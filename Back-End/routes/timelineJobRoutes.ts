// routes/result.ts
import express from "express";
import { getTimelineByJobId} from "../controllers/timelineJobController";

const router = express.Router();

router.post("/:jobId", getTimelineByJobId);

export default router;
