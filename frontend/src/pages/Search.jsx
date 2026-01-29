import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import mediaService from '../services/media.service';
import requestService from '../services/request.service';
import MediaCard from '../components/MediaCard';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
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
  const { data: searchResults, isLoading, error } = useQuery({
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
    staleTime: 5 * 60 * 1000,
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
        total_pages: Math.ceil(sortedResults.length / pageSize)
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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Search Media</h1>
          <p className="text-xl text-gray-300">Discover movies and TV shows for your Plex library</p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for movies, TV shows..."
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-700 rounded-xl bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button 
                onClick={clearSearch} 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-white">Loading...</div>
        )}

        {error && (
          <div className="text-center py-8 text-red-400">Error: Failed to search</div>
        )}

        {sortedAndPaginatedResults && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedAndPaginatedResults.results.map((media) => (
                <MediaCard
                  key={`${media.media_type}-${media.id}`}
                  media={media}
                  onRequest={() => handleRequest(media)}
                  isRequested={isRequested(media)}
                />
              ))}
            </div>

            {sortedAndPaginatedResults.total_pages > 1 && (
              <div className="flex justify-center space-x-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-600 rounded bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-white">
                  Page {page} of {sortedAndPaginatedResults.total_pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(sortedAndPaginatedResults.total_pages, p + 1))}
                  disabled={page === sortedAndPaginatedResults.total_pages}
                  className="px-4 py-2 border border-gray-600 rounded bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {debouncedQuery && !isLoading && (!sortedAndPaginatedResults || sortedAndPaginatedResults.results.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-300">No results found for "{debouncedQuery}"</p>
          </div>
        )}

        {!debouncedQuery && (
          <div className="text-center py-16">
            <div className="max-w-lg mx-auto">
              <h3 className="text-xl font-medium text-white mb-3">Search Movies & TV Shows</h3>
              <p className="text-gray-300">
                Find content to add to your Plex library. Click on any result for detailed information.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
