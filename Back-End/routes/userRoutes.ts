import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import { userController } from '@controllers';

const router = express.Router();

// ==========================
// USER ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const USER_ID_REQUIRED = 'User ID is required';
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

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: USER_ID_REQUIRED,
      });
      return;
    }

    const user = await userController.getUserById(id);
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

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: USER_ID_REQUIRED,
      });
      return;
    }

    const user = await userController.updateUser(id, updates);
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

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: USER_ID_REQUIRED,
      });
      return;
    }

    const message = await userController.deleteUser(id);
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
 *     description: Returns a compound payload for the user (e.g., profile, timelines, degrees, etc.).
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

    if (!id) {
      res.status(HTTP.BAD_REQUEST).json({
        error: USER_ID_REQUIRED,
      });
      return;
    }

    const userData = await userController.getUserData(id);
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

// ==========================
// DEFICIENCY ROUTES
// ==========================

const DEFICIENCIES_PATH = '/:userId/deficiencies';

/**
 * POST /users/:userId/deficiencies - Create deficiency
 */
/**
 * @openapi
 * /users/{userId}/deficiencies:
 *   post:
 *     summary: Create deficiency
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
 *             properties:
 *               coursepool: { type: string }
 *               creditsRequired: { type: number }
 *             required: [coursepool, creditsRequired]
 *     responses:
 *       201:
 *         description: Deficiency created successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: User does not exist
 *       409:
 *         description: Deficiency already exists
 *       500:
 *         description: Internal server error
 */
router.post(DEFICIENCIES_PATH, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { coursepool, creditsRequired } = req.body;

    if (!userId || !coursepool || typeof creditsRequired !== 'number') {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID, coursepool, and creditsRequired are required',
      });
      return;
    }

    const deficiency = await userController.createDeficiency(
      coursepool,
      userId,
      creditsRequired,
    );
    res.status(HTTP.CREATED).json(deficiency);
  } catch (error) {
    console.error('Error in POST /users/:userId/deficiencies', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else if (
      error instanceof Error &&
      error.message.includes('already exists')
    ) {
      res.status(HTTP.CONFLICT).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * GET /users/:userId/deficiencies - Get user deficiencies
 */
/**
 * @openapi
 * /users/{userId}/deficiencies:
 *   get:
 *     summary: Get user deficiencies
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deficiencies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 deficiencies:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User does not exist
 *       500:
 *         description: Internal server error
 */
router.get(DEFICIENCIES_PATH, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(HTTP.BAD_REQUEST).json({
        error: USER_ID_REQUIRED,
      });
      return;
    }

    const deficiencies = await userController.getAllDeficienciesByUser(userId);
    res.status(HTTP.OK).json(deficiencies);
  } catch (error) {
    console.error('Error in GET /users/:userId/deficiencies', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * PUT /users/:userId/deficiencies - Update deficiency
 */
/**
 * @openapi
 * /users/{userId}/deficiencies:
 *   put:
 *     summary: Update deficiency
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
 *             properties:
 *               coursepool: { type: string }
 *               creditsRequired: { type: number }
 *             required: [coursepool, creditsRequired]
 *     responses:
 *       200:
 *         description: Deficiency updated successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Deficiency not found
 *       500:
 *         description: Internal server error
 */
router.put(DEFICIENCIES_PATH, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { coursepool, creditsRequired } = req.body;

    if (!userId || !coursepool || typeof creditsRequired !== 'number') {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID, coursepool, and creditsRequired are required',
      });
      return;
    }

    const deficiency = await userController.updateDeficiency(
      coursepool,
      userId,
      creditsRequired,
    );
    res.status(HTTP.OK).json(deficiency);
  } catch (error) {
    console.error('Error in PUT /users/:userId/deficiencies', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * DELETE /users/:userId/deficiencies - Delete deficiency
 */
/**
 * @openapi
 * /users/{userId}/deficiencies:
 *   delete:
 *     summary: Delete deficiency
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
 *             properties:
 *               coursepool: { type: string }
 *             required: [coursepool]
 *     responses:
 *       200:
 *         description: Deleted
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: User/deficiency does not exist
 *       500:
 *         description: Internal server error
 */
router.delete(DEFICIENCIES_PATH, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { coursepool } = req.body;

    if (!userId || !coursepool) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID and coursepool are required',
      });
      return;
    }

    const message = await userController.deleteDeficiency(coursepool, userId);
    res.status(HTTP.OK).json(message);
  } catch (error) {
    console.error('Error in DELETE /users/:userId/deficiencies', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

// ==========================
// EXEMPTION ROUTES
// ==========================

const EXEMPTION_PATH = '/:userId/exemptions';

/**
 * POST /users/:userId/exemptions - Create exemptions
 */
/**
 * @openapi
 * /users/{userId}/exemptions:
 *   post:
 *     summary: Create exemptions
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
 *             properties:
 *               coursecodes:
 *                 type: array
 *                 items: { type: string }
 *             required: [coursecodes]
 *     responses:
 *       201:
 *         description: Exemptions processed successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: User does not exist
 *       500:
 *         description: Internal server error
 */
router.post(EXEMPTION_PATH, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { coursecodes } = req.body;

    if (!userId || !Array.isArray(coursecodes)) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID and coursecodes array are required',
      });
      return;
    }

    const result = await userController.createExemptions(coursecodes, userId);
    res.status(HTTP.CREATED).json(result);
  } catch (error) {
    console.error('Error in POST /users/:userId/exemptions', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * GET /users/:userId/exemptions - Get user exemptions
 */
/**
 * @openapi
 * /users/{userId}/exemptions:
 *   get:
 *     summary: Get user exemptions
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exemptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 exemptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       400:
 *         description: User ID is required
 *       404:
 *         description: User does not exist
 *       500:
 *         description: Internal server error
 */
router.get(EXEMPTION_PATH, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(HTTP.BAD_REQUEST).json({
        error: USER_ID_REQUIRED,
      });
      return;
    }

    const exemptions = await userController.getAllExemptionsByUser(userId);
    res.status(HTTP.OK).json(exemptions);
  } catch (error) {
    console.error('Error in GET /users/:userId/exemptions', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

/**
 * DELETE /users/:userId/exemptions - Delete exemption
 */
/**
 * @openapi
 * /users/{userId}/exemptions:
 *   delete:
 *     summary: Delete exemption
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
 *             properties:
 *               coursecode: { type: string }
 *             required: [coursecode]
 *     responses:
 *       200:
 *         description: Deleted
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: User/exemption does not exist
 *       500:
 *         description: Internal server error
 */
router.delete(EXEMPTION_PATH, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { coursecode } = req.body;

    if (!userId || !coursecode) {
      res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID and coursecode are required',
      });
      return;
    }

    const message = await userController.deleteExemption(coursecode, userId);
    res.status(HTTP.OK).json(message);
  } catch (error) {
    console.error('Error in DELETE /users/:userId/exemptions', error);
    if (error instanceof Error && error.message.includes(DOES_NOT_EXIST)) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
  }
});

export default router;
