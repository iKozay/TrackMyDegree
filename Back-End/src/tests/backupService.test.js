const mongoose = require('mongoose');
const path = require('node:path');
const fs = require('node:fs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Sentry = require('@sentry/node');
const cron = require('node-cron');

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const BackupService = require('../services/backup/backupService');
const BACKUP_DIR = (process.env.BACKUP_DIR ||
  path.join(__dirname, '../backups')).trim();

describe('BackupService', () => {
  let mongoServer;
  let db;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    db = mongoose.connection.db;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();

    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const collections = await db.listCollections().toArray();
    for (const c of collections) {
      await db.collection(c.name).deleteMany({});
    }

    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
  });

  describe('startBackupScheduler', () => {
    let createBackupSpy;

    afterEach(() => {
        if (createBackupSpy) {
        createBackupSpy.mockRestore();
        }
    });

    it('should schedule the daily backup job', () => {
        BackupService.startBackupScheduler();

        expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
        );
    });

    it('should execute scheduled callback successfully', async () => {
        createBackupSpy = jest
        .spyOn(BackupService, 'createBackup')
        .mockResolvedValue('backup-test.json');

        BackupService.startBackupScheduler();
        const callback = cron.schedule.mock.calls[0][1];

        await callback();

        expect(createBackupSpy).toHaveBeenCalled();
    });

    it('should capture scheduler callback errors', async () => {
        createBackupSpy = jest
        .spyOn(BackupService, 'createBackup')
        .mockRejectedValue(new Error('scheduler failed'));

        BackupService.startBackupScheduler();
        const callback = cron.schedule.mock.calls[0][1];

        await callback();

        expect(createBackupSpy).toHaveBeenCalled();
        expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('createBackup', () => {
    it('should create a backup file successfully', async () => {
      await db.collection('users').insertOne({ name: 'Ayaan' });
      await db.collection('timelines').insertOne({ event: 'created' });

      const fileName = await BackupService.createBackup();
      const filePath = path.join(BACKUP_DIR, fileName);

      expect(fileName).toMatch(/^backup-.*\.json$/);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should handle missing collections gracefully', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = {
        collection: jest.fn().mockImplementation((name) => {
          if (name === 'users') {
            throw new Error('users missing');
          }
          return {
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([]),
            }),
          };
        }),
      };

      const fileName = await BackupService.createBackup();
      expect(fileName).toContain('backup-');

      mongoose.connection.db = originalDb;
    });

    it('should throw when no db connection exists', async () => {
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = null;

      await expect(BackupService.createBackup()).rejects.toThrow(
        'No database connection available',
      );

      expect(Sentry.captureException).toHaveBeenCalled();
      mongoose.connection.db = originalDb;
    });
  });

  describe('listBackups', () => {
    it('should list only json backup files', async () => {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      fs.writeFileSync(path.join(BACKUP_DIR, 'a.json'), '{}');
      fs.writeFileSync(path.join(BACKUP_DIR, 'b.txt'), 'ignore');

      const files = await BackupService.listBackups();

      expect(files).toEqual(['a.json']);
    });
  });

  describe('restoreBackup', () => {
    it('should restore users and timelines from backup', async () => {
      const fileName = await BackupService.createBackup();

      await db.collection('users').deleteMany({});
      await db.collection('timelines').deleteMany({});

      await BackupService.restoreBackup(fileName);

      expect(await db.collection('users').countDocuments()).toBeGreaterThanOrEqual(0);
      expect(await db.collection('timelines').countDocuments()).toBeGreaterThanOrEqual(0);
    });

    it('should skip empty collections during restore', async () => {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const fileName = 'empty-backup.json';
      fs.writeFileSync(
        path.join(BACKUP_DIR, fileName),
        JSON.stringify({ users: [], timelines: [] }),
      );

      await expect(
        BackupService.restoreBackup(fileName),
      ).resolves.toBeUndefined();
    });

    it('should throw if backup file does not exist', async () => {
      await expect(
        BackupService.restoreBackup('missing.json'),
      ).rejects.toThrow('Backup file not found');

      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should throw when insertMany fails', async () => {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const fileName = 'broken.json';
      fs.writeFileSync(
        path.join(BACKUP_DIR, fileName),
        JSON.stringify({ users: [{ a: 1 }], timelines: [] }),
      );

      const originalDb = mongoose.connection.db;
      mongoose.connection.db = {
        collection: jest.fn().mockReturnValue({
          deleteMany: jest.fn().mockResolvedValue({}),
          insertMany: jest.fn().mockRejectedValue(new Error('insert failed')),
        }),
      };

      await expect(BackupService.restoreBackup(fileName)).rejects.toThrow(
        'insert failed',
      );

      mongoose.connection.db = originalDb;
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup file successfully', async () => {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const fileName = 'delete-me.json';
      const filePath = path.join(BACKUP_DIR, fileName);
      fs.writeFileSync(filePath, '{}');

      await BackupService.deleteBackup(fileName);

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should throw if backup file does not exist', async () => {
      await expect(BackupService.deleteBackup('missing.json')).rejects.toThrow(
        'Backup file not found: missing.json',
      );

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });
});
