import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/ErrorPage.css';

//This page shows up if an action was made without proper permissions (non-admin)
const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <div className="error-container">
      <div className="error-content">
        <div className="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#912338">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2zm2-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h1>403 - Forbidden</h1>
        <p>Access to this resource is permanently denied.</p>
        <p>Contact your administrator if you believe this is an error.</p>
        <button 
          onClick={() => navigate("/")} 
          className="error-button"
        >
          Go Back To Home Page
        </button>
      </div>
    </div>
  );
};

export default ForbiddenPage;