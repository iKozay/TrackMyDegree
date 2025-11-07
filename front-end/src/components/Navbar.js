// src/components/Navbar.js
import React, { useContext, useEffect, useRef } from 'react';
import { useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../middleware/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../css/Navbar.css';
import userIcon from '../icons/userIcon2.png';
import logoutIcon from '../icons/logoutIcon.png';
import logo from '../images/trackmydegreelogo.png'; // Adjust the path to your logo image

const Navbar = () => {
  const { isLoggedIn, loading, logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const location = useLocation();
  const timelineActivePaths = ['/timeline_initial', '/timeline_change'];

  // Handle logout logic
  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  // Toggle menu
  const toggleMenu = () => {
    const body = document.body;
    const navbarCollapse = document.getElementById('navbarNavAltMarkup');
    const isMenuOpen = body.classList.contains('menu-open');

    if (isMenuOpen) {
      body.classList.remove('menu-open');
      navbarCollapse.classList.remove('show');
    } else {
      body.classList.add('menu-open');
      navbarCollapse.classList.add('show');
    }
  };

  // Close menu on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      const body = document.body;
      const navbarCollapse = document.getElementById('navbarNavAltMarkup');

      if (menuRef.current && !menuRef.current.contains(event.target) && body.classList.contains('menu-open')) {
        body.classList.remove('menu-open');
        navbarCollapse.classList.remove('show');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <div ref={menuRef}>
      <nav className="navbar navbar-expand-lg custom-navbar custom-navbar-height custom-navbar-padding">
        <div className="container-fluid custom-navbar-left-align">
          <Link className="navbar-brand custom-navbar-brand-left" to="/">
            <span className="brand-text">TrackMyDegree</span>
            <img src={logo} alt="TrackMyDegree Logo" className="navbar-logo" />
          </Link>
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
            {/* Close button for mobile collapse */}
            <button className="close-nav" onClick={toggleMenu}>
              &times;
            </button>
            <div className="mobile-feedback">
              <Link
                onClick={() =>
                  window.open(
                    'https://docs.google.com/forms/d/e/1FAIpQLScr67TcEpPV1wNCTM5H53hPwRgplAvkYmxg72LKgHihCSmzKg/viewform',
                    '_blank',
                  )
                }
              >
                <button className="feedback-button-mobile">Submit Feedback!</button>
              </Link>
            </div>
            <div className="navbar-nav custom-nav-links">
              <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                Home
              </NavLink>
              <NavLink
                to="/timeline_initial"
                className={() => 'nav-link' + (timelineActivePaths.includes(location.pathname) ? ' active' : '')}
              >
                Timeline
              </NavLink>
              <NavLink to="/courselist" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                Courses
              </NavLink>
              {user && user.type === 'admin' ? (
                <>
                  <p className={'nav-separator'}>|</p>
                  <Link className="nav-link" to="/adminpage">
                    Admin
                  </Link>
                </>
              ) : (
                ''
              )}
            </div>
            {!loading ? (
              <>
                {isLoggedIn && user ? (
                  <>
                    <div className="navbar-right-buttons">
                      <Link to="/user">
                        <button className="navbar-user">
                          <img src={userIcon} alt="User Icon" className="user-icon" />
                          <span className="user-name">{user.fullname || 'NULL'}</span>
                        </button>
                      </Link>
                      <Link to="/signin">
                        <button className="navbar-user" onClick={handleLogout}>
                          <img src={logoutIcon} alt="Logout Icon" className="logout-icon" />
                          <span className="user-name">Log Out</span>
                        </button>
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
              </>
            ) : (
              ''
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
