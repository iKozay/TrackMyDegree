import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/SignInPage.css";

function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    if (email === "admin@gmail.com" && password === "admin") {
      login();
      navigate("/user");
    } else {
      setErrorMessage("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="SignInPage">
      <div className="container d-flex justify-content-center align-items-center">
        <h2 className="text-center mb-4 custom-header">Sign in</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="form-label">Email:</label>
            <input
              type="email"
              className="form-control custom-input"
              id="email"
              placeholder="Enter your email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="form-label">Password:</label>
            <input
              type="password"
              className="form-control custom-input"
              id="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
            />
          </div>

          {/* Show error message here */}
          {errorMessage && (
            <div className="alert alert-danger custom-alert" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="d-flex justify-content-between mb-3">
            <button
              type="button"
              className="btn btn-outline-secondary custom-cancel-btn"
              onClick={() => navigate("/")}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary custom-submit-btn">
              Submit
            </button>
          </div>
        </form>
        <div className="text-center">
          <a href="/signup" className="text-decoration-none">
            Don't have an account? Register here!
          </a>
        </div>
      </div>
    </div>
  );
}

export default SignInPage;