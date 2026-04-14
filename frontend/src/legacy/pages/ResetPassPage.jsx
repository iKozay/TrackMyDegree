import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import '../css/SignInPage.css';
import { motion } from 'framer-motion';
import { api } from '../../api/http-api-client';

//This is the page where the users can reset their password. This is just a form because the reset happens on the server side
function ResetPassPage() {
  const { token } = useParams(); // token from /reset-password/:token
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const [error, setError] = useState(null); // To handle error messages
  const [loading, setLoading] = useState(false); // To handle loading state

  const handleResetPassword = async (e) => {
    e.preventDefault();

    // Reset error state
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Basic validation checks
    if (password.trim() === '' || confirmPassword.trim() === '') {
      setError('All fields are required.');
      return;
    }

    if (!token) {
      setError('Invalid or expired reset link.');
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true); // Start loading

    //The password reset process is done in the backend so the data from the form is being sent there
    try {
        // Send token from URL and the new password
        await api.post('/auth/reset-password', {
            resetToken: token,
            newPassword: password,
        });
      // API returns a success message and we can redirect to login page
      navigate('/signin');
    } catch (err) {
      console.log('Password reset error:', err.message || 'Unknown error');
      setError('Unable to reset password. Your link may have expired. Please request a new password reset.');
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
            <h3 className="text-center mb-7">Reset Password</h3>
            <div className="position-relative">
              <form onSubmit={handleResetPassword}>
                {/* Password Field */}
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
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
                  <label htmlFor="confirmPassword" className="form-label">
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
                  <Button className="button-outline" variant="primary" type="submit" disabled={loading}>
                    {loading ? 'Resetting Password...' : 'Submit'}
                  </Button>
                </div>
                {error && (
                  <Alert
                    variant="danger"
                    style={{
                      marginTop: '30px', // Adds spacing below the button
                      width: '100%', // Matches button width
                      textAlign: 'center', // Centers text
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
