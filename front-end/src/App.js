import React, {useState} from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
import AdminPage from "./pages/AdminPage";
// import LogInPage from "./pages/LogInPage";

function App() {
	const [degreeId, setDegreeId] = useState(null);
	const [timelineData, setTimelineData] = useState([]);
	const [creditsRequired, setcreditsRequired] = useState([]);

  const handleDataProcessed = (data) => {
    setTimelineData(data.transcriptData);  // Update transcript data
    setDegreeId(data.degreeId);  // Update degreeId
		setcreditsRequired(data.creditsRequired); // Update creditsRequired
  };


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
										<UserPage 
									onDataProcessed={handleDataProcessed}/>
									</ProtectedRoute>
								}
							/>
							<Route
								path="/admin"
								element={
										<AdminPage />
								}
							/>
							<Route
								path="/timeline_change"
								element={<TimelinePage degreeid={degreeId} timelineData={timelineData} creditsrequired={creditsRequired}/>}
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
								element={<UploadAcceptanceLetter onDataProcessed={handleDataProcessed}/>}
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
