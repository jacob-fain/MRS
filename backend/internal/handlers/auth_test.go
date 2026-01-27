package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/models"
	"github.com/jacob-fain/MRS/internal/services"
	"github.com/jacob-fain/MRS/internal/testutil"
)

func TestAuthHandler_Register(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	db := testutil.SetupTestDB(t)
	
	// Set JWT secret for testing
	os.Setenv("JWT_SECRET", "test-secret-key")
	defer os.Unsetenv("JWT_SECRET")
	
	authService, err := services.NewAuthService()
	testutil.AssertNoError(t, err)
	
	handler := NewAuthHandler(db, authService)
	router := gin.New()
	router.POST("/auth/register", handler.Register)

	tests := []struct {
		name           string
		request        RegisterRequest
		setupDB        func()
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name: "successful registration",
			request: RegisterRequest{
				Email:    "newuser@example.com",
				Username: "newuser",
				Password: "password123",
			},
			expectedStatus: http.StatusCreated,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Registration successful", response["message"])
				
				// Check token exists
				token, ok := response["token"].(string)
				if !ok || token == "" {
					t.Error("expected token in response")
				}
				
				// Check user data
				user, ok := response["user"].(map[string]interface{})
				if !ok {
					t.Error("expected user in response")
					return
				}
				testutil.AssertEqual(t, "newuser@example.com", user["email"])
				testutil.AssertEqual(t, "newuser", user["username"])
				testutil.AssertEqual(t, false, user["is_admin"])
			},
		},
		{
			name: "duplicate email",
			request: RegisterRequest{
				Email:    "existing@example.com",
				Username: "newuser2",
				Password: "password123",
			},
			setupDB: func() {
				testutil.CreateTestUser(t, db, "existing@example.com", "existinguser", "hashedpass", false)
			},
			expectedStatus: http.StatusConflict,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Email already registered", response["error"])
			},
		},
		{
			name: "duplicate username",
			request: RegisterRequest{
				Email:    "newuser@example.com",
				Username: "existinguser",
				Password: "password123",
			},
			setupDB: func() {
				testutil.CreateTestUser(t, db, "other@example.com", "existinguser", "hashedpass", false)
			},
			expectedStatus: http.StatusConflict,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Username already taken", response["error"])
			},
		},
		{
			name: "invalid email",
			request: RegisterRequest{
				Email:    "invalid-email",
				Username: "validuser",
				Password: "password123",
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid request data", response["error"])
			},
		},
		{
			name: "short password",
			request: RegisterRequest{
				Email:    "user@example.com",
				Username: "validuser",
				Password: "123",
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid request data", response["error"])
			},
		},
		{
			name: "short username",
			request: RegisterRequest{
				Email:    "user@example.com",
				Username: "ab",
				Password: "password123",
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid request data", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean database
			db.Exec("DELETE FROM users")
			
			// Setup database if needed
			if tt.setupDB != nil {
				tt.setupDB()
			}

			// Create request
			body, err := json.Marshal(tt.request)
			testutil.AssertNoError(t, err)

			req, err := http.NewRequest("POST", "/auth/register", bytes.NewReader(body))
			testutil.AssertNoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Check status
			testutil.AssertEqual(t, tt.expectedStatus, w.Code)

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			testutil.AssertNoError(t, err)

			// Check response
			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestAuthHandler_Login(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	db := testutil.SetupTestDB(t)
	
	// Set JWT secret for testing
	os.Setenv("JWT_SECRET", "test-secret-key")
	defer os.Unsetenv("JWT_SECRET")
	
	authService, err := services.NewAuthService()
	testutil.AssertNoError(t, err)
	
	// Create test user with hashed password
	hashedPassword, err := authService.HashPassword("correctpassword")
	testutil.AssertNoError(t, err)
	
	handler := NewAuthHandler(db, authService)
	router := gin.New()
	router.POST("/auth/login", handler.Login)

	tests := []struct {
		name           string
		request        LoginRequest
		setupDB        func()
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name: "successful login",
			request: LoginRequest{
				Email:    "user@example.com",
				Password: "correctpassword",
			},
			setupDB: func() {
				user := &models.User{
					Email:    "user@example.com",
					Username: "testuser",
					Password: hashedPassword,
					IsAdmin:  false,
				}
				db.Create(user)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Login successful", response["message"])
				
				// Check token exists
				token, ok := response["token"].(string)
				if !ok || token == "" {
					t.Error("expected token in response")
				}
				
				// Check user data
				user, ok := response["user"].(map[string]interface{})
				if !ok {
					t.Error("expected user in response")
					return
				}
				testutil.AssertEqual(t, "user@example.com", user["email"])
				testutil.AssertEqual(t, "testuser", user["username"])
			},
		},
		{
			name: "admin login",
			request: LoginRequest{
				Email:    "admin@example.com",
				Password: "correctpassword",
			},
			setupDB: func() {
				user := &models.User{
					Email:    "admin@example.com",
					Username: "admin",
					Password: hashedPassword,
					IsAdmin:  true,
				}
				db.Create(user)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				user, _ := response["user"].(map[string]interface{})
				testutil.AssertEqual(t, true, user["is_admin"])
			},
		},
		{
			name: "wrong password",
			request: LoginRequest{
				Email:    "user@example.com",
				Password: "wrongpassword",
			},
			setupDB: func() {
				user := &models.User{
					Email:    "user@example.com",
					Username: "testuser",
					Password: hashedPassword,
					IsAdmin:  false,
				}
				db.Create(user)
			},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid credentials", response["error"])
			},
		},
		{
			name: "non-existent user",
			request: LoginRequest{
				Email:    "nonexistent@example.com",
				Password: "somepassword",
			},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid credentials", response["error"])
			},
		},
		{
			name: "invalid email format",
			request: LoginRequest{
				Email:    "invalid-email",
				Password: "password123",
			},
			expectedStatus: http.StatusBadRequest,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Invalid request data", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean database
			db.Exec("DELETE FROM users")
			
			// Setup database if needed
			if tt.setupDB != nil {
				tt.setupDB()
			}

			// Create request
			body, err := json.Marshal(tt.request)
			testutil.AssertNoError(t, err)

			req, err := http.NewRequest("POST", "/auth/login", bytes.NewReader(body))
			testutil.AssertNoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Check status
			testutil.AssertEqual(t, tt.expectedStatus, w.Code)

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			testutil.AssertNoError(t, err)

			// Check response
			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}

func TestAuthHandler_GetCurrentUser(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	db := testutil.SetupTestDB(t)
	
	// Set JWT secret for testing
	os.Setenv("JWT_SECRET", "test-secret-key")
	defer os.Unsetenv("JWT_SECRET")
	
	authService, err := services.NewAuthService()
	testutil.AssertNoError(t, err)
	
	handler := NewAuthHandler(db, authService)
	
	// Create test user
	user := testutil.CreateTestUser(t, db, "user@example.com", "testuser", "hashedpass", false)

	tests := []struct {
		name           string
		setupContext   func(c *gin.Context)
		expectedStatus int
		checkResponse  func(t *testing.T, response map[string]interface{})
	}{
		{
			name: "successful get current user",
			setupContext: func(c *gin.Context) {
				c.Set("userID", user.ID)
			},
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, float64(user.ID), response["id"])
				testutil.AssertEqual(t, "user@example.com", response["email"])
				testutil.AssertEqual(t, "testuser", response["username"])
				testutil.AssertEqual(t, false, response["is_admin"])
			},
		},
		{
			name:           "no user in context",
			setupContext:   func(c *gin.Context) {},
			expectedStatus: http.StatusUnauthorized,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "User not found in context", response["error"])
			},
		},
		{
			name: "user not found in database",
			setupContext: func(c *gin.Context) {
				c.Set("userID", uint(9999))
			},
			expectedStatus: http.StatusInternalServerError,
			checkResponse: func(t *testing.T, response map[string]interface{}) {
				testutil.AssertEqual(t, "Failed to find user", response["error"])
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create router for each test
			router := gin.New()
			router.GET("/auth/me", func(c *gin.Context) {
				tt.setupContext(c)
				handler.GetCurrentUser(c)
			})

			// Create request
			req, err := http.NewRequest("GET", "/auth/me", nil)
			testutil.AssertNoError(t, err)

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Check status
			testutil.AssertEqual(t, tt.expectedStatus, w.Code)

			// Parse response
			var response map[string]interface{}
			err = json.Unmarshal(w.Body.Bytes(), &response)
			testutil.AssertNoError(t, err)

			// Check response
			if tt.checkResponse != nil {
				tt.checkResponse(t, response)
			}
		})
	}
}