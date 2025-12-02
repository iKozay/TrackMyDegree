import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const LoginPage: React.FC = () => {
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/student/profile", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    // For now, use simple dummy credentials or something your mock/real backend accepts
    try {
      await login("student@example.com", "password123");
      navigate("/student/profile", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  if (loading) return null; // or a spinner

  return (
    <main style={{ padding: "2rem", maxWidth: "420px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>Login</h1>
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        style={{ marginTop: "1rem" }}>
        {loading ? "Logging in..." : "Login as demo student"}
      </button>
    </main>
  );
};

export default LoginPage;
