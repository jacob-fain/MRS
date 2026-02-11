import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import mediaService from '../services/media.service';

const PersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('votes'); // date, votes, title
  const [filterType, setFilterType] = useState('all'); // all, movie, tv

  const { data: personDetails, isLoading: isLoadingDetails, error: detailsError } = useQuery({
    queryKey: ['person-details', id],
    queryFn: () => mediaService.getPersonDetails(parseInt(id)),
    enabled: !!id,
  });

  const { data: personCredits, isLoading: isLoadingCredits, error: creditsError } = useQuery({
    queryKey: ['person-credits', id],
    queryFn: () => mediaService.getPersonCredits(parseInt(id)),
    enabled: !!id,
  });

  if (isLoadingDetails || isLoadingCredits) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  if (detailsError || creditsError || !personDetails) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error loading person details</h2>
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

  // Process and sort credits
  const allCredits = [...(personCredits?.cast || []), ...(personCredits?.crew || [])];

  // Remove duplicates and filter out items without posters
  const uniqueCreditsMap = new Map();
  allCredits.forEach(credit => {
    // Only include if it has a poster
    if (credit.poster_path || credit.poster_url) {
      const key = `${credit.media_type}-${credit.id}`;
      // Keep the one with the higher vote_count (most popular) if duplicate
      if (!uniqueCreditsMap.has(key) ||
          (credit.vote_count || 0) > (uniqueCreditsMap.get(key).vote_count || 0)) {
        uniqueCreditsMap.set(key, credit);
      }
    }
  });

  const uniqueCredits = Array.from(uniqueCreditsMap.values());

  let filteredCredits = uniqueCredits.filter(credit => {
    if (filterType === 'all') return true;
    if (filterType === 'movie') return credit.media_type === 'movie';
    if (filterType === 'tv') return credit.media_type === 'tv';
    return true;
  });

  // Sort credits
  filteredCredits = filteredCredits.sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = a.release_date || a.first_air_date || '';
      const dateB = b.release_date || b.first_air_date || '';
      return dateB.localeCompare(dateA); // Newest first
    } else if (sortBy === 'votes') {
      return (b.vote_count || 0) - (a.vote_count || 0);
    } else if (sortBy === 'title') {
      const titleA = a.title || a.name || '';
      const titleB = b.title || b.name || '';
      return titleA.localeCompare(titleB);
    }
    return 0;
  });

  const handleCreditClick = (credit) => {
    navigate(`/${credit.media_type}/${credit.id}`);
  };

  const getYear = (credit) => {
    const date = credit.release_date || credit.first_air_date;
    return date ? new Date(date).getFullYear() : 'TBA';
  };

  const getRole = (credit) => {
    if (credit.character) return credit.character;
    if (credit.job) return credit.job;
    return 'Crew';
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors px-2 py-2 hover:bg-gray-800 rounded-md min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Back</span>
        </button>

        {/* Person Profile Section */}
        <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Profile Photo */}
            <div className="md:col-span-1 mx-auto md:mx-0">
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-700 w-48 md:w-full">
                {personDetails.profile_url ? (
                  <img
                    src={personDetails.profile_url}
                    alt={personDetails.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-32 h-32 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Person Info */}
            <div className="md:col-span-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">{personDetails.name}</h1>

              <div className="space-y-3 mb-6">
                {personDetails.known_for_department && (
                  <div>
                    <span className="text-sm font-medium text-gray-400">Known For: </span>
                    <span className="text-base text-white">{personDetails.known_for_department}</span>
                  </div>
                )}
                {personDetails.birthday && (
                  <div>
                    <span className="text-sm font-medium text-gray-400">Birthday: </span>
                    <span className="text-base text-white">{new Date(personDetails.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                )}
                {personDetails.place_of_birth && (
                  <div>
                    <span className="text-sm font-medium text-gray-400">Place of Birth: </span>
                    <span className="text-base text-white">{personDetails.place_of_birth}</span>
                  </div>
                )}
              </div>

              {personDetails.biography && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Biography</h2>
                  <p className="text-gray-300 leading-relaxed line-clamp-6">{personDetails.biography}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filmography Section */}
        <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Filmography ({filteredCredits.length})
            </h2>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              {/* Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('movie')}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    filterType === 'movie'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Movies
                </button>
                <button
                  onClick={() => setFilterType('tv')}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    filterType === 'tv'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  TV
                </button>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
              >
                <option value="date">Sort by Date</option>
                <option value="votes">Sort by Votes</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>

          {/* Credits Grid */}
          {filteredCredits.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredCredits.map((credit, index) => (
                <div
                  key={`${credit.id}-${index}`}
                  onClick={() => handleCreditClick(credit)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCreditClick(credit);
                    }
                  }}
                  className="bg-gray-700 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`View details for ${credit.title || credit.name}`}
                >
                  {/* Poster */}
                  <div className="aspect-[2/3] overflow-hidden bg-gray-800">
                    {credit.poster_url ? (
                      <img
                        src={credit.poster_url}
                        alt={credit.title || credit.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-white line-clamp-2 mb-1">
                      {credit.title || credit.name}
                    </h3>
                    <p className="text-xs text-gray-400 mb-1">{getYear(credit)}</p>
                    <p className="text-xs text-gray-400 line-clamp-1">{getRole(credit)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {credit.vote_average > 0 && (
                        <div className="flex items-center">
                          <svg className="w-3 h-3 text-yellow-400 fill-current mr-1" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs text-white">{credit.vote_average.toFixed(1)}</span>
                        </div>
                      )}
                      {credit.vote_count > 0 && (
                        <div className="flex items-center text-gray-400">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          <span className="text-xs">{credit.vote_count > 999 ? `${(credit.vote_count / 1000).toFixed(1)}K` : credit.vote_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No {filterType === 'all' ? '' : filterType} credits found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonDetail;
