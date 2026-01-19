import React, { useState } from "react";
import { motion } from 'framer-motion';
import Button from 'react-bootstrap/Button';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { validateSignupForm } from "../utils/authUtils";

const SignupPage: React.FC = () => {
  const [fullname, setfullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null); // To handle error messages
  const { signup, loading, isAuthenticated } = useAuth();

  const navigate = useNavigate();
  if (loading) return null; // or spinner
  if (isAuthenticated) {
    navigate("/profile/student", { replace: true });
    return null;
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate form using authUtils
    const validationErrors = validateSignupForm(fullname, email, password, confirmPassword);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]); // Display first error
      return;
    }
    try {
      await signup({
        name: fullname,
        email,
        password,
      });
      navigate("/profile/student", { replace: true });
    } catch (err) {
      console.error("Signup failed:", err);
      setError((err as Error).message);
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
};

export default SignupPage;
