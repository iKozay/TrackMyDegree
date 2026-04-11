import HTTP from '@utils/httpCodes';
import express, { NextFunction, Request, Response } from 'express';
import { adminController } from '@controllers/adminController';
import { runCatalog } from '@services/catalogService';
import {
  adminCheckMiddleware,
  authMiddleware,
} from '@middleware/authMiddleware';
import {
  seedAllDegreeData,
  seedDegreeData,
} from '@controllers/seedingController';
import { BadRequestError, CatalogError } from '@utils/errors';
import path from 'node:path';
import { adminRateLimiter } from '@middleware/rateLimiter';
const router = express.Router();

// ==========================
// MIDDLEWARE
// ==========================

router.use(authMiddleware);
router.use(adminCheckMiddleware);
router.use(adminRateLimiter);

// ==========================
// ADMIN ROUTES
// ==========================

const COLLECTION_NAME_REQUIRED = 'Collection name is required';
const ACADEMIC_YEAR_REQUIRED = 'Academic year is required';
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
router.get('/collections', async (req: Request, res: Response, next: NextFunction) => {
  try{
    const collections = await adminController.getCollections();
    res.status(HTTP.OK).json({
      success: true,
      data: collections,
    });
  }catch (error) {
    next(error);  
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
  async (req: Request, res: Response, next: NextFunction) => {
    try{
      const { collectionName } = req.params;
      const { keyword, page, limit } = req.query;

      if (!collectionName) {
        throw new BadRequestError(COLLECTION_NAME_REQUIRED);
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
      }catch (error) {
    next(error);  
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
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { collectionName } = req.params;

      if (!collectionName) {
        throw new BadRequestError(COLLECTION_NAME_REQUIRED);
      }

      const count = await adminController.clearCollection(
        collectionName as string,
      );
      res.status(HTTP.OK).json({
        success: true,
        message: `${count} documents cleared successfully`,
      });
    } catch (error) {
        next(error);  
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
router.get('/connection-status', (req: Request, res: Response, next: NextFunction) => {
  try{
    const status = adminController.getConnectionStatus();
    res.status(HTTP.OK).json({
      message: 'Connection status retrieved successfully',
      ...status,
    });
  }catch (error) {
    next(error);  
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
router.post('/catalogs-update', async (req: Request, res: Response, next: NextFunction) => {
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
      throw new BadRequestError(ACADEMIC_YEAR_REQUIRED);
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
  }catch (error) {
    if (error instanceof CatalogError){
      return res.status(HTTP.SERVER_ERR).json({
        success: false,
        error: error.message,
        inspectionFiles: error.inspectionFiles,
      });
    }
    next(error);
  }
});

// GET /admin/seed-data - Seed all degree data
router.get('/seed-data', async (req: Request, res: Response, next: NextFunction) => {
   try{

    const result = await seedAllDegreeData();
    res.status(HTTP.OK).json({
      message: result,
    });
   } catch (error) {
    next(error);
  }
});

// GET /admin/seed-data/:degreeName - Seed degree data for the degree specifie
router.get('/seed-data/:degreeName', async (req: Request, res: Response, next: NextFunction) => {
  try{
    const { degreeName } = req.params;

    if (!degreeName) {
      throw new BadRequestError('Degree name is required');
    }

    const result = await seedDegreeData(degreeName as string);
    res.status(HTTP.OK).json({
      message: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/fetch-backups - Fetch all the backups from backup directory
router.get('/fetch-backups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backups = await adminController.listBackups(); 

    res.status(HTTP.OK).json({
      success: true,
      data: backups,
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/create-backup - Create a new backup in the backup directory
router.post('/create-backup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backupFileName = await adminController.createBackup(); 

    res.status(HTTP.OK).json({
      success: true,
      data: backupFileName,
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/restore-backup - Restore a backup from backup directory
router.post('/restore-backup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { backupName } = req.body;

    if (!backupName) {
      return res.status(HTTP.BAD_REQUEST).json({
        success: false,
        message: "backupName is required",
      });
    }

    const safeBackupname = path.basename(backupName);
    await adminController.restoreBackup(safeBackupname);

    return res.status(HTTP.OK).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

// POST /admin/delete-backup - Delete the backup from backup directory
router.post('/delete-backup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { backupName } = req.body;

    if (!backupName) {
      return res.status(HTTP.BAD_REQUEST).json({
        success: false,
        message: "backupName is required",
      });
    }

    const safeBackupname = path.basename(backupName);
    await adminController.deleteBackup(safeBackupname);

    return res.status(HTTP.OK).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});


export default router;
