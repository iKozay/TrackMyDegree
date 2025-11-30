import React, { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

const AdminPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTimelines = async () => {
      try {
        // backend will read the JWT from the cookie
      } catch (err) {
        console.error(err);
      } finally {
        //
      }
    };

    fetchTimelines();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <p>Please log in to see your saved timelines.</p>;
  }
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Hello, Student {user?.name} 👋</h1>
      <p>Welcome to your profile page.</p>
    </main>
  );
};

export default AdminPage;
