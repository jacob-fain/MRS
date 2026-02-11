import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import mediaService from '../services/media.service';
import requestService from '../services/request.service';
import MediaCard from '../components/MediaCard';

// Loading skeleton component for cards
const SkeletonCard = () => (
  <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse">
    <div className="aspect-[2/3] bg-gray-700"></div>
    <div className="p-5">
      <div className="h-6 bg-gray-700 rounded mb-2"></div>
      <div className="h-4 bg-gray-700 rounded mb-3 w-3/4"></div>
      <div className="flex gap-1 mb-3">
        <div className="h-6 bg-gray-700 rounded w-16"></div>
        <div className="h-6 bg-gray-700 rounded w-20"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-700 rounded"></div>
        <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        <div className="h-3 bg-gray-700 rounded w-4/6"></div>
      </div>
      <div className="h-10 bg-gray-700 rounded"></div>
    </div>
  </div>
);

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);
  const queryClient = useQueryClient();

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

  // Multi-page fetch for proper sorting of first few pages
  const fetchMultiplePages = async (query, startPage, pageCount) => {
    const promises = [];
    for (let i = 0; i < pageCount; i++) {
      promises.push(mediaService.searchMedia(query, startPage + i, true));
    }

    const results = await Promise.all(promises);

    // Combine all results
    const allResults = [];
    let totalResults = 0;
    let totalPages = 0;

    for (const result of results) {
      if (result.results) {
        allResults.push(...result.results);
      }
      if (result.total_results) {
        totalResults = result.total_results;
        totalPages = result.total_pages;
      }
    }

    return {
      results: allResults,
      total_results: totalResults,
      total_pages: totalPages
    };
  };

  // Determine if we need multi-page fetch (for first 3 pages)
  const needsMultiPageFetch = page <= 3;

  // Search query with multi-page logic
  const { data: searchResults, isLoading, error, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery, needsMultiPageFetch ? 'multi-page-1-3' : page],
    queryFn: async () => {
      if (needsMultiPageFetch) {
        // Fetch first 3 pages for proper sorting
        return await fetchMultiplePages(debouncedQuery, 1, 3);
      } else {
        // Normal single page fetch for page 4+
        return await mediaService.searchMedia(debouncedQuery, page, true);
      }
    },
    enabled: debouncedQuery.length > 0,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,     // 10 minutes (cache retention)
  });

  // Sort and paginate results
  const sortedAndPaginatedResults = useMemo(() => {
    if (!searchResults?.results) return searchResults;

    // Filter out results without posters, then sort by vote count
    const filteredResults = searchResults.results.filter(media => media.poster_path);
    const sortedResults = [...filteredResults].sort((a, b) => {
      const votesA = a.vote_count || 0;
      const votesB = b.vote_count || 0;
      return votesB - votesA;
    });

    if (needsMultiPageFetch) {
      // For multi-page results, paginate the sorted results
      const pageSize = 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageResults = sortedResults.slice(startIndex, endIndex);

      return {
        ...searchResults,
        results: pageResults,
        page: page,
        total_pages: searchResults.total_pages  // Keep original TMDB total
      };
    } else {
      // For single page results (page 4+), return as-is
      return {
        ...searchResults,
        results: sortedResults
      };
    }
  }, [searchResults, page, debouncedQuery, needsMultiPageFetch]);

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

  const hasResults = sortedAndPaginatedResults?.results?.length > 0;
  const showEmptyState = debouncedQuery.length > 0 && !isLoading && !hasResults;
  const showInitialState = searchQuery === '' && debouncedQuery === '';

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">Search</h1>
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
              placeholder="Search for movies, TV shows..."
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-700 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />

            {/* Loading Spinner */}
            {(isLoading || isFetching) && (
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
          {searchResults && hasResults && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">
                Found <span className="font-semibold text-white">{searchResults.total_results.toLocaleString()}</span> results for
                <span className="font-semibold text-white"> "{debouncedQuery}"</span>
                {sortedAndPaginatedResults.total_pages > 1 && (
                  <span> • Page {page} of {sortedAndPaginatedResults.total_pages}</span>
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
                    Failed to search for "{debouncedQuery}". Please check your connection and try again.
                  </p>
                  <button
                    onClick={() => {
                      const queryKey = needsMultiPageFetch
                        ? ['search', debouncedQuery, 'multi-page-1-3']
                        : ['search', debouncedQuery, page];
                      queryClient.invalidateQueries(queryKey);
                    }}
                    className="mt-3 text-sm font-medium text-red-400 hover:text-red-300 underline"
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
              {sortedAndPaginatedResults.results.map((media) => (
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
          {sortedAndPaginatedResults && sortedAndPaginatedResults.total_pages > 1 && !error && (
            <div className="flex items-center justify-center space-x-4 mt-12 mb-8">
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

              <div className="flex items-center space-x-2">
                {/* Page Numbers */}
                {Array.from(
                  { length: Math.min(5, sortedAndPaginatedResults.total_pages) },
                  (_, i) => {
                    const pageNum = Math.max(1, Math.min(sortedAndPaginatedResults.total_pages - 4, page - 2)) + i;
                    if (pageNum > sortedAndPaginatedResults.total_pages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          pageNum === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => setPage(p => Math.min(sortedAndPaginatedResults.total_pages, p + 1))}
                disabled={page === sortedAndPaginatedResults.total_pages}
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
                <p className="text-gray-400 mb-4">
                  We couldn't find any movies or TV shows matching <span className="font-semibold text-white">"{debouncedQuery}"</span>
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search terms or browsing popular content.
                </p>
              </div>
            </div>
          )}

          {/* Initial State */}
          {showInitialState && (
            <div className="text-center py-20">
              <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-400 text-lg">Search for movies and TV shows</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Search;
