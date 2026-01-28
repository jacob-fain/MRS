import React, { useState } from 'react';

const MediaCard = ({ media, onRequest, isRequested }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const title = media.title || media.name;
  const releaseDate = media.release_date || media.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  const posterUrl = media.poster_url || (media.poster_path 
    ? `https://image.tmdb.org/t/p/w342${media.poster_path}`
    : null);

  const formatRating = (rating) => {
    if (!rating || rating === 0) return 'NR';
    return rating.toFixed(1);
  };

  const getRatingColor = (rating) => {
    if (!rating || rating === 0) return 'text-gray-400';
    if (rating >= 8) return 'text-green-600';
    if (rating >= 7) return 'text-yellow-600';
    if (rating >= 6) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatGenres = (genreIds) => {
    // TMDB genre mapping (simplified - in real app might come from API)
    const genreMap = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
      // TV Genres
      10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary',
      18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery', 10763: 'News',
      10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 37: 'Western'
    };
    
    if (!genreIds || !Array.isArray(genreIds)) return [];
    return genreIds.slice(0, 2).map(id => genreMap[id]).filter(Boolean);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
      {/* Poster Section */}
      <div className="relative aspect-[2/3] bg-gray-100">
        {/* Loading Skeleton */}
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-400">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Poster Image */}
        {posterUrl && !imageError && (
          <img
            src={posterUrl}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        
        {/* No Poster Fallback */}
        {(!posterUrl || imageError) && !imageLoading && (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <p className="text-xs font-medium">No Image</p>
            </div>
          </div>
        )}
        
        {/* In Plex Badge - Enhanced */}
        {media.in_plex && (
          <div className="absolute top-3 right-3">
            <div className="bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center space-x-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>In Plex</span>
            </div>
          </div>
        )}
        
        {/* Rating Badge */}
        <div className="absolute top-3 left-3">
          <div className="bg-black/75 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs font-semibold">
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className={getRatingColor(media.vote_average)}>
                {formatRating(media.vote_average)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-5">
        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        
        {/* Metadata Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">{year || 'TBA'}</span>
            <span>•</span>
            <span className="capitalize">{media.media_type === 'movie' ? 'Movie' : 'TV Show'}</span>
          </div>
          {media.vote_count > 0 && (
            <div className="text-xs text-gray-500">
              {media.vote_count.toLocaleString()} votes
            </div>
          )}
        </div>
        
        {/* Genres */}
        {formatGenres(media.genre_ids).length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {formatGenres(media.genre_ids).map((genre, index) => (
                <span 
                  key={index}
                  className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Overview */}
        <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
          {media.overview || 'No description available for this title.'}
        </p>
        
        {/* Action Button */}
        <div className="mt-auto">
          {media.in_plex ? (
            <button
              disabled
              className="w-full py-3 px-4 bg-green-100 text-green-700 rounded-lg text-sm font-semibold cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Available in Plex</span>
            </button>
          ) : isRequested ? (
            <button
              disabled
              className="w-full py-3 px-4 bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>Request Pending</span>
            </button>
          ) : (
            <button
              onClick={onRequest}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 flex items-center justify-center space-x-2 group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Request This</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaCard;