package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"
)

const omdbBaseURL = "http://www.omdbapi.com/"

// OMDBService handles all OMDB API interactions for ratings
type OMDBService struct {
	apiKey     string
	httpClient *http.Client
}

// OMDBServiceInterface defines methods for OMDB service
type OMDBServiceInterface interface {
	GetRatingsByIMDB(imdbID string) (*OMDBRatings, error)
}

// NewOMDBService creates a new OMDB service instance
func NewOMDBService() (*OMDBService, error) {
	apiKey := os.Getenv("OMDB_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OMDB_API_KEY environment variable not set")
	}

	return &OMDBService{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}, nil
}

// GetRatingsByIMDB fetches ratings from OMDB using IMDB ID
func (s *OMDBService) GetRatingsByIMDB(imdbID string) (*OMDBRatings, error) {
	if imdbID == "" {
		return nil, fmt.Errorf("IMDB ID cannot be empty")
	}

	params := url.Values{}
	params.Add("i", imdbID)
	params.Add("apikey", s.apiKey)

	url := fmt.Sprintf("%s?%s", omdbBaseURL, params.Encode())

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch from OMDB: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OMDB API returned status %d", resp.StatusCode)
	}

	var result OMDBResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode OMDB response: %w", err)
	}

	if result.Response == "False" {
		return nil, fmt.Errorf("OMDB error: %s", result.Error)
	}

	// Parse ratings from the response
	ratings := &OMDBRatings{
		IMDBRating: result.IMDBRating,
		IMDBVotes:  result.IMDBVotes,
		Metascore:  result.Metascore,
		Awards:     result.Awards,
		BoxOffice:  result.BoxOffice,
	}

	// Extract Rotten Tomatoes scores from Ratings array
	for _, rating := range result.Ratings {
		switch rating.Source {
		case "Rotten Tomatoes":
			ratings.RottenTomatoesScore = rating.Value
		case "Metacritic":
			if ratings.Metascore == "" {
				ratings.Metascore = rating.Value
			}
		}
	}

	return ratings, nil
}

// OMDBResponse represents the full OMDB API response
type OMDBResponse struct {
	Title      string       `json:"Title"`
	Year       string       `json:"Year"`
	Rated      string       `json:"Rated"`
	Released   string       `json:"Released"`
	Runtime    string       `json:"Runtime"`
	Genre      string       `json:"Genre"`
	Director   string       `json:"Director"`
	Writer     string       `json:"Writer"`
	Actors     string       `json:"Actors"`
	Plot       string       `json:"Plot"`
	Language   string       `json:"Language"`
	Country    string       `json:"Country"`
	Awards     string       `json:"Awards"`
	Poster     string       `json:"Poster"`
	Ratings    []OMDBRating `json:"Ratings"`
	Metascore  string       `json:"Metascore"`
	IMDBRating string       `json:"imdbRating"`
	IMDBVotes  string       `json:"imdbVotes"`
	IMDBID     string       `json:"imdbID"`
	Type       string       `json:"Type"`
	BoxOffice  string       `json:"BoxOffice"`
	Response   string       `json:"Response"`
	Error      string       `json:"Error"`
}

// OMDBRating represents a single rating source
type OMDBRating struct {
	Source string `json:"Source"`
	Value  string `json:"Value"`
}

// OMDBRatings represents parsed ratings for storage
type OMDBRatings struct {
	IMDBRating           string `json:"imdb_rating"`
	IMDBVotes            string `json:"imdb_votes"`
	RottenTomatoesScore  string `json:"rotten_tomatoes_score"`
	Metascore            string `json:"metascore"`
	Awards               string `json:"awards"`
	BoxOffice            string `json:"box_office"`
}
