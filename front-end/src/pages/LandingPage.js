import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/LandingPage.css';
import ImageCarousel from '../components/ImageCarousel';
import Typewriter from 'typewriter-effect';
import { motion } from 'framer-motion';
import {useState} from 'react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(() => {
    return localStorage.getItem('disclaimerAcknowledged') !== 'true';    
  });

  const handleClosePopup = () => {
    localStorage.setItem('disclaimerAcknowledged', 'true');
    setShowPopup(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >

      {showPopup && (
      <div className ="popup-container">
        <div className = "popup">
          <h2>DISCLAIMER</h2>
          <p>
            TrackMyDegree🎓 can make mistakes. Please check the important information. 
            Note that this website is an independent helper tool and is not affiliated with Concordia University. 
            It is designed to provide supplementary assistance and should not be solely relied upon for academic or administrative decisions.
          </p>
          <button type = "button" className= "popup-button" onClick={handleClosePopup}>Acknowledge</button>
        </div>
      </div>
      )}

      <div className="landing-section">
        <Typewriter
          options={{
            strings: [
              'Organize your course sequence',
              'Plan your degree',
              'Visualize your courses',
              'Stay on track',
              'Navigate your program',
            ],
            autoStart: true,
            loop: true,
            pauseFor: 1000,
            delay: 65,
          }}
        />
        <div className="try-now-section">
          <p>Try Now!</p>
          <button
            className="btn btn-outline-dark btn-lg"
            onClick={() => navigate('/timeline_initial')}
          >
            Live Demo{' '}
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
