import React, { useState } from 'react';
import '../css/Footer.css';

const Footer = () => {
  const [feedback, setFeedback] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [showAlert, setShowAlert] = useState('');

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
        onClick={() => setShowPopup(true)}
        style={{
          backgroundColor: 'red',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px',
          transition: 'background-color 0.3s ease',
          position: 'absolute',
          right: '20px',
          bottom: '10px',
        }}
      >
        Submit Feedback!
      </button>
      {showAlert && <div className="alert">{showAlert}</div>}
    </footer>
  );
};

export default Footer;
