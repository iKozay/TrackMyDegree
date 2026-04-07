import HTTP from '@utils/httpCodes';
import express, { NextFunction, Request, Response } from 'express';
import { userController } from '@controllers/userController';
import { authController } from '@controllers/authController';
import { authMiddleware, userCheckMiddleware } from '@middleware/authMiddleware';
import mongoose from 'mongoose';
import { BadRequestError, INVALID_ID_FORMAT } from '@utils/errors';
import { userRateLimiter } from '@middleware/rateLimiter';

const router = express.Router();

// ==========================
// USER ROUTES (CRUD)
// ==========================



router.use(userRateLimiter);
router.use(authMiddleware);

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: Mongo-backed user endpoints
 */

/**
 * GET /users/:userId - Get user by ID
 */
/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User does not exist
 *       500:
 *         description: Internal server error
 */
router.get('/:userId', userCheckMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const user = await userController.getUserById(userId as string);
    res.status(HTTP.OK).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /users/:userId - Update user
 */
/**
 * @openapi
 * /users/{userId}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user:
 *                   type: object
 *                   additionalProperties: true
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User does not exist
 *       500:
 *         description: Internal server error
 */

/**
 * PATCH /users/:userId - Partial update fullname, password
 */

async function handlePasswordUpdate(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!currentPassword) {
    throw new BadRequestError('currentPassword is required to set a new password');
  }
  if (newPassword.length < 6) {
    throw new BadRequestError('newPassword must be at least 6 characters');
  }

  await authController.changePassword(userId, currentPassword, newPassword);

}

// eslint-disable-next-line sonarjs/cognitive-complexity
router.patch('/:userId', userCheckMiddleware, async (req: Request<{ userId: string }>, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { fullname, currentPassword, newPassword } = req.body;

    if (fullname !== undefined && typeof fullname !== 'string') {
      throw new BadRequestError('fullname must be a string');
    }
    if (currentPassword !== undefined && typeof currentPassword !== 'string') {
      throw new BadRequestError('currentPassword must be a string');
    }
    if (newPassword !== undefined && typeof newPassword !== 'string') {
      throw new BadRequestError('newPassword must be a string');
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    if (!fullname && !newPassword) {
      throw new BadRequestError('Provide at least one field to update: fullname or newPassword');
    }

    // Name update
    if (fullname) {
      if (!fullname.trim()) {
        throw new BadRequestError('Fullname cannot be empty');
      }
      await userController.updateUser(userId, { fullname: fullname.trim() });
    }

    // Password update
    if (newPassword) {
      await handlePasswordUpdate(userId, currentPassword, newPassword);
    }

    res.status(HTTP.OK).json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/:userId', userCheckMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (
      typeof updates !== 'object' ||
      Array.isArray(updates) ||
      updates === null
    ) {
      throw new BadRequestError('Invalid request body')
    }

     if (!mongoose.Types.ObjectId.isValid(userId as string)) {
        throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const user = await userController.updateUser(userId as string, updates);
    res.status(HTTP.OK).json(user);
  } catch (error) {     
    next(error);
  }
});


/**
 * GET /users/:userId/data - Get comprehensive user data
 */
/**
 * @openapi
 * /users/{userId}/data:
 *   get:
 *     summary: Get comprehensive user data
 *     description: Returns a compound payload for the user (e.g., profile, timelines, etc.).
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User does not exist
 *       500:
 *         description: Internal server error
 */
router.get('/:userId/data', userCheckMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const userData = await userController.getUserData(userId as string);
    res.status(HTTP.OK).json(userData);
  } catch (error) {
    next(error);
  }
});

export default router;
