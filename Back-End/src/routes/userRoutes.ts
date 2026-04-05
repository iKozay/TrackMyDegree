import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import { userController } from '@controllers/userController';
import { authController } from '@controllers/authController';
import { authMiddleware, userCheckMiddleware } from '@middleware/authMiddleware';
import mongoose from 'mongoose';

const router = express.Router();

// ==========================
// USER ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const INVALID_ID_FORMAT = 'Invalid user id format';
const DOES_NOT_EXIST = 'does not exist';

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
router.get('/:userId', userCheckMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: INVALID_ID_FORMAT,
      });
    }

    const user = await userController.getUserById(userId as string);
    res.status(HTTP.OK).json(user);
  } catch (error) {
    console.error('Error in GET /users/:userId', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
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
): Promise<string | null> {
  if (!currentPassword) {
    return 'currentPassword is required to set a new password';
  }
  if (newPassword.length < 6) {
    return 'newPassword must be at least 6 characters';
  }

  const changed = await authController.changePassword(userId, currentPassword, newPassword);
  if (!changed) {
    return 'Current password is incorrect';
  }

  return null;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
router.patch('/:userId', userCheckMiddleware, async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    const { fullname, currentPassword, newPassword } = req.body;

    if (fullname !== undefined && typeof fullname !== 'string') {
      return res
        .status(HTTP.BAD_REQUEST)
        .json({ error: 'fullname must be a string' });
    }
    if (currentPassword !== undefined && typeof currentPassword !== 'string') {
      return res
        .status(HTTP.BAD_REQUEST)
        .json({ error: 'currentPassword must be a string' });
    }
    if (newPassword !== undefined && typeof newPassword !== 'string') {
      return res
        .status(HTTP.BAD_REQUEST)
        .json({ error: 'newPassword must be a string' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(HTTP.BAD_REQUEST).json({ error: INVALID_ID_FORMAT });
    }

    if (!fullname && !newPassword) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: 'Provide at least one field to update: fullname or newPassword',
      });
    }

    // Name update
    if (fullname) {
      if (!fullname.trim()) {
        return res.status(HTTP.BAD_REQUEST).json({ error: 'fullname cannot be empty' });
      }
      await userController.updateUser(userId, { fullname: fullname.trim() });
    }

    // Password update
    if (newPassword) {
      const passwordError = await handlePasswordUpdate(userId, currentPassword, newPassword);
      if (passwordError) {
        const statusCode = passwordError.includes('required') || passwordError.includes('6 characters')
          ? HTTP.BAD_REQUEST
          : HTTP.UNAUTHORIZED;
        return res.status(statusCode).json({ error: passwordError });
      }
    }

    res.status(HTTP.OK).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error in PATCH /users/:userId', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

router.put('/:userId', userCheckMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    if (
      typeof updates !== 'object' ||
      Array.isArray(updates) ||
      updates === null
    ) {
      return res
        .status(HTTP.BAD_REQUEST)
        .json({ error: 'Invalid request body' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: INVALID_ID_FORMAT,
      });
    }

    const user = await userController.updateUser(userId as string, updates);
    res.status(HTTP.OK).json(user);
  } catch (error) {
    console.error('Error in PUT /users/:userId', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
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
router.get('/:userId/data', userCheckMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId as string)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: INVALID_ID_FORMAT,
      });
    }

    const userData = await userController.getUserData(userId as string);
    res.status(HTTP.OK).json(userData);
  } catch (error) {
    console.error('Error in GET /users/:userId/data', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

export default router;
