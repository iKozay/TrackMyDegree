import Database from "@controllers/DBController/DBController";
import { randomUUID } from "crypto";
import Auth from "@controllers/authController/auth_types"; //types import
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const log = console.log;
var salt = bcrypt.genSaltSync(10);

//Functions
async function authenticate(
	email: string,
	password: string
): Promise<Auth.UserInfo | undefined> {
	const authConn = await Database.getConnection();

	if (authConn) {
		try {
			// Step 1: Query the database for the user by email only
			const result = await authConn
				.request()
				.input("email", Database.msSQL.VarChar, email)
				.query("SELECT * FROM AppUser WHERE email = @email");

			// Step 2: Check if user exists and if the password matches
			if (result.recordset && result.recordset.length > 0) {
				const user = result.recordset[0];

				// Compare the plain-text password with the stored hashed password
				const isPasswordValid = await bcrypt.compare(password, user.password);

				if (isPasswordValid) {
					return user; // Authentication successful
				} else {
					log("Incorrect email or password", email, password);
				}
			} else {
				log("User not found", email);
			}
		} catch (error) {
			log("Error in login\n", error);
		}
	}

	return undefined;
}

async function registerUser(
	userInfo: Auth.UserInfo
): Promise<{ id: string } | undefined> {
	const authConn = await Database.getConnection();

	if (undefined !== authConn) {
		const { email, password, fullname, type } = userInfo;
		const id = randomUUID();

		try {
			const result = await authConn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.input("email", Database.msSQL.VarChar, email)
				.input("password", Database.msSQL.VarChar, password)
				.input("fullname", Database.msSQL.VarChar, fullname)
				.input("type", Database.msSQL.VarChar, type)
				.query(
					"INSERT INTO AppUser ( id,  email,  password,  fullname,  type) \
              OUTPUT INSERTED.*                                         \
                          VALUES  (@id, @email, @password, @fullname, @type)"
				);

			if (undefined === result.recordset) {
				log("Error inserting record ", result.recordset);
			} else {
				return result.recordset[0];
			}
		} catch (error) {
			log("Error in Sign Up\n", error);
		}
	}
}

// Forgot Password
async function forgotPassword(
	email: string
): Promise<{ message: string } | undefined> {
	// Attempt to connect to the database
	const authConn = await Database.getConnection();

	if (!authConn) {
		log("Database connection failed.");
		return;
	}

	// Query DB for user email
	try {
		const result = await authConn
			.request()
			.input("email", Database.msSQL.VarChar, email)
			.query("SELECT * FROM AppUser WHERE email = @email");

		// Validation
		if (!result.recordset || result.recordset.length === 0) {
			log("User not found for email:", email);
			return;
		}

		// Generate OTP (one time pass)
		const otp = Math.floor(1000 + Math.random() * 9000);
		const otpExpire = new Date();
		otpExpire.setMinutes(otpExpire.getMinutes() + 10); // Set OTP expiry

		// Update user record with OTP and expiry
		await authConn
			.request()
			.input("otp", Database.msSQL.Int, otp)
			.input("otpExpire", Database.msSQL.DateTime, otpExpire)
			.input("email", Database.msSQL.VarChar, email)
			.query(
				"UPDATE AppUser SET otp = @otp, otpExpire = @otpExpire WHERE email = @email"
			);

		// Create email transporter object to send email
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_USER!,
				pass: process.env.EMAIL_PASSWORD!,
			},
		});

		// Configure mailing options
		const mailOptions = {
			from: process.env.EMAIL_USER!,
			to: email,
			subject: "Password Reset",
			text: `Your One Time Password (expires in 10 minutes): ${otp}`,
		};

		// Send email
		await transporter.sendMail(mailOptions);

		return { message: "OTP has been sent to your email." }; // Confirmation message
	} catch (error) {
		log("Error in forgot password:\n", error);
	}
}

// Reset Password
async function resetPassword(
	otp: number,
	password: string,
	confirmPassword: string
): Promise<{ message: string } | undefined> {
	// Make sure new password matches with confirmation
	if (password !== confirmPassword) {
		log("Passwords do not match.");
		return;
	}

	// Connect to the database
	const authConn = await Database.getConnection();
	if (!authConn) {
		log("Database connection failed.");
		return;
	}

	// Query the database for the OTP that matches the user's input
	// Is it safe to query for the OTP
	try {
		const result = await authConn
			.request()
			.input("otp", Database.msSQL.Int, otp)
			.query(
				"SELECT * FROM AppUser WHERE otp = @otp AND otpExpire > GETDATE()"
			);

		// Validate OTP
		if (!result.recordset || result.recordset.length === 0) {
			log("Invalid or expired OTP.");
			return;
		}

		// Hash the new password
		const hashedPassword = await bcrypt.hash(password, salt);

		// Update the user's password and clear the OTP
		await authConn
			.request()
			.input("password", Database.msSQL.VarChar, hashedPassword)
			.input("otp", Database.msSQL.Int, otp)
			.query(
				"UPDATE AppUser SET password = @password, otp = NULL, otpExpire = NULL WHERE otp = @otp"
			);

		return { message: "Password reset successful." };
	} catch (error) {
		log("Error in reset password:\n", error);
	}
}

//Namespace
const authController = {
	authenticate,
	registerUser,
	forgotPassword,
	resetPassword,
};

//Default export
export default authController;
