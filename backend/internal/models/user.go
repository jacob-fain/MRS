package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
	
	Email    string `json:"email" gorm:"uniqueIndex;not null"`
	Username string `json:"username" gorm:"uniqueIndex;not null"`
	Password string `json:"-" gorm:"not null"`
	IsAdmin  bool   `json:"is_admin" gorm:"default:false"`
	
	Requests []Request `json:"requests,omitempty" gorm:"foreignKey:UserID"`
}