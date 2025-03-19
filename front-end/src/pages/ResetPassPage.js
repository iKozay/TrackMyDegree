import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import "../css/SignInPage.css";
import { motion } from "framer-motion";
import { ResetPassError } from "../middleware/SentryErrors";

function ResetPassPage() {
	const [otp, setOTP] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const navigate = useNavigate();

	const [error, setError] = useState(null); // To handle error messages
	const [loading, setLoading] = useState(false); // To handle loading state

	const handleResetPassword = async (e) => {
		e.preventDefault();

		// Reset error state
		setError(null);

		// Basic validation checks
		if (
			otp.trim() === "" ||
			password.trim() === "" ||
			confirmPassword.trim() === ""
		) {
			setError("All fields are required.");
			return;
		}

		if (otp.length !== 4) {
			setError("OTP must be 4 digits long.");
			return;
		}

		// Check if passwords match
		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setLoading(true); // Start loading

		try {
			const response = await fetch(
				`${process.env.REACT_APP_SERVER}/auth/reset-password`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						otp,
						password,
						confirmPassword,
					}),
				}
			);

			if (!response.ok) {
				// Extract error message from response
				const errorData = await response.json();
				throw new ResetPassError(
					errorData.message || "Error resetting password!"
				);
			}

			const data = await response.json();
			console.log(data);
			// API returns a success message and we can redirect to login page
			navigate("/signin");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false); // End loading
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.7 }}
		>
			<>
				{/* Same styling as LogInPage.css */}
				<div className="LogInPage">
					<div className="container my-5 sign-in-container">
						<h3 className="text-center mb-7">Reset Password</h3>
						<div className="position-relative">
							<form onSubmit={handleResetPassword}>
								{/* OTP Field */}
								<div className="mb-3">
									<label
										htmlFor="otp"
										className="form-label"
									>
										OTP Code:
									</label>
									<input
										type="text"
										className="form-control"
										id="otp"
										placeholder="* Enter your OTP"
										value={otp}
										onChange={(e) => {
											setOTP(e.target.value);
											setError(null);
										}}
									/>
								</div>

								{/* Password Field */}
								<div className="mb-3">
									<label
										htmlFor="password"
										className="form-label"
									>
										Password:
									</label>
									<input
										type="password"
										className="form-control"
										id="password"
										placeholder="* Enter your password"
										value={password}
										onChange={(e) => {
											setPassword(e.target.value);
											setError(null);
										}}
									/>
								</div>

								{/* Confirm Password Field */}
								<div className="mb-3">
									<label
										htmlFor="confirmPassword"
										className="form-label"
									>
										Confirm Password:
									</label>
									<input
										type="password"
										className="form-control"
										id="confirmPassword"
										placeholder="* Confirm your password"
										value={confirmPassword}
										onChange={(e) => {
											setConfirmPassword(e.target.value);
											setError(null);
										}}
									/>
								</div>

								{/* Submit Button */}
								<div className="d-grid gap-2">
									<Button
										className="button-outline"
										variant="primary"
										type="submit"
										disabled={loading}
									>
										{loading ? "Resetting Password..." : "Submit"}
									</Button>
								</div>
								{error && (
									<Alert
										variant="danger"
										style={{
											marginTop: "30px", // Adds spacing below the button
											width: "100%", // Matches button width
											textAlign: "center", // Centers text
										}}
									>
										{error}
									</Alert>
								)}
							</form>
						</div>
					</div>
				</div>
			</>
		</motion.div>
	);
}

export default ResetPassPage;
