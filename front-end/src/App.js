import React, { useState } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	useLocation,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LogInPage from "./pages/LogInPage";
import SignUpPage from "./pages/SignUpPage";
import UserPage from "./pages/UserPage";
import CourseList from "./pages/CourseListPage";
import UploadTranscript from "./pages/UploadTranscriptPage";
import UploadAcceptanceLetter from "./pages/UploadAcceptanceLetter";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./App.css";
import TimelinePage from "./pages/TimelinePage";
import ForgotPassPage from "./pages/ForgotPassPage";
import ResetPassPage from "./pages/ResetPassPage";
import AdminPage from "./pages/AdminPage";
import { AnimatePresence } from "framer-motion";

function App() {
	const [degreeId, setDegreeId] = useState(null);
	const [timelineData, setTimelineData] = useState([]);
	const [creditsRequired, setcreditsRequired] = useState([]);
	const [isExtendedCredit, setIsExtendedCredit] = useState(false);

	const handleDataProcessed = (data) => {
		setTimelineData(data.transcriptData); // Update transcript data
		setDegreeId(data.degreeId); // Update degreeId
		setcreditsRequired(data.creditsRequired); // Update creditsRequired
		setIsExtendedCredit(data.isExtendedCredit); // Update is

		console.log("app.js data.isExtendedCredit: ", data.isExtendedCredit);
		console.log("app.js isExtendedCredit: ", isExtendedCredit);
	};

	return (
		<div className="page-container">
			<AuthProvider>
				<Router>
					<Navbar />
					<AppContent
						degreeId={degreeId}
						timelineData={timelineData}
						creditsRequired={creditsRequired}
						isExtendedCredit={isExtendedCredit}
						handleDataProcessed={handleDataProcessed}
					/>
					<Footer />
				</Router>
			</AuthProvider>
		</div>
	);
}

// Create a new component to use `useLocation` inside the `<Router>`
function AppContent({
	degreeId,
	timelineData,
	creditsRequired,
	handleDataProcessed,
	isExtendedCredit,
}) {
	const location = useLocation(); // <--- useLocation is now inside the Router context

	return (
		<div className="App">
			<AnimatePresence mode="wait">
				<Routes
					location={location}
					key={location.pathname}
				>
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
								<UserPage onDataProcessed={handleDataProcessed} />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/admin"
						element={<AdminPage />}
					/>
					<Route
						path="/timeline_change"
						element={
							<TimelinePage
								degreeid={degreeId}
								initialTimelineData={timelineData}
								creditsrequired={creditsRequired}
								isExtendedCredit={isExtendedCredit}
								onDataProcessed={handleDataProcessed}
							/>
						}
					/>
					<Route
						path="/courselist"
						element={<CourseList />}
					/>
					<Route
						path="/uploadTranscript"
						element={<UploadTranscript onDataProcessed={handleDataProcessed} />}
					/>
					<Route
						path="/timeline_initial"
						element={
							<UploadAcceptanceLetter onDataProcessed={handleDataProcessed} />
						}
					/>
					<Route
						path="/forgot-pass"
						element={<ForgotPassPage />}
					/>
					<Route
						path="/reset-pass"
						element={<ResetPassPage />}
					/>
				</Routes>
			</AnimatePresence>
		</div>
	);
}

export default App;
