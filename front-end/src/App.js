// src/App.js
import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import TimelineSection from "./components/TimelineSection";
import Footer from "./components/Footer";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Navbar />
      <Hero />
      <TimelineSection />
      <Footer />
    </div>
  );
}

export default App;
