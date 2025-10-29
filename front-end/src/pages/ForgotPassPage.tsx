import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import '../css/SignInPage.css';
import { motion } from 'framer-motion';
import { api } from '~/frontend/api/http-api-client';

//This page is used to help users that forgot their password. It checks if the email already exists in the database and if it does it redirects them to the ResetPassword page
function ForgotPassPage() {
  const [email, setEmail] = useState<string>('');
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null); // To handle error messages
  const [loading, setLoading] = useState<boolean>(false); // To handle loading state

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
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
      const data = await api.post<{ message: string }>('/auth/forgot-password', {
        email,
      });
      console.log(data);
      // API returns a success message and we can redirect to reset pass page
      navigate('/reset-password');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
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
                <label htmlFor="email" className="form-label"></label>
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
