import express from "express";
import { createProcessingJob } from "../controllers/processController.js";
const router = express.Router();

router.post("/", createProcessingJob);

export default router;
