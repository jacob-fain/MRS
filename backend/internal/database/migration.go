package database

import (
	"github.com/jacob/plex-requests/internal/models"
	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.Request{},
	)
}