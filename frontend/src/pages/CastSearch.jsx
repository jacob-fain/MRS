import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import mediaService from '../services/media.service';

// Loading skeleton for person cards
const SkeletonCard = () => (
  <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse">
    <div className="aspect-[2/3] bg-gray-700"></div>
    <div className="p-4">
      <div className="h-5 bg-gray-700 rounded mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
    </div>
  </div>
);

const CastSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get('page');
    const parsed = parseInt(pageParam, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  });

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

  // Sync URL params with state
  useEffect(() => {
    const params = {};
    if (debouncedQuery) {
      params.q = debouncedQuery;
    }
    if (page > 1) {
      params.page = page.toString();
    }
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, page, setSearchParams]);

  // Fetch first 20 pages of person search results for better sorting and filtering
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['person-search-multi', debouncedQuery],
    queryFn: async () => {
      // Fetch first 20 pages in parallel to ensure we get popular people even after filtering
      const pagePromises = [];
      for (let i = 1; i <= 20; i++) {
        pagePromises.push(mediaService.searchPerson(debouncedQuery, i));
      }

      const settledPages = await Promise.allSettled(pagePromises);

      // Keep only successfully fetched pages
      const successfulPages = settledPages
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);

      // If all pages failed, propagate an error so React Query can handle it
      if (successfulPages.length === 0) {
        throw new Error('Failed to fetch person search results');
      }

      // Combine all results from successful pages
      const allResults = successfulPages.flatMap(page => page.results || []);

      return {
        results: allResults,
        total_results: successfulPages[0]?.total_results || 0,
      };
    },
    enabled: debouncedQuery.length > 0,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  // Filter people with photos and sort by popularity
  const allFilteredResults = searchResults?.results
    ?.filter(person => person.profile_path || person.profile_url) // Only show people with photos
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); // Sort by popularity (TMDB's metric)

  // Client-side pagination
  const pageSize = 20;
  const totalPages = allFilteredResults ? Math.ceil(allFilteredResults.length / pageSize) : 0;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResults = allFilteredResults?.slice(startIndex, endIndex);

  const hasResults = paginatedResults?.length > 0;
  const showEmptyState = debouncedQuery.length > 0 && !isLoading && !hasResults;
  const showInitialState = searchQuery === '' && debouncedQuery === '';

  const handlePersonClick = (personId) => {
    navigate(`/person/${personId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Cast & Crew Search</h1>
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
              placeholder="Search for actors, directors, crew..."
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-700 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />

            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}

            {/* Clear Button */}
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Stats */}
          {allFilteredResults && hasResults && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">
                Found <span className="font-semibold text-white">{allFilteredResults.length}</span> people matching
                <span className="font-semibold text-white"> "{debouncedQuery}"</span>
                {totalPages > 1 && (
                  <span> • Page {page} of {totalPages}</span>
                )}
              </p>
            </div>
          )}
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
                  <h3 className="text-sm font-semibold text-red-400">Search Error</h3>
                  <p className="text-sm text-red-300 mt-1">
                    Failed to search for "{debouncedQuery}". Please try again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="space-y-8">
          {/* Loading State */}
          {isLoading && debouncedQuery && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: 12 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {hasResults && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {paginatedResults.map((person) => (
                <div
                  key={person.id}
                  onClick={() => handlePersonClick(person.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePersonClick(person.id);
                    }
                  }}
                  className="bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label={`View ${person.name}'s filmography`}
                >
                  {/* Profile Photo */}
                  <div className="aspect-[2/3] overflow-hidden bg-gray-700">
                    {person.profile_url ? (
                      <img
                        src={person.profile_url}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-20 h-20 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Person Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-base text-white line-clamp-2 mb-1">
                      {person.name}
                    </h3>
                    {person.known_for_department && (
                      <p className="text-xs text-gray-400 mb-2">{person.known_for_department}</p>
                    )}
                    {person.popularity > 0 && (
                      <div className="flex items-center text-gray-500">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs">{person.popularity.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && !error && (
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

          {/* Empty State */}
          {showEmptyState && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <svg className="mx-auto h-16 w-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-white mb-2">No Results Found</h3>
                <p className="text-gray-400">
                  We couldn't find any people matching <span className="font-semibold text-white">"{debouncedQuery}"</span>
                </p>
              </div>
            </div>
          )}

          {/* Initial State */}
          {showInitialState && (
            <div className="text-center py-20">
              <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-gray-400 text-lg">Search for actors, directors, and crew members</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CastSearch;
