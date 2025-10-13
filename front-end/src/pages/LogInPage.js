// src/pages/SignInPage.js
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../middleware/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import '../css/SignInPage.css';
import { motion } from 'framer-motion';
import { LoginError } from '../middleware/SentryErrors';
const REACT_APP_SERVER = process.env.REACT_APP_SERVER||'http://localhost:8000';
//This is the login page with a standard form that is sent to the server for validation. Redirects to UserPage.js upon success
function LogInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();

  const [error, setError] = useState(null); // To handle error messages
  const [loading, setLoading] = useState(false); // To handle loading state

  useEffect(() => {
    if(isLoggedIn) {
      navigate("/user");
    }
  },[isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Reset error state
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Basic validation checks
    if (email.trim() === '' || password.trim() === '') {
      setError('Both email and password are required.');
      return;
    }

    // Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true); // Start loading

    try {
      const response = await fetch(
        `${REACT_APP_SERVER}/auth/login`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      if (!response.ok) {
        // Extract error message from response
        const errorData = await response.json();
        throw new LoginError(errorData.message || 'Failed to log in.');
      }

      const data = await response.json();

      // Assuming the API returns an authentication token and user data
      login(data); // Pass the received data to the login function
      navigate('/user'); // Redirect to the user page
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
                <Button
                  className="button-outline"
                  variant="primary"
                  type="submit"
                  disabled={loading}
                >
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
}

export default LogInPage;
