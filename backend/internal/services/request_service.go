package services

import (
	"fmt"
	"log"

	"github.com/jacob-fain/MRS/internal/models"
	"gorm.io/gorm"
)

// RequestService handles business logic for requests
type RequestService struct {
	db *gorm.DB
}

// NewRequestService creates a new request service
func NewRequestService(db *gorm.DB) *RequestService {
	return &RequestService{db: db}
}

// GetPendingRequests returns all pending requests
func (s *RequestService) GetPendingRequests() ([]models.Request, error) {
	var requests []models.Request
	err := s.db.Preload("User").Where("status = ?", models.StatusPending).Find(&requests).Error
	return requests, err
}

// GetApprovedRequests returns all approved requests ready for download
func (s *RequestService) GetApprovedRequests() ([]models.Request, error) {
	var requests []models.Request
	err := s.db.Preload("User").Where("status = ?", models.StatusApproved).Find(&requests).Error
	return requests, err
}

// GetRequestsByUser returns all requests for a specific user
func (s *RequestService) GetRequestsByUser(userID uint) ([]models.Request, error) {
	var requests []models.Request
	err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&requests).Error
	return requests, err
}

// ApproveRequest approves a request and prepares it for download
func (s *RequestService) ApproveRequest(requestID uint, adminNotes string) error {
	return s.db.Model(&models.Request{}).
		Where("id = ?", requestID).
		Updates(map[string]interface{}{
			"status":      models.StatusApproved,
			"admin_notes": adminNotes,
		}).Error
}

// CompleteRequest marks a request as completed
func (s *RequestService) CompleteRequest(requestID uint) error {
	return s.db.Model(&models.Request{}).
		Where("id = ?", requestID).
		Update("status", models.StatusCompleted).Error
}

// RejectRequest rejects a request with a reason
func (s *RequestService) RejectRequest(requestID uint, reason string) error {
	return s.db.Model(&models.Request{}).
		Where("id = ?", requestID).
		Updates(map[string]interface{}{
			"status":      models.StatusRejected,
			"admin_notes": reason,
		}).Error
}

// GetRequestQueue returns the download queue (approved requests)
func (s *RequestService) GetRequestQueue() ([]models.Request, error) {
	var requests []models.Request
	err := s.db.Preload("User").
		Where("status = ?", models.StatusApproved).
		Order("updated_at ASC"). // FIFO for approved requests
		Find(&requests).Error
	return requests, err
}

// CheckDuplicateRequest checks if a similar request already exists
func (s *RequestService) CheckDuplicateRequest(userID uint, title string, mediaType models.MediaType) (bool, error) {
	var count int64
	err := s.db.Model(&models.Request{}).
		Where("user_id = ? AND title = ? AND media_type = ? AND status IN ?", 
			userID, title, mediaType, []models.RequestStatus{models.StatusPending, models.StatusApproved}).
		Count(&count).Error
	return count > 0, err
}

// GetRequestStatsByUser returns statistics for a specific user
func (s *RequestService) GetRequestStatsByUser(userID uint) (map[string]interface{}, error) {
	var totalRequests int64
	var pendingRequests int64
	var approvedRequests int64
	var completedRequests int64
	var rejectedRequests int64

	// Get total requests
	if err := s.db.Model(&models.Request{}).Where("user_id = ?", userID).Count(&totalRequests).Error; err != nil {
		return nil, err
	}

	// Get counts by status
	s.db.Model(&models.Request{}).Where("user_id = ? AND status = ?", userID, models.StatusPending).Count(&pendingRequests)
	s.db.Model(&models.Request{}).Where("user_id = ? AND status = ?", userID, models.StatusApproved).Count(&approvedRequests)
	s.db.Model(&models.Request{}).Where("user_id = ? AND status = ?", userID, models.StatusCompleted).Count(&completedRequests)
	s.db.Model(&models.Request{}).Where("user_id = ? AND status = ?", userID, models.StatusRejected).Count(&rejectedRequests)

	return map[string]interface{}{
		"total":     totalRequests,
		"pending":   pendingRequests,
		"approved":  approvedRequests,
		"completed": completedRequests,
		"rejected":  rejectedRequests,
	}, nil
}

// ProcessRequestQueue can be called periodically to process approved requests
func (s *RequestService) ProcessRequestQueue() error {
	requests, err := s.GetRequestQueue()
	if err != nil {
		return fmt.Errorf("failed to get request queue: %w", err)
	}

	for _, request := range requests {
		// This is where you would integrate with download services
		// For now, we'll just log
		log.Printf("Processing request: %s (%s) - ID: %d", request.Title, request.MediaType, request.ID)
		
		// In a real implementation, you would:
		// 1. Search for the media on torrent sites or usenet
		// 2. Add to download client (like qBittorrent, Transmission, SABnzbd)
		// 3. Update request status based on download status
		// 4. Move completed downloads to Plex library
	}

	return nil
}

// CleanupOldRequests removes completed/rejected requests older than specified days
func (s *RequestService) CleanupOldRequests(daysOld int) error {
	return s.db.Where("status IN ? AND updated_at < NOW() - INTERVAL ? DAY",
		[]models.RequestStatus{models.StatusCompleted, models.StatusRejected}, daysOld).
		Delete(&models.Request{}).Error
}