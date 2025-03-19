import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import "../css/SignInPage.css";
import { motion } from "framer-motion";

function ForgotPassPage() {
	const [email, setEmail] = useState("");
	const navigate = useNavigate();

	const [error, setError] = useState(null); // To handle error messages
	const [loading, setLoading] = useState(false); // To handle loading state

	const handleForgotPassword = async (e) => {
		e.preventDefault();

		// Reset error state
		setError(null);

		// Basic validation checks
		if (email.trim() === "") {
			setError("Email is required.");
			return;
		}

		// Simple email format validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			setError("Please enter a valid email address.");
			return;
		}

		setLoading(true); // Start loading

		try {
			const response = await fetch(
				`${process.env.REACT_APP_SERVER}/auth/forgot-password`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						email,
					}),
				}
			);

			if (!response.ok) {
				// Extract error message from response
				const errorData = await response.json();
				throw new Error(errorData.message || "Email does not exist.");
			}

			const data = await response.json();
			console.log(data);
			// API returns a success message and we can redirect to reset pass page
			navigate("/reset-pass");
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
						<h3 className="text-center mb-7">Forgot Your Password?</h3>
						<form onSubmit={handleForgotPassword}>
							{/* Email Field */}
							<div className="mb-3">
								<label
									htmlFor="email"
									className="form-label"
								></label>
								<input
									type="email"
									className="form-control"
									id="email"
									placeholder="Enter your email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
								/>
							</div>

							{/* Display Error Message */}
							{error && <Alert variant="danger">{error}</Alert>}

							{/* Submit Button */}
							<div className="d-grid gap-2">
								<Button
									className="button-outline"
									variant="primary"
									type="submit"
									disabled={loading}
								>
									{loading ? "Sending email..." : "Submit"}
								</Button>
							</div>
						</form>
					</div>
				</div>
			</>
		</motion.div>
	);
}

export default ForgotPassPage;
