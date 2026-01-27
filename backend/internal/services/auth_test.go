package services

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jacob-fain/MRS/internal/testutil"
)

func TestNewAuthService(t *testing.T) {
	tests := []struct {
		name      string
		jwtSecret string
		wantErr   bool
	}{
		{
			name:      "valid secret",
			jwtSecret: "test-secret-key",
			wantErr:   false,
		},
		{
			name:      "missing secret",
			jwtSecret: "",
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("JWT_SECRET", tt.jwtSecret)
			defer os.Unsetenv("JWT_SECRET")

			service, err := NewAuthService()
			if tt.wantErr {
				testutil.AssertError(t, err)
			} else {
				testutil.AssertNoError(t, err)
				testutil.AssertEqual(t, []byte(tt.jwtSecret), service.jwtSecret)
			}
		})
	}
}

func TestAuthService_HashPassword(t *testing.T) {
	service := &AuthService{}

	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "securepassword123",
			wantErr:  false,
		},
		{
			name:     "minimum length password",
			password: "123456",
			wantErr:  false,
		},
		{
			name:     "too short password",
			password: "12345",
			wantErr:  true,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := service.HashPassword(tt.password)
			if tt.wantErr {
				testutil.AssertError(t, err)
			} else {
				testutil.AssertNoError(t, err)
				// Verify hash is not empty and not equal to original password
				if hash == "" || hash == tt.password {
					t.Error("invalid hash generated")
				}
			}
		})
	}
}

func TestAuthService_VerifyPassword(t *testing.T) {
	service := &AuthService{}
	
	// Generate a test hash
	password := "testpassword123"
	hash, err := service.HashPassword(password)
	testutil.AssertNoError(t, err)

	tests := []struct {
		name     string
		password string
		hash     string
		wantErr  bool
		errType  error
	}{
		{
			name:     "correct password",
			password: password,
			hash:     hash,
			wantErr:  false,
		},
		{
			name:     "incorrect password",
			password: "wrongpassword",
			hash:     hash,
			wantErr:  true,
			errType:  ErrInvalidCredentials,
		},
		{
			name:     "invalid hash",
			password: password,
			hash:     "invalid-hash",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.VerifyPassword(tt.password, tt.hash)
			if tt.wantErr {
				testutil.AssertError(t, err)
				if tt.errType != nil && err != tt.errType {
					t.Errorf("expected error %v, got %v", tt.errType, err)
				}
			} else {
				testutil.AssertNoError(t, err)
			}
		})
	}
}

func TestAuthService_GenerateToken(t *testing.T) {
	service := &AuthService{
		jwtSecret: []byte("test-secret"),
	}

	tests := []struct {
		name    string
		userID  uint
		email   string
		isAdmin bool
	}{
		{
			name:    "regular user",
			userID:  1,
			email:   "user@example.com",
			isAdmin: false,
		},
		{
			name:    "admin user",
			userID:  2,
			email:   "admin@example.com",
			isAdmin: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := service.GenerateToken(tt.userID, tt.email, tt.isAdmin)
			testutil.AssertNoError(t, err)
			
			// Verify token is not empty
			if token == "" {
				t.Error("empty token generated")
			}
			
			// Validate the generated token
			claims, err := service.ValidateToken(token)
			testutil.AssertNoError(t, err)
			
			// Verify claims
			testutil.AssertEqual(t, float64(tt.userID), claims["user_id"])
			testutil.AssertEqual(t, tt.email, claims["email"])
			testutil.AssertEqual(t, tt.isAdmin, claims["is_admin"])
		})
	}
}

func TestAuthService_ValidateToken(t *testing.T) {
	service := &AuthService{
		jwtSecret: []byte("test-secret"),
	}

	// Generate a valid token
	validToken, err := service.GenerateToken(1, "test@example.com", false)
	testutil.AssertNoError(t, err)

	// Generate an expired token
	expiredClaims := jwt.MapClaims{
		"user_id": 1,
		"email":   "test@example.com",
		"exp":     time.Now().Add(-1 * time.Hour).Unix(), // Expired 1 hour ago
	}
	expiredToken := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
	expiredTokenString, err := expiredToken.SignedString(service.jwtSecret)
	testutil.AssertNoError(t, err)

	// Generate token with wrong secret
	wrongSecretToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": 1,
		"exp":     time.Now().Add(1 * time.Hour).Unix(),
	})
	wrongSecretTokenString, err := wrongSecretToken.SignedString([]byte("wrong-secret"))
	testutil.AssertNoError(t, err)

	tests := []struct {
		name    string
		token   string
		wantErr bool
	}{
		{
			name:    "valid token",
			token:   validToken,
			wantErr: false,
		},
		{
			name:    "expired token",
			token:   expiredTokenString,
			wantErr: true,
		},
		{
			name:    "invalid token",
			token:   "invalid.token.here",
			wantErr: true,
		},
		{
			name:    "wrong secret",
			token:   wrongSecretTokenString,
			wantErr: true,
		},
		{
			name:    "empty token",
			token:   "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := service.ValidateToken(tt.token)
			if tt.wantErr {
				testutil.AssertError(t, err)
				testutil.AssertEqual(t, ErrInvalidToken, err)
			} else {
				testutil.AssertNoError(t, err)
				if claims == nil {
					t.Error("expected claims, got nil")
				}
			}
		})
	}
}

func TestAuthService_GetUserIDFromClaims(t *testing.T) {
	service := &AuthService{}

	tests := []struct {
		name    string
		claims  jwt.MapClaims
		want    uint
		wantErr bool
	}{
		{
			name: "valid user_id",
			claims: jwt.MapClaims{
				"user_id": float64(123),
			},
			want:    123,
			wantErr: false,
		},
		{
			name:    "missing user_id",
			claims:  jwt.MapClaims{},
			want:    0,
			wantErr: true,
		},
		{
			name: "wrong type",
			claims: jwt.MapClaims{
				"user_id": "123",
			},
			want:    0,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := service.GetUserIDFromClaims(tt.claims)
			if tt.wantErr {
				testutil.AssertError(t, err)
			} else {
				testutil.AssertNoError(t, err)
				testutil.AssertEqual(t, tt.want, got)
			}
		})
	}
}

func TestAuthService_IsAdminFromClaims(t *testing.T) {
	service := &AuthService{}

	tests := []struct {
		name   string
		claims jwt.MapClaims
		want   bool
	}{
		{
			name: "admin user",
			claims: jwt.MapClaims{
				"is_admin": true,
			},
			want: true,
		},
		{
			name: "regular user",
			claims: jwt.MapClaims{
				"is_admin": false,
			},
			want: false,
		},
		{
			name:   "missing is_admin",
			claims: jwt.MapClaims{},
			want:   false,
		},
		{
			name: "wrong type",
			claims: jwt.MapClaims{
				"is_admin": "true",
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := service.IsAdminFromClaims(tt.claims)
			testutil.AssertEqual(t, tt.want, got)
		})
	}
}