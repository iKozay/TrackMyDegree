import express, { Request, Response } from "express";
import submitFeedback from "@controllers/feedbackController/feedbackController";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
    try {
        const { message, user_id } = req.body;

        if (!message || typeof message !== "string") {
            res.status(400).json({ error: "Feedback message is required." });
            return; // Exit the function after sending the response
        }

        const feedback = await submitFeedback(message, user_id);

        res.status(201).json({ message: "Feedback submitted successfully!", feedback });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;