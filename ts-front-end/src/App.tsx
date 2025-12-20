import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TimeLinePage from "./pages/TimelinePage";
import TimelineSetupPage from "./pages/TimelineSetupPage";
import StudentPage from "./pages/StudentPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";
import RequirementSelectPage from "./pages/RequirementsFormPage";
import RequirementsFormPage from "./pages/RequirementsSelectPage";
import CoursePage from "./pages/CoursePage";
import ForbiddenPage from "./pages/ForbiddenPage";
import ForgetPasswordPage from "./pages/ForgetPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { Navbar } from "./components/NavBar";
import { Footer } from "./components/Footer";

import { AuthProvider } from "./providers/authProvider";
import { ProtectedRoute } from "./ProtectedRoute";

import "./App.css";

const deployment_version = import.meta.env.VITE_DEPLOYMENT_VERSION || 'dev';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/timeline" element={<TimelineSetupPage />} />
          <Route path="/timeline/:jobId" element={<TimeLinePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/courses" element={<CoursePage />} />
          <Route path="/requirements" element={<RequirementsFormPage />} />
          <Route path="/requirements/:programId" element={<RequirementSelectPage />} />

          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/profile/student" element={<StudentPage />} />
          </Route>

          {/* Protected: ADMIN PROFILE */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/profile/admin" element={<AdminPage />} />
          </Route>
        </Routes>
        <Footer deployment_version={deployment_version} />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
