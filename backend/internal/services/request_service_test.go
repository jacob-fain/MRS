package services

import (
	"testing"

	"github.com/jacob/plex-requests/internal/models"
	"github.com/jacob/plex-requests/internal/testutil"
)

func TestRequestService_GetPendingRequests(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewRequestService(db)

	// Create test data
	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	
	// Create requests with different statuses
	req1 := testutil.CreateTestRequest(t, db, user.ID, "Pending 1", models.MediaTypeMovie)
	req2 := testutil.CreateTestRequest(t, db, user.ID, "Pending 2", models.MediaTypeMovie)
	req3 := testutil.CreateTestRequest(t, db, user.ID, "Approved", models.MediaTypeMovie)
	req3.Status = models.StatusApproved
	db.Save(&req3)

	// Get pending requests
	requests, err := service.GetPendingRequests()
	testutil.AssertNoError(t, err)
	testutil.AssertEqual(t, 2, len(requests))
	
	// Verify only pending requests are returned
	for _, req := range requests {
		testutil.AssertEqual(t, models.StatusPending, req.Status)
	}
}

func TestRequestService_ApproveRequest(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewRequestService(db)

	// Create test request
	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)
	request := testutil.CreateTestRequest(t, db, user.ID, "To Approve", models.MediaTypeMovie)

	// Approve request
	err := service.ApproveRequest(request.ID, "Approved for download")
	testutil.AssertNoError(t, err)

	// Verify status changed
	var updated models.Request
	db.First(&updated, request.ID)
	testutil.AssertEqual(t, models.StatusApproved, updated.Status)
	testutil.AssertEqual(t, "Approved for download", updated.AdminNotes)
}

func TestRequestService_CheckDuplicateRequest(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewRequestService(db)

	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)

	tests := []struct {
		name      string
		setupDB   func()
		userID    uint
		title     string
		mediaType models.MediaType
		wantDupe  bool
	}{
		{
			name: "no duplicate",
			userID: user.ID,
			title: "New Movie",
			mediaType: models.MediaTypeMovie,
			wantDupe: false,
		},
		{
			name: "duplicate pending request",
			setupDB: func() {
				testutil.CreateTestRequest(t, db, user.ID, "Existing Movie", models.MediaTypeMovie)
			},
			userID: user.ID,
			title: "Existing Movie",
			mediaType: models.MediaTypeMovie,
			wantDupe: true,
		},
		{
			name: "duplicate approved request",
			setupDB: func() {
				req := testutil.CreateTestRequest(t, db, user.ID, "Approved Movie", models.MediaTypeMovie)
				req.Status = models.StatusApproved
				db.Save(&req)
			},
			userID: user.ID,
			title: "Approved Movie",
			mediaType: models.MediaTypeMovie,
			wantDupe: true,
		},
		{
			name: "completed request not duplicate",
			setupDB: func() {
				req := testutil.CreateTestRequest(t, db, user.ID, "Completed Movie", models.MediaTypeMovie)
				req.Status = models.StatusCompleted
				db.Save(&req)
			},
			userID: user.ID,
			title: "Completed Movie",
			mediaType: models.MediaTypeMovie,
			wantDupe: false,
		},
		{
			name: "different media type not duplicate",
			setupDB: func() {
				testutil.CreateTestRequest(t, db, user.ID, "Same Title", models.MediaTypeMovie)
			},
			userID: user.ID,
			title: "Same Title",
			mediaType: models.MediaTypeTV,
			wantDupe: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean database
			db.Exec("DELETE FROM requests")

			if tt.setupDB != nil {
				tt.setupDB()
			}

			isDupe, err := service.CheckDuplicateRequest(tt.userID, tt.title, tt.mediaType)
			testutil.AssertNoError(t, err)
			testutil.AssertEqual(t, tt.wantDupe, isDupe)
		})
	}
}

func TestRequestService_GetRequestStatsByUser(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewRequestService(db)

	// Create test users
	user1 := testutil.CreateTestUser(t, db, "user1@example.com", "user1", "pass", false)
	user2 := testutil.CreateTestUser(t, db, "user2@example.com", "user2", "pass", false)

	// Create various requests for user1
	req1 := testutil.CreateTestRequest(t, db, user1.ID, "Movie 1", models.MediaTypeMovie)
	req2 := testutil.CreateTestRequest(t, db, user1.ID, "Movie 2", models.MediaTypeMovie)
	req3 := testutil.CreateTestRequest(t, db, user1.ID, "Movie 3", models.MediaTypeMovie)
	req4 := testutil.CreateTestRequest(t, db, user1.ID, "Movie 4", models.MediaTypeMovie)

	// Update statuses
	req2.Status = models.StatusApproved
	db.Save(&req2)
	req3.Status = models.StatusCompleted
	db.Save(&req3)
	req4.Status = models.StatusRejected
	db.Save(&req4)

	// Create a request for user2 (should not affect user1 stats)
	testutil.CreateTestRequest(t, db, user2.ID, "Other Movie", models.MediaTypeMovie)

	// Get stats for user1
	stats, err := service.GetRequestStatsByUser(user1.ID)
	testutil.AssertNoError(t, err)

	testutil.AssertEqual(t, int64(4), stats["total"])
	testutil.AssertEqual(t, int64(1), stats["pending"])
	testutil.AssertEqual(t, int64(1), stats["approved"])
	testutil.AssertEqual(t, int64(1), stats["completed"])
	testutil.AssertEqual(t, int64(1), stats["rejected"])
}

func TestRequestService_GetRequestQueue(t *testing.T) {
	db := testutil.SetupTestDB(t)
	service := NewRequestService(db)

	// Create test data
	user := testutil.CreateTestUser(t, db, "user@example.com", "user", "pass", false)

	// Create requests with different statuses and update times
	req1 := testutil.CreateTestRequest(t, db, user.ID, "Pending", models.MediaTypeMovie)
	
	req2 := testutil.CreateTestRequest(t, db, user.ID, "Approved First", models.MediaTypeMovie)
	req2.Status = models.StatusApproved
	db.Save(&req2)
	
	// Wait a moment to ensure different timestamps
	req3 := testutil.CreateTestRequest(t, db, user.ID, "Approved Second", models.MediaTypeMovie)
	req3.Status = models.StatusApproved
	db.Save(&req3)

	req4 := testutil.CreateTestRequest(t, db, user.ID, "Completed", models.MediaTypeMovie)
	req4.Status = models.StatusCompleted
	db.Save(&req4)

	// Get queue
	queue, err := service.GetRequestQueue()
	testutil.AssertNoError(t, err)
	
	// Should only get approved requests
	testutil.AssertEqual(t, 2, len(queue))
	
	// Verify FIFO order (first approved should be first in queue)
	testutil.AssertEqual(t, "Approved First", queue[0].Title)
	testutil.AssertEqual(t, "Approved Second", queue[1].Title)
}