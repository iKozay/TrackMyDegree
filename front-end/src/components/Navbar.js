// src/components/Navbar.js
import React, { useContext, useEffect, useRef  } from "react";
import { useNavigate,  Link  } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import '../css/Navbar.css';

const Navbar = () => {
  const { isLoggedIn, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Handle logout logic
  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  // Toggle menu
  const toggleMenu = () => {
    const body = document.body;
    const navbarCollapse = document.getElementById("navbarNavAltMarkup");
    const isMenuOpen = body.classList.contains("menu-open");

    if (isMenuOpen) {
      body.classList.remove("menu-open");
      navbarCollapse.classList.remove("show");
    } else {
      body.classList.add("menu-open");
      navbarCollapse.classList.add("show");
    }
  };

  // Close menu on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const body = document.body;
      const navbarCollapse = document.getElementById("navbarNavAltMarkup");

      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        body.classList.contains("menu-open")
      ) {
        body.classList.remove("menu-open");
        navbarCollapse.classList.remove("show");
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div ref={menuRef}>
    <nav className="navbar navbar-expand-lg custom-navbar custom-navbar-height custom-navbar-padding">
      <div className="container-fluid custom-navbar-left-align">
        <a className="navbar-brand custom-navbar-brand-left" href="/">
          <span className="brand-text">TrackMyDegree 🎓</span>
          <span className="brand-emoji">🎓</span>
        </a>
        <button
          className="navbar-toggler"
          type="button"
          onClick={toggleMenu}
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
            <a className="nav-link" href="/timeline_initial">
              Timeline
            </a>
            <a className="nav-link" href="/courselist">
              Courses
            </a>
            {/* <a className="nav-link" href="/uploadTranscript">
              Upload Transcript
            </a> */}
          </div>
            {isLoggedIn ? (
              <>
                <div className="navbar-right-buttons">
                  <Link to="/user">
                    <button className="navbar-button navbar-button-signin">User</button>
                  </Link>
                  <Link to="/signin">
                    <button className="navbar-button navbar-button-register" onClick={handleLogout}>Log Out</button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="navbar-right-buttons">
                <Link to="/signin">
                  <button className="navbar-button navbar-button-signin">Sign in</button>
                </Link>
                <Link to="/signup">
                  <button className="navbar-button navbar-button-register">Register</button>
                </Link>
              </div>
            )}
        </div>
      </div>
    </nav>
    </div>
  );
};

export default Navbar;
