import mongoose from 'mongoose';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import * as Sentry from '@sentry/node';
import { seedDatabase } from '../seed/seedService';

const BACKUP_DIR =
  process.env.BACKUP_DIR || path.join(__dirname, '../../backups');

// Collections to backup (USER DATA ONLY - excludes courses and degrees)
const USER_DATA_COLLECTIONS = ['users', 'timelines', 'feedback'];

// Collections that are always seeded from files (STATIC DATA)
const STATIC_DATA_COLLECTIONS = ['courses', 'degrees'];

// -------------------------------------
// Ensure Backup Directory Exists
// -------------------------------------
async function ensureBackupDir(): Promise<void> {
  if (!fs.existsSync(BACKUP_DIR)) {
    await fsPromises.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

// -------------------------------------
// Create Backup (User Data Only)
// -------------------------------------
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
        console.warn(`Collection ${collectionName} not found, skipping...`);
        backupData[collectionName] = [];
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
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

// -------------------------------------
// List Available Backups
// -------------------------------------
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

// -------------------------------------
// Restore Backup
// Step 1: Clear ALL collections
// Step 2: Re-seed Courses & Degrees from files
// Step 3: Restore User Data from backup
// -------------------------------------
export async function restoreBackup(backupFileName: string): Promise<void> {
  try {
    const filePath = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${backupFileName}`);
    }

    const db = mongoose.connection.db;
    if (!db) throw new Error('No database connection available');

    // Read backup data
    const backupContent = await fsPromises.readFile(filePath, 'utf-8');
    const backupData: Record<string, any[]> = JSON.parse(backupContent);

    console.log('[RESTORE] Step 1: Clearing all collections...');

    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      await db.collection(col.name).deleteMany({});
      console.log(`Cleared collection: ${col.name}`);
    }

    console.log('[RESTORE] Step 2: Re-seeding Courses & Degrees from files...');

    await seedDatabase();

    console.log('[RESTORE] Step 3: Restoring user data from backup...');

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

// -------------------------------------
// Delete Backup
// -------------------------------------
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
