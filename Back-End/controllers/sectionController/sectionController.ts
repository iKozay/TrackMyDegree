import axios from "axios";
import * as Sentry from "@sentry/node";

const API_BASE = 'https://opendata.concordia.ca/API/v1/course/schedule/filter';

// courseController.ts
async function getCourseSchedule(subject: string, catalog: string) {
    try {
        const authHeader = 'Basic ' + Buffer.from(
            `${process.env.SCHEDULE_USER}:${process.env.SCHEDULE_PASS}`
        ).toString('base64');

        const response = await axios.get(
            `https://opendata.concordia.ca/API/v1/course/schedule/filter/*/${subject}/${catalog}`,
            {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                }
            }
        );
        return response;
    } catch (error) {
        Sentry.captureException(error);

        // Add detailed error logging
        if (axios.isAxiosError(error)) {
            console.error('External API Error:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            });
        }

        throw new Error(`Failed to fetch course schedule.`);
    }
}

// Namespace
const courseController = {
    getCourseSchedule
};

export default courseController;