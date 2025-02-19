import Database from "@controllers/DBController/DBController";
import { randomUUID } from "crypto";

export default async function submitFeedback(message: string, user_id?: string) {
    const conn = await Database.getConnection();

    if (conn) {
        try {
            const id = randomUUID();
            const submitted_at = new Date().toISOString();

            await conn.request()
                .input("id", Database.msSQL.VarChar, id)
                .input("message", Database.msSQL.VarChar, message)
                .input("user_id", Database.msSQL.VarChar, user_id || null)
                .input("submitted_at", Database.msSQL.DateTime2, submitted_at)
                .query("INSERT INTO Feedback (id, message, user_id, submitted_at) VALUES (@id, @message, @user_id, @submitted_at)");

            return { id, message, user_id, submitted_at };
        } catch (error) {
            throw error;
        } finally {
            conn.close();
        }
    }
}
