import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import { adminController } from '@controllers/adminController';
import { CatalogError, runCatalog } from '@services/catalogService';
import {
  adminCheckMiddleware,
  authMiddleware,
} from '@middleware/authMiddleware';
import {
  seedAllDegreeData,
  seedDegreeData,
} from '../controllers/seedingController';
import { cacheDelPattern } from '@lib/cache';
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
const ACADEMIC_YEAR_REQUIRED = 'Academic year is required';
const NOT_AVAILABLE = 'not available';

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Mongo-backed administrative endpoints.
 */

/**
 * GET /admin/collections - Get all collections
 */
/**
 * @openapi
 * /admin/collections:
 *   get:
 *     summary: List MongoDB collections
 *     description: Returns all available collection names.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Collections retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 collections:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error.
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
      res
        .status(HTTP.SERVER_ERR)
        .json({ success: false, message: error.message });
    } else {
      res
        .status(HTTP.SERVER_ERR)
        .json({ success: false, message: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * GET /admin/collections/:collectionName/documents - Get documents from collection
 */
/**
 * @openapi
 * /admin/collections/{collectionName}/documents:
 *   get:
 *     summary: Get documents from a collection
 *     description: Retrieves documents from the specified collection with optional keyword search and pagination.
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: collectionName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the collection.
 *       - in: query
 *         name: keyword
 *         required: false
 *         schema:
 *           type: string
 *         description: Text to search within documents.
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page size (items per page).
 *     responses:
 *       200:
 *         description: Documents retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       400:
 *         description: Collection name is missing.
 *       500:
 *         description: Server error.
 */
router.get(
  '/collections/:collectionName/documents',
  async (req: Request, res: Response) => {
    try {
      const { collectionName } = req.params;
      const { keyword, page, limit } = req.query;

      if (!collectionName) {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: COLLECTION_NAME_REQUIRED,
        });
        return;
      }

      const documents = await adminController.getCollectionDocuments(
        collectionName as string,
        {
          keyword: keyword as string,
          page: page ? Number.parseInt(page as string) : undefined,
          limit: limit ? Number.parseInt(limit as string) : undefined,
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
      res
        .status(HTTP.SERVER_ERR)
        .json({ success: false, message: INTERNAL_SERVER_ERROR });
    }
  },
);

/**
 * DELETE /admin/collections/:collectionName/clear - Clear collection
 */
/**
 * @openapi
 * /admin/collections/{collectionName}/clear:
 *   delete:
 *     summary: Clear all documents in a collection
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: collectionName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the collection to clear.
 *     responses:
 *       200:
 *         description: Collection cleared successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedCount:
 *                   type: integer
 *       400:
 *         description: Collection name is missing.
 *       500:
 *         description: Server error.
 */
router.delete(
  '/collections/:collectionName/clear',
  async (req: Request, res: Response) => {
    try {
      const { collectionName } = req.params;

      if (!collectionName) {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: COLLECTION_NAME_REQUIRED,
        });
        return;
      }

      const count = await adminController.clearCollection(
        collectionName as string,
      );
      res.status(HTTP.OK).json({
        success: true,
        message: `${count} documents cleared successfully`,
      });
    } catch (error) {
      console.error(
        'Error in DELETE /admin/collections/:collectionName/clear',
        error,
      );
      if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
        res
          .status(HTTP.SERVER_ERR)
          .json({ success: false, message: error.message });
      } else {
        res
          .status(HTTP.SERVER_ERR)
          .json({ success: false, message: INTERNAL_SERVER_ERROR });
      }
    }
  },
);

/**
 * GET /admin/connection-status - Get database connection status
 */
/**
 * @openapi
 * /admin/connection-status:
 *   get:
 *     summary: Get database connection status
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Connection status retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       500:
 *         description: Server error.
 */
