// src/components/Navbar.js
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import '../css/Navbar.css';

const Navbar = () => {
  const { isLoggedIn, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Handle logout logic
  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  return (
    <nav className="navbar navbar-expand-lg custom-navbar custom-navbar-height custom-navbar-padding">
      <div className="container-fluid custom-navbar-left-align">
        <a className="navbar-brand custom-navbar-brand-left" href="/">
          TrackMyDegree
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNavAltMarkup"
          aria-controls="navbarNavAltMarkup"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
          <div className="navbar-nav custom-nav-links">
            <a className="nav-link active" aria-current="page" href="/">
              Home
            </a>

            {isLoggedIn ? (
              <>
                <a className="nav-link" href="/user">
                  User
                </a>
                <a className="nav-link" href="/timeline">
                  Timeline
                </a>
                {/* Add an empty link */}
                <a className="nav-link">                      </a>
                <a
                  className="nav-link"
                  onClick={handleLogout}
                >
                  Log Out
                </a>
              </>
            ) : (
              <a className="nav-link" href="/signin">
                Log In
              </a>
            )}
            <a className="nav-link" href="/courselist">
              Course List
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
