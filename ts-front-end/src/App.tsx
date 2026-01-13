import React, { useEffect } from "react";
import { ENV } from "./config";
import { Routes, Route, useLocation } from "react-router-dom";
import posthog from "posthog-js";

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
import DegreeAuditPage from "./pages/DegreeAuditPage.tsx";
import CoopSequencePlannerPage from "./pages/CoopSequencePlanner.tsx";

import { Navbar } from "./components/NavBar";
import { Footer } from "./components/Footer";
import DashboardLayout from "./components/DashboardLayout.tsx";

import { AuthProvider } from "./providers/authProvider";
import { ProtectedRoute } from "./ProtectedRoute";

import "./App.css";

const deployment_version = import.meta.env.VITE_DEPLOYMENT_VERSION || '1.0.0';
const NODE_ENV = ENV.NODE_ENV || 'development';

// Only initialize PostHog if not in development mode
if (NODE_ENV !== 'development') {
  posthog.init(
    ENV.POSTHOG_KEY,
    { api_host: ENV.POSTHOG_HOST }
  );
}

const App: React.FC = () => {
  useEffect(() => {
    if (NODE_ENV !== 'development') {
      posthog.capture('app_loaded', { deployment_version, NODE_ENV });
    }
  }, []);

  const location = useLocation();
  const dashboardRoutes = ['/dashboard', '/degree-audit', '/missing-requirements', '/class-builder'];
  const isDashboardPage = dashboardRoutes.some(route => location.pathname.startsWith(route));

  return (
    <AuthProvider>
      {!isDashboardPage && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/timeline" element={<TimelineSetupPage />} />
        <Route path="/timeline/:jobId" element={<TimeLinePage />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgetPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/courses" element={<CoursePage />} />
        <Route path="/requirements" element={<RequirementsFormPage />} />
        <Route path="/requirements/:programId" element={<RequirementSelectPage />} />
        <Route path="/co-op" element={<CoopSequencePlannerPage />} />
        {NODE_ENV == 'development' && (
            <Route path="/degree-audit" element={
              <DashboardLayout>
                <DegreeAuditPage />
              </DashboardLayout>
            } />
        )}

        <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/profile/student" element={<StudentPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/profile/admin" element={<AdminPage />} />
        </Route>
      </Routes>
      {!isDashboardPage && <Footer deployment_version={deployment_version} />}
    </AuthProvider>
  );
};

export default App;