router.get('/connection-status', (req: Request, res: Response) => {
  try {
    const status = adminController.getConnectionStatus();
    res.status(HTTP.OK).json({
      message: 'Connection status retrieved successfully',
      ...status,
    });
  } catch (error) {
    console.error('Error in GET /admin/connection-status', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * @openapi
 * /admin/catalogs-update:
 *   post:
 *     summary: Scrape, diff, and optionally apply catalog updates
 *     description: Runs the catalog update flow for an academic year and optionally persists the resulting changes.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - academicYear
 *             properties:
 *               academicYear:
 *                 type: string
 *                 example: 2026-2027
 *               degree:
 *                 type: string
 *                 description: Optional degree name to limit the scrape scope.
 *               apply:
 *                 type: boolean
 *                 default: false
 *               writeSnapshot:
 *                 type: boolean
 *                 default: false
 *                 description: Writes snapshot JSON locally in development only.
 *               writePatch:
 *                 type: boolean
 *                 default: false
 *                 description: Writes patch JSON locally in development only.
 *               inspectDir:
 *                 type: string
 *                 description: Optional output directory for local inspection files in development only.
 *               backfillBaseAcademicYear:
 *                 type: string
 *                 description: Optional academic year used to backfill missing baseAcademicYear fields before applying.
 *     responses:
 *       200:
 *         description: Catalog update completed successfully.
 *       400:
 *         description: Academic year is missing or invalid.
 *       500:
 *         description: Catalog update failed.
 */
router.post('/catalogs-update', async (req: Request, res: Response) => {
  try {
    const {
      academicYear,
      degree,
      apply = false,
      writeSnapshot = false,
      writePatch = false,
      inspectDir,
      backfillBaseAcademicYear,
    } = req.body || {};

    if (!academicYear || typeof academicYear !== 'string') {
      res.status(HTTP.BAD_REQUEST).json({
        success: false,
        message: ACADEMIC_YEAR_REQUIRED,
      });
      return;
    }

    const result = await runCatalog({
      academicYear,
      // Omit degree to import all degrees for the academic year.
      degree: typeof degree === 'string' ? degree : undefined,
      apply: Boolean(apply),
      writeSnapshot: Boolean(writeSnapshot),
      writePatch: Boolean(writePatch),
      inspectDir: typeof inspectDir === 'string' ? inspectDir : undefined,
      backfillBaseAcademicYear:
        typeof backfillBaseAcademicYear === 'string'
          ? backfillBaseAcademicYear
          : undefined,
    });

    res.status(HTTP.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in POST /admin/catalogs-update', error);

    if (error instanceof CatalogError) {
      res.status(HTTP.SERVER_ERR).json({
        success: false,
        error: error.message,
        inspectionFiles: error.inspectionFiles,
      });
      return;
    }

    res.status(HTTP.SERVER_ERR).json({
      success: false,
      message: INTERNAL_SERVER_ERROR,
    });
  }
});

router.get('/seed-data', async (req: Request, res: Response) => {
  try {
    const result = await seedAllDegreeData();
    await cacheDelPattern('GET:/degree*');
    await cacheDelPattern('GET:/courses*');
    res.status(HTTP.OK).json({ success: true, message: result });
  } catch (error) {
    console.error('Error in GET /admin/seed-data', error);
    res.status(HTTP.SERVER_ERR).json({ success: false, message: INTERNAL_SERVER_ERROR });
  }
});

router.get('/seed-data/:degreeName', async (req: Request, res: Response) => {
  try {
    const { degreeName } = req.params;

    if (!degreeName) {
      res.status(HTTP.BAD_REQUEST).json({ success: false, message: 'Degree name is required' });
      return;
    }

    const result = await seedDegreeData(degreeName as string);
    await cacheDelPattern('GET:/degree*');
    await cacheDelPattern('GET:/courses*');
    res.status(HTTP.OK).json({ success: true, message: result });
  } catch (error) {
    console.error('Error in GET /admin/seed-data/:degreeName', error);
    res.status(HTTP.SERVER_ERR).json({ success: false, message: INTERNAL_SERVER_ERROR });
  }
});

export default router;
