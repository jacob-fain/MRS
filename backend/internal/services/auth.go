package services

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid token")
)

// AuthService handles authentication operations
type AuthService struct {
	jwtSecret []byte
}

// NewAuthService creates a new auth service
func NewAuthService() (*AuthService, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable not set")
	}

	return &AuthService{
		jwtSecret: []byte(secret),
	}, nil
}

// HashPassword hashes a password using bcrypt
func (s *AuthService) HashPassword(password string) (string, error) {
	if len(password) < 6 {
		return "", fmt.Errorf("password must be at least 6 characters")
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hashedBytes), nil
}

// VerifyPassword verifies a password against a hash
func (s *AuthService) VerifyPassword(password, hash string) error {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return ErrInvalidCredentials
		}
		return fmt.Errorf("failed to verify password: %w", err)
	}
	return nil
}

// GenerateToken generates a JWT token for a user
func (s *AuthService) GenerateToken(userID uint, email string, isAdmin bool) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID,
		"email":    email,
		"is_admin": isAdmin,
		"exp":      time.Now().Add(24 * time.Hour).Unix(), // Token expires in 24 hours
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, ErrInvalidToken
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Check expiration
		if exp, ok := claims["exp"].(float64); ok {
			if time.Now().Unix() > int64(exp) {
				return nil, ErrInvalidToken
			}
		}
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// GetUserIDFromClaims extracts user ID from JWT claims
func (s *AuthService) GetUserIDFromClaims(claims jwt.MapClaims) (uint, error) {
	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		return 0, fmt.Errorf("user_id not found in claims")
	}
	return uint(userIDFloat), nil
}

// IsAdminFromClaims checks if user is admin from JWT claims
func (s *AuthService) IsAdminFromClaims(claims jwt.MapClaims) bool {
	isAdmin, ok := claims["is_admin"].(bool)
	return ok && isAdmin
}