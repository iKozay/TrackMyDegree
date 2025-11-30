import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const SignupPage: React.FC = () => {
  const { signup, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  if (loading) return null; // or spinner
  if (isAuthenticated) {
    navigate("/student/profile", { replace: true });
    return null;
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "420px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>Sign up</h1>
    </main>
  );
};

export default SignupPage;
