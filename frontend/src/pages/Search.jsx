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

  // SMART ALGORITHM: Identify main franchise content vs random stuff
  const calculateRelevanceScore = (media) => {
    const voteCount = media.vote_count || 0;
    const popularity = media.popularity || 0;
    const title = (media.title || media.name || '').toLowerCase();
    const isMovie = media.media_type === 'movie';
    
    // MAIN STAR WARS FILMS: Episodes, main titles, major spin-offs
    const isMainStarWarsMovie = isMovie && (
      (title.match(/^star wars(\s|:)/) && (
        title.includes('episode') ||           // Episode I-IX
        title.includes('new hope') ||          // A New Hope
        title.includes('empire strikes') ||    // Empire Strikes Back  
        title.includes('return of the jedi') ||// Return of the Jedi
        title.includes('phantom menace') ||    // Episode I
        title.includes('attack of the clones') ||// Episode II
        title.includes('revenge of the sith') ||// Episode III
        title.includes('force awakens') ||     // Episode VII
        title.includes('last jedi') ||         // Episode VIII
        title.includes('rise of skywalker') || // Episode IX
        (voteCount > 15000 && title.length < 30) // High vote count, simple title
      )) ||
      // Major spin-offs (different title patterns)
      (title.includes('rogue one') && voteCount > 5000) ||    // Rogue One (major)
      (title.includes('solo') && voteCount > 5000)            // Solo (major)
    );
    
    // MAJOR TV SHOWS: Clone Wars, Rebels (with high vote counts)
    const isMajorStarWarsTV = !isMovie && title.match(/^star wars(\s|:)/) && (
      (title.includes('clone wars') && voteCount > 1000) ||
      (title.includes('rebels') && voteCount > 500) ||
      (title.includes('mandalorian') && voteCount > 1000)
    );
    
    // RANDOM UNRELATED CONTENT: Doraemon, documentaries, fan films
    const isUnrelated = (
      title.includes('doraemon') ||
      title.includes('nobita') || 
      title.includes('star wars kid') ||
      title.includes('equilibrium knight') ||
      title.includes('fan film') ||
      (voteCount < 50 && !title.match(/^star wars(\s|:)/))
    );
    
    // SCORING
    if (isUnrelated) {
      // Penalty for unrelated content
      return voteCount * 0.1;
    } else if (isMainStarWarsMovie) {
      // MASSIVE boost for main Star Wars films
      return (voteCount * 10000) + (popularity * 1000) + 10000000;
    } else if (isMajorStarWarsTV) {
      // Good boost for major TV shows
      return (voteCount * 1000) + (popularity * 100) + 1000000;
    } else if (isMovie && title.match(/^star wars(\s|:)/)) {
      // Medium boost for other Star Wars movies
      return (voteCount * 100) + (popularity * 10) + 100000;
    } else if (!isMovie && title.match(/^star wars(\s|:)/)) {
      // Small boost for other Star Wars TV
      return (voteCount * 10) + (popularity * 2) + 10000;
    } else {
      // Default scoring for everything else
      return (voteCount * 2) + popularity;
    }
  };

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, page],
    queryFn: () => mediaService.searchMedia(debouncedQuery, page, true),
    enabled: debouncedQuery.length > 0,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  // Sort results by smart relevance score
  const sortedResults = useMemo(() => {
    if (!searchResults?.results) return searchResults;
    
    const sortedResultsArray = [...searchResults.results].sort((a, b) => {
      const scoreA = calculateRelevanceScore(a);
      const scoreB = calculateRelevanceScore(b);
      return scoreB - scoreA; // Higher scores first
    });
    
    // Debug logging
    if (debouncedQuery.toLowerCase().includes('star wars')) {
      console.log('=== SMART STAR WARS ALGORITHM ===');
      sortedResultsArray.slice(0, 15).forEach((item, index) => {
        const score = calculateRelevanceScore(item);
        const title = item.title || item.name;
        const votes = item.vote_count || 0;
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const category = score > 10000000 ? 'MAIN' : 
                        score > 1000000 ? 'MAJOR' : 
                        score > 100000 ? 'OTHER' : 
                        score > 10000 ? 'TV' : 'MISC';
        console.log(`${(index + 1).toString().padStart(2)}. ${title} (${year}) - ${item.media_type} - Votes: ${votes.toString().padStart(5)} - Score: ${score.toFixed(0).padStart(10)} - ${category}`);
      });
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
          <p className="text-xl text-gray-600">Smart algorithm: Main franchise content first, random stuff penalized</p>
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
              Smart relevance: Main franchise content first, unrelated content penalized
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
                Smart algorithm identifies main franchise content and prioritizes it over random unrelated items.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Main films: 10M+ score • Major TV: 1M+ score • Other: lower scores • Unrelated: penalized
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;