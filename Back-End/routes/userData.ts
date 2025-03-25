import express, { Request, Response } from 'express';
import getUserData from '@controllers/userDataController/userDataController';
import HTTP from '@Util/HTTPCodes';

const router = express.Router();

// Route to get user data by user ID
router.post('/userdata', async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }
    // Call the controller function to handle the request
    await getUserData(req, res);
  } catch (error) {
    console.error('Error in /userdata route', error);
    res.status(HTTP.SERVER_ERR).json({ error: 'An unexpected error occurred' });
  }
});

export default router;
