// src/components/Navbar.js
import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./Navbar.css"; // Import your custom CSS

const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg custom-navbar custom-navbar-height custom-navbar-padding">
      <div className="container-fluid custom-navbar-left-align">
        <a className="navbar-brand custom-navbar-brand-left" href="#">
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
            <a className="nav-link active" aria-current="page" href="#">
              Home
            </a>
            <a className="nav-link" href="#">
              Features
            </a>
            <a className="nav-link" href="#">
              Pricing
            </a>
            <a
              className="nav-link disabled"
              href="#"
              tabIndex="-1"
              aria-disabled="true"
            >
              Disabled
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
