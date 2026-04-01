import mongoose from 'mongoose';
import fs from 'node:fs';
import fsPromises = fs.promises;
import path from 'node:path';
import * as Sentry from '@sentry/node';
import cron from 'node-cron';

// Initialize Backup Directory
const BACKUP_DIR = (
  process.env.BACKUP_DIR || path.join(__dirname, '../../backups')
).trim();

// Collections to backup (USER DATA ONLY - excludes courses and degrees)
const USER_DATA_COLLECTIONS = ['users', 'timelines'];

// Schedule Backups for every 24 hours
export function startBackupScheduler(): void {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[BACKUP SCHEDULER] Starting daily backup...');
      const fileName = await createBackup();
      console.log(`[BACKUP SCHEDULER] Backup created: ${fileName}`);
    } catch (error) {
      Sentry.captureException(error);
      console.error('[BACKUP SCHEDULER] Backup failed:', error);
    }
  });

  console.log('[BACKUP SCHEDULER] Daily scheduler started.');
}

// Ensure Backup Directory Exists
async function ensureBackupDir(): Promise<void> {
  if (!fs.existsSync(BACKUP_DIR)) {
    await fsPromises.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

// Create Backup (User Data Only)
export async function createBackup(): Promise<string> {
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('No database connection available');

    await ensureBackupDir();

    const backupData: Record<string, any[]> = {};

    // Only backup user data collections
    for (const collectionName of USER_DATA_COLLECTIONS) {
      try {
        const collection = db.collection(collectionName);
        const data = await collection.find().toArray();
        backupData[collectionName] = data;
        console.log(
          `Backed up ${data.length} documents from ${collectionName}`,
        );
      } catch (error) {
        // log error for each collection
        console.warn(
          `Error accessing collection ${collectionName}:`,
          (error as Error).message,
        );
        backupData[collectionName] = [];
      }
    }

    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    await fsPromises.writeFile(
      filePath,
      JSON.stringify(backupData, null, 2),
      'utf-8',
    );

    console.log(`Backup created successfully at: ${filePath}`);
    return fileName;
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error creating backup:', error);
    throw error;
  }
}

// List Available Backups
export async function listBackups(): Promise<string[]> {
  try {
    await ensureBackupDir();
    const files = await fsPromises.readdir(BACKUP_DIR);
    return files.filter((file) => file.endsWith('.json'));
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error listing backups:', error);
    throw error;
  }
}

// Restore Backup
// Step 1: Clear user data collections
// Step 2: Restore User Data from backup
export async function restoreBackup(backupFileName: string): Promise<void> {
  try {
    const filePath = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filePath}`);
    }

    const db = mongoose.connection.db;
    if (!db) throw new Error('No database connection available');

    // Read backup data
    const backupContent = await fsPromises.readFile(filePath, 'utf-8');
    const backupData: Record<string, any[]> = JSON.parse(backupContent);

    console.log('[RESTORE] Step 1: Clearing users and timeline collections...');

    for (const collectionName of USER_DATA_COLLECTIONS) {
      await db.collection(collectionName).deleteMany({});
      console.log(`[RESTORE] Cleared collection: ${collectionName}`);
    }

    console.log('[RESTORE] Step 2: Restoring user data from backup...');

    for (const collectionName of USER_DATA_COLLECTIONS) {
      const docs = backupData[collectionName];

      if (!docs || !Array.isArray(docs) || docs.length === 0) {
        console.log(`No data to restore for collection: ${collectionName}`);
        continue;
      }

      try {
        const collection = db.collection(collectionName);
        await collection.insertMany(docs);
        console.log(`Restored ${docs.length} documents to ${collectionName}`);
      } catch (error) {
        console.error(`Error restoring collection ${collectionName}:`, error);
        throw error;
      }
    }

    console.log(
      `[RESTORE] Backup restored successfully from: ${backupFileName}`,
    );
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error restoring backup:', error);
    throw error;
  }
}

// Delete Backup
export async function deleteBackup(backupFileName: string): Promise<void> {
  try {
    const filePath = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${backupFileName}`);
    }

    await fsPromises.unlink(filePath);
    console.log(`Backup deleted: ${backupFileName}`);
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error deleting backup:', error);
    throw error;
  }
}
