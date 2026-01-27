import React from 'react';

const MediaCard = ({ media, onRequest, isRequested }) => {
  const title = media.title || media.name;
  const releaseDate = media.release_date || media.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const posterUrl = media.poster_url || (media.poster_path 
    ? `https://image.tmdb.org/t/p/w342${media.poster_path}`
    : '/placeholder-poster.png');

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
        <h3 className="font-semibold text-gray-900 line-clamp-1">{title}</h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-gray-500">
            {year} • {media.media_type === 'movie' ? 'Movie' : 'TV Show'}
          </span>
          <div className="flex items-center">
            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
            <span className="text-sm text-gray-600 ml-1">
              {media.vote_average?.toFixed(1) || 'N/A'}
            </span>
          </div>
        </div>
        
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
          {media.overview || 'No description available'}
        </p>
        
        <div className="mt-4">
          {media.in_plex ? (
            <button
              disabled
              className="w-full py-2 px-4 bg-gray-300 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed"
            >
              Already in Plex
            </button>
          ) : isRequested ? (
            <button
              disabled
              className="w-full py-2 px-4 bg-gray-300 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed"
            >
              Already Requested
            </button>
          ) : (
            <button
              onClick={onRequest}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;