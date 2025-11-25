import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TimeLinePage from "./pages/TimelinePage";
import TimelineSetupPage from "./pages/TimelineSetupPage";
import "./App.css";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Timeline page */}
        <Route path="/timeline/:jobId" element={<TimeLinePage />} />
        <Route path="/" element={<TimelineSetupPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
