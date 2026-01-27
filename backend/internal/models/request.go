package models

import (
	"time"

	"gorm.io/gorm"
)

type RequestStatus string

const (
	StatusPending   RequestStatus = "pending"
	StatusApproved  RequestStatus = "approved"
	StatusCompleted RequestStatus = "completed"
	StatusRejected  RequestStatus = "rejected"
)

type MediaType string

const (
	MediaTypeMovie MediaType = "movie"
	MediaTypeTV    MediaType = "tv"
)

type Request struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
	
	UserID      uint          `json:"user_id" gorm:"not null"`
	User        User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	
	Title       string        `json:"title" gorm:"not null"`
	Year        int           `json:"year"`
	MediaType   MediaType     `json:"media_type" gorm:"not null"`
	TMDBId      int           `json:"tmdb_id"`
	IMDBId      string        `json:"imdb_id"`
	Overview    string        `json:"overview" gorm:"type:text"`
	PosterPath  string        `json:"poster_path"`
	
	Status      RequestStatus `json:"status" gorm:"default:'pending'"`
	Notes       string        `json:"notes" gorm:"type:text"`
	AdminNotes  string        `json:"admin_notes" gorm:"type:text"`
}