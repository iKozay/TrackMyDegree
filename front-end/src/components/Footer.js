import React, { useState } from 'react';
import '../css/Footer.css';
import { api } from '../api/http-api-client';

const Footer = () => {
  const [feedback, setFeedback] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [showAlert, setShowAlert] = useState('');
  const [popupType, setPopupType] = useState('');

  const redirectToFeedbackPage = () => {
    window.open(
      'https://docs.google.com/forms/d/e/1FAIpQLScr67TcEpPV1wNCTM5H53hPwRgplAvkYmxg72LKgHihCSmzKg/viewform',
      '_blank',
    );
  };

  const handleShowFeedback = () => {
    setShowPopup(true);
    setPopupType('feedback');
  };

  const handleShowDisclaimer = () => {
    setShowPopup(true);
    setPopupType('disclaimer');
  };

  const hidePopup = () => {
    setFeedback('');
    setShowPopup(false);
  };

  const handleSubmit = async () => {
    if (feedback === '') {
      return;
    }

    try {
      const resData = await api.post('/feedback', {
        message: feedback,
        user_id: '',
      });
      console.log(resData);
      setShowAlert(resData.message || 'Feedback submitted successfully');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setShowAlert('Error submitting feedback');
    }

    setTimeout(() => {
      setShowAlert('');
    }, 2500);

    setFeedback('');
    setShowPopup(false);
  };

  return (
    <footer className="footer" style={{ position: 'relative', padding: '20px', minHeight: '60px' }}>
      {showPopup && (
        <div className="overlay" onClick={hidePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-content">
              {popupType === 'feedback' ? (
                <>
                  <h3>Submit Feedback</h3>
                  <textarea
                    rows="4"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter your feedback..."
                  />
                  <div className="popup-buttons">
                    <button onClick={handleSubmit}>Submit</button>
                    <button onClick={hidePopup}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <h3>DISCLAIMER</h3>
                  <p>
                    TrackMyDegree🎓 can make mistakes. Please check the important information. Note that this website is
                    an independent helper tool and is not affiliated with Concordia University. It is designed to
                    provide supplementary assistance and should not be solely relied upon for academic or administrative
                    decisions.
                  </p>
                  <div className="popup-buttons">
                    <button onClick={hidePopup}>Acknowledge</button>
                  </div>
                </>
              )}
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

      <button className="feedback-button" onClick={redirectToFeedbackPage}>
        Submit Feedback!
      </button>

      {showAlert && <div className="alert">{showAlert}</div>}
    </footer>
  );
};

export default Footer;
