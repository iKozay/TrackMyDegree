import { Feedback } from "models";

/**
 * Submits feedback to the database.
 * Feedback can optionally be tied to a specific user.
 * 
 * @param {string} message - The feedback message provided by the user.
 * @param {string} [user_id] - The optional user ID associated with the feedback. If not provided, it's set to null.
 * @returns {Promise<{ id: string; message: string; user_id: string; submitted_at: string }>} - An object containing the feedback details: id, message, user_id, and timestamp when it was submitted.
 *
 * @throws {Error} - Throws an error if there's any issue while interacting with the database.
 */
export default async function submitFeedback(
  message: string,
  user_id: string,
) {

    const feedback = await Feedback.create({
        message,
        user_id
    });

    return {
        id: feedback.id,
        message: feedback.message,
        user_id: feedback.user_id,
        submitted_at: feedback.submitted_at,
    };
}