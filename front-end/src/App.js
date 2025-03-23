import React, { useState } from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
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
  const [creditsRequired, setCreditsRequired] = useState([]);
  const [isExtendedCredit, setIsExtendedCredit] = useState(false);

  const handleDataProcessed = (data) => {
    setTimelineData(data.transcriptData); // Update transcript data
    setDegreeId(data.degreeId); // Update degreeId
    setCreditsRequired(data.creditsRequired); // Update creditsRequired
    setIsExtendedCredit(data.isExtendedCredit); // Update is

		console.log("app.js data.isExtendedCredit: ", data.isExtendedCredit);
		console.log("app.js isExtendedCredit: ", isExtendedCredit);
	};

  const router = createBrowserRouter([
    {
      path: "/",
      element: (
        <div className="page-container">
          <Navbar />
          <AnimatePresence mode="wait">
            <div className="App">
              <Outlet />
            </div>
          </AnimatePresence>
          <Footer />
        </div>
      ),
      children: [
        { path: "/", element: <LandingPage /> },
        { path: "/signin", element: <LogInPage /> },
        { path: "/signup", element: <SignUpPage /> },
        { path: "/admin", element: <AdminPage /> },
        {
          path: "/user",
          element: (
            <ProtectedRoute>
              <UserPage onDataProcessed={handleDataProcessed} />
            </ProtectedRoute>
          ),
        },
        {
          path: "/timeline_change",
          element: (
            <TimelinePage
              degreeid={degreeId}
              timelineData={timelineData}
              creditsrequired={creditsRequired}
              isExtendedCredit={isExtendedCredit}
              onDataProcessed={handleDataProcessed}
            />
          ),
        },
        { path: "/courselist", element: <CourseList /> },
        {
          path: "/uploadTranscript",
          element: <UploadTranscript onDataProcessed={handleDataProcessed} />,
        },
        {
          path: "/timeline_initial",
          element: <UploadAcceptanceLetter onDataProcessed={handleDataProcessed} />,
        },
      ],
    },
  ]);

  return (
    <AuthProvider>
      <RouterProvider router = {router} />
    </AuthProvider>
  );
}

export default App;
