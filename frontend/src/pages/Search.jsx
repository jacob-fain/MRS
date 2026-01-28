import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import mediaService from '../services/media.service';
import requestService from '../services/request.service';
import MediaCard from '../components/MediaCard';

// Loading skeleton component for cards
const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
    <div className="aspect-[2/3] bg-gray-200"></div>
    <div className="p-5">
      <div className="h-6 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
      <div className="flex gap-1 mb-3">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showTVShows, setShowTVShows] = useState(false);
  const queryClient = useQueryClient();

  // Debounce search input
  const debouncedSearch = useCallback(
    debounce((query) => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setPage(1);
  };

  // Calculate mainstream score for sorting (vote_count is primary indicator of mainstream appeal)
  const calculateMainstreamScore = (media) => {
    const voteCount = media.vote_count || 0;
    const popularity = media.popularity || 0;
    const voteAverage = media.vote_average || 0;
    
    // vote_count is the best indicator of how "mainstream" content is
    // More votes = more people have seen it = more mainstream
    // Secondary factors: popularity and quality
    const score = (voteCount * 0.1) + (popularity * 0.3) + (voteAverage * 0.1);
    
    return score;
  };

  // Search query
  const { data: searchResults, isLoading, error, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery, page],
    queryFn: () => mediaService.searchMedia(debouncedQuery, page, true),
    enabled: debouncedQuery.length > 0,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    if (!searchResults?.results) return searchResults;
    
    // 1. Filter by media type based on toggle
    let filteredResults = searchResults.results;
    if (!showTVShows) {
      filteredResults = filteredResults.filter(item => item.media_type === 'movie');
    }
    
    // 2. Separate movies and TV shows for different sorting
    const movies = filteredResults.filter(item => item.media_type === 'movie');
    const tvShows = filteredResults.filter(item => item.media_type === 'tv');
    
    // 3. Sort each type by mainstream score
    const sortedMovies = [...movies].sort((a, b) => {
      const scoreA = calculateMainstreamScore(a);
      const scoreB = calculateMainstreamScore(b);
      return scoreB - scoreA; // Higher scores first
    });
    
    const sortedTVShows = [...tvShows].sort((a, b) => {
      const scoreA = calculateMainstreamScore(a);
      const scoreB = calculateMainstreamScore(b);
      return scoreB - scoreA; // Higher scores first
    });
    
    // 4. Combine: movies first, then TV shows
    const finalResults = [...sortedMovies, ...sortedTVShows];
    
    // Debug logging
    if (debouncedQuery.toLowerCase().includes('star wars') && finalResults.length > 0) {
      console.log('=== SEARCH RESULTS (Movies First) ===');
      finalResults.slice(0, 10).forEach((item, index) => {
        const score = calculateMainstreamScore(item);
        console.log(`${index + 1}. "${item.title || item.name}" - Type: ${item.media_type}, Votes: ${item.vote_count}, Pop: ${item.popularity}, Score: ${score.toFixed(2)}`);
      });
    }
    
    return {
      ...searchResults,
      results: finalResults
    };
  }, [searchResults, showTVShows, debouncedQuery]);

  // Get user's existing requests
  const { data: userRequests } = useQuery({
    queryKey: ['userRequests'],
    queryFn: () => requestService.getRequests(),
  });

  const handleRequest = async (media) => {
    try {
      await requestService.createRequest({
        title: media.title || media.name,
        year: media.release_date ? parseInt(media.release_date.substring(0, 4)) : 
              media.first_air_date ? parseInt(media.first_air_date.substring(0, 4)) : 0,
        media_type: media.media_type,
        tmdb_id: media.id,
        overview: media.overview,
        poster_path: media.poster_path,
      });
      
      queryClient.invalidateQueries(['userRequests']);
    } catch (err) {
      console.error('Failed to create request:', err);
    }
  };

  const isRequested = (media) => {
    if (!userRequests?.requests) return false;
    return userRequests.requests.some(
      (req) => req.tmdb_id === media.id && req.media_type === media.media_type
    );
  };

  const hasResults = filteredAndSortedResults?.results?.length > 0;
  const showEmptyState = debouncedQuery.length > 0 && !isLoading && !hasResults;
  const showInitialState = searchQuery === '' && debouncedQuery === '';

  // Calculate total counts for display
  const movieCount = searchResults?.results?.filter(item => item.media_type === 'movie').length || 0;
  const tvCount = searchResults?.results?.filter(item => item.media_type === 'tv').length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Search Media</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover movies and TV shows to add to your Plex server. Search through thousands of titles and request what you want to watch.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for movies, TV shows, actors..."
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm"
            />
            
            {(isLoading || isFetching) && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Filter Controls */}
          {searchResults && (movieCount > 0 || tvCount > 0) && (
            <div className="mt-4 flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showTVShows"
                  checked={showTVShows}
                  onChange={(e) => setShowTVShows(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="showTVShows" className="text-sm font-medium text-gray-700">
                  Show TV Shows ({tvCount})
                </label>
              </div>
              <div className="text-sm text-gray-500">
                Movies: {movieCount} • Currently showing: {filteredAndSortedResults?.results?.length || 0}
              </div>
            </div>
          )}
          
          {/* Search Stats */}
          {filteredAndSortedResults && hasResults && (
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-600">
                Found <span className="font-semibold text-gray-900">{searchResults?.total_results?.toLocaleString()}</span> results for 
                <span className="font-semibold text-gray-900"> "{debouncedQuery}"</span>
                <span className="text-gray-500"> • Sorted by mainstream appeal</span>
                {searchResults?.total_pages > 1 && (
                  <span> • Page {page} of {searchResults.total_pages}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="max-w-md mx-auto mb-8">
            <div className="rounded-xl bg-red-50 border border-red-200 p-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-semibold text-red-800">Search Error</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Failed to search for "{debouncedQuery}". Please check your connection and try again.
                  </p>
                  <button
                    onClick={() => queryClient.invalidateQueries(['search', debouncedQuery, page])}
                    className="mt-3 text-sm font-medium text-red-700 hover:text-red-900 underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="space-y-8">
          {/* Loading State */}
          {isLoading && debouncedQuery && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {hasResults && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredAndSortedResults.results.map((media) => (
                <MediaCard
                  key={`${media.media_type}-${media.id}`}
                  media={media}
                  onRequest={() => handleRequest(media)}
                  isRequested={isRequested(media)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedResults && searchResults?.total_pages > 1 && !error && (
            <div className="flex items-center justify-center space-x-4 mt-12 mb-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Previous</span>
              </button>

              <div className="flex items-center space-x-2">
                {Array.from(
                  { length: Math.min(5, searchResults.total_pages) },
                  (_, i) => {
                    const pageNum = Math.max(1, Math.min(searchResults.total_pages - 4, page - 2)) + i;
                    if (pageNum > searchResults.total_pages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          pageNum === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => setPage(p => Math.min(searchResults.total_pages, p + 1))}
                disabled={page === searchResults.total_pages}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span>Next</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600 mb-4">
                  We couldn't find any {showTVShows ? 'movies or TV shows' : 'movies'} matching <span className="font-semibold">"{debouncedQuery}"</span>
                </p>
                {!showTVShows && tvCount > 0 && (
                  <button
                    onClick={() => setShowTVShows(true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                  >
                    Show TV Shows ({tvCount} available)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Initial State */}
          {showInitialState && (
            <div className="text-center py-16">
              <div className="max-w-lg mx-auto">
                <div className="mb-6">
                  <svg className="mx-auto h-20 w-20 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">Start Your Search</h3>
                <p className="text-gray-600 mb-6">
                  Search through our extensive database of movies and TV shows. Movies are shown first, with TV shows available via toggle.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 max-w-sm mx-auto">
                  <div className="text-center">
                    <div className="font-semibold text-gray-700 text-lg">Movies</div>
                    <div>Shown by default</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-700 text-lg">TV Shows</div>
                    <div>Toggle to include</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;