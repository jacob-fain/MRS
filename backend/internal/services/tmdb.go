package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"
)

const (
	tmdbBaseURL   = "https://api.themoviedb.org/3"
	tmdbImageBase = "https://image.tmdb.org/t/p"
)

// TMDBService handles all TMDB API interactions
type TMDBService struct {
	apiKey     string
	httpClient *http.Client
}

// NewTMDBService creates a new TMDB service instance
func NewTMDBService() (*TMDBService, error) {
	apiKey := os.Getenv("TMDB_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY environment variable not set")
	}

	return &TMDBService{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}, nil
}

// SearchMulti searches for movies and TV shows
func (s *TMDBService) SearchMulti(query string, page int) (*TMDBSearchResult, error) {
	if query == "" {
		return nil, fmt.Errorf("search query cannot be empty")
	}

	params := url.Values{}
	params.Add("query", query)
	params.Add("page", fmt.Sprintf("%d", page))

	url := fmt.Sprintf("%s/search/multi?%s", tmdbBaseURL, params.Encode())
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	// Use Bearer token for authentication
	req.Header.Add("Authorization", "Bearer " + s.apiKey)
	req.Header.Add("accept", "application/json")
	
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to search TMDB: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API returned status %d", resp.StatusCode)
	}

	var result TMDBSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode TMDB response: %w", err)
	}

	// Process results to add full image URLs
	for i := range result.Results {
		if result.Results[i].PosterPath != "" {
			result.Results[i].PosterURL = s.GetImageURL(result.Results[i].PosterPath, "w342")
		}
		if result.Results[i].BackdropPath != "" {
			result.Results[i].BackdropURL = s.GetImageURL(result.Results[i].BackdropPath, "w780")
		}
	}

	return &result, nil
}

// GetMovieDetails fetches detailed information about a movie
func (s *TMDBService) GetMovieDetails(movieID int) (*TMDBMovieDetails, error) {
	params := url.Values{}
	params.Add("append_to_response", "credits,videos,external_ids")

	url := fmt.Sprintf("%s/movie/%d?%s", tmdbBaseURL, movieID, params.Encode())
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	// Use Bearer token for authentication
	req.Header.Add("Authorization", "Bearer " + s.apiKey)
	req.Header.Add("accept", "application/json")
	
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get movie details: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API returned status %d", resp.StatusCode)
	}

	var movie TMDBMovieDetails
	if err := json.NewDecoder(resp.Body).Decode(&movie); err != nil {
		return nil, fmt.Errorf("failed to decode movie details: %w", err)
	}

	// Add full image URLs
	if movie.PosterPath != "" {
		movie.PosterURL = s.GetImageURL(movie.PosterPath, "w500")
	}
	if movie.BackdropPath != "" {
		movie.BackdropURL = s.GetImageURL(movie.BackdropPath, "w1280")
	}

	return &movie, nil
}

// GetTVDetails fetches detailed information about a TV show
func (s *TMDBService) GetTVDetails(tvID int) (*TMDBTVDetails, error) {
	params := url.Values{}
	params.Add("append_to_response", "credits,videos,external_ids")

	url := fmt.Sprintf("%s/tv/%d?%s", tmdbBaseURL, tvID, params.Encode())
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	
	// Use Bearer token for authentication
	req.Header.Add("Authorization", "Bearer " + s.apiKey)
	req.Header.Add("accept", "application/json")
	
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get TV details: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TMDB API returned status %d", resp.StatusCode)
	}

	var tv TMDBTVDetails
	if err := json.NewDecoder(resp.Body).Decode(&tv); err != nil {
		return nil, fmt.Errorf("failed to decode TV details: %w", err)
	}

	// Add full image URLs
	if tv.PosterPath != "" {
		tv.PosterURL = s.GetImageURL(tv.PosterPath, "w500")
	}
	if tv.BackdropPath != "" {
		tv.BackdropURL = s.GetImageURL(tv.BackdropPath, "w1280")
	}

	return &tv, nil
}

// GetImageURL constructs a full image URL from a path
func (s *TMDBService) GetImageURL(path string, size string) string {
	if path == "" {
		return ""
	}
	return fmt.Sprintf("%s/%s%s", tmdbImageBase, size, path)
}

// TMDBSearchResult represents the search results from TMDB
type TMDBSearchResult struct {
	Page         int          `json:"page"`
	TotalPages   int          `json:"total_pages"`
	TotalResults int          `json:"total_results"`
	Results      []TMDBResult `json:"results"`
}

