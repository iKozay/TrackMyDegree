import mongoose from 'mongoose';
import { BaseMongoController } from './baseMongoController';
import { DATABASE_CONNECTION_NOT_AVAILABLE, DatabaseConnectionError } from '@utils/errors';
import * as BackupService from '@services/backup';

export class AdminController extends BaseMongoController<any> {
  constructor() {
    // Admin controller doesn't use a specific model
    super(null as any, 'Admin');
  }

  /**
   * Get all collections in the database
   */
  async getCollections(): Promise<string[]> {
      const db = mongoose.connection.db;
      if (!db) {
        throw new DatabaseConnectionError();
      }

      const collections = await db.listCollections().toArray();
      return collections.map((col) => col.name);
  }

  /**
   * Get documents from a collection with optional search
   * Optimized with pagination and field projection
   */
  async getCollectionDocuments(
    collectionName: string,
    options: {
      keyword?: string;
      page?: number;
      limit?: number;
      select?: string[];
    } = {},
  ): Promise<any[]> {
      const db = mongoose.connection.db;
      if (!db) {
        throw new DatabaseConnectionError();
      }

      const collection = db.collection(collectionName);
      const { keyword, page = 1, limit = 100, select } = options;

      let query: Record<string, unknown> = {};

      // Build search filter if keyword provided
      if (keyword) {
        const sampleDoc = await collection.findOne({});
        if (sampleDoc) {
          const stringFields = Object.keys(sampleDoc).filter(
            (key) => typeof sampleDoc[key] === 'string',
          );

          if (stringFields.length > 0) {
            query = {
              $or: stringFields.map((field) => ({
                [field]: { $regex: keyword, $options: 'i' },
              })),
            };
          }
        }
      }

      // Build projection
      const projection = select
        ? select.reduce(
            (acc, field) => ({ ...acc, [field]: 1 }),
            {} as Record<string, number>,
          )
        : null;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const findOptions = projection ? { projection } : {};
      const documents = await collection
        .find(query, findOptions)
        .skip(skip)
        .limit(limit)
        .toArray();

      return documents as any[];
  }

  async getCollectionDocumentsCount(
    collectionName: string,
    options: {
      field?: string;
      value?: string;
      keyword?: string;
    } = {},
  ): Promise<number> {
      const db = mongoose.connection.db;
      if (!db) {
        throw new DatabaseConnectionError(DATABASE_CONNECTION_NOT_AVAILABLE);
      }

      const collection = db.collection(collectionName);
      const { field, value, keyword } = options;

      let query: Record<string, unknown> = {};

      // Exact match when a specific field value is provided
      if (field && typeof value === 'string') {
        query[field] = value;
      } else if (field && keyword) {
        // Backward-compatible partial match path
        query[field] = { $regex: keyword, $options: 'i' };
      }

      const count = await collection.countDocuments(query);
      return count;
   
  }

  /**
   * Clear all documents from a collection (dangerous - use with caution)
   */
  async clearCollection(collectionName: string): Promise<number> {
      const db = mongoose.connection.db;
      if (!db) {
        throw new DatabaseConnectionError();
      }

      const result = await db.collection(collectionName).deleteMany({});
      return result.deletedCount || 0;
  }

  /**
   * Get database connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    readyState: number;
    name?: string;
  } {
    return {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name,
    };
  }

  // Return all the available backups from the backup directory
  async listBackups(): Promise<string[]> {
      return await BackupService.listBackups();
  }

  // Create a backup in the backup directory
  async createBackup(): Promise<string> {
      const db = mongoose.connection.db;
      if (!db) {
        throw new DatabaseConnectionError(DATABASE_CONNECTION_NOT_AVAILABLE);
      }
      const backupFileName = await BackupService.createBackup(); 
      return backupFileName;
  }

  // Delete the backup file from the backup directory
  async deleteBackup(backupFileName: string): Promise<void> {
      await BackupService.deleteBackup(backupFileName);
  }

  // Restore the backup file from the backup directory
  async restoreBackup(backupFileName: string): Promise<void> {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error(DATABASE_CONNECTION_NOT_AVAILABLE);
      }
      await BackupService.restoreBackup(backupFileName);
  }

}

export const adminController = new AdminController();
