import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { adminController } from '@controllers/mondoDBControllers';
import { adminCheckMiddleware, authMiddleware } from '@middleware/authMiddleware';

const router = express.Router();

// ==========================
// MIDDLEWARE
// ==========================

router.use(authMiddleware);
router.use(adminCheckMiddleware);

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
      success: true,
      data: collections,
    });
  } catch (error) {
    console.error('Error in GET /admin/collections', error);
    if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
      res.status(HTTP.SERVER_ERR).json({ success: false, message: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ success: false, message: INTERNAL_SERVER_ERROR });
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
          success: false, message: COLLECTION_NAME_REQUIRED,
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
        success: true,
        data: documents,
      });
    } catch (error) {
      console.error(
        'Error in GET /admin/collections/:collectionName/documents',
        error,
      );
      res.status(HTTP.SERVER_ERR).json({ success: false, message: INTERNAL_SERVER_ERROR });
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
          success: false, message: COLLECTION_NAME_REQUIRED,
        });
        return;
      }

      const count = await adminController.clearCollection(collectionName);
      res.status(HTTP.OK).json({
        success: true, message: `${count} documents cleared successfully`,
      });
    } catch (error) {
      console.error(
        'Error in DELETE /admin/collections/:collectionName/clear',
        error,
      );
      if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
        res.status(HTTP.SERVER_ERR).json({ success: false, message: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ success: false, message: INTERNAL_SERVER_ERROR });
      }
    }
  },
);

// TODO: Add seed data route that will call: scraper, courseController (MongoDB), coursepoolController (MongoDB) and degreeController (MongoDB)

export default router;
