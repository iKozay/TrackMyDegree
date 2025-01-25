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
import exemptionRouter from "@routes/exemption"
import deficiencyRouter from "@routes/deficiency"
import degreeRouter from "@routes/degree";
import timelineRouter from "@routes/timeline";
import AppUser from "@routes/appUser";
import userDataRouter from "@routes/userData";
import Admin from "@routes/adminRoutes";
import requisiteRouter from "@routes/requisite"


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
      "chrome-extension://amknoiejhlmhancpahfcfcfhllgkpbld",
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

//Routes
app.use("/auth", authRouter);
app.use("/courses", coursesRouter);
app.use("/degree", degreeRouter);
app.use("/exemption", exemptionRouter);
app.use("/deficiency", deficiencyRouter);
app.use("/timeline", timelineRouter);
//app.use("/appUser", AppUser);
app.use("/data", userDataRouter);
app.use("/admin", Admin);
app.use("/requisite", requisiteRouter);

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

