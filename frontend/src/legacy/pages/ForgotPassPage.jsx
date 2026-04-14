import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import '../css/SignInPage.css';
import { motion } from 'framer-motion';
import { api } from '../../api/http-api-client';

//This page is used to help users that forgot their password. It checks if the email already exists in the database and if it does it sends a reset link to that email and prompts users to check mailbox.
function ForgotPassPage() {
  const [email, setEmail] = useState('');

  const [error, setError] = useState(null); // To handle error messages
  const [loading, setLoading] = useState(false); // To handle loading state

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    // Reset error state
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 10)); //This timeout is most likely to allow React to refresh

    // Basic validation checks
    if (email.trim() === '') {
      setError('Email is required.');
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
      await api.post('/auth/forgot-password', {
        email,
      });
      // show a generic success, do not navigate or store email/token
      setError('If the email exists, a reset link has been sent. Please check your inbox and spam folder.');
    } catch (err) {
        console.log('Forgot password error:', err.message || 'Unknown error');
        setError('If the email exists, a reset link has been sent. Please check your inbox and spam folder.');
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <>
        {/* Same styling as LogInPage.css */}
        <div className="LogInPage">
          <div className="container my-5 sign-in-container">
            <h3 className="text-center mb-7">Forgot Your Password?</h3>
            <form onSubmit={handleForgotPassword}>
              {/* Email Field */}
              <div className="mb-3">
                <label htmlFor="email" className="form-label visually-hidden">Email</label> {/* Hidden label for accessibility and sonarqube compliance */}
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <div className="d-grid gap-2">
                <Button className="button-outline" variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Sending email...' : 'Submit'}
                </Button>
              </div>
              {/* Display Error Message */}
              {error && (
                <Alert variant="danger " className="mt-4">
                  {error}
                </Alert>
              )}
            </form>
          </div>
        </div>
      </>
    </motion.div>
  );
}

export default ForgotPassPage;
