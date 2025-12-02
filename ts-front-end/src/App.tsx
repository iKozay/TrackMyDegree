import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TimeLinePage from "./pages/TimelinePage";
import TimelineSetupPage from "./pages/TimelineSetupPage";
import StudentPage from "./pages/StudentPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";
import RequirementPage from "./pages/RequirementPage";
import CoursePage from "./pages/CoursePage";
import { Navbar } from "./components/NavBar";

// TODO: import { AuthProvider } from "./contexts/authProvider";
import { MockAuthProvider } from "./providers/MockAuthProvider";
import { ProtectedRoute } from "./ProtectedRoute";

import "./App.css";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MockAuthProvider>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/timeline" element={<TimelineSetupPage />} />
          <Route path="/timeline/:jobId" element={<TimeLinePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/courses" element={<CoursePage />} />
          <Route path="/requirements" element={<RequirementPage />} />

          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/student/profile" element={<StudentPage />} />
          </Route>

          {/* Protected: ADMIN PROFILE */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/profile" element={<AdminPage />} />
          </Route>
        </Routes>
      </MockAuthProvider>
    </BrowserRouter>
  );
};

export default App;
