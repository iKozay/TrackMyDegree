import HTTP from '@utils/httpCodes';
import express, { NextFunction, Request, Response } from 'express';
import { userController } from '@controllers/userController';
import { authController } from '@controllers/authController';
import mongoose from 'mongoose';
import { BadRequestError, INVALID_ID_FORMAT } from '@utils/errors';

const router = express.Router();

// ==========================
// USER ROUTES (CRUD)
// ==========================



/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: Mongo-backed user endpoints
 */

/**
 * POST /users - Create user
 */
/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *               fullname: { type: string }
 *               type: { type: string }
 *             required: [email, fullname, type]
 *     responses:
 *       201:
 *         description: User created successfully
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
 *         description: Missing required fields
 *       409:
 *         description: User already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userData = req.body;

    if (!userData.email || !userData.fullname || !userData.type) {
      throw new BadRequestError('Email, fullname, and type are required');
    }

    const user = await userController.createUser(userData);
    res.status(HTTP.CREATED).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/:id - Get user by ID
 */
/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const user = await userController.getUserById(id as string);
    res.status(HTTP.OK).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users - Get all users
 */
/**
 * @openapi
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userController.getAllUsers();
    res.status(HTTP.OK).json(users);
  } catch (error) {
      next(error);
  }
});

/**
 * PUT /users/:id - Update user
 */
/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
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
 * PATCH /users/:id - Partial update fullname, password
 */

async function handlePasswordUpdate(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!currentPassword) {
    throw new BadRequestError('currentPassword is required to set a new password');
  }
  if (newPassword.length < 6) {
    throw new BadRequestError('newPassword must be at least 6 characters');
  }

  await authController.changePassword(id, currentPassword, newPassword);

}

// eslint-disable-next-line sonarjs/cognitive-complexity
router.patch('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fullname, currentPassword, newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
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
      await userController.updateUser(id, { fullname: fullname.trim() });
    }

    // Password update
    if (newPassword) {
      await handlePasswordUpdate(id, currentPassword, newPassword);
    }

    res.status(HTTP.OK).json({ message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = req.body;

     if (!mongoose.Types.ObjectId.isValid(id as string)) {
        throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const user = await userController.updateUser(id as string, updates);
    res.status(HTTP.OK).json(user);
  } catch (error) {     
    next(error);
  }
});

/**
 * DELETE /users/:id - Delete user
 */
/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User does not exist
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const message = await userController.deleteUser(id as string);
    res.status(HTTP.OK).json(message);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/:id/data - Get comprehensive user data
 */
/**
 * @openapi
 * /users/{id}/data:
 *   get:
 *     summary: Get comprehensive user data
 *     description: Returns a compound payload for the user (e.g., profile, timelines, etc.).
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
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
router.get('/:id/data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      throw new BadRequestError(INVALID_ID_FORMAT);
    }

    const userData = await userController.getUserData(id as string);
    res.status(HTTP.OK).json(userData);
  } catch (error) {
    next(error);
  }
});

export default router;
