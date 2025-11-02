import express from "express";
import { getResultById } from "../controllers/resultController.js";
const router = express.Router();

router.get("/:id", getResultById);

export default router;
