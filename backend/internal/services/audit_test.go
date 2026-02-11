package services

import (
	"testing"

	"github.com/jacob-fain/MRS/internal/models"
	"github.com/jacob-fain/MRS/internal/testutil"
)

func TestAuditService_LogRequestCreated(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewAuditService(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	req := testutil.CreateTestRequest(t, db, user.ID, "The Matrix", models.MediaTypeMovie)

	err := service.LogRequestCreated(req.ID, user.ID)
	testutil.AssertNoError(t, err)

	// Verify log was created
	var log models.AuditLog
	err = db.Where("request_id = ? AND action = ?", req.ID, models.ActionCreated).First(&log).Error
	testutil.AssertNoError(t, err)
	testutil.AssertEqual(t, req.ID, log.RequestID)
	testutil.AssertEqual(t, user.ID, *log.UserID)
	testutil.AssertEqual(t, string(models.ActionCreated), string(log.Action))
}

func TestAuditService_LogRequestStatusChange(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewAuditService(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	req := testutil.CreateTestRequest(t, db, user.ID, "The Matrix", models.MediaTypeMovie)

	err := service.LogRequestStatusChange(req.ID, &user.ID, models.StatusPending, models.StatusApproved)
	testutil.AssertNoError(t, err)

	// Verify log was created
	var log models.AuditLog
	err = db.Where("request_id = ? AND action = ?", req.ID, models.ActionApproved).First(&log).Error
	testutil.AssertNoError(t, err)
	testutil.AssertEqual(t, req.ID, log.RequestID)
	testutil.AssertEqual(t, user.ID, *log.UserID)
	testutil.AssertEqual(t, string(models.ActionApproved), string(log.Action))
	testutil.AssertNotNil(t, log.OldValue)
	testutil.AssertNotNil(t, log.NewValue)
}

func TestAuditService_LogRequestNotesUpdate(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewAuditService(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	req := testutil.CreateTestRequest(t, db, user.ID, "The Matrix", models.MediaTypeMovie)

	err := service.LogRequestNotesUpdate(req.ID, &user.ID, "Admin notes")
	testutil.AssertNoError(t, err)

	// Verify log was created
	var log models.AuditLog
	err = db.Where("request_id = ? AND action = ?", req.ID, models.ActionNotesUpdated).First(&log).Error
	testutil.AssertNoError(t, err)
	testutil.AssertEqual(t, req.ID, log.RequestID)
	testutil.AssertEqual(t, user.ID, *log.UserID)
}

func TestAuditService_LogRequestDeleted(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewAuditService(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	req := testutil.CreateTestRequest(t, db, user.ID, "The Matrix", models.MediaTypeMovie)

	err := service.LogRequestDeleted(req.ID, user.ID, "The Matrix")
	testutil.AssertNoError(t, err)

	// Verify log was created
	var log models.AuditLog
	err = db.Where("request_id = ? AND action = ?", req.ID, models.ActionDeleted).First(&log).Error
	testutil.AssertNoError(t, err)
	testutil.AssertEqual(t, req.ID, log.RequestID)
	testutil.AssertEqual(t, user.ID, *log.UserID)
}

func TestAuditService_GetRequestAuditLogs(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewAuditService(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	req := testutil.CreateTestRequest(t, db, user.ID, "The Matrix", models.MediaTypeMovie)

	// Create multiple audit logs
	service.LogRequestCreated(req.ID, user.ID)
	service.LogRequestStatusChange(req.ID, &user.ID, models.StatusPending, models.StatusApproved)
	service.LogRequestNotesUpdate(req.ID, &user.ID, "User notes")

	// Retrieve logs
	logs, err := service.GetRequestAuditLogs(req.ID)
	testutil.AssertNoError(t, err)
	testutil.AssertTrue(t, len(logs) >= 3, "should have at least 3 audit logs")

	// Verify ordering (DESC by created_at)
	for i := 1; i < len(logs); i++ {
		testutil.AssertTrue(t, logs[i].CreatedAt.Before(logs[i-1].CreatedAt) || logs[i].CreatedAt.Equal(logs[i-1].CreatedAt),
			"logs should be ordered by created_at DESC")
	}

	// Verify user preloading
	foundUserPreloaded := false
	for _, log := range logs {
		if log.User != nil {
			foundUserPreloaded = true
			testutil.AssertEqual(t, user.ID, log.User.ID)
			break
		}
	}
	testutil.AssertTrue(t, foundUserPreloaded, "at least one log should have User preloaded")
}
