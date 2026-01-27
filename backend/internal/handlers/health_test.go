package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jacob-fain/MRS/internal/testutil"
)

func TestHealthCheck(t *testing.T) {
	// Setup
	router := testutil.SetupTestRouter()
	router.GET("/health", HealthCheck)

	// Create request
	req, err := http.NewRequest("GET", "/health", nil)
	testutil.AssertNoError(t, err)

	// Record response
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assertions
	testutil.AssertEqual(t, http.StatusOK, w.Code)

	// Parse response
	var response map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &response)
	testutil.AssertNoError(t, err)

	testutil.AssertEqual(t, "healthy", response["status"])
	testutil.AssertEqual(t, "Plex Requests API", response["service"])
}