import { CorsOptions } from "cors";

const corsOptions: CorsOptions = {
	origin: (
		origin: string | undefined,
		callback: (err: Error | null, allow?: boolean) => void
	) => {
		const allowedOrigins = [
			"http://localhost:3000",
			"http://167.71.165.174:3000",
			"http://159.65.216.141:3000",
			"https://trackmydegree.com",
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
  exposedHeaders: ['set-cookie'],
	allowedHeaders: [
		"Origin",
		"X-Requested-With",
		"Content-Type",
		"Accept",
		"Authorization",
	],
};

export default corsOptions;