// TMDBResult represents a single search result
type TMDBResult struct {
	ID           int      `json:"id"`
	MediaType    string   `json:"media_type"`
	Title        string   `json:"title,omitempty"`        // For movies
	Name         string   `json:"name,omitempty"`         // For TV shows
	ReleaseDate  string   `json:"release_date,omitempty"` // For movies
	FirstAirDate string   `json:"first_air_date,omitempty"` // For TV shows
	Overview     string   `json:"overview"`
	PosterPath   string   `json:"poster_path"`
	BackdropPath string   `json:"backdrop_path"`
	VoteAverage  float64  `json:"vote_average"`
	Popularity   float64  `json:"popularity"`
	GenreIDs     []int    `json:"genre_ids"`
	PosterURL    string   `json:"poster_url,omitempty"`   // Added by service
	BackdropURL  string   `json:"backdrop_url,omitempty"` // Added by service
	InPlex       bool     `json:"in_plex,omitempty"`      // Added by handler
}

// TMDBMovieDetails represents detailed movie information
type TMDBMovieDetails struct {
	ID               int                 `json:"id"`
	Title            string              `json:"title"`
	Overview         string              `json:"overview"`
	ReleaseDate      string              `json:"release_date"`
	Runtime          int                 `json:"runtime"`
	VoteAverage      float64             `json:"vote_average"`
	VoteCount        int                 `json:"vote_count"`
	Popularity       float64             `json:"popularity"`
	PosterPath       string              `json:"poster_path"`
	BackdropPath     string              `json:"backdrop_path"`
	Genres           []TMDBGenre         `json:"genres"`
	ProductionCompanies []TMDBCompany    `json:"production_companies"`
	Status           string              `json:"status"`
	Tagline          string              `json:"tagline"`
	ExternalIDs      TMDBExternalIDs     `json:"external_ids"`
	Credits          TMDBCredits         `json:"credits"`
	Videos           TMDBVideos          `json:"videos"`
	PosterURL        string              `json:"poster_url,omitempty"`
	BackdropURL      string              `json:"backdrop_url,omitempty"`
	InPlex           bool                `json:"in_plex,omitempty"`
}

// TMDBTVDetails represents detailed TV show information
type TMDBTVDetails struct {
	ID               int                 `json:"id"`
	Name             string              `json:"name"`
	Overview         string              `json:"overview"`
	FirstAirDate     string              `json:"first_air_date"`
	LastAirDate      string              `json:"last_air_date"`
	NumberOfSeasons  int                 `json:"number_of_seasons"`
	NumberOfEpisodes int                 `json:"number_of_episodes"`
	VoteAverage      float64             `json:"vote_average"`
	VoteCount        int                 `json:"vote_count"`
	Popularity       float64             `json:"popularity"`
	PosterPath       string              `json:"poster_path"`
	BackdropPath     string              `json:"backdrop_path"`
	Genres           []TMDBGenre         `json:"genres"`
	Networks         []TMDBNetwork       `json:"networks"`
	Status           string              `json:"status"`
	Type             string              `json:"type"`
	ExternalIDs      TMDBExternalIDs     `json:"external_ids"`
	Credits          TMDBCredits         `json:"credits"`
	Videos           TMDBVideos          `json:"videos"`
	PosterURL        string              `json:"poster_url,omitempty"`
	BackdropURL      string              `json:"backdrop_url,omitempty"`
	InPlex           bool                `json:"in_plex,omitempty"`
}

// Supporting types
type TMDBGenre struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type TMDBCompany struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Logo string `json:"logo_path"`
}

type TMDBNetwork struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Logo string `json:"logo_path"`
}

type TMDBExternalIDs struct {
	IMDBID      string `json:"imdb_id"`
	TVDBID      int    `json:"tvdb_id"`
	FacebookID  string `json:"facebook_id"`
	TwitterID   string `json:"twitter_id"`
	InstagramID string `json:"instagram_id"`
}

type TMDBCredits struct {
	Cast []TMDBCast `json:"cast"`
	Crew []TMDBCrew `json:"crew"`
}

type TMDBCast struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Character   string `json:"character"`
	ProfilePath string `json:"profile_path"`
	Order       int    `json:"order"`
}

type TMDBCrew struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Job         string `json:"job"`
	Department  string `json:"department"`
	ProfilePath string `json:"profile_path"`
}

type TMDBVideos struct {
	Results []TMDBVideo `json:"results"`
}

type TMDBVideo struct {
	ID       string `json:"id"`
	Key      string `json:"key"`
	Name     string `json:"name"`
	Site     string `json:"site"`
	Type     string `json:"type"`
	Official bool   `json:"official"`
}