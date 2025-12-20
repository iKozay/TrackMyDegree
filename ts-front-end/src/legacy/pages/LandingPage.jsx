import { React, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/LandingPage.css';
import ImageCarousel from '../components/ImageCarousel.jsx';
import Typewriter from 'typewriter-effect';
import { motion } from 'framer-motion';
import DisclaimerPopup from '../../components/DisclaimerPopup.tsx';


//This is the website's landing page. It serves the purpose of making sure the user acknowledges the disclaimer and allows them to be redirected to the UploadAcceptanceLetter.js page
const LandingPage = () => {
  const navigate = useNavigate();

  //This checks local storage to find if the user has acknowledged the disclaimer and pops it up if they didn't
  const [showPopup, setShowPopup] = useState(() => {
    return localStorage.getItem('disclaimerAcknowledged') !== 'true';
  });

  const handleClosePopup = () => {
    localStorage.setItem('disclaimerAcknowledged', 'true');
    setShowPopup(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      {showPopup && (
        <DisclaimerPopup show={showPopup} onClose={handleClosePopup} />
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
          <button className="btn btn-outline-dark btn-lg" onClick={() => navigate('/timeline')}>
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
