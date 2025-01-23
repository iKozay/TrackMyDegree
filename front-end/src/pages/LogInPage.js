// src/pages/SignInPage.js
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "bootstrap/dist/css/bootstrap.min.css";
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

function LogInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [error, setError] = useState(null); // To handle error messages
  const [loading, setLoading] = useState(false); // To handle loading state

  const handleLogin = async (e) => {
    e.preventDefault();

    // Reset error state
    setError(null);

    // Basic validation checks
    if (email.trim() === "" || password.trim() === "") {
      setError("Both email and password are required.");
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
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        // Extract error message from response
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to log in.");
      }

      const data = await response.json();

      // Assuming the API returns an authentication token and user data
      // You might want to store the token in context or localStorage here
      login(data); // Pass the received data to the login function
      navigate("/user"); // Redirect to the user page
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <>
      {/* <Navbar /> Include Navbar if needed */}
      <div className="LogInPage">
        <div className="container my-5 sign-in-container">
          <h2 className="text-center mb-4">Log In</h2>
          <form onSubmit={handleLogin}>
            {/* Email Field */}
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input 
                type="email" 
                className="form-control" 
                id="email" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Field */}
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input 
                type="password" 
                className="form-control" 
                id="password" 
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Display Error Message */}
            {error && (
              <Alert variant="danger">
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <div className="d-grid gap-2">
              <Button 
                className="button-outline" 
                variant="primary" 
                type="submit" 
                disabled={loading}
              >
                {loading ? "Logging in..." : "Submit"}
              </Button>
            </div>
          </form>

          {/* Link to Sign Up */}
          <div className="text-center mt-3">
            <a href="/signup">Don't have an account? Register here!</a>
          </div>
        </div>
      </div>
      {/* <Footer /> Include Footer if needed */}
    </>
  );
}

export default LogInPage;
