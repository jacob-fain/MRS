package testutil

import (
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/jacob-fain/MRS/internal/models"
)

// SetupTestDB creates an in-memory SQLite database for testing
func SetupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	// Run migrations
	err = db.AutoMigrate(&models.User{}, &models.Request{})
	if err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	return db
}

// SetupTestRouter creates a test Gin router
func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

// CreateTestUser creates a test user in the database
func CreateTestUser(t *testing.T, db *gorm.DB, email, username, password string, isAdmin bool) *models.User {
	user := &models.User{
		Email:    email,
		Username: username,
		Password: password, // In real tests, this should be hashed
		IsAdmin:  isAdmin,
	}

	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}

	return user
}

// CreateTestRequest creates a test request in the database
func CreateTestRequest(t *testing.T, db *gorm.DB, userID uint, title string, mediaType models.MediaType) *models.Request {
	request := &models.Request{
		UserID:    userID,
		Title:     title,
		Year:      2024,
		MediaType: mediaType,
		Status:    models.StatusPending,
		Overview:  "Test overview",
	}

	if err := db.Create(request).Error; err != nil {
		t.Fatalf("failed to create test request: %v", err)
	}

	return request
}

// AssertEqual checks if two values are equal
func AssertEqual(t *testing.T, expected, actual interface{}) {
	t.Helper()
	if expected != actual {
		t.Errorf("expected %v, got %v", expected, actual)
	}
}

// AssertNoError checks if error is nil
func AssertNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

// AssertError checks if error is not nil
func AssertError(t *testing.T, err error) {
	t.Helper()
	if err == nil {
		t.Error("expected error, got nil")
	}
}

// AssertErrorContains checks if error contains a specific string
func AssertErrorContains(t *testing.T, err error, contains string) {
	t.Helper()
	if err == nil {
		t.Errorf("expected error containing '%s', got nil", contains)
		return
	}
	if !stringContains(err.Error(), contains) {
		t.Errorf("expected error containing '%s', got '%s'", contains, err.Error())
	}
}

// WaitFor waits for a condition to be true with timeout
func WaitFor(t *testing.T, condition func() bool, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Errorf("condition not met within %v", timeout)
}

func stringContains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && stringContains(s[1:], substr))
}