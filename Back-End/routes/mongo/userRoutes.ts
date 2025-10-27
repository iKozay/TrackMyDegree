/**
 * User Routes
 * 
 * Handles user CRUD operations, deficiencies, and exemptions
 */

import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { userController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// USER ROUTES (CRUD)
// ==========================

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
    res.status(HTTP.CREATED).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    console.error('Error in POST /users', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(HTTP.CONFLICT).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
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
        error: 'User ID is required',
      });
      return;
    }

    const user = await userController.getUserById(id);
    res.status(HTTP.OK).json({
      message: 'User retrieved successfully',
      user,
    });
  } catch (error) {
    console.error('Error in GET /users/:id', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  }
});

/**
 * GET /users - Get all users
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await userController.getAllUsers();
    res.status(HTTP.OK).json({
      message: 'Users retrieved successfully',
      users,
    });
  } catch (error) {
    console.error('Error in GET /users', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
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
        error: 'User ID is required',
      });
      return;
    }

    const user = await userController.updateUser(id, updates);
    res.status(HTTP.OK).json({
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    console.error('Error in PUT /users/:id', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
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
        error: 'User ID is required',
      });
      return;
    }

    const message = await userController.deleteUser(id);
    res.status(HTTP.OK).json({
      message,
    });
  } catch (error) {
    console.error('Error in DELETE /users/:id', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
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
        error: 'User ID is required',
      });
      return;
    }

    const userData = await userController.getUserData(id);
    res.status(HTTP.OK).json({
      message: 'User data retrieved successfully',
      ...userData,
    });
  } catch (error) {
    console.error('Error in GET /users/:id/data', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      res.status(HTTP.NOT_FOUND).json({ error: error.message });
    } else {
      res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
    }
  }
});

// ==========================
// DEFICIENCY ROUTES
// ==========================

/**
 * POST /users/:userId/deficiencies - Create deficiency
 */
router.post(
  '/:userId/deficiencies',
  async (req: Request, res: Response) => {
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
      res.status(HTTP.CREATED).json({
        message: 'Deficiency created successfully',
        deficiency,
      });
    } catch (error) {
      console.error('Error in POST /users/:userId/deficiencies', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else if (
        error instanceof Error &&
        error.message.includes('already exists')
      ) {
        res.status(HTTP.CONFLICT).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

/**
 * GET /users/:userId/deficiencies - Get user deficiencies
 */
router.get(
  '/:userId/deficiencies',
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'User ID is required',
        });
        return;
      }

      const deficiencies =
        await userController.getAllDeficienciesByUser(userId);
      res.status(HTTP.OK).json({
        message: 'Deficiencies retrieved successfully',
        deficiencies,
      });
    } catch (error) {
      console.error('Error in GET /users/:userId/deficiencies', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

/**
 * PUT /users/:userId/deficiencies - Update deficiency
 */
router.put(
  '/:userId/deficiencies',
  async (req: Request, res: Response) => {
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
      res.status(HTTP.OK).json({
        message: 'Deficiency updated successfully',
        deficiency,
      });
    } catch (error) {
      console.error('Error in PUT /users/:userId/deficiencies', error);
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

/**
 * DELETE /users/:userId/deficiencies - Delete deficiency
 */
router.delete(
  '/:userId/deficiencies',
  async (req: Request, res: Response) => {
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
      res.status(HTTP.OK).json({
        message,
      });
    } catch (error) {
      console.error('Error in DELETE /users/:userId/deficiencies', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

// ==========================
// EXEMPTION ROUTES
// ==========================

/**
 * POST /users/:userId/exemptions - Create exemptions
 */
router.post(
  '/:userId/exemptions',
  async (req: Request, res: Response) => {
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
      res.status(HTTP.CREATED).json({
        message: 'Exemptions processed successfully',
        ...result,
      });
    } catch (error) {
      console.error('Error in POST /users/:userId/exemptions', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

/**
 * GET /users/:userId/exemptions - Get user exemptions
 */
router.get(
  '/:userId/exemptions',
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(HTTP.BAD_REQUEST).json({
          error: 'User ID is required',
        });
        return;
      }

      const exemptions = await userController.getAllExemptionsByUser(userId);
      res.status(HTTP.OK).json({
        message: 'Exemptions retrieved successfully',
        exemptions,
      });
    } catch (error) {
      console.error('Error in GET /users/:userId/exemptions', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

/**
 * DELETE /users/:userId/exemptions - Delete exemption
 */
router.delete(
  '/:userId/exemptions',
  async (req: Request, res: Response) => {
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
      res.status(HTTP.OK).json({
        message,
      });
    } catch (error) {
      console.error('Error in DELETE /users/:userId/exemptions', error);
      if (error instanceof Error && error.message.includes('does not exist')) {
        res.status(HTTP.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HTTP.SERVER_ERR).json({ error: 'Internal server error' });
      }
    }
  },
);

export default router;

