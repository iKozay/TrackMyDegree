/**
 * Purpose:
 *  - Controller module for the Feedback table.
 *  - Provides a function to submit feedback from users.
 * Notes:
 *  - Stores optional user_id if provided.
 *  - Errors are logged to Sentry and then rethrown.
 *  - Generates unique ID and timestamp for each feedback.
 */


import Database from '@controllers/DBController/DBController';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';

/**
 * Submits feedback to the database.
 * Feedback can optionally be tied to a specific user.
 * 
 * @param {string} message - The feedback message provided by the user.
 * @param {string} [user_id] - The optional user ID associated with the feedback. If not provided, it's set to null.
 * @returns {Promise<{ id: string; message: string; user_id: string | null; submitted_at: string }>} - An object containing the feedback details: id, message, user_id, and timestamp when it was submitted.
 *
 * @throws {Error} - Throws an error if there's any issue while interacting with the database.
 */
export default async function submitFeedback(
  message: string,
  user_id?: string,
) {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Step 1: Generate a unique ID for this feedback entry.
      const id = randomUUID();

      // Step 2: Record the exact submission timestamp in ISO format.
      const submitted_at = new Date().toISOString();

      // Step 3: Insert the feedback into the database. 
      // If user_id is not provided, we store it as NULL.
      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .input('message', Database.msSQL.VarChar, message)
        .input('user_id', Database.msSQL.VarChar, user_id || null)
        .input('submitted_at', Database.msSQL.DateTime2, submitted_at)
        .query(
          'INSERT INTO Feedback (id, message, user_id, submitted_at) VALUES (@id, @message, @user_id, @submitted_at)',
        );

      // Step 4: Return the full feedback object so the caller knows what was stored.
      return { id, message, user_id, submitted_at };
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}
