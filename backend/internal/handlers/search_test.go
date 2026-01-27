package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/services"
	"github.com/jacob-fain/MRS/internal/testutil"
)

// Mock TMDB service
type mockTMDBService struct {
	searchMultiFunc     func(query string, page int) (*services.TMDBSearchResult, error)
	getMovieDetailsFunc func(movieID int) (*services.TMDBMovieDetails, error)
	getTVDetailsFunc    func(tvID int) (*services.TMDBTVDetails, error)
}

func (m *mockTMDBService) SearchMulti(query string, page int) (*services.TMDBSearchResult, error) {
	if m.searchMultiFunc != nil {
		return m.searchMultiFunc(query, page)
	}
	return &services.TMDBSearchResult{Results: []services.TMDBResult{}}, nil
}

func (m *mockTMDBService) GetMovieDetails(movieID int) (*services.TMDBMovieDetails, error) {
	if m.getMovieDetailsFunc != nil {
		return m.getMovieDetailsFunc(movieID)
	}
	return &services.TMDBMovieDetails{}, nil
}

func (m *mockTMDBService) GetTVDetails(tvID int) (*services.TMDBTVDetails, error) {
	if m.getTVDetailsFunc != nil {
		return m.getTVDetailsFunc(tvID)
	}
	return &services.TMDBTVDetails{}, nil
}

func (m *mockTMDBService) GetImageURL(path string, size string) string {
	return "https://image.tmdb.org/t/p/" + size + path
}

func TestSearchMedia(t *testing.T) {
	tests := []struct {
		name           string
		query          string
		page           string
		checkPlex      string
		mockTMDB       func(query string, page int) (*services.TMDBSearchResult, error)
		mockPlex       func(title string, year int, mediaType string) (bool, error)
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name:      "successful search without plex check",
			query:     "Matrix",
			page:      "1",
			checkPlex: "false",
			mockTMDB: func(query string, page int) (*services.TMDBSearchResult, error) {
				return &services.TMDBSearchResult{
					Page:         1,
					TotalPages:   1,
					TotalResults: 1,
					Results: []services.TMDBResult{
						{
							ID:          603,
							MediaType:   "movie",
							Title:       "The Matrix",
							ReleaseDate: "1999-03-31",
							Overview:    "A computer hacker learns...",
						},
					},
				}, nil
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, float64(1), response["page"])
				testutil.AssertEqual(t, float64(1), response["total_results"])
				results := response["results"].([]interface{})
				testutil.AssertEqual(t, 1, len(results))
			},
		},
		{
			name:      "search with plex check",
			query:     "Matrix",
			page:      "1",
			checkPlex: "true",
			mockTMDB: func(query string, page int) (*services.TMDBSearchResult, error) {
				return &services.TMDBSearchResult{
					Page:         1,
					TotalPages:   1,
					TotalResults: 1,
					Results: []services.TMDBResult{
						{
							ID:          603,
							MediaType:   "movie",
							Title:       "The Matrix",
							ReleaseDate: "1999-03-31",
						},
					},
				}, nil
			},
			mockPlex: func(title string, year int, mediaType string) (bool, error) {
				return true, nil
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				results := response["results"].([]interface{})
				firstResult := results[0].(map[string]interface{})
				testutil.AssertEqual(t, true, firstResult["in_plex"])
			},
		},
		{
			name:           "missing query",
			query:          "",
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "search query is required", response["error"])
			},
		},
		{
			name:  "TMDB error",
			query: "Matrix",
			mockTMDB: func(query string, page int) (*services.TMDBSearchResult, error) {
				return nil, errors.New("TMDB API error")
			},
			expectedStatus: http.StatusInternalServerError,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "failed to search TMDB", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()

			mockTMDB := &mockTMDBService{
				searchMultiFunc: tt.mockTMDB,
			}

			var mockPlex services.PlexServiceInterface
			if tt.mockPlex != nil {
				mockPlex = &mockPlexService{
					checkIfExistsFunc: tt.mockPlex,
				}
			}

			handler := NewSearchHandler(mockTMDB, mockPlex)
			router.GET("/search", handler.SearchMedia)

			// Build URL
			url := "/search?"
			if tt.query != "" {
				url += "q=" + tt.query + "&"
			}
			if tt.page != "" {
				url += "page=" + tt.page + "&"
			}
			if tt.checkPlex != "" {
				url += "check_plex=" + tt.checkPlex
			}

			req, err := http.NewRequest("GET", url, nil)
			testutil.AssertNoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			testutil.AssertEqual(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			testutil.AssertNoError(t, err)

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestGetMediaDetails(t *testing.T) {
	tests := []struct {
		name           string
		mediaType      string
		id             string
		mockMovie      func(movieID int) (*services.TMDBMovieDetails, error)
		mockTV         func(tvID int) (*services.TMDBTVDetails, error)
		mockPlex       func(title string, year int, mediaType string) (bool, error)
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name:      "get movie details",
			mediaType: "movie",
			id:        "603",
			mockMovie: func(movieID int) (*services.TMDBMovieDetails, error) {
				return &services.TMDBMovieDetails{
					ID:          603,
					Title:       "The Matrix",
					ReleaseDate: "1999-03-31",
					Runtime:     136,
				}, nil
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, float64(603), response["id"])
				testutil.AssertEqual(t, "The Matrix", response["title"])
				testutil.AssertEqual(t, float64(136), response["runtime"])
			},
		},
		{
			name:      "get tv details",
			mediaType: "tv",
			id:        "1396",
			mockTV: func(tvID int) (*services.TMDBTVDetails, error) {
				return &services.TMDBTVDetails{
					ID:              1396,
					Name:            "Breaking Bad",
					FirstAirDate:    "2008-01-20",
					NumberOfSeasons: 5,
				}, nil
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, float64(1396), response["id"])
				testutil.AssertEqual(t, "Breaking Bad", response["name"])
				testutil.AssertEqual(t, float64(5), response["number_of_seasons"])
			},
		},
		{
			name:           "invalid media type",
			mediaType:      "invalid",
			id:             "123",
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "invalid media type, must be 'movie' or 'tv'", response["error"])
			},
		},
		{
			name:           "invalid id",
			mediaType:      "movie",
			id:             "abc",
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "invalid ID", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()

			mockTMDB := &mockTMDBService{
				getMovieDetailsFunc: tt.mockMovie,
				getTVDetailsFunc:    tt.mockTV,
			}

			var mockPlex services.PlexServiceInterface
			if tt.mockPlex != nil {
				mockPlex = &mockPlexService{
					checkIfExistsFunc: tt.mockPlex,
				}
			}

			handler := NewSearchHandler(mockTMDB, mockPlex)
			router.GET("/search/:type/:id", handler.GetMediaDetails)

			url := "/search/" + tt.mediaType + "/" + tt.id
			req, err := http.NewRequest("GET", url, nil)
			testutil.AssertNoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			testutil.AssertEqual(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			testutil.AssertNoError(t, err)

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}