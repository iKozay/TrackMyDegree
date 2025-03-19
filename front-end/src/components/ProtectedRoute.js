// src/components/ProtectedRoute.js
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../middleware/AuthContext";

const ProtectedRoute = ({ children }) => {
	const { isLoggedIn, loading } = useContext(AuthContext);

	// Debugging log
	console.log("ProtectedRoute: isLoggedIn =", isLoggedIn, "loading =", loading);

	if (loading) {
		// You can return a loading spinner or just null until we know if the user is logged in
		return <div>Loading...</div>;
	}

	if (!isLoggedIn) {
		return <Navigate to="/signin" />;
	}

	return children;
};

export default ProtectedRoute;
