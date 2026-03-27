import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import { userController } from '@controllers/userController';
import mongoose from 'mongoose';
import { User } from '@models';
import { mailServicePromise } from '@services/mailService';
import { authMiddleware, adminCheckMiddleware } from '@middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '@lib/redisClient';
import { RESET_EXPIRY_MINUTES } from '@utils/constants';

const router = express.Router();

// ==========================
// USER ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const INVALID_ID_FORMAT = 'Invalid user id format';
const DOES_NOT_EXIST = 'does not exist';

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
router.post('/', async (req: Request, res: Response) => {
  try {
    const userData = req.body;

    if (!userData.email || !userData.fullname || !userData.type) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'Email, fullname, and type are required',
      });
      return;
    }

    const user = await userController.createUser(userData);
    res.status(HTTP.CREATED).json(user);
  } catch (error) {
    console.error('Error in POST /users', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(HTTP.CONFLICT).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: INVALID_ID_FORMAT,
      });
    }

    const user = await userController.getUserById(id as string);
    res.status(HTTP.OK).json(user);
  } catch (error) {
    console.error('Error in GET /users/:id', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
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
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await userController.getAllUsers();
    res.status(HTTP.OK).json(users);
  } catch (error) {
    console.error('Error in GET /users', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
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
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

     if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: INVALID_ID_FORMAT,
      });
    }

    const user = await userController.updateUser(id as string, updates);
    res.status(HTTP.OK).json(user);
  } catch (error) {
    console.error('Error in PUT /users/:id', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
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
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: INVALID_ID_FORMAT,
      });
    }

    const message = await userController.deleteUser(id as string);
    res.status(HTTP.OK).json(message);
  } catch (error) {
    console.error('Error in DELETE /users/:id', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
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
router.get('/:id/data', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: INVALID_ID_FORMAT,
      });
    }

    const userData = await userController.getUserData(id as string);
    res.status(HTTP.OK).json(userData);
  } catch (error) {
    console.error('Error in GET /users/:id/data', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * POST /users/invite-admin - Invite a new admin by email
 * Creates an admin account with no usable password and sends a setup link.
 */
router.post('/invite-admin', authMiddleware, adminCheckMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      res.status(HTTP.BAD_REQUEST).json({ error: 'Email and name are required' });
      return;
    }

    // Check if email is already in use
    const existing = await User.exists({ email }).exec();
    if (existing) {
      res.status(HTTP.CONFLICT).json({ error: 'A user with this email already exists' });
      return;
    }

    // Create the admin user without a usable password (they will set it via the invite link)
    await User.create({ email, fullname: name, type: 'admin', password: null });

    // Generate a password-setup token using the same reset flow
    const token = uuidv4();
    const expireSeconds = RESET_EXPIRY_MINUTES * 60;
    await redisClient.set(`reset:${token}`, email, { EX: expireSeconds });

    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT || '';
    const setupLink = `${frontendUrl.replace(/\/$/, '')}/reset-password/${token}`;

    const mailService = await mailServicePromise;
    await mailService.sendAdminInvitation(email, name, setupLink);

    res.status(HTTP.CREATED).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    console.error('Error in POST /users/invite-admin', error);
    res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

export default router;
