import Database from "@controllers/DBController/DBController";
import { randomUUID } from "crypto";
import * as Sentry from "@sentry/react";

/**
 * Submits feedback to the database.
 *
 * @param {string} message - The feedback message provided by the user.
 * @param {string} [user_id] - The optional user ID associated with the feedback. If not provided, it's set to null.
 * @returns {Promise<{ id: string; message: string; user_id: string | null; submitted_at: string }>} - An object containing the feedback details: id, message, user_id, and timestamp when it was submitted.
 *
 * @throws {Error} - Throws an error if there's any issue while interacting with the database.
 */
export default async function submitFeedback(
	message: string,
	user_id?: string
) {
	const conn = await Database.getConnection();

	if (conn) {
		try {
			const id = randomUUID();
			const submitted_at = new Date().toISOString();

			await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.input("message", Database.msSQL.VarChar, message)
				.input("user_id", Database.msSQL.VarChar, user_id || null)
				.input("submitted_at", Database.msSQL.DateTime2, submitted_at)
				.query(
					"INSERT INTO Feedback (id, message, user_id, submitted_at) VALUES (@id, @message, @user_id, @submitted_at)"
				);

			return { id, message, user_id, submitted_at };
		} catch (error) {
			Sentry.captureException(error);
			throw error;
		} finally {
			conn.close();
		}
	}
}
