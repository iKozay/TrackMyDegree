import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../middleware/AuthContext';
import { Menu, X, User, LogOut } from 'lucide-react';

interface User {
  fullname?: string;
  type?: string;
}

const Navbar: React.FC = () => {
  const { isLoggedIn, loading, logout, user } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const timelineActivePaths = ['/timeline_initial', '/timeline_change', '/uploadTranscript'];

  // Handle logout logic
  const handleLogout = (): void => {
    logout();
    navigate('/signin');
  };

  // Toggle menu
  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent): void => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        isMenuOpen
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMenuOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div ref={menuRef}>
      <nav className="bg-red-900 text-white h-[120px] px-5 py-8">
        <div className="container mx-auto flex items-center justify-between h-full">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3">
            <span className="text-4xl font-medium text-white hidden sm:block">
              TrackMyDegree
            </span>
            <span className="text-4xl sm:hidden">🎓</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex items-center gap-8">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `text-xl font-medium px-3 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 ${
                    isActive 
                      ? 'text-white relative after:absolute after:bottom-[-24px] after:left-0 after:right-0 after:h-1.5 after:bg-white after:rounded-lg' 
                      : 'text-gray-200'
                  }`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/timeline_initial"
                className={() =>
                  `text-xl font-medium px-3 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 ${
                    timelineActivePaths.includes(location.pathname)
                      ? 'text-white relative after:absolute after:bottom-[-24px] after:left-0 after:right-0 after:h-1.5 after:bg-white after:rounded-lg'
                      : 'text-gray-200'
                  }`
                }
              >
                Timeline
              </NavLink>
              <NavLink
                to="/courselist"
                className={({ isActive }) =>
                  `text-xl font-medium px-3 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 ${
                    isActive
                      ? 'text-white relative after:absolute after:bottom-[-24px] after:left-0 after:right-0 after:h-1.5 after:bg-white after:rounded-lg'
                      : 'text-gray-200'
                  }`
                }
              >
                Courses
              </NavLink>
              {user && user.type === 'admin' && (
                <>
                  <span className="text-gray-300 text-2xl">|</span>
                  <Link
                    to="/adminpage"
                    className="text-xl font-medium px-3 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 hover:scale-105 text-gray-200"
                  >
                    Admin
                  </Link>
                </>
              )}
            </div>

            {/* Auth Buttons */}
            {!loading && (
              <div className="flex items-center gap-4">
                {isLoggedIn && user ? (
                  <>
                    <Link to="/user">
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 text-gray-200">
                        <User size={20} />
                        <span className="text-sm font-medium">
                          {user.fullname || 'User'}
                        </span>
                      </button>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 text-gray-200"
                    >
                      <LogOut size={20} />
                      <span className="text-sm font-medium">Log Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/signin">
                      <button className="bg-white text-black font-bold text-sm px-4 py-2 rounded-lg border-2 border-black transition-all duration-300 hover:bg-black hover:text-white">
                        Sign in
                      </button>
                    </Link>
                    <Link to="/signup">
                      <button className="bg-white text-black font-bold text-sm px-4 py-2 rounded-lg border-2 border-black transition-all duration-300 hover:bg-blue-500 hover:text-white hover:border-blue-500">
                        Register
                      </button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden fixed top-0 right-0 h-full w-64 bg-red-900 transform transition-transform duration-300 ease-in-out z-50 ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full p-6">
            {/* Close Button */}
            <button
              onClick={toggleMenu}
              className="self-end p-2 rounded-lg hover:bg-white/10 transition-colors mb-6"
            >
              <X size={24} />
            </button>

            {/* Mobile Auth Buttons */}
            {!loading && (
              <div className="flex flex-col gap-4 pb-6 mb-6 border-b border-white/20">
                {isLoggedIn && user ? (
                  <>
                    <Link to="/user" onClick={toggleMenu}>
                      <button className="flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-300 hover:bg-white/10 text-left">
                        <User size={20} />
                        <span className="font-medium">
                          {user.fullname || 'User'}
                        </span>
                      </button>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        toggleMenu();
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-300 hover:bg-white/10 text-left"
                    >
                      <LogOut size={20} />
                      <span className="font-medium">Log Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/signin" onClick={toggleMenu}>
                      <button className="w-full bg-white text-black font-bold py-3 px-4 rounded-lg border-2 border-black transition-all duration-300 hover:bg-black hover:text-white">
                        Sign in
                      </button>
                    </Link>
                    <Link to="/signup" onClick={toggleMenu}>
                      <button className="w-full bg-white text-black font-bold py-3 px-4 rounded-lg border-2 border-black transition-all duration-300 hover:bg-blue-500 hover:text-white hover:border-blue-500">
                        Register
                      </button>
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Mobile Navigation Links */}
            <div className="flex flex-col gap-6 flex-1">
              <NavLink
                to="/"
                onClick={toggleMenu}
                className={({ isActive }) =>
                  `text-lg font-medium py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white/10 ${
                    isActive
                      ? 'text-white bg-white/10 border-l-4 border-white'
                      : 'text-gray-200'
                  }`
                }
              >
                Home
              </NavLink>
              <NavLink
                to="/timeline_initial"
                onClick={toggleMenu}
                className={() =>
                  `text-lg font-medium py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white/10 ${
                    timelineActivePaths.includes(location.pathname)
                      ? 'text-white bg-white/10 border-l-4 border-white'
                      : 'text-gray-200'
                  }`
                }
              >
                Timeline
              </NavLink>
              <NavLink
                to="/courselist"
                onClick={toggleMenu}
                className={({ isActive }) =>
                  `text-lg font-medium py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white/10 ${
                    isActive
                      ? 'text-white bg-white/10 border-l-4 border-white'
                      : 'text-gray-200'
                  }`
                }
              >
                Courses
              </NavLink>
              {user && user.type === 'admin' && (
                <Link
                  to="/adminpage"
                  onClick={toggleMenu}
                  className="text-lg font-medium py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white/10 text-gray-200"
                >
                  Admin
                </Link>
              )}
            </div>

            {/* Mobile Feedback Button */}
            <div className="mt-auto pt-6 border-t border-white/20">
              <button
                onClick={() => {
                  window.open(
                    'https://docs.google.com/forms/d/e/1FAIpQLScr67TcEpPV1wNCTM5H53hPwRgplAvkYmxg72LKgHihCSmzKg/viewform',
                    '_blank'
                  );
                  toggleMenu();
                }}
                className="w-full py-3 px-4 text-center font-medium transition-all duration-300 hover:bg-white/10 rounded-lg"
              >
                Submit Feedback!
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={toggleMenu}
          />
        )}
      </nav>
    </div>
  );
};

export default Navbar;
