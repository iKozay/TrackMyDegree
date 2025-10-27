/**
 * Handles admin operations including database management.
 */

import mongoose from 'mongoose';
import { BaseMongoController } from './BaseMongoController';
import * as Sentry from '@sentry/node';

export class AdminController extends BaseMongoController<any> {
  constructor() {
    // Admin controller doesn't use a specific model
    super(null as any, 'Admin');
  }

  /**
   * Get all collections in the database
   */
  async getCollections(): Promise<string[]> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const collections = await db.listCollections().toArray();
      return collections.map((col) => col.name);
    } catch (error) {
      Sentry.captureException(error);
      throw new Error('Error fetching collections');
    }
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
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
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
        : {};

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const documents = await collection
        .find(query, { projection })
        .skip(skip)
        .limit(limit)
        .toArray();

      return documents as any[];
    } catch (error) {
      Sentry.captureException(error);
      throw new Error('Error fetching documents from collection');
    }
  }

  /**
   * Get collection statistics using countDocuments
   */
  async getCollectionStats(collectionName: string): Promise<{
    count: number;
    size: number;
    avgDocSize: number;
  }> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }


      const stats = await db.command({
        collStats: collectionName,
      });

      return {
        count: stats.count || 0,
        size: stats.size || 0,
        avgDocSize: stats.avgObjSize || 0,
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error('Error fetching collection statistics');
    }
  }

  /**
   * Clear all documents from a collection (dangerous - use with caution)
   */
  async clearCollection(collectionName: string): Promise<number> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const result = await db.collection(collectionName).deleteMany({});
      return result.deletedCount || 0;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error('Error clearing collection');
    }
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
}

export const adminController = new AdminController();
