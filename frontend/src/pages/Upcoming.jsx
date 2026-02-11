import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import mediaService from '../services/media.service';
import MediaCard from '../components/MediaCard';

// Skeleton loading card
const SkeletonCard = () => (
  <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse">
    <div className="aspect-[2/3] bg-gray-700"></div>
    <div className="p-4 space-y-3">
      <div className="h-5 bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      <div className="h-4 bg-gray-700 rounded w-full"></div>
    </div>
  </div>
);

const Upcoming = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mediaType, setMediaType] = useState(searchParams.get('type') || 'movie');
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page');
    const parsed = parseInt(pageParam, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  });

  // Fetch upcoming content
  const { data, isLoading, error } = useQuery({
    queryKey: ['upcoming', mediaType, page],
    queryFn: () => mediaType === 'movie'
      ? mediaService.getUpcomingMovies(page)
      : mediaService.getUpcomingTV(page),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Update URL when filters change
  React.useEffect(() => {
    const params = {};
    if (mediaType !== 'movie') params.type = mediaType;
    if (page > 1) params.page = page.toString();
    setSearchParams(params, { replace: true });
  }, [mediaType, page, setSearchParams]);

  const handleMediaTypeChange = (type) => {
    setMediaType(type);
    setPage(1);
  };

  const results = data?.results || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Upcoming</h1>
          <p className="text-gray-400">Browse releases coming in the next 6 months</p>
        </div>

        {/* Media Type Filter */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => handleMediaTypeChange('movie')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mediaType === 'movie'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => handleMediaTypeChange('tv')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mediaType === 'tv'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            TV Shows
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="max-w-md mx-auto mb-8">
            <div className="rounded-xl bg-red-900/20 border border-red-800 p-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-red-400">Error</h3>
                  <p className="text-sm text-red-300 mt-1">
                    Failed to load upcoming content. Please try again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {Array.from({ length: 20 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && results.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {results.map((media) => (
                <MediaCard key={media.id} media={media} showReleaseDate={true} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-4 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Previous</span>
                </button>

                <span className="text-gray-300">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center space-x-2 px-6 py-3 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && !error && results.length === 0 && (
          <div className="text-center py-20">
            <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <p className="text-gray-400 text-lg">No content found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upcoming;
