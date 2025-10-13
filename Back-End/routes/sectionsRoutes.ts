import HTTP from "@Util/HTTPCodes";
import express, { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import sectionController from '@controllers/sectionController/sectionController'

const router = express.Router();

router.get('/schedule', async (req: Request, res: Response) => {
    const { subject, catalog } = req.query as {
        subject: string;
        catalog: string;
    };

    try {
        // Validate input
        if (!subject || !catalog || typeof subject !== 'string' || typeof catalog !== 'string') {
            res.status(HTTP.BAD_REQUEST).json({
                error: 'Invalid input. Provide subject and course codes.',
            });
            return;
        }

        // Call external API through proxy
        const response = await sectionController.getCourseSchedule(subject, catalog);

        res.status(HTTP.OK).json(response.data);
    } catch (error) {
        const errMsg = 'Error fetching course schedule';
        console.error(errMsg, error);
        Sentry.captureException(error);
        res.status(HTTP.SERVER_ERR).json({ error: errMsg });
    }
});

export default router;