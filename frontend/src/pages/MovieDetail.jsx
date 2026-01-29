import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import mediaService from '../services/media.service';
import requestService from '../services/request.service';

// Avatar component with fallback
const AvatarWithFallback = ({ src, alt, className, isRound = false }) => {
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = () => {
    setImageError(true);
  };

  if (imageError || !src) {
    return (
      <div className={`${className} bg-gray-600 flex items-center justify-center`}>
        <svg className="w-1/2 h-1/2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleImageError}
    />
  );
};

const MovieDetail = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: mediaDetails, isLoading, error } = useQuery({
    queryKey: ['mediaDetails', type, id],
    queryFn: () => mediaService.getMediaDetails(type, id),
    enabled: !!(type && id),
  });

  const { data: userRequests } = useQuery({
    queryKey: ['userRequests'],
    queryFn: () => requestService.getRequests(),
  });

  const handleRequest = async () => {
    try {
      await requestService.createRequest({
        title: mediaDetails.title || mediaDetails.name,
        year: mediaDetails.release_date ? parseInt(mediaDetails.release_date.substring(0, 4)) : 
              mediaDetails.first_air_date ? parseInt(mediaDetails.first_air_date.substring(0, 4)) : 0,
        media_type: type,
        tmdb_id: parseInt(id),
        overview: mediaDetails.overview,
        poster_path: mediaDetails.poster_path,
      });
      queryClient.invalidateQueries(['userRequests']);
    } catch (err) {
      console.error('Failed to create request:', err);
    }
  };

  const isRequested = () => {
    if (!userRequests?.requests || !mediaDetails) return false;
    return userRequests.requests.some(
      (req) => req.tmdb_id === parseInt(id) && req.media_type === type
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (error || !mediaDetails) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error loading details</h2>
          <button 
            onClick={() => navigate(-1)}
            className="text-blue-400 hover:text-blue-300"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const title = mediaDetails.title || mediaDetails.name;
  const releaseDate = mediaDetails.release_date || mediaDetails.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const posterUrl = mediaDetails.poster_url || (mediaDetails.poster_path 
    ? `https://image.tmdb.org/t/p/w500${mediaDetails.poster_path}`
    : '/placeholder-poster.png');
  const backdropUrl = mediaDetails.backdrop_path
    ? `https://image.tmdb.org/t/p/original${mediaDetails.backdrop_path}`
    : null;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section with Backdrop */}
      {backdropUrl && (
        <div className="relative h-96 overflow-hidden">
          <img 
            src={backdropUrl} 
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-60"></div>
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-all"
          >
            ← Back
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Poster and Actions */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700">
              <img
                src={posterUrl}
                alt={title}
                className="w-full object-cover"
                onError={(e) => {
                  e.target.src = '/placeholder-poster.png';
                }}
              />
              
              <div className="p-6">
                {mediaDetails.in_plex ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 bg-gray-600 text-gray-400 rounded-md font-medium cursor-not-allowed"
                  >
                    Already in Plex
                  </button>
                ) : isRequested() ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 bg-gray-600 text-gray-400 rounded-md font-medium cursor-not-allowed"
                  >
                    Already Requested
                  </button>
                ) : (
                  <button
                    onClick={handleRequest}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                  >
                    Request {type === 'movie' ? 'Movie' : 'TV Show'}
                  </button>
                )}
              </div>
            </div>

            {/* Additional Info Card */}
            <div className="bg-gray-800 rounded-lg shadow-md p-6 mt-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4">Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-400">Release Date</dt>
                  <dd className="text-sm text-gray-200">{releaseDate || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-400">Rating</dt>
                  <dd className="text-sm text-gray-200 flex items-center">
                    <svg className="w-4 h-4 text-yellow-400 fill-current mr-1" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    {mediaDetails.vote_average?.toFixed(1) || 'N/A'} / 10
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-400">Vote Count</dt>
                  <dd className="text-sm text-gray-200">{mediaDetails.vote_count?.toLocaleString() || 'N/A'}</dd>
                </div>
                {mediaDetails.runtime && (
                  <div>
                    <dt className="text-sm font-medium text-gray-400">Runtime</dt>
                    <dd className="text-sm text-gray-200">{mediaDetails.runtime} minutes</dd>
                  </div>
                )}
                {mediaDetails.genres && mediaDetails.genres.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-400">Genres</dt>
                    <dd className="text-sm text-gray-200">
                      {mediaDetails.genres.map(genre => genre.name).join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Title and Overview */}
            <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>{year}</span>
                    <span>•</span>
                    <span>{type === 'movie' ? 'Movie' : 'TV Show'}</span>
                    {mediaDetails.in_plex && (
                      <>
                        <span>•</span>
                        <span className="text-green-400 font-medium">Available in Plex</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
                <p className="text-gray-300 leading-relaxed">
                  {mediaDetails.overview || 'No description available.'}
                </p>
              </div>
            </div>

            {/* Cast */}
            {mediaDetails.credits && mediaDetails.credits.cast && mediaDetails.credits.cast.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">Cast</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {mediaDetails.credits.cast.slice(0, 10).map((person) => (
                    <div key={person.id} className="text-center">
                      <div className="aspect-[3/4] mb-2">
                        <AvatarWithFallback
