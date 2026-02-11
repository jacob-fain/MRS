import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isBrowseActive = () => {
    return ['/popular', '/top-rated', '/upcoming'].some(path =>
      location.pathname.startsWith(path)
    );
  };

  // Close dropdown and mobile menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsBrowseOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (isBrowseOpen) setIsBrowseOpen(false);
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isBrowseOpen, isMobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              {user && (
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="sm:hidden inline-flex items-center justify-center p-2 min-w-[44px] min-h-[44px] rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 mr-2 transition-colors duration-200"
                  aria-controls="mobile-menu"
                  aria-expanded={isMobileMenuOpen}
                  ref={mobileMenuRef}
                >
                  <span className="sr-only">
                    {isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}
                  </span>
                  {isMobileMenuOpen ? (
                    <svg className="block h-6 w-6 transition-transform duration-200 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              )}

              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-white">MRS</span>
              </Link>

              {user && (
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/search"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/search')
                        ? 'border-blue-400 text-white'
                        : 'border-transparent text-gray-300 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    Search
                  </Link>
                  <Link
                    to="/cast-search"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/cast-search')
                        ? 'border-blue-400 text-white'
                        : 'border-transparent text-gray-300 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    Cast Search
                  </Link>

                  {/* Browse Dropdown */}
                  <div className="relative inline-flex items-center" ref={dropdownRef}>
                    <button
                      onClick={() => setIsBrowseOpen(!isBrowseOpen)}
                      aria-haspopup="true"
                      aria-expanded={isBrowseOpen}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-16 ${
                        isBrowseActive()
                          ? 'border-blue-400 text-white'
                          : 'border-transparent text-gray-300 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      Browse
                    </button>

                    {isBrowseOpen && (
                      <div
                        className="absolute z-10 left-0 top-full mt-0 w-48 rounded-md shadow-lg bg-gray-800 border border-gray-700"
                        role="menu"
                        aria-orientation="vertical"
                      >
                        <div className="py-1">
                          <Link
                            to="/popular"
                            onClick={() => setIsBrowseOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                          >
                            Popular
                          </Link>
                          <Link
                            to="/top-rated"
                            onClick={() => setIsBrowseOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                          >
                            Top Rated
                          </Link>
                          <Link
                            to="/upcoming"
                            onClick={() => setIsBrowseOpen(false)}
                            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                          >
                            Upcoming
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    to="/requests"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/requests')
                        ? 'border-blue-400 text-white'
                        : 'border-transparent text-gray-300 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    My Requests
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive('/admin')
                          ? 'border-blue-400 text-white'
                          : 'border-transparent text-gray-300 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      Admin
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-200">{user.username}</span>
                  {isAdmin && (
                    <span className="px-2 py-1 text-xs font-semibold text-blue-200 bg-blue-900 rounded-full">
                      Admin
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-white focus:outline-none transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        {user && (
          <div
            className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}
            id="mobile-menu"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-700">
              <Link
                to="/search"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium min-h-[44px] flex items-center ${
                  isActive('/search')
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Search
              </Link>
              <Link
                to="/cast-search"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium min-h-[44px] flex items-center ${
                  isActive('/cast-search')
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Cast Search
              </Link>

              {/* Browse submenu in mobile */}
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Browse
                </div>
                <Link
                  to="/popular"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block pl-6 pr-3 py-2 rounded-md text-base font-medium min-h-[44px] flex items-center ${
                    isActive('/popular')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Popular
                </Link>
                <Link
                  to="/top-rated"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block pl-6 pr-3 py-2 rounded-md text-base font-medium min-h-[44px] flex items-center ${
                    isActive('/top-rated')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Top Rated
                </Link>
                <Link
                  to="/upcoming"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block pl-6 pr-3 py-2 rounded-md text-base font-medium min-h-[44px] flex items-center ${
                    isActive('/upcoming')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Upcoming
                </Link>
              </div>

              <Link
                to="/requests"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium min-h-[44px] flex items-center ${
                  isActive('/requests')
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                My Requests
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium min-h-[44px] flex items-center ${
                    isActive('/admin')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
