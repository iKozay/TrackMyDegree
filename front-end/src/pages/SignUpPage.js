import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../middleware/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/SignUpPage.css';
import Button from 'react-bootstrap/Button';
import { motion } from 'framer-motion';
import { SignUpError } from '../middleware/SentryErrors';

//Similar to the login page. It's just a form that sends the data to the server to be treated there. Redirects to UserPage.js on success
function SignUpPage() {
  const [fullname, setfullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const userType = 'student'; // Hardcoded to 'student'
  const { login, isLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState(null); // To handle error messages
  //const [loading, setLoading] = useState(false); // To handle loading state

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/user');
    }
  });

  const handleSignUp = async (e) => {
    e.preventDefault();

    // Reset error state
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Basic validation checks
    if (fullname === '' || email === '' || password === '' || confirmPassword === '') {
      setError('All fields are required.');
      return;
    }

    // Simple email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Additional password strength validation (optional)
    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    //setLoading(true); // Start loading

    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER}/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullname,
          email,
          password,
          type: userType,
        }),
      });

      console.log(response);
      if (!response.ok) {
        // Extract error message from response
        const errorData = await response.json();
        throw new SignUpError(errorData.message || 'Failed to sign up.');
      }

      const data = await response.json();

      // Assuming the API returns some form of authentication token or user data
      // You might want to store the token in context or localStorage here
      login(data); // Pass the received data to the login function
      navigate('/user'); // Redirect to the user page
    } catch (err) {
      setError(err.message);
    } finally {
      //setLoading(false); // End loading
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <div className="SignUpPage">
        <div className="container my-5 sign-in-container">
          <h2 className="text-center mb-6" style={{ fontSize: '5vh' }}>
            Sign Up
          </h2>
          <form onSubmit={handleSignUp}>
            {/* Name Field */}
            <div className="mb-3">
              <label htmlFor="fullname" className="form-label">
                Full Name{' '}
              </label>
              <input
                type="fullname"
                className="form-control"
                id="fullname"
                placeholder="* Enter your full name"
                value={fullname}
                onChange={(e) => setfullname(e.target.value)}
              />
            </div>

            {/* Email Field*/}
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email Address{' '}
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                placeholder="* Enter your email"
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
                placeholder="* Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Confirm Password Field */}
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                placeholder="* Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {/* Cancel and Register Buttons */}
            <div className="d-flex justify-content-between align-items-center mt-3">
              <Button className="btn-secondary" type="button" onClick={() => navigate('/signin')}>
                Cancel
              </Button>
              <Button className="btn-danger" type="submit">
                Register
              </Button>
            </div>
          </form>

          {/* Link to Sign In */}
          <div className="text-center mt-4">
            <a href="/signin">Already have an account? Log in here!</a>
            {/* Display Error Message */}
            <br />
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default SignUpPage;
