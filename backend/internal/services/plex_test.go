package services

import (
	"os"
	"testing"

	"github.com/jacob-fain/MRS/internal/testutil"
)

func TestNewPlexService(t *testing.T) {
	tests := []struct {
		name        string
		serverURL   string
		token       string
		wantErr     bool
		errContains string
	}{
		{
			name:        "missing server URL",
			serverURL:   "",
			token:       "test-token",
			wantErr:     true,
			errContains: "PLEX_SERVER_URL and PLEX_TOKEN must be set",
		},
		{
			name:        "missing token",
			serverURL:   "http://localhost:32400",
			token:       "",
			wantErr:     true,
			errContains: "PLEX_SERVER_URL and PLEX_TOKEN must be set",
		},
		{
			name:        "missing both",
			serverURL:   "",
			token:       "",
			wantErr:     true,
			errContains: "PLEX_SERVER_URL and PLEX_TOKEN must be set",
		},
		// Note: Can't test successful connection without a real Plex server
		// In a real scenario, we'd mock the plex client
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variables
			os.Setenv("PLEX_SERVER_URL", tt.serverURL)
			os.Setenv("PLEX_TOKEN", tt.token)
			defer func() {
				os.Unsetenv("PLEX_SERVER_URL")
				os.Unsetenv("PLEX_TOKEN")
			}()

			_, err := NewPlexService()
			if tt.wantErr {
				testutil.AssertError(t, err)
				if tt.errContains != "" {
					testutil.AssertErrorContains(t, err, tt.errContains)
				}
			} else {
				testutil.AssertNoError(t, err)
			}
		})
	}
}

func TestPlexService_CheckIfExists(t *testing.T) {
	// This would need a mock Plex client in a real implementation
	// For now, we'll create a basic structure test
	
	tests := []struct {
		name      string
		title     string
		year      int
		mediaType string
		results   []PlexSearchResult
		want      bool
	}{
		{
			name:      "exact match found",
			title:     "The Matrix",
			year:      1999,
			mediaType: "movie",
			results: []PlexSearchResult{
				{Title: "The Matrix", Year: 1999, Type: "movie"},
			},
			want: true,
		},
		{
			name:      "case insensitive match",
			title:     "the matrix",
			year:      1999,
			mediaType: "MOVIE",
			results: []PlexSearchResult{
				{Title: "The Matrix", Year: 1999, Type: "movie"},
			},
			want: true,
		},
		{
			name:      "wrong year",
			title:     "The Matrix",
			year:      2003,
			mediaType: "movie",
			results: []PlexSearchResult{
				{Title: "The Matrix", Year: 1999, Type: "movie"},
			},
			want: false,
		},
		{
			name:      "wrong type",
			title:     "The Matrix",
			year:      1999,
			mediaType: "show",
			results: []PlexSearchResult{
				{Title: "The Matrix", Year: 1999, Type: "movie"},
			},
			want: false,
		},
		{
			name:      "no results",
			title:     "Non-existent Movie",
			year:      2024,
			mediaType: "movie",
			results:   []PlexSearchResult{},
			want:      false,
		},
		{
			name:      "year zero matches any year",
			title:     "The Matrix",
			year:      0,
			mediaType: "movie",
			results: []PlexSearchResult{
				{Title: "The Matrix", Year: 1999, Type: "movie"},
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// This is where we'd use a mock client
			// For demonstration purposes, showing the test structure
			t.Skip("Requires mock Plex client implementation")
		})
	}
}

// Helper function
func contains(s, substr string) bool {
	return len(substr) > 0 && len(s) >= len(substr) && s[:len(substr)] == substr || len(s) > len(substr) && contains(s[1:], substr)
}