import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import mediaService from '../services/media.service';
import requestService from '../services/request.service';

// Avatar component with fallback for cast and crew photos
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
        <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
          <img
            src={backdropUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-60"></div>
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-sm text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-gray-900/95 transition-all flex items-center space-x-2 font-semibold shadow-lg border border-gray-700 min-h-[44px]"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Show back button if no backdrop */}
        {!backdropUrl && (
          <button
            onClick={() => navigate(-1)}
            className="mb-6 bg-gray-800 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-gray-700 transition-all flex items-center space-x-2 font-semibold border border-gray-700 min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
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

              <div className="p-4 sm:p-6">
                {mediaDetails.in_plex ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 bg-gray-600 text-gray-400 rounded-md font-medium cursor-not-allowed min-h-[44px]"
                  >
                    Already in Plex
                  </button>
                ) : isRequested() ? (
                  <button
                    disabled
                    className="w-full py-3 px-4 bg-gray-600 text-gray-400 rounded-md font-medium cursor-not-allowed min-h-[44px]"
                  >
                    Already Requested
                  </button>
                ) : (
                  <button
                    onClick={handleRequest}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors min-h-[44px]"
                  >
                    Request {type === 'movie' ? 'Movie' : 'TV Show'}
                  </button>
                )}
              </div>
            </div>

            {/* Additional Info Card */}
            <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mt-6 border border-gray-700">
              <h3 className="font-semibold text-white mb-4 text-lg">Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-400">Release Date</dt>
                  <dd className="text-sm text-gray-200">{releaseDate || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-400">TMDB Rating</dt>
                  <dd className="text-sm text-gray-200 flex items-center">
                    <svg className="w-4 h-4 text-yellow-400 fill-current mr-1" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    {mediaDetails.vote_average?.toFixed(1) || 'N/A'} / 10
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-400">TMDB Votes</dt>
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

            {/* Ratings Card */}
            {mediaDetails.ratings && (mediaDetails.ratings.imdb_rating || mediaDetails.ratings.rotten_tomatoes_score || mediaDetails.ratings.metascore) && (
              <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Ratings</h3>
                <div className="flex flex-wrap gap-3">
                  {mediaDetails.ratings.imdb_rating && mediaDetails.ratings.imdb_rating !== 'N/A' && (
                    <div className="bg-gray-700/50 rounded-lg px-4 py-2 flex items-center space-x-2">
                      <span className="text-xl">⭐</span>
                      <div>
                        <div className="text-lg font-bold text-white">{mediaDetails.ratings.imdb_rating}<span className="text-sm text-gray-400">/10</span></div>
                        <div className="text-xs text-gray-400">IMDB</div>
                      </div>
                    </div>
                  )}
                  {mediaDetails.ratings.rotten_tomatoes_score && mediaDetails.ratings.rotten_tomatoes_score !== 'N/A' && (
                    <div className="bg-gray-700/50 rounded-lg px-4 py-2 flex items-center space-x-2">
                      <span className="text-xl">🍅</span>
                      <div>
                        <div className="text-lg font-bold text-white">{mediaDetails.ratings.rotten_tomatoes_score}</div>
                        <div className="text-xs text-gray-400">Rotten Tomatoes</div>
                      </div>
                    </div>
                  )}
                  {mediaDetails.ratings.metascore && mediaDetails.ratings.metascore !== 'N/A' && (
                    <div className="bg-gray-700/50 rounded-lg px-4 py-2 flex items-center space-x-2">
                      <span className="text-sm font-bold text-green-400">MC</span>
                      <div>
                        <div className="text-lg font-bold text-white">{mediaDetails.ratings.metascore}<span className="text-sm text-gray-400">/100</span></div>
                        <div className="text-xs text-gray-400">Metacritic</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Box Office & Awards */}
            {mediaDetails.ratings && (mediaDetails.ratings.box_office || mediaDetails.ratings.awards) && (
              <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-3">Box Office & Awards</h3>
                <dl className="space-y-2">
                  {mediaDetails.ratings.box_office && mediaDetails.ratings.box_office !== 'N/A' && (
                    <div>
                      <dt className="text-sm font-medium text-gray-400">Box Office</dt>
                      <dd className="text-base text-white font-semibold">{mediaDetails.ratings.box_office}</dd>
                    </div>
                  )}
                  {mediaDetails.ratings.awards && mediaDetails.ratings.awards !== 'N/A' && (
                    <div>
                      <dt className="text-sm font-medium text-gray-400">Awards</dt>
                      <dd className="text-sm text-gray-200">{mediaDetails.ratings.awards}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Cast */}
            {mediaDetails.credits && mediaDetails.credits.cast && mediaDetails.credits.cast.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">Cast</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {mediaDetails.credits.cast.slice(0, 10).map((person) => (
                    <div
                      key={person.id}
                      onClick={() => navigate(`/person/${person.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/person/${person.id}`);
                        }
                      }}
                      className="text-center cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
                      aria-label={`View ${person.name}'s filmography`}
                    >
                      <div className="aspect-[3/4] mb-2">
                        <AvatarWithFallback
                          src={person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null}
                          alt={person.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                      <h3 className="font-medium text-sm text-white truncate hover:text-blue-400">{person.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{person.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Crew */}
            {mediaDetails.credits && mediaDetails.credits.crew && (
              <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-4">Crew</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mediaDetails.credits.crew
                    .filter(person => ['Director', 'Producer', 'Executive Producer', 'Screenplay', 'Writer'].includes(person.job))
                    .slice(0, 9)
                    .map((person, index) => (
                      <div
                        key={`${person.id}-${index}`}
                        onClick={() => navigate(`/person/${person.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/person/${person.id}`);
                          }
                        }}
                        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-700/50 transition-colors p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={`View ${person.name}'s filmography`}
                      >
                        <div className="flex-shrink-0">
                          <AvatarWithFallback
                            src={person.profile_path ? `https://image.tmdb.org/t/p/w92${person.profile_path}` : null}
                            alt={person.name}
                            className="w-12 h-12 object-cover rounded-full"
                            isRound={true}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm text-white truncate hover:text-blue-400">{person.name}</h3>
                          <p className="text-xs text-gray-400 truncate">{person.job}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;
