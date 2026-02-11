package models

import (
	"time"

	"gorm.io/gorm"
)

// AuditAction represents the type of action performed
type AuditAction string

const (
	ActionCreated       AuditAction = "created"
	ActionApproved      AuditAction = "approved"
	ActionRejected      AuditAction = "rejected"
	ActionCompleted     AuditAction = "completed"
	ActionNotesUpdated  AuditAction = "notes_updated"
	ActionDeleted       AuditAction = "deleted"
	ActionStatusChanged AuditAction = "status_changed"
)

// AuditLog represents an audit log entry for request changes
type AuditLog struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	RequestID  uint           `gorm:"not null;index" json:"request_id"`
	Request    *Request       `gorm:"foreignKey:RequestID" json:"request,omitempty"`
	UserID     *uint          `gorm:"index" json:"user_id"` // Nullable for system actions
	User       *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action     AuditAction    `gorm:"type:varchar(50);not null" json:"action"`
	OldValue   string         `gorm:"type:text" json:"old_value,omitempty"` // JSON string
	NewValue   string         `gorm:"type:text" json:"new_value,omitempty"` // JSON string
	Notes      string         `gorm:"type:text" json:"notes,omitempty"`     // Human-readable description
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
