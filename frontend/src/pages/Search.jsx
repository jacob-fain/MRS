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

  // PURE VOTE COUNT ALGORITHM - Simple and effective
  const calculateRelevanceScore = (media) => {
    // Return vote count directly - higher vote count = more mainstream
    return media.vote_count || 0;
  };

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, page],
    queryFn: () => mediaService.searchMedia(debouncedQuery, page, true),
    enabled: debouncedQuery.length > 0,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  // Sort results by pure vote count
  const sortedResults = useMemo(() => {
    if (!searchResults?.results) return searchResults;
    
    const sortedResultsArray = [...searchResults.results].sort((a, b) => {
      const scoreA = calculateRelevanceScore(a);
      const scoreB = calculateRelevanceScore(b);
      return scoreB - scoreA; // Higher vote counts first
    });
    
    // Debug logging to verify sorting works
    if (debouncedQuery.toLowerCase().includes('star wars')) {
      console.log('=== PURE VOTE COUNT SORTING ===');
      console.log('Sorted by vote count (highest first):');
      sortedResultsArray.slice(0, 15).forEach((item, index) => {
        const votes = item.vote_count || 0;
        const title = item.title || item.name;
        const media_type = item.media_type;
        console.log(`${(index + 1).toString().padStart(2)}. ${title} - ${votes.toLocaleString()} votes - ${media_type}`);
      });
      
      // Validation check
      const majorMovies = sortedResultsArray.filter(item => 
        item.media_type === 'movie' && (item.vote_count || 0) > 8000
      ).slice(0, 7);
      
      const doraemonItems = sortedResultsArray.filter(item => 
        (item.title || item.name || '').toLowerCase().includes('doraemon')
      );
      
      console.log('\\nValidation:');
      console.log(`Major movies in top 7: ${majorMovies.length}/7`);
      if (doraemonItems.length > 0) {
        const doraemonRanks = doraemonItems.map(item => 
          sortedResultsArray.indexOf(item) + 1
        );
        console.log(`Doraemon ranks: ${doraemonRanks.join(', ')} (should be 14+)`);
      }
    }
    
    return {
      ...searchResults,
      results: sortedResultsArray
    };
  }, [searchResults, debouncedQuery]);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Search Media</h1>
          <p className="text-xl text-gray-600">Sorted by vote count (mainstream appeal)</p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search for movies, TV shows..."
              className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2">
                ✕
              </button>
            )}
          </div>
          
          {sortedResults?.results?.length > 0 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Sorted by vote count - most voted (mainstream) content first
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-8">Loading...</div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">Error: Failed to search</div>
        )}

        {sortedResults && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedResults.results.map((media) => (
                <MediaCard
                  key={`${media.media_type}-${media.id}`}
                  media={media}
                  onRequest={() => handleRequest(media)}
                  isRequested={isRequested(media)}
                />
              ))}
            </div>

            {sortedResults.total_pages > 1 && (
              <div className="flex justify-center space-x-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {sortedResults.total_pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(sortedResults.total_pages, p + 1))}
                  disabled={page === sortedResults.total_pages}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {debouncedQuery && !isLoading && (!sortedResults || sortedResults.results.length === 0) && (
          <div className="text-center py-12">
            <p>No results found for "{debouncedQuery}"</p>
          </div>
        )}

        {!debouncedQuery && (
          <div className="text-center py-16">
            <div className="max-w-lg mx-auto">
              <h3 className="text-xl font-medium text-gray-900 mb-3">Search Movies & TV Shows</h3>
              <p className="text-gray-600">
                Results sorted by vote count. More votes = more mainstream = higher relevance.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Algorithm: Pure vote count sorting (simple and effective)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;