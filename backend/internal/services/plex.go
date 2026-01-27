package services

import (
	"fmt"
	"os"
	"strings"

	"github.com/jrudio/go-plex-client"
)

type PlexService struct {
	client *plex.Plex
}

func NewPlexService() (*PlexService, error) {
	serverURL := os.Getenv("PLEX_SERVER_URL")
	token := os.Getenv("PLEX_TOKEN")

	if serverURL == "" || token == "" {
		return nil, fmt.Errorf("PLEX_SERVER_URL and PLEX_TOKEN must be set")
	}

	client, err := plex.New(serverURL, token)
	if err != nil {
		return nil, fmt.Errorf("failed to create plex client: %w", err)
	}

	// Test connection
	result, err := client.Test()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to plex server: %w", err)
	}
	if !result {
		return nil, fmt.Errorf("plex connection test returned false")
	}

	return &PlexService{client: client}, nil
}

// SearchLibrary searches all libraries for a given query
func (s *PlexService) SearchLibrary(query string) ([]PlexSearchResult, error) {
	results, err := s.client.Search(query)
	if err != nil {
		return nil, fmt.Errorf("plex search failed: %w", err)
	}

	var searchResults []PlexSearchResult
	
	// Process search results - use Metadata instead of Video
	for _, metadata := range results.MediaContainer.Metadata {
		result := PlexSearchResult{
			Title:     metadata.Title,
			Year:      metadata.Year,
			Type:      metadata.Type,
			Summary:   metadata.Summary,
			Thumb:     metadata.Thumb,
			RatingKey: metadata.RatingKey,
		}
		searchResults = append(searchResults, result)
	}

	return searchResults, nil
}

// CheckIfExists checks if a specific movie/show exists in the library
func (s *PlexService) CheckIfExists(title string, year int, mediaType string) (bool, error) {
	results, err := s.SearchLibrary(title)
	if err != nil {
		return false, err
	}

	for _, result := range results {
		// Normalize for comparison
		if strings.EqualFold(result.Title, title) && 
		   (year == 0 || result.Year == year) &&
		   strings.EqualFold(result.Type, mediaType) {
			return true, nil
		}
	}

	return false, nil
}

// GetLibraries returns all available libraries
func (s *PlexService) GetLibraries() ([]PlexLibrary, error) {
	libraries, err := s.client.GetLibraries()
	if err != nil {
		return nil, fmt.Errorf("failed to get libraries: %w", err)
	}

	var plexLibraries []PlexLibrary
	for _, lib := range libraries.MediaContainer.Directory {
		plexLibrary := PlexLibrary{
			Key:   lib.Key,
			Title: lib.Title,
			Type:  lib.Type,
		}
		plexLibraries = append(plexLibraries, plexLibrary)
	}

	return plexLibraries, nil
}

// PlexSearchResult represents a search result from Plex
type PlexSearchResult struct {
	Title     string `json:"title"`
	Year      int    `json:"year"`
	Type      string `json:"type"`
	Summary   string `json:"summary"`
	Thumb     string `json:"thumb"`
	RatingKey string `json:"rating_key"`
}

// PlexLibrary represents a Plex library
type PlexLibrary struct {
	Key   string `json:"key"`
	Title string `json:"title"`
	Type  string `json:"type"`
}