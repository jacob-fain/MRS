package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/models"
	"github.com/jacob-fain/MRS/internal/testutil"
)

func TestRequestHandler_GetRequests(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	db := testutil.SetupTestDB(t)
	handler := NewRequestHandler(db)

	// Create test users
	user1 := testutil.CreateTestUser(t, db, "user1@example.com", "user1", "pass", false)
	user2 := testutil.CreateTestUser(t, db, "user2@example.com", "user2", "pass", false)
	admin := testutil.CreateTestUser(t, db, "admin@example.com", "admin", "pass", true)

	// Create test requests
	req1 := testutil.CreateTestRequest(t, db, user1.ID, "The Matrix", models.MediaTypeMovie)
	req2 := testutil.CreateTestRequest(t, db, user2.ID, "Breaking Bad", models.MediaTypeTV)
	req3 := testutil.CreateTestRequest(t, db, user1.ID, "Inception", models.MediaTypeMovie)
	req3.Status = models.StatusApproved
	db.Save(&req3)

	tests := []struct {
		name           string
		userID         uint
		isAdmin        bool
		queryParams    string
		expectedStatus int
		expectedCount  int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name:           "regular user sees only their requests",
			userID:         user1.ID,
			isAdmin:        false,
			expectedStatus: http.StatusOK,
			expectedCount:  2, // req1 and req3
		},
		{
			name:           "admin sees all requests",
			userID:         admin.ID,
			isAdmin:        true,
			expectedStatus: http.StatusOK,
			expectedCount:  3,
		},
		{
			name:           "filter by status",
			userID:         admin.ID,
			isAdmin:        true,
			queryParams:    "?status=approved",
			expectedStatus: http.StatusOK,
			expectedCount:  1, // only req3
		},
		{
			name:           "admin filter by user_id",
			userID:         admin.ID,
			isAdmin:        true,
			queryParams:    fmt.Sprintf("?user_id=%d", user2.ID),
			expectedStatus: http.StatusOK,
			expectedCount:  1, // only req2
		},
		{
			name:           "non-admin cannot filter by user_id",
			userID:         user1.ID,
			isAdmin:        false,
			queryParams:    fmt.Sprintf("?user_id=%d", user2.ID),
			expectedStatus: http.StatusOK,
			expectedCount:  2, // still sees only their own
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.GET("/requests", func(c *gin.Context) {
				c.Set("userID", tt.userID)
				c.Set("isAdmin", tt.isAdmin)
				handler.GetRequests(c)
			})

			req, err := http.NewRequest("GET", "/requests"+tt.queryParams, nil)
			testutil.AssertNoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			testutil.AssertEqual(t, tt.expectedStatus, w.Code)

			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			testutil.AssertNoError(t, err)

			requests := response["requests"].([]interface{})
			testutil.AssertEqual(t, tt.expectedCount, len(requests))
			testutil.AssertEqual(t, float64(tt.expectedCount), response["count"])

			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestRequestHandler_CreateRequest(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	db := testutil.SetupTestDB(t)
	handler := NewRequestHandler(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)

	tests := []struct {
		name           string
		userID         uint
		input          CreateRequestInput
		setupDB        func()
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name:   "successful creation",
			userID: user.ID,
			input: CreateRequestInput{
				Title:      "The Matrix",
				Year:       1999,
				MediaType:  models.MediaTypeMovie,
				TMDBId:     603,
				Overview:   "A computer hacker learns...",
				PosterPath: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
				Notes:      "Please add this!",
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "The Matrix", response["title"])
				testutil.AssertEqual(t, float64(1999), response["year"])
				testutil.AssertEqual(t, "movie", response["media_type"])
				testutil.AssertEqual(t, "pending", response["status"])
				testutil.AssertEqual(t, "Please add this!", response["notes"])
			},
		},
		{
			name:   "duplicate request",
			userID: user.ID,
			input: CreateRequestInput{
				Title:     "Existing Movie",
				MediaType: models.MediaTypeMovie,
			},
			setupDB: func() {
				testutil.CreateTestRequest(t, db, user.ID, "Existing Movie", models.MediaTypeMovie)
			},
			expectedStatus: http.StatusConflict,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "You already have a request for this media", response["error"])
			},
		},
		{
			name:   "missing title",
			userID: user.ID,
			input: CreateRequestInput{
				MediaType: models.MediaTypeMovie,
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid request data", response["error"])
			},
		},
		{
			name:   "invalid media type",
			userID: user.ID,
			input: CreateRequestInput{
				Title:     "Some Title",
				MediaType: "invalid",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean requests table
			db.Exec("DELETE FROM requests")

			if tt.setupDB != nil {
				tt.setupDB()
			}

			router := gin.New()
			router.POST("/requests", func(c *gin.Context) {
				c.Set("userID", tt.userID)
				handler.CreateRequest(c)
			})

			body, err := json.Marshal(tt.input)
			testutil.AssertNoError(t, err)

			req, err := http.NewRequest("POST", "/requests", bytes.NewReader(body))
			testutil.AssertNoError(t, err)
			req.Header.Set("Content-Type", "application/json")

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

func TestRequestHandler_UpdateRequest(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	db := testutil.SetupTestDB(t)
	handler := NewRequestHandler(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	admin := testutil.CreateTestUser(t, db, "admin@example.com", "admin", "pass", true)
	otherUser := testutil.CreateTestUser(t, db, "other@example.com", "other", "pass", false)

	// Create test request
	request := testutil.CreateTestRequest(t, db, user.ID, "The Matrix", models.MediaTypeMovie)

	tests := []struct {
		name           string
		requestID      string
		userID         uint
		isAdmin        bool
		input          UpdateRequestInput
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name:      "user updates their own notes",
			requestID: fmt.Sprintf("%d", request.ID),
			userID:    user.ID,
			isAdmin:   false,
			input: UpdateRequestInput{
				Notes: "Updated notes",
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Updated notes", response["notes"])
			},
		},
		{
			name:      "admin updates status",
			requestID: fmt.Sprintf("%d", request.ID),
			userID:    admin.ID,
			isAdmin:   true,
			input: UpdateRequestInput{
				Status:     models.StatusApproved,
				AdminNotes: "Approved for download",
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "approved", response["status"])
				testutil.AssertEqual(t, "Approved for download", response["admin_notes"])
			},
		},
		{
			name:      "user cannot update others' requests",
			requestID: fmt.Sprintf("%d", request.ID),
			userID:    otherUser.ID,
			isAdmin:   false,
			input: UpdateRequestInput{
				Notes: "Should fail",
			},
			expectedStatus: http.StatusForbidden,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "You can only update your own requests", response["error"])
			},
		},
		{
			name:      "invalid request ID",
			requestID: "invalid",
			userID:    user.ID,
			isAdmin:   false,
			input:     UpdateRequestInput{},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid request ID", response["error"])
			},
		},
		{
			name:      "request not found",
			requestID: "9999",
			userID:    user.ID,
			isAdmin:   false,
			input:     UpdateRequestInput{},
			expectedStatus: http.StatusNotFound,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Request not found", response["error"])
			},
		},
		{
			name:      "no valid updates",
			requestID: fmt.Sprintf("%d", request.ID),
			userID:    user.ID,
			isAdmin:   false,
			input:     UpdateRequestInput{},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "No valid updates provided", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.PUT("/requests/:id", func(c *gin.Context) {
				c.Set("userID", tt.userID)
				c.Set("isAdmin", tt.isAdmin)
				handler.UpdateRequest(c)
			})

			body, err := json.Marshal(tt.input)
			testutil.AssertNoError(t, err)

			req, err := http.NewRequest("PUT", "/requests/"+tt.requestID, bytes.NewReader(body))
			testutil.AssertNoError(t, err)
			req.Header.Set("Content-Type", "application/json")

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

func TestRequestHandler_DeleteRequest(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	db := testutil.SetupTestDB(t)
	handler := NewRequestHandler(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	admin := testutil.CreateTestUser(t, db, "admin@example.com", "admin", "pass", true)
	otherUser := testutil.CreateTestUser(t, db, "other@example.com", "other", "pass", false)

	tests := []struct {
		name           string
		setupRequest   func() uint
		requestID      string
		userID         uint
		isAdmin        bool
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
		checkDB        func(t *testing.T, requestID uint)
	}{
		{
			name: "user deletes own request",
			setupRequest: func() uint {
				req := testutil.CreateTestRequest(t, db, user.ID, "To Delete", models.MediaTypeMovie)
				return req.ID
			},
			userID:         user.ID,
			isAdmin:        false,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Request deleted successfully", response["message"])
			},
			checkDB: func(t *testing.T, requestID uint) {
				var count int64
				db.Model(&models.Request{}).Where("id = ?", requestID).Count(&count)
				testutil.AssertEqual(t, int64(0), count)
			},
		},
		{
			name: "admin deletes any request",
			setupRequest: func() uint {
				req := testutil.CreateTestRequest(t, db, otherUser.ID, "Admin Delete", models.MediaTypeMovie)
				return req.ID
			},
			userID:         admin.ID,
			isAdmin:        true,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Request deleted successfully", response["message"])
			},
		},
		{
			name: "user cannot delete others' requests",
			setupRequest: func() uint {
				req := testutil.CreateTestRequest(t, db, otherUser.ID, "Cannot Delete", models.MediaTypeMovie)
				return req.ID
			},
			userID:         user.ID,
			isAdmin:        false,
			expectedStatus: http.StatusForbidden,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "You can only delete your own requests", response["error"])
			},
		},
		{
			name:           "invalid request ID",
			requestID:      "invalid",
			userID:         user.ID,
			isAdmin:        false,
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid request ID", response["error"])
			},
		},
		{
			name:           "request not found",
			requestID:      "9999",
			userID:         user.ID,
			isAdmin:        false,
			expectedStatus: http.StatusNotFound,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Request not found", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var requestID uint
			if tt.setupRequest != nil {
				requestID = tt.setupRequest()
				tt.requestID = fmt.Sprintf("%d", requestID)
			}

			router := gin.New()
			router.DELETE("/requests/:id", func(c *gin.Context) {
				c.Set("userID", tt.userID)
				c.Set("isAdmin", tt.isAdmin)
				handler.DeleteRequest(c)
			})

			req, err := http.NewRequest("DELETE", "/requests/"+tt.requestID, nil)
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

			if tt.checkDB != nil {
				tt.checkDB(t, requestID)
			}
		})
	}
}

func TestRequestHandler_GetRequestStats(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	db := testutil.SetupTestDB(t)
	handler := NewRequestHandler(db)

	// Create test data
	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	admin := testutil.CreateTestUser(t, db, "admin@example.com", "admin", "pass", true)

	// Create various requests
	req1 := testutil.CreateTestRequest(t, db, user.ID, "Movie 1", models.MediaTypeMovie)
	req2 := testutil.CreateTestRequest(t, db, user.ID, "Movie 2", models.MediaTypeMovie)
	req3 := testutil.CreateTestRequest(t, db, user.ID, "TV Show 1", models.MediaTypeTV)
	
	// Update statuses
	req2.Status = models.StatusApproved
	db.Save(&req2)
	req3.Status = models.StatusCompleted
	db.Save(&req3)

	tests := []struct {
		name           string
		userID         uint
		isAdmin        bool
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name:           "admin can view stats",
			userID:         admin.ID,
			isAdmin:        true,
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, float64(3), response["total_requests"])
				
				// Check status counts
				statusCounts := response["by_status"].([]interface{})
				testutil.AssertEqual(t, 3, len(statusCounts))
				
				// Check media type counts
				mediaTypeCounts := response["by_media_type"].([]interface{})
				testutil.AssertEqual(t, 2, len(mediaTypeCounts))
			},
		},
		{
			name:           "non-admin cannot view stats",
			userID:         user.ID,
			isAdmin:        false,
			expectedStatus: http.StatusForbidden,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Admin privileges required", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.GET("/requests/stats", func(c *gin.Context) {
				c.Set("userID", tt.userID)
				c.Set("isAdmin", tt.isAdmin)
				handler.GetRequestStats(c)
			})

			req, err := http.NewRequest("GET", "/requests/stats", nil)
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