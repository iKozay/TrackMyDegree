import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import processRoutes from "./routes/processRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/process", processRoutes);
app.use("/api", resultRoutes);

export default app;
