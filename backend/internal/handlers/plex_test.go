package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jacob/plex-requests/internal/services"
	"github.com/jacob/plex-requests/internal/testutil"
)

// Mock Plex service for testing
type mockPlexService struct {
	checkIfExistsFunc   func(title string, year int, mediaType string) (bool, error)
	searchLibraryFunc   func(query string) ([]services.PlexSearchResult, error)
	getLibrariesFunc    func() ([]services.PlexLibrary, error)
}

func (m *mockPlexService) CheckIfExists(title string, year int, mediaType string) (bool, error) {
	if m.checkIfExistsFunc != nil {
		return m.checkIfExistsFunc(title, year, mediaType)
	}
	return false, nil
}

func (m *mockPlexService) SearchLibrary(query string) ([]services.PlexSearchResult, error) {
	if m.searchLibraryFunc != nil {
		return m.searchLibraryFunc(query)
	}
	return []services.PlexSearchResult{}, nil
}

func (m *mockPlexService) GetLibraries() ([]services.PlexLibrary, error) {
	if m.getLibrariesFunc != nil {
		return m.getLibrariesFunc()
	}
	return []services.PlexLibrary{}, nil
}

func TestCheckMedia(t *testing.T) {
	tests := []struct {
		name           string
		title          string
		year           string
		mediaType      string
		mockFunc       func(title string, year int, mediaType string) (bool, error)
		expectedStatus int
		expectedBody   map[string]interface{}
	}{
		{
			name:      "media exists",
			title:     "The Matrix",
			year:      "1999",
			mediaType: "movie",
			mockFunc: func(title string, year int, mediaType string) (bool, error) {
				return true, nil
			},
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"exists": true,
				"title":  "The Matrix",
				"type":   "movie",
				"year":   float64(1999),
			},
		},
		{
			name:      "media does not exist",
			title:     "NonExistent Movie",
			year:      "2024",
			mediaType: "movie",
			mockFunc: func(title string, year int, mediaType string) (bool, error) {
				return false, nil
			},
			expectedStatus: http.StatusOK,
			expectedBody: map[string]interface{}{
				"exists": false,
				"title":  "NonExistent Movie",
				"type":   "movie",
				"year":   float64(2024),
			},
		},
		{
			name:           "missing title",
			title:          "",
			year:           "2024",
			mediaType:      "movie",
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "title and type are required",
			},
		},
		{
			name:           "missing type",
			title:          "The Matrix",
			year:           "1999",
			mediaType:      "",
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "title and type are required",
			},
		},
		{
			name:           "invalid year",
			title:          "The Matrix",
			year:           "invalid",
			mediaType:      "movie",
			expectedStatus: http.StatusBadRequest,
			expectedBody: map[string]interface{}{
				"error": "invalid year format",
			},
		},
		{
			name:      "plex service error",
			title:     "The Matrix",
			year:      "1999",
			mediaType: "movie",
			mockFunc: func(title string, year int, mediaType string) (bool, error) {
				return false, errors.New("plex connection failed")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody: map[string]interface{}{
				"error": "failed to check Plex library",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			router := gin.New()
			
			mockService := &mockPlexService{
				checkIfExistsFunc: tt.mockFunc,
			}
			
			handler := NewPlexHandler(mockService)
			
			router.GET("/plex/check", handler.CheckMedia)

			// Create request
			url := "/plex/check?"
			if tt.title != "" {
				url += "title=" + tt.title + "&"
			}
			if tt.year != "" {
				url += "year=" + tt.year + "&"
			}
			if tt.mediaType != "" {
				url += "type=" + tt.mediaType
			}

			req, err := http.NewRequest("GET", url, nil)
			testutil.AssertNoError(t, err)

			// Record response
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assertions
			testutil.AssertEqual(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			testutil.AssertNoError(t, err)

			for key, expectedValue := range tt.expectedBody {
				testutil.AssertEqual(t, expectedValue, response[key])
			}
		})
	}
}

func TestSearchPlex(t *testing.T) {
	tests := []struct {
		name           string
		query          string
		mockFunc       func(query string) ([]services.PlexSearchResult, error)
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name:  "successful search",
			query: "Matrix",
			mockFunc: func(query string) ([]services.PlexSearchResult, error) {
				return []services.PlexSearchResult{
					{
						Title: "The Matrix",
						Year:  1999,
						Type:  "movie",
					},
					{
						Title: "The Matrix Reloaded",
						Year:  2003,
						Type:  "movie",
					},
				}, nil
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, float64(2), response["count"])
				results := response["results"].([]interface{})
				testutil.AssertEqual(t, 2, len(results))
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
			name:  "plex service error",
			query: "Matrix",
			mockFunc: func(query string) ([]services.PlexSearchResult, error) {
				return nil, errors.New("plex search failed")
			},
			expectedStatus: http.StatusInternalServerError,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "failed to search Plex library", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			router := gin.New()
			
			mockService := &mockPlexService{
				searchLibraryFunc: tt.mockFunc,
			}
			
			handler := NewPlexHandler(mockService)
			
			router.GET("/plex/search", handler.SearchPlex)

			// Create request
			url := "/plex/search"
			if tt.query != "" {
				url += "?q=" + tt.query
			}

			req, err := http.NewRequest("GET", url, nil)
			testutil.AssertNoError(t, err)

			// Record response
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assertions
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