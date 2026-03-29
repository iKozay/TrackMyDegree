import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import {getCourseSchedule} from '@utils/pythonUtilsApi';
import { BadRequestError } from '@utils/errors';

const router = express.Router();

router.get('/schedule', async (req: Request, res: Response) => {
  const { subject, catalog } = req.query as {
    subject: string;
    catalog: string;
  };

    // Validate input
    if (
      !subject ||
      !catalog ||
      typeof subject !== 'string' ||
      typeof catalog !== 'string'
    ) {
      throw new BadRequestError('Invalid input. Provide subject and course codes.');
    }

    // Call external API through proxy
    const response = await getCourseSchedule(subject, catalog);

    res.status(HTTP.OK).json(response);
});

export default router;
