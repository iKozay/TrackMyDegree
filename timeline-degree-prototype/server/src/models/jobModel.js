import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    jobId: { type: String, required: true, unique: true },
    status: { type: String, enum: ["processing", "done", "failed"], default: "processing" },
    result: { type: Object, default: null },
    createdAt: { type: Date, default: Date.now },
});

export const Job = mongoose.model("Job", jobSchema);
