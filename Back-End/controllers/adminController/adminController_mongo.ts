import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
} from '../../services/backup';
const unknownErrorString = 'Unknown error';
export const adminController = {
  async createBackup(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const fileName = await createBackup();
      res.json({ message: 'Backup created', data: fileName });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : unknownErrorString;
      res.status(500).json({ error: message });
    }
  },

  async restoreBackup(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { file } = req.body;
      await restoreBackup(file);
      res.json({ message: 'Backup restored successfully' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : unknownErrorString;
      res.status(500).json({ error: message });
    }
  },

  async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const backups = await listBackups();
      res.json({ success: true, data: backups });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : unknownErrorString;
      res.status(500).json({ error: message });
    }
  },

  async deleteBackup(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { file } = req.body;
      await deleteBackup(file);
      res.json({ message: 'Backup deleted' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : unknownErrorString;
      res.status(500).json({ error: message });
    }
  },

  async getCollections(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        res.status(500).json({
          success: false,
          message: 'Database connection not available',
          data: null,
        });
        return;
      }
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map((col) => col.name);

      res.status(200).json({ success: true, data: collectionNames });
    } catch (err: unknown) {
      console.error('Error fetching collections:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching documents from collection',
        data: err instanceof Error ? err.message : err,
      });
    }
  },

  async getCollectionDocuments(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const { collectionName } = req.params;
    const { keyword } = req.query;

    try {
      const db = mongoose.connection.db;
      if (!db) {
        res.status(500).json({
          success: false,
          message: 'Database connection not available',
          data: null,
        });
        return;
      }
      const collection = db.collection(collectionName);

      let filter = {};
      if (keyword && typeof keyword === 'string') {
        // Build filter for string fields
        const sampleDoc = await collection.findOne({});
        if (sampleDoc) {
          const stringFields = Object.keys(sampleDoc).filter(
            (key) => typeof sampleDoc[key] === 'string',
          );
          if (stringFields.length > 0) {
            filter = {
              $or: stringFields.map((field) => ({
                [field]: { $regex: keyword, $options: 'i' },
              })),
            };
          }
        }
      }

      const documents = await collection.find(filter).toArray();
      res.status(200).json({ success: true, data: documents });
    } catch (err: unknown) {
      console.error('Error fetching collection documents:', err);
      res.status(500).json({
        success: false,
        message: 'Error fetching documents from collection',
        data: err instanceof Error ? err.message : err,
      });
    }
  },
};
