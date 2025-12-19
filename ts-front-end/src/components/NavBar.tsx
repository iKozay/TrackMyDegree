import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/components/navbar.css";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { label: "Timeline", href: "/timeline" },
  { label: "Courses", href: "/courses" },
  { label: "Requirements", href: "/requirements" },
];

export const Navbar: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const closeMenus = () => {
    setIsMobileOpen(false);
    setIsProfileOpen(false);
  };

  const navigateTo = (path: string) => {
    closeMenus();
    navigate(path);
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen((prev) => !prev);
    setIsProfileOpen(false);
  };

  const handleProfileToggle = () => {
    setIsProfileOpen((prev) => !prev);
  };

  const goToProfile = () => {
    const profilePath =
      user?.role === "admin" ? "/profile/admin" : "/profile/student";
    navigateTo(profilePath);
  };

  const handleLogout = async () => {
    await logout();
    navigateTo("/");
  };

  const avatarInitial = (user?.name || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="navbar">
      <nav className="navbar__inner" aria-label="Main navigation">
        {/* LEFT: Logo + text */}
        <button
          type="button"
          className="navbar__brand navbar__brand--button"
          onClick={() => navigateTo("/")}>
          <div className="navbar__logo">🎓</div>
          <span className="navbar__brand-text">
            Track My <span className="navbar__brand-highlight">Degree</span>
          </span>
        </button>

        {/* CENTER: Nav links (desktop) */}
        <ul className="navbar__links">
          {navItems.map((item) => (
            <li key={item.label} className="navbar__link-item">
              <button
                type="button"
                className="navbar__link navbar__link--button"
                onClick={() => navigateTo(item.href)}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* RIGHT: Actions (desktop) */}
        <div className="navbar__actions">
          {!isAuthenticated ? (
            <>
              <button
                className="navbar__btn navbar__btn--ghost"
                type="button"
                onClick={() => navigateTo("/login")}>
                Login
              </button>
              <button
                className="navbar__btn navbar__btn--primary"
                type="button"
                onClick={() => navigateTo("/signup")}>
                Sign up
              </button>
            </>
          ) : (
            <div className="navbar__profile">
              <button
                className="navbar__profile-btn"
                type="button"
                onClick={handleProfileToggle}>
                <div className="navbar__avatar">
                  <span>{avatarInitial}</span>
                </div>
                <div className="navbar__profile-info">
                  <span className="navbar__profile-name">
                    {user?.name || "Student"}
                  </span>
                </div>
                <span className="navbar__profile-caret">▾</span>
              </button>

              {isProfileOpen && (
                <div className="navbar__profile-menu">
                  <button
                    type="button"
                    className="navbar__profile-menu-item"
                    onClick={goToProfile}>
                    View profile
                  </button>
                  <button
                    type="button"
                    className="navbar__profile-menu-item navbar__profile-menu-item--danger"
                    onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE: Hamburger button */}
        <button
          className="navbar__toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileOpen}
          onClick={toggleMobileMenu}
          type="button">
          <span className="navbar__toggle-line"></span>
          <span className="navbar__toggle-line"></span>
          <span className="navbar__toggle-line"></span>
        </button>

        {/* MOBILE DROPDOWN */}
        {isMobileOpen && (
          <div className="navbar__mobile-menu">
            <ul className="navbar__mobile-links">
              {navItems.map((item) => (
                <li key={item.label} className="navbar__mobile-link-item">
                  <button
                    type="button"
                    className="navbar__mobile-link navbar__mobile-link--button"
                    onClick={() => navigateTo(item.href)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>

            <div className="navbar__mobile-actions">
              {!isAuthenticated ? (
                <>
                  <button
                    className="navbar__btn navbar__btn--ghost"
                    type="button"
                    onClick={() => navigateTo("/login")}>
                    Login
                  </button>
                  <button
                    className="navbar__btn navbar__btn--primary"
                    type="button"
                    onClick={() => navigateTo("/signup")}>
                    Sign up
                  </button>
                </>
              ) : (
                <div className="navbar__profile">
                  <button
                    className="navbar__profile-btn"
                    type="button"
                    onClick={handleProfileToggle}>
                    <div className="navbar__avatar">
                      <span>{avatarInitial}</span>
                    </div>
                    <div className="navbar__profile-info">
                      <span className="navbar__profile-name">
                        {user?.name || "Student"}
                      </span>
                    </div>
                    <span className="navbar__profile-caret">▾</span>
                  </button>

                  {isProfileOpen && (
                    <div className="navbar__profile-menu">
                      <button
                        type="button"
                        className="navbar__profile-menu-item"
                        onClick={goToProfile}>
                        View profile
                      </button>
                      <button
                        type="button"
                        className="navbar__profile-menu-item navbar__profile-menu-item--danger"
                        onClick={handleLogout}>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};
