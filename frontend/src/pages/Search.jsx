import React, { useState, useCallback } from 'react';
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

  // Debounce search input
  const debouncedSearch = useCallback(
    debounce((query) => {
      setDebouncedQuery(query);
      setPage(1);
    }, 500),
    []
  );

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Search query
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, page],
    queryFn: () => mediaService.searchMedia(debouncedQuery, page, true),
    enabled: debouncedQuery.length > 0,
    keepPreviousData: true,
  });

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
      
      // Refetch user requests
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Search Media</h1>
        <p className="mt-2 text-gray-600">
          Search for movies and TV shows to request
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search for movies or TV shows..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">Failed to search. Please try again.</p>
        </div>
      )}

      {searchResults && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searchResults.results.map((media) => (
              <MediaCard
                key={`${media.media_type}-${media.id}`}
                media={media}
                onRequest={() => handleRequest(media)}
                isRequested={isRequested(media)}
              />
            ))}
          </div>

          {searchResults.total_pages > 1 && (
            <div className="flex justify-center space-x-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {page} of {searchResults.total_pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(searchResults.total_pages, p + 1))}
                disabled={page === searchResults.total_pages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {searchQuery === '' && (
        <div className="text-center py-12">
          <p className="text-gray-500">Start typing to search for movies and TV shows</p>
        </div>
      )}

      {searchQuery !== '' && !isLoading && searchResults?.results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No results found for "{debouncedQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default Search;