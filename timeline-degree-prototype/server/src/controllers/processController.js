import { v4 as uuidv4 } from "uuid";
import { Job } from "../models/jobModel.js";
import { queue } from "../workers/queue.js";

export const createProcessingJob = async (req, res) => {
    try {
        const jobId = uuidv4();

        // create db entry
        await Job.create({ jobId, status: "processing" });

        // push to queue for async processing
        await queue.add("processData", { jobId });

        res.json({ jobId, status: "processing", message: "Job accepted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating job" });
    }
};
