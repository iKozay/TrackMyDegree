/**
 * Admin Routes
 *
 * Handles admin operations including database management
 */

import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { adminController } from '@controllers/mondoDBControllers';
import { seedDegreeData, seedAllDegreeData } from '@controllers/mondoDBControllers/SeedingController';

const router = express.Router();

// ==========================
// ADMIN ROUTES
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const COLLECTION_NAME_REQUIRED = 'Collection name is required';
const NOT_AVAILABLE = 'not available';

/**
 * GET /admin/collections - Get all collections
 */
router.get('/collections', async (req: Request, res: Response) => {
  try {
    const collections = await adminController.getCollections();
    res.status(HTTP.OK).json({
      message: 'Collections retrieved successfully',
      collections,
    });
  } catch (error) {
    console.error('Error in GET /admin/collections', error);
    if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
      res.status(HTTP.SERVER_ERR).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * GET /admin/collections/:collectionName/documents - Get documents from collection
 */
router.get(
  '/collections/:collectionName/documents',
  async (req: Request, res: Response) => {
    try {
      const { collectionName } = req.params;
      const { keyword, page, limit } = req.query;

      if (!collectionName) {
        res.status(HTTP.BAD_REQUEST).json({
          error: COLLECTION_NAME_REQUIRED,
        });
        return;
      }

      const documents = await adminController.getCollectionDocuments(
        collectionName,
        {
          keyword: keyword as string,
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
        },
      );

      res.status(HTTP.OK).json({
        message: 'Documents retrieved successfully',
        documents,
      });
    } catch (error) {
      console.error(
        'Error in GET /admin/collections/:collectionName/documents',
        error,
      );
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  },
);

/**
 * GET /admin/collections/:collectionName/stats - Get collection statistics
 */
router.get(
  '/collections/:collectionName/stats',
  async (req: Request, res: Response) => {
    try {
      const { collectionName } = req.params;

      if (!collectionName) {
        res.status(HTTP.BAD_REQUEST).json({
          error: COLLECTION_NAME_REQUIRED,
        });
        return;
      }

      const stats = await adminController.getCollectionStats(collectionName);
      res.status(HTTP.OK).json({
        message: 'Statistics retrieved successfully',
        stats,
      });
    } catch (error) {
      console.error(
        'Error in GET /admin/collections/:collectionName/stats',
        error,
      );
      if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
        res.status(HTTP.SERVER_ERR).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
      }
    }
  },
);

/**
 * DELETE /admin/collections/:collectionName/clear - Clear collection
 */
router.delete(
  '/collections/:collectionName/clear',
  async (req: Request, res: Response) => {
    try {
      const { collectionName } = req.params;

      if (!collectionName) {
        res.status(HTTP.BAD_REQUEST).json({
          error: COLLECTION_NAME_REQUIRED,
        });
        return;
      }

      const count = await adminController.clearCollection(collectionName);
      res.status(HTTP.OK).json({
        message: `Collection cleared successfully`,
        deletedCount: count,
      });
    } catch (error) {
      console.error(
        'Error in DELETE /admin/collections/:collectionName/clear',
        error,
      );
      if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
        res.status(HTTP.SERVER_ERR).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
      }
    }
  },
);

/**
 * GET /admin/connection-status - Get database connection status
 */
router.get('/connection-status', async (req: Request, res: Response) => {
  try {
    const status = await adminController.getConnectionStatus();
    res.status(HTTP.OK).json({
      message: 'Connection status retrieved successfully',
      ...status,
    });
  } catch (error) {
    console.error('Error in GET /admin/connection-status', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

router.get('/seed-data', async (req: Request, res: Response)=>{
  try {
    await seedAllDegreeData();
    res.status(HTTP.OK).json({
      message: 'Data seeded for all degrees'
    });

  }catch (error) {
    console.error('Error in GET /admin/seed-data', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

router.get('/seed-data/:degreeName', async (req: Request, res: Response)=>{
  try {
    const {degreeName} = req.params;

    if (!degreeName) {
          res.status(HTTP.BAD_REQUEST).json({
            error: 'Degree name is required',
          });
          return;
    }

    await seedDegreeData(degreeName as unknown as string);
    res.status(HTTP.OK).json({
      message: 'Data seeded for degree ' + degreeName
    });
  }catch (error) {
    console.error('Error in GET /admin/seed-data', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

export default router;
