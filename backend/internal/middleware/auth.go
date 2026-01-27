package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jacob/plex-requests/internal/services"
)

// AuthRequired creates a middleware that requires a valid JWT token
func AuthRequired(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
			})
			c.Abort()
			return
		}

		// Check Bearer prefix
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		// Validate token
		token := parts[1]
		claims, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Extract user information from claims
		userID, err := authService.GetUserIDFromClaims(claims)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token claims",
			})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("userID", userID)
		c.Set("userEmail", claims["email"])
		c.Set("isAdmin", authService.IsAdminFromClaims(claims))

		c.Next()
	}
}

// AdminRequired creates a middleware that requires admin privileges
func AdminRequired(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// First ensure user is authenticated
		isAdmin, exists := c.Get("isAdmin")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
			})
			c.Abort()
			return
		}

		// Check if user is admin
		if admin, ok := isAdmin.(bool); !ok || !admin {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin privileges required",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth creates a middleware that validates JWT if present but doesn't require it
func OptionalAuth(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token provided, continue without auth
			c.Next()
			return
		}

		// Check Bearer prefix
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			// Invalid format, continue without auth
			c.Next()
			return
		}

		// Validate token
		token := parts[1]
		claims, err := authService.ValidateToken(token)
		if err != nil {
			// Invalid token, continue without auth
			c.Next()
			return
		}

		// Extract user information from claims
		userID, err := authService.GetUserIDFromClaims(claims)
		if err != nil {
			// Invalid claims, continue without auth
			c.Next()
			return
		}

		// Set user information in context
		c.Set("userID", userID)
		c.Set("userEmail", claims["email"])
		c.Set("isAdmin", authService.IsAdminFromClaims(claims))

		c.Next()
	}
}