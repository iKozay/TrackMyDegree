import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UploadPage from "./UploadPage";
import TimeLinePage from "./TimelinePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<UploadPage />} />

        {/* Timeline page */}
        <Route path="/results/:jobId" element={<TimeLinePage />} />
      </Routes>
    </BrowserRouter>
  );
}
