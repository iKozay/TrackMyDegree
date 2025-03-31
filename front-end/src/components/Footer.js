import React, { useState } from 'react';
import '../css/Footer.css';

const Footer = () => {
  const [feedback, setFeedback] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [showAlert, setShowAlert] = useState('');

  const redirectToFeedbackPage = () => {
    window.open(
      'https://docs.google.com/forms/d/e/1FAIpQLScr67TcEpPV1wNCTM5H53hPwRgplAvkYmxg72LKgHihCSmzKg/viewform',
      '_blank',
    );
  };

  const handleSubmit = async () => {
    if (feedback === '') {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: feedback, user_id: '' }),
      });

      if (!response.ok) {
        setShowAlert('Error submitting feedback');
      } else {
        const resData = await response.json();
        console.log(resData);
        setShowAlert(resData.message);
      }

      setTimeout(() => {
        setShowAlert('');
      }, 2500);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }

    setFeedback('');
    setShowPopup(false);
  };

  const hidePopup = () => {
    setFeedback('');
    setShowPopup(false);
  };

  return (
    <footer
      className="footer"
      style={{ position: 'relative', padding: '20px', minHeight: '60px' }}
    >
      {showPopup && (
        <div className="overlay" onClick={hidePopup}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-content">
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
            </div>
          </div>
        </div>
      )}
      <p className="footer-text">
        TrackMyDegree helps Concordia Engineering students visualize and plan
        their courses with an easy-to-use and interactive UI.
      </p>
      <button
        className="feedback-button"
        onClick={redirectToFeedbackPage}
      >
        Submit Feedback!
      </button>
      {showAlert && <div className="alert">{showAlert}</div>}
    </footer>
  );
};

export default Footer;
