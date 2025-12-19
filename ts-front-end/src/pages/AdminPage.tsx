import React, { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import LegacyAdminPage from "../legacy/pages/AdminPage.jsx";

const AdminPage: React.FC = () => {
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
  return <LegacyAdminPage />;
};

export default AdminPage;
