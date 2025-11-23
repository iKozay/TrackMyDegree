// src/components/Navbar.js
import React, { useContext, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../middleware/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../css/Navbar.css';
import userIcon from '../icons/userIcon2.png';
import logoutIcon from '../icons/logoutIcon.png';
import logo from '../images/trackmydegreelogo.png';

const Navbar = () => {
  const { isLoggedIn, loading, logout, user } = useContext(AuthContext);
  const menuRef = useRef(null);
  const location = useLocation();
  const timelineActivePaths = ['/timeline_initial', '/timeline_change'];

  const handleLogout = () => {
    logout();
  };

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
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div ref={menuRef}>
      <nav className="navbar navbar-expand-lg custom-navbar custom-navbar-height custom-navbar-padding">
        <div
          className="container-fluid custom-navbar-left-align"
          style={{ maxWidth: 1280, margin: '0 auto', minWidth: 0 }}
        >
          <Link
            className="navbar-brand custom-navbar-brand-left"
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
          >
            <span className="brand-text" style={{ whiteSpace: 'nowrap' }}>
              TrackMyDegree
            </span>
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

          <div className="collapse navbar-collapse" id="navbarNavAltMarkup" style={{ flex: '1 1 auto', minWidth: 0 }}>
            <button className="close-nav" onClick={toggleMenu}>
              &times;
            </button>

            {/* ===== 6 equal columns ===== */}
            <div className="nav-rail" style={{ width: '100%' }}>
              <NavLink to="/" className={({ isActive }) => 'nav-link rail-link' + (isActive ? ' active' : '')}>
                Home
              </NavLink>

              <NavLink
                to="/timeline_initial"
                className={() =>
                  'nav-link rail-link' + (timelineActivePaths.includes(location.pathname) ? ' active' : '')
                }
              >
                Timeline
              </NavLink>

              <NavLink
                to="/courselist"
                className={({ isActive }) => 'nav-link rail-link' + (isActive ? ' active' : '')}
              >
                Courses
              </NavLink>

              <NavLink
                to="/requirements"
                className={({ isActive }) => 'nav-link rail-link' + (isActive ? ' active' : '')}
              >
                Requirements
              </NavLink>

              {/* Column 5 */}
              <div className="rail-cell">
                {!loading &&
                  (isLoggedIn && user ? (
                    <Link to="/user" className="user-link">
                      <button className="navbar-user rail-btn">
                        <img src={userIcon} alt="User Icon" className="user-icon" />
                        <span className="user-name" style={{ marginLeft: 6 }}>
                          {user.fullname || 'NULL'}
                        </span>
                      </button>
                    </Link>
                  ) : (
                    <Link to="/signin">
                      <button className="navbar-button navbar-button-signin rail-btn">Sign in</button>
                    </Link>
                  ))}
              </div>

              {/* Column 6 */}
              <div className="rail-cell">
                {!loading &&
                  (isLoggedIn ? (
                    <button className="navbar-user rail-btn" onClick={handleLogout}>
                      <img src={logoutIcon} alt="Logout Icon" className="logout-icon" />
                      <span className="user-name" style={{ marginLeft: 4 }}>
                        Log Out
                      </span>
                    </button>
                  ) : (
                    <Link to="/signup">
                      <button className="navbar-button navbar-button-register rail-btn">Register</button>
                    </Link>
                  ))}
              </div>
            </div>

            {/* mobile-only feedback (unchanged) */}
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
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
