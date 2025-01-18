import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import createError from "http-errors";
import Database from "@controllers/DBController/DBController";
import HTTP from "@Util/HTTPCodes";
//Routes import
import authRouter from "@routes/auth";
import coursesRouter from "@routes/courses";
import degreeRouter from "@routes/degree";
import timelineRouter from "@routes/timeline";
import userDataRouter from "@routes/userData"


//Dev Consts
const HOPPSCOTCH = "chrome-extension://amknoiejhlmhancpahfcfcfhllgkpbld";

//Express Init
dotenv.config(); //Load environment variables from .env file
const app = express();
const PORT = process.env.PORT || 8000;
const CLIENT = process.env.CLIENT || "http://localhost:3000";

// needs to be first
app.use((req, res, next) => {

	res.header('Access-Control-Allow-Origin', ['http://localhost:3000', HOPPSCOTCH]);
	res.header('Access-Control-Allow-Credentials', 'true');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

	// Handle preflight
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
		return;
	}
	next();
});


// app.use(cors({ origin: [HOPPSCOTCH, CLIENT, "*"] }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());


//Routes
app.use("/auth", authRouter);
app.use("/courses", coursesRouter);
app.use("/degree", degreeRouter);
app.use("/timeline", timelineRouter);
app.use("/data", userDataRouter);

/**
 * DB test route
 * TO BE REMOVED
 */
app.get("/test-db", async (req, res) => {
	try {
		const pool = await Database.getConnection();
		if (pool) {
			const result = await pool.request().query("SELECT 1 AS number");
			res.status(HTTP.OK).send({
				message: "Database connected successfully!",
				result: result.recordset,
			});
		} else {
			throw new Error("Connection error in test-db");
		}
	} catch (error) {
		res
			.status(HTTP.SERVER_ERR)
			.send({ message: "Database connection failed", error });
	}
});

//Handle 404
app.use((req: Request, res: Response, next: NextFunction) => {
	next(createError(HTTP.NOT_FOUND, "Page not found!!!"));
});

//Listen for requests
app.listen(PORT, () => {
	console.log(`Server listening on Port: ${PORT}`);
});
