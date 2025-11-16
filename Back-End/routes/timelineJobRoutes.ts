
import express from "express";
import { getTimelineByJobId} from "../controllers/timelineJobController";

const router = express.Router();

router.get("/:jobId", getTimelineByJobId);

export default router;
