import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import createError from "http-errors";
import Database from "@controllers/DBController/DBController";
import HTTP from "@Util/HTTPCodes";
import rateLimit from "express-rate-limit";
import * as Sentry from "@sentry/react";

//Routes import
import authRouter from "@routes/auth";
import coursesRouter from "@routes/courses";
import exemptionRouter from "@routes/exemption";
import deficiencyRouter from "@routes/deficiency";
import degreeRouter from "@routes/degree";
import timelineRouter from "@routes/timeline";
import coursepoolRouter from "@routes/coursepool";
import userDataRouter from "@routes/userData";
import Admin from "@routes/adminRoutes";
import requisiteRouter from "@routes/requisite";
import feedbackRouter from "@routes/feedback";

// Sentry Backend INIT
Sentry.init({
	dsn: process.env.REACT_APP_SENTRY_DSN,
	integrations: [Sentry.browserTracingIntegration()],
	tracesSampleRate: 1.0,
});

//Dev Consts
const HOPPSCOTCH = "chrome-extension://amknoiejhlmhancpahfcfcfhllgkpbld";

//Express Init
dotenv.config(); //Load environment variables from .env file
const app = express();
const PORT = process.env.PORT || 8000;
const CLIENT = process.env.CLIENT || "http://localhost:3000";

const corsOptions: cors.CorsOptions = {
	origin: (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void
	) => {
		const allowedOrigins = [
			"http://localhost:3000",
			"http://167.71.165.174:3000",
			"http://159.65.216.141:3000",
			"chrome-extension://amknoiejhlmhancpahfcfcfhllgkpbld",
			"https://hoppscotch.io",
		];

		// Allow requests with no origin (like Postman or server-to-server calls)
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true); // Allow
		} else {
			callback(new Error("Not allowed by CORS")); // Deny
		}
	},
	credentials: true, // Allow cookies to be sent
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: [
		"Origin",
		"X-Requested-With",
		"Content-Type",
		"Accept",
		"Authorization",
	],
};

// Apply the CORS middleware
app.use(cors(corsOptions));

// Preflight handling for all routes
app.options("*", cors(corsOptions));

// app.use(cors({ origin: [HOPPSCOTCH, CLIENT, "*"] }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Rate limiter for "Forgot Password"
const forgotPasswordLimiter = rateLimit({
	windowMs: 2 * 60 * 1000, // window should be as large as OTP expiry time
	max: 5, // Limit each IP to 5 requests every 2 minutes
	message: { error: "Too many password reset attempts. Try again later." },
	standardHeaders: true, // Send rate limit info in headers
	legacyHeaders: false, // Disable X-RateLimit legacy headers
});

// Rate limiter for "Reset Password"
const resetPasswordLimiter = rateLimit({
	windowMs: 2 * 60 * 1000,
	max: 3, // Limit each IP to 3 reset attempts per window
	message: { error: "Too many reset attempts. Try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Rate limiter for Login
const loginLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 min window
	max: 5, // Attempt to login in 5 times a minute
	message: { error: "Too many password reset attempts. Try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Rate limiter for signup
const signupLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 5,
	message: { error: "Too many password reset attempts. Try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Apply rate limiters of forgot-password and reset-password routes
app.use("/auth/forgot-password", forgotPasswordLimiter);
app.use("/auth/reset-password", resetPasswordLimiter);
app.use("/auth/login", loginLimiter);
app.use("/auth/signup", signupLimiter);

//Routes
app.use("/auth", authRouter);
app.use("/courses", coursesRouter);
app.use("/degree", degreeRouter);
app.use("/exemption", exemptionRouter);
app.use("/deficiency", deficiencyRouter);
app.use("/timeline", timelineRouter);
app.use("/coursepool", coursepoolRouter);
//app.use("/appUser", AppUser);
app.use("/data", userDataRouter);
app.use("/admin", Admin);
app.use("/requisite", requisiteRouter);
app.use("/feedback", feedbackRouter);

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
