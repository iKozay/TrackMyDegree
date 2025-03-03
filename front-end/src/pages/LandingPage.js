import React from "react";
import { useNavigate } from "react-router-dom";
import '../css/LandingPage.css';
import ImageCarousel from "../components/ImageCarousel";
import Typewriter from "typewriter-effect";

const LandingPage = () => {

  const navigate = useNavigate();

  return (
    <div className="landing-section">
      <Typewriter
        options={{
          strings: ['Organize your course sequence', 'Plan your degree', 'Visualize your courses', 'Stay on track', 'Navigate your program'],
          autoStart: true,
          loop: true,
          pauseFor: 2000
        }}
      />
      <div className="try-now-section">
        <p>Try Now!</p>
        <button className="btn btn-outline-dark btn-lg" onClick={() => navigate("/timeline_initial")}>
          Live Demo{" "}
          <span role="img" aria-label="play">
            ▶️
          </span>
        </button>
      </div>
      <div>
        <ImageCarousel />
      </div>
    </div>
  );
};

export default LandingPage;
