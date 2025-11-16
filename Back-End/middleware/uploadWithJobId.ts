// middleware/uploadWithJobId.ts
import multer from "multer";
import fs from "fs";
import path from "path";
import type { RequestWithJobId } from "./assignJobId";

const uploadDir = "./tmp/pdf-uploads";

// make sure the folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (
    req: RequestWithJobId,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    // use the jobId created by assignJobId
    const jobId = req.jobId;
    const ext = path.extname(file.originalname) || ".pdf";
    const filename = `${jobId}${ext}`; // e.g. <uuid>.pdf
    cb(null, filename);
  },
});

export const uploadWithJobId = multer({ storage });
