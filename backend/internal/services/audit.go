package services

import (
	"encoding/json"
	"fmt"

	"github.com/jacob-fain/MRS/internal/models"
	"gorm.io/gorm"
)

// AuditService handles audit logging for requests
type AuditService struct {
	db *gorm.DB
}

// NewAuditService creates a new audit service
func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

// LogRequestCreated logs when a request is created
func (s *AuditService) LogRequestCreated(requestID, userID uint) error {
	log := models.AuditLog{
		RequestID: requestID,
		UserID:    &userID,
		Action:    models.ActionCreated,
		Notes:     "Request created",
	}
	return s.db.Create(&log).Error
}

// LogRequestStatusChange logs when a request status changes
func (s *AuditService) LogRequestStatusChange(requestID uint, userID *uint, oldStatus, newStatus models.RequestStatus) error {
	oldValueJSON, _ := json.Marshal(map[string]interface{}{"status": oldStatus})
	newValueJSON, _ := json.Marshal(map[string]interface{}{"status": newStatus})

	action := models.ActionStatusChanged
	notes := fmt.Sprintf("Status changed from %s to %s", oldStatus, newStatus)

	// Use more specific actions for common status changes
	switch newStatus {
	case models.StatusApproved:
		action = models.ActionApproved
		notes = "Request approved"
	case models.StatusRejected:
		action = models.ActionRejected
		notes = "Request rejected"
	case models.StatusCompleted:
		action = models.ActionCompleted
		notes = "Request marked as completed"
	}

	log := models.AuditLog{
		RequestID: requestID,
		UserID:    userID,
		Action:    action,
		OldValue:  string(oldValueJSON),
		NewValue:  string(newValueJSON),
		Notes:     notes,
	}
	return s.db.Create(&log).Error
}

// LogRequestNotesUpdate logs when request notes are updated
func (s *AuditService) LogRequestNotesUpdate(requestID uint, userID *uint, fieldName string) error {
	notes := fmt.Sprintf("%s updated", fieldName)
	log := models.AuditLog{
		RequestID: requestID,
		UserID:    userID,
		Action:    models.ActionNotesUpdated,
		Notes:     notes,
	}
	return s.db.Create(&log).Error
}

// LogRequestDeleted logs when a request is deleted
func (s *AuditService) LogRequestDeleted(requestID, userID uint, title string) error {
	notes := fmt.Sprintf("Request deleted: %s", title)
	log := models.AuditLog{
		RequestID: requestID,
		UserID:    &userID,
		Action:    models.ActionDeleted,
		Notes:     notes,
	}
	return s.db.Create(&log).Error
}

// GetRequestAuditLogs retrieves all audit logs for a specific request
func (s *AuditService) GetRequestAuditLogs(requestID uint) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	err := s.db.Where("request_id = ?", requestID).
		Preload("User").
		Order("created_at DESC").
		Find(&logs).Error
	return logs, err
}
