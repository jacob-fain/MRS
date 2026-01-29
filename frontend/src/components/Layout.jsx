import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
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
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
