package services

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/jacob/plex-requests/internal/testutil"
)

func TestNewTMDBService(t *testing.T) {
	tests := []struct {
		name      string
		apiKey    string
		wantErr   bool
		errMsg    string
	}{
		{
			name:    "valid API key",
			apiKey:  "test-api-key",
			wantErr: false,
		},
		{
			name:    "missing API key",
			apiKey:  "",
			wantErr: true,
			errMsg:  "TMDB_API_KEY environment variable not set",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variable
			os.Setenv("TMDB_API_KEY", tt.apiKey)
			defer os.Unsetenv("TMDB_API_KEY")

			service, err := NewTMDBService()
			if tt.wantErr {
				testutil.AssertError(t, err)
				testutil.AssertErrorContains(t, err, tt.errMsg)
			} else {
				testutil.AssertNoError(t, err)
				testutil.AssertEqual(t, tt.apiKey, service.apiKey)
			}
		})
	}
}

func TestTMDBService_SearchMulti(t *testing.T) {
	// Create a test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		testutil.AssertEqual(t, "/3/search/multi", r.URL.Path)
		testutil.AssertEqual(t, "test-api-key", r.URL.Query().Get("api_key"))
		
		query := r.URL.Query().Get("query")
		
		// Return different responses based on query
		switch query {
		case "Matrix":
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{
				"page": 1,
				"total_pages": 1,
				"total_results": 2,
				"results": [
					{
						"id": 603,
						"media_type": "movie",
						"title": "The Matrix",
						"release_date": "1999-03-31",
						"overview": "A computer hacker learns about the true nature of reality.",
						"poster_path": "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
						"vote_average": 8.2
					},
					{
						"id": 604,
						"media_type": "movie",
						"title": "The Matrix Reloaded",
						"release_date": "2003-05-15",
						"overview": "The second chapter in The Matrix trilogy.",
						"poster_path": "/aA5qHS0FbSXO8PxcxUIHbDrJyuh.jpg",
						"vote_average": 7.1
					}
				]
			}`))
		case "":
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"results": []}`))
		case "error":
			w.WriteHeader(http.StatusInternalServerError)
		default:
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"results": []}`))
		}
	}))
	defer server.Close()

	// Create service with test server URL
	service := &TMDBService{
		apiKey:     "test-api-key",
		httpClient: &http.Client{},
	}
	
	// Override base URL for testing
	originalBaseURL := tmdbBaseURL
	defer func() { tmdbBaseURL = originalBaseURL }()
	tmdbBaseURL = server.URL

	tests := []struct {
		name          string
		query         string
		page          int
		wantErr       bool
		expectedCount int
	}{
		{
			name:          "successful search",
			query:         "Matrix",
			page:          1,
			wantErr:       false,
			expectedCount: 2,
		},
		{
			name:    "empty query",
			query:   "",
			page:    1,
			wantErr: true,
		},
		{
			name:    "server error",
			query:   "error",
			page:    1,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := service.SearchMulti(tt.query, tt.page)
			
			if tt.wantErr {
				testutil.AssertError(t, err)
			} else {
				testutil.AssertNoError(t, err)
				testutil.AssertEqual(t, tt.expectedCount, len(result.Results))
				
				// Verify image URLs were added
				if len(result.Results) > 0 && result.Results[0].PosterPath != "" {
					expected := fmt.Sprintf("%s/w342%s", tmdbImageBase, result.Results[0].PosterPath)
					testutil.AssertEqual(t, expected, result.Results[0].PosterURL)
				}
			}
		})
	}
}

func TestTMDBService_GetImageURL(t *testing.T) {
	service := &TMDBService{}
	
	tests := []struct {
		name     string
		path     string
		size     string
		expected string
	}{
		{
			name:     "valid path",
			path:     "/abc123.jpg",
			size:     "w500",
			expected: "https://image.tmdb.org/t/p/w500/abc123.jpg",
		},
		{
			name:     "empty path",
			path:     "",
			size:     "w500",
			expected: "",
		},
		{
			name:     "different size",
			path:     "/xyz789.jpg",
			size:     "original",
			expected: "https://image.tmdb.org/t/p/original/xyz789.jpg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.GetImageURL(tt.path, tt.size)
			testutil.AssertEqual(t, tt.expected, result)
		})
	}
}

func TestTMDBService_GetMovieDetails(t *testing.T) {
	// Create a test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		testutil.AssertEqual(t, "/3/movie/603", r.URL.Path)
		testutil.AssertEqual(t, "test-api-key", r.URL.Query().Get("api_key"))
		testutil.AssertEqual(t, "credits,videos,external_ids", r.URL.Query().Get("append_to_response"))
		
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{
			"id": 603,
			"title": "The Matrix",
			"overview": "A computer hacker learns about the true nature of reality.",
			"release_date": "1999-03-31",
			"runtime": 136,
			"vote_average": 8.2,
			"poster_path": "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
			"backdrop_path": "/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg",
			"genres": [
				{"id": 28, "name": "Action"},
				{"id": 878, "name": "Science Fiction"}
			],
			"external_ids": {
				"imdb_id": "tt0133093"
			}
		}`))
	}))
	defer server.Close()

	// Create service with test server URL
	service := &TMDBService{
		apiKey:     "test-api-key",
		httpClient: &http.Client{},
	}
	
	// Override base URL for testing
	originalBaseURL := tmdbBaseURL
	defer func() { tmdbBaseURL = originalBaseURL }()
	tmdbBaseURL = server.URL

	movie, err := service.GetMovieDetails(603)
	testutil.AssertNoError(t, err)
	
	// Verify response
	testutil.AssertEqual(t, 603, movie.ID)
	testutil.AssertEqual(t, "The Matrix", movie.Title)
	testutil.AssertEqual(t, 136, movie.Runtime)
	testutil.AssertEqual(t, "tt0133093", movie.ExternalIDs.IMDBID)
	testutil.AssertEqual(t, 2, len(movie.Genres))
	
	// Verify image URLs
	expectedPoster := fmt.Sprintf("%s/w500%s", tmdbImageBase, movie.PosterPath)
	testutil.AssertEqual(t, expectedPoster, movie.PosterURL)
}