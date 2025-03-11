import React from "react";
import { useNavigate } from "react-router-dom";
import '../css/LandingPage.css';
import ImageCarousel from "../components/ImageCarousel";
import Typewriter from "typewriter-effect";
import { motion } from "framer-motion"

const LandingPage = () => {

  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <div className="landing-section">
        <Typewriter
          options={{
            strings: ['Organize your course sequence', 'Plan your degree', 'Visualize your courses', 'Stay on track', 'Navigate your program'],
            autoStart: true,
            loop: true,
            pauseFor: 1000,
            delay: 65
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
    </motion.div>
  );
};

export default LandingPage;
