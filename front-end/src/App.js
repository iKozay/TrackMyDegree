import './middleware/sentry_instrument';
import React, { useState } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  Routes,
  Route,
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
import { AuthProvider } from "./middleware/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./App.css";
import TimelinePage from "./pages/TimelinePage";
import ForgotPassPage from "./pages/ForgotPassPage";
import ResetPassPage from "./pages/ResetPassPage";
import AdminPage from "./pages/AdminPage";
import ForbiddenPage from "./pages/Forbidden_403";
import { AnimatePresence } from "framer-motion";

function App() {
  const [degreeId, setDegreeId] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [creditsRequired, setCreditsRequired] = useState([]);
  const [isExtendedCredit, setIsExtendedCredit] = useState(false);

  const handleDataProcessed = (data) => {
    if (data) {
      setTimelineData(data.transcriptData); // Update transcript data
      setDegreeId(data.degreeId); // Update degreeId
      setCreditsRequired(data.creditsRequired); // Update creditsRequired
      setIsExtendedCredit(data.isExtendedCredit); // Update is

      console.log('app.js data.isExtendedCredit: ', data.isExtendedCredit);
      console.log('app.js isExtendedCredit: ', isExtendedCredit);
    } else {
      // Clear the data
      setTimelineData([]);
      setDegreeId(null);
      setCreditsRequired([]);
      setIsExtendedCredit(false);
      console.log('Timeline data cleared');
    }
  };

  const location = useLocation();

  return (
    <div className="page-container">
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/signin" element={<LogInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            path="/user"
            element={
              <ProtectedRoute>
                <UserPage onDataProcessed={handleDataProcessed} />
              </ProtectedRoute>
            }
          />
          <Route path="/adminpage" element={<AdminPage />} />
          <Route
            path="/timeline_change"
            element={
              <TimelinePage
                degreeId={degreeId}
                timelineData={timelineData}
                creditsRequired={creditsRequired}
                isExtendedCredit={isExtendedCredit}
                onDataProcessed={handleDataProcessed}
              />
            }
          />
          <Route path="/courselist" element={<CourseList />} />
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
          <Route path="/forgot-password" element={<ForgotPassPage />} />
          <Route path="/reset-password" element={<ResetPassPage />} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </div>
  );
}

const router = createBrowserRouter([{ path: '/*', element: <App /> }]);

export default function Root() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
