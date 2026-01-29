import React from 'react';
import { useNavigate } from 'react-router-dom';

const MediaCard = ({ media, onRequest, isRequested }) => {
  const navigate = useNavigate();
  
  const title = media.title || media.name;
  const releaseDate = media.release_date || media.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const posterUrl = media.poster_url || (media.poster_path 
    ? `https://image.tmdb.org/t/p/w342${media.poster_path}`
    : '/placeholder-poster.png');

  const handleCardClick = (e) => {
    // Don't navigate if clicking on the request button
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return;
    }
    
    const mediaType = media.media_type || 'movie';
    navigate(`/movie/${mediaType}/${media.id}`);
  };

  const handleRequestClick = (e) => {
    e.stopPropagation(); // Prevent card click navigation
    onRequest();
  };

  return (
    <div 
      className="bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 border border-gray-700"
      onClick={handleCardClick}
    >
      <div className="relative aspect-[2/3]">
        <img
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = '/placeholder-poster.png';
          }}
        />
        {media.in_plex && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
            In Plex
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-white line-clamp-1">{title}</h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-gray-400">
            {year} • {media.media_type === 'movie' ? 'Movie' : 'TV Show'}
          </span>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="text-sm text-gray-300 ml-1">
              {media.vote_average?.toFixed(1) || 'N/A'}
            </span>
          </div>
        </div>
        
        <p className="mt-2 text-sm text-gray-300 line-clamp-2">
          {media.overview || 'No description available'}
        </p>
        
        <div className="mt-4">
          {media.in_plex ? (
            <button
              disabled
              className="w-full py-2 px-4 bg-gray-600 text-gray-400 rounded-md text-sm font-medium cursor-not-allowed"
              onClick={(e) => e.stopPropagation()}
            >
              Already in Plex
            </button>
          ) : isRequested ? (
            <button
              disabled
              className="w-full py-2 px-4 bg-gray-600 text-gray-400 rounded-md text-sm font-medium cursor-not-allowed"
              onClick={(e) => e.stopPropagation()}
            >
              Already Requested
            </button>
          ) : (
            <button
              onClick={handleRequestClick}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
            >
              Request
            </button>
          )}
        </div>
        
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500">Click for details</span>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
