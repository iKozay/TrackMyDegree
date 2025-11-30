import React, { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const StudentPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchWhatever = async () => {
      try {
        // backend will read the JWT from the cookie
      } catch (err) {
        console.error(err);
      } finally {
        //
      }
    };

    fetchWhatever();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <p>Please log in to see your data.</p>;
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Hello, Advisor {user?.name} 👋</h1>
      <p>Welcome to your profile page.</p>
    </main>
  );
};

export default StudentPage;
