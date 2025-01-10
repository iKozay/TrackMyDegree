import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LogInPage from "./pages/LogInPage";
import SignUpPage from "./pages/SignUpPage";
import UserPage from "./pages/UserPage";
import CourseList from "./pages/CourseListPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./App.css";
import TimelinePage from "./pages/TimelinePage";
// import LogInPage from "./pages/LogInPage";

function App() {
	return (
		<div className="page-container">
			<AuthProvider>
				<Router>
					<Navbar />
					<div className="App">
						<Routes>
							<Route
								path="/"
								element={<LandingPage />}
							/>
							<Route
								path="/signin"
								element={<LogInPage />}
							/>
							<Route
								path="/signup"
								element={<SignUpPage />}
							/>
							<Route
								path="/user"
								element={
									<ProtectedRoute>
										<UserPage />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/timeline"
								element={
									<ProtectedRoute>
										<TimelinePage />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/courselist"
								element={<CourseList />}
							/>
						</Routes>
					</div>
					<Footer />
				</Router>
			</AuthProvider>
		</div>
	);
}

export default App;
