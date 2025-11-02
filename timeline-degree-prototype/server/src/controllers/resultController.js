import { Job } from "../models/jobModel.js";
import { getJobResult } from "../lib/cache.js";

export const getResultById = async (req, res) => {
    try {
        const { id } = req.params;
        // get job id from db 
        console.log(id);
        const job = await Job.findOne({ jobId: id });

        if (!job) return res.status(404).json({ message: "Job not found" });

        // get result from cache
        const result = await getJobResult(id);

        if (!result) return res.status(410).json({ error: "result expired" });
        res.json({ id, status: "done", result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching result" });
    }
};
