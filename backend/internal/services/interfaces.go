package services

import "github.com/golang-jwt/jwt/v5"

// AuthServiceInterface defines the interface for authentication operations
type AuthServiceInterface interface {
	HashPassword(password string) (string, error)
	VerifyPassword(password, hash string) error
	GenerateToken(userID uint, email string, isAdmin bool) (string, error)
	ValidateToken(tokenString string) (jwt.MapClaims, error)
	GetUserIDFromClaims(claims jwt.MapClaims) (uint, error)
	IsAdminFromClaims(claims jwt.MapClaims) bool
}

// PlexServiceInterface defines the interface for Plex operations
type PlexServiceInterface interface {
	SearchLibrary(query string) ([]PlexSearchResult, error)
	CheckIfExists(title string, year int, mediaType string) (bool, error)
	GetLibraries() ([]PlexLibrary, error)
}

// TMDBServiceInterface defines the interface for TMDB operations
type TMDBServiceInterface interface {
	SearchMulti(query string, page int) (*TMDBSearchResult, error)
	GetMovieDetails(movieID int) (*TMDBMovieDetails, error)
	GetTVDetails(tvID int) (*TMDBTVDetails, error)
	GetImageURL(path string, size string) string
}