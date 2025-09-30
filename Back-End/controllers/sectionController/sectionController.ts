// Controller responsible for fetching course schedules from Concordia's Open Data API


import axios from "axios";
import * as Sentry from "@sentry/node";

const API_BASE = 'https://opendata.concordia.ca/API/v1/course/schedule/filter';

// courseController.ts
// Fetch the schedule of a specific course (based on subject + catalog number) from Concordia's API
async function getCourseSchedule(subject: string, catalog: string) {
    try {
        // Build the authentication header using credentials stored in environment variables
        // The API requires Basic Auth, so we encode username:password as base64
        const authHeader = 'Basic ' + Buffer.from(
            `${process.env.SCHEDULE_USER}:${process.env.SCHEDULE_PASS}`
        ).toString('base64');

        // Send GET request to Concordia's schedule API with subject + catalog
        // Example: subject = COMP, catalog = 674 → fetch COMP 674 schedule
        const response = await axios.get(
            `https://opendata.concordia.ca/API/v1/course/schedule/filter/*/${subject}/${catalog}`,
            {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                }
            }
        );

        // Return the raw API response so it can be used by the caller
        return response;
    } catch (error) {
        // Log the error to Sentry for monitoring/alerting
        Sentry.captureException(error);

        // Add detailed error logging
        if (axios.isAxiosError(error)) {
            // If it's an Axios-specific error, log extra details about the failed request
            console.error('External API Error:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            });
        }

        // Rethrow a simplified error so the caller knows the schedule fetch failed
        throw new Error(`Failed to fetch course schedule.`);
    }
}

// Group the controller methods under one object for exporting
const courseController = {
    getCourseSchedule
};

export default courseController;