import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { userController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// USER ROUTES (CRUD)
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';
const USER_ID_REQUIRED = 'User ID is required';
const DOES_NOT_EXIST = 'does not exist';

/**
 * POST /users - Create user
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
