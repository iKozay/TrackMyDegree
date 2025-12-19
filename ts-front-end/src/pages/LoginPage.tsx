import React, { useEffect, useState } from "react";
import { motion } from 'framer-motion';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { validateLoginForm } from "../utils/authUtils";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // To handle error messages
  const { login, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    console.log("isAuthenticated:", isAuthenticated, "user:", user);
    if (isAuthenticated && user?.role === "student") {
      navigate("/profile/student", { replace: true });
    }else if (isAuthenticated && user?.role === "admin") {
      navigate("/profile/admin", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate the form inputs
    const validationErrors = validateLoginForm(email, password);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]); // Display first error
      return;
    }
    
    try {
      await login(email, password);
    } catch (err) {
      console.error("Login failed:", err);
      setError((err as Error).message);
    }
  };

  if (loading) return null; // or a spinner

  return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
        <>
          {/* <Navbar /> Include Navbar if needed */}
          <div className="LogInPage">
            <div className="container my-5 sign-in-container">
              <h2 className="text-center mb-7">Sign In</h2>
              <form onSubmit={handleLogin}>
                {/* Email Field */}
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email address
                  </label>
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
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
  
                {/* Submit Button */}
                <div className="d-grid gap-2">
                  <Button className="button-outline" variant="primary" type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Submit'}
                  </Button>
                </div>
              </form>
  
              {/* Link to Sign Up */}
              <div className="text-center mt-3">
                <a href="/signup">Don't have an account? Register here!</a>
                <br />
                <a href="/forgot-password">Forgot your password?</a>
                {/* Display Error Message */}
                {error && <Alert variant="danger">{error}</Alert>}
              </div>
            </div>
          </div>
          {/* <Footer /> Include Footer if needed */}
        </>
      </motion.div>
    );
};

export default LoginPage;
