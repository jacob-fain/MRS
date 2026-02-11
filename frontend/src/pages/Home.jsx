import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import requestService from '../services/request.service';

const Home = () => {
  const { user } = useAuth();

  // Get user's recent requests
  const { data: requestsData } = useQuery({
    queryKey: ['userRequests', 'recent'],
    queryFn: () => requestService.getRequests({ limit: 5 }),
    enabled: !!user,
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900 bg-opacity-50 text-yellow-200 border border-yellow-700';
      case 'approved':
        return 'bg-blue-900 bg-opacity-50 text-blue-200 border border-blue-700';
      case 'completed':
        return 'bg-green-900 bg-opacity-50 text-green-200 border border-green-700';
      case 'rejected':
        return 'bg-red-900 bg-opacity-50 text-red-200 border border-red-700';
      default:
        return 'bg-gray-700 text-gray-200 border border-gray-600';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12 px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Welcome to MRS
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-8">
          Request movies and TV shows for your Plex Media Server
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors min-h-[44px]"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-gray-600 text-base font-medium rounded-md text-gray-200 bg-gray-700 hover:bg-gray-600 transition-colors min-h-[44px]"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Welcome back, {user.username}!
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-300">
          What would you like to watch today?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Link
          to="/search"
          className="bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-xl transition-all border border-gray-700 hover:border-gray-600"
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-medium text-white">Search Media</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Browse movies and TV shows to request
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link
          to="/requests"
          className="bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-xl transition-all border border-gray-700 hover:border-gray-600"
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-600 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-medium text-white">My Requests</h3>
                <p className="mt-1 text-sm text-gray-400">
                  View and manage your requests
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {requestsData && requestsData.requests.length > 0 && (
        <div className="bg-gray-800 shadow rounded-lg border border-gray-700">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-700">
            <h3 className="text-lg leading-6 font-medium text-white">
              Recent Requests
            </h3>
          </div>
          <ul className="divide-y divide-gray-700">
            {requestsData.requests.slice(0, 5).map((request) => (
              <li key={request.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img
                      src={request.poster_path 
                        ? `https://image.tmdb.org/t/p/w92${request.poster_path}`
                        : '/placeholder-poster.png'}
                      alt={request.title}
                      className="w-10 h-14 object-cover rounded"
                      onError={(e) => {
                        e.target.src = '/placeholder-poster.png';
                      }}
                    />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-white">{request.title}</p>
                      <p className="text-sm text-gray-400">
                        {request.year} • {request.media_type === 'movie' ? 'Movie' : 'TV Show'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="bg-gray-700 px-4 py-3 sm:px-6 border-t border-gray-600">
            <Link
              to="/requests"
              className="block text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] flex items-center"
            >
              View all requests →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
