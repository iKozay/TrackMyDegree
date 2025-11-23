import React, { useState } from 'react';
import '../css/Footer.css';
import posthog from 'posthog-js';

const Footer = () => {
  const [showPopup, setShowPopup] = useState(false);

  const handleShowDisclaimer = () => {
    setShowPopup(true);
  };

  const hidePopup = () => {
    setShowPopup(false);
  };

  return (
    <footer className="footer" style={{ position: 'relative', padding: '20px', minHeight: '60px' }}>
      {showPopup && (
        <div className="overlay" onClick={hidePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-content">
              <h3>DISCLAIMER</h3>
              <p>
                TrackMyDegree🎓 can make mistakes. Please check the important information. Note that this website is an
                independent helper tool and is not affiliated with Concordia University. It is designed to provide
                supplementary assistance and should not be solely relied upon for academic or administrative decisions.
              </p>
              <div className="popup-buttons">
                <button onClick={hidePopup}>Acknowledge</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="footer-content">
        <p style={{ fontSize: '0.9em', fontWeight: 'italic' }}>v0.3.2</p>
      </div>
      <p className="footer-text">
        Disclaimer: TrackMyDegree🎓 can make mistakes.
        <button className="disclaimer-button" onClick={handleShowDisclaimer}>
          {' '}
          Click here for more information.
        </button>
      </p>

      <button className="feedback-button" onClick={() => posthog.surveys.launch()}>
        Submit Feedback!
      </button>
    </footer>
  );
};

export default Footer;
