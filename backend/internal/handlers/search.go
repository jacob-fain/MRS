package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/models"
	"github.com/jacob-fain/MRS/internal/services"
	"gorm.io/gorm"
)

type searchHandler struct {
	tmdbService services.TMDBServiceInterface
	plexService services.PlexServiceInterface
	omdbService services.OMDBServiceInterface
	db          *gorm.DB
}

// NewSearchHandler creates a new search handler with TMDB, Plex, and OMDB services
func NewSearchHandler(tmdbService services.TMDBServiceInterface, plexService services.PlexServiceInterface, omdbService services.OMDBServiceInterface, db *gorm.DB) *searchHandler {
	return &searchHandler{
		tmdbService: tmdbService,
		plexService: plexService,
		omdbService: omdbService,
		db:          db,
	}
}

// SearchMedia searches for movies and TV shows using TMDB API
// @Summary Search for media
// @Description Search for movies and TV shows, optionally checking Plex availability
// @Tags search
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Param page query int false "Page number (default: 1)"
// @Param check_plex query bool false "Check Plex availability"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /search [get]
func (h *searchHandler) SearchMedia(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "search query is required",
		})
		return
	}

	// Parse page parameter
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	// Search TMDB
	results, err := h.tmdbService.SearchMulti(query, page)
	if err != nil {
		// Log the actual error for debugging
		gin.DefaultErrorWriter.Write([]byte(fmt.Sprintf("TMDB search error: %v\n", err)))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to search TMDB",
			"details": err.Error(),
		})
		return
	}

	// Check Plex availability if requested and service is available
	checkPlex := c.Query("check_plex") == "true"
	if checkPlex && h.plexService != nil {
		for i := range results.Results {
			result := &results.Results[i]
			
			// Get title and year based on media type
			var title string
			var year int
			
			if result.MediaType == "movie" {
				title = result.Title
				if result.ReleaseDate != "" && len(result.ReleaseDate) >= 4 {
					year, _ = strconv.Atoi(result.ReleaseDate[:4])
				}
			} else if result.MediaType == "tv" {
				title = result.Name
				if result.FirstAirDate != "" && len(result.FirstAirDate) >= 4 {
					year, _ = strconv.Atoi(result.FirstAirDate[:4])
				}
			}
			
			if title != "" && h.plexService != nil {
				exists, _ := h.plexService.CheckIfExists(title, year, result.MediaType)
				result.InPlex = exists
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"page":          results.Page,
		"total_pages":   results.TotalPages,
		"total_results": results.TotalResults,
		"results":       results.Results,
	})
}

// GetMediaDetails fetches detailed information about a specific movie or TV show
// @Summary Get media details
// @Description Get detailed information about a movie or TV show
// @Tags search
// @Accept json
// @Produce json
// @Param type path string true "Media type (movie or tv)"
// @Param id path int true "TMDB ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /search/{type}/{id} [get]
func (h *searchHandler) GetMediaDetails(c *gin.Context) {
	mediaType := c.Param("type")
	idStr := c.Param("id")
	
	if mediaType != "movie" && mediaType != "tv" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid media type, must be 'movie' or 'tv'",
		})
		return
	}
	
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid ID",
		})
		return
	}
	
	var details interface{}
	
	if mediaType == "movie" {
		movieDetails, err := h.tmdbService.GetMovieDetails(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to get movie details",
			})
			return
		}

		// Check Plex availability
		if h.plexService != nil {
			year := 0
			if movieDetails.ReleaseDate != "" && len(movieDetails.ReleaseDate) >= 4 {
				year, _ = strconv.Atoi(movieDetails.ReleaseDate[:4])
			}
			movieDetails.InPlex, _ = h.plexService.CheckIfExists(movieDetails.Title, year, "movie")
		}

		// Fetch OMDB ratings if IMDB ID is available
		if movieDetails.ExternalIDs.IMDBID != "" {
			ratings := h.fetchOrCacheRatings(movieDetails.ExternalIDs.IMDBID)
			if ratings != nil {
				// Add ratings to response
				response := gin.H{
					"id":                   movieDetails.ID,
					"title":                movieDetails.Title,
					"overview":             movieDetails.Overview,
					"release_date":         movieDetails.ReleaseDate,
					"runtime":              movieDetails.Runtime,
					"vote_average":         movieDetails.VoteAverage,
					"vote_count":           movieDetails.VoteCount,
					"popularity":           movieDetails.Popularity,
					"poster_path":          movieDetails.PosterPath,
					"backdrop_path":        movieDetails.BackdropPath,
					"genres":               movieDetails.Genres,
					"production_companies": movieDetails.ProductionCompanies,
					"status":               movieDetails.Status,
					"tagline":              movieDetails.Tagline,
					"external_ids":         movieDetails.ExternalIDs,
					"credits":              movieDetails.Credits,
					"videos":               movieDetails.Videos,
					"poster_url":           movieDetails.PosterURL,
					"backdrop_url":         movieDetails.BackdropURL,
					"in_plex":              movieDetails.InPlex,
					"ratings":              ratings,
				}
				c.JSON(http.StatusOK, response)
				return
			}
		}

		details = movieDetails
	} else {
		tvDetails, err := h.tmdbService.GetTVDetails(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to get TV show details",
			})
			return
		}

		// Check Plex availability
		if h.plexService != nil {
			year := 0
			if tvDetails.FirstAirDate != "" && len(tvDetails.FirstAirDate) >= 4 {
				year, _ = strconv.Atoi(tvDetails.FirstAirDate[:4])
			}
			tvDetails.InPlex, _ = h.plexService.CheckIfExists(tvDetails.Name, year, "tv")
		}

		// Fetch OMDB ratings if IMDB ID is available
		if tvDetails.ExternalIDs.IMDBID != "" {
			ratings := h.fetchOrCacheRatings(tvDetails.ExternalIDs.IMDBID)
			if ratings != nil {
				// Add ratings to response
				response := gin.H{
					"id":                  tvDetails.ID,
					"name":                tvDetails.Name,
					"overview":            tvDetails.Overview,
					"first_air_date":      tvDetails.FirstAirDate,
					"last_air_date":       tvDetails.LastAirDate,
					"number_of_seasons":   tvDetails.NumberOfSeasons,
					"number_of_episodes":  tvDetails.NumberOfEpisodes,
					"vote_average":        tvDetails.VoteAverage,
					"vote_count":          tvDetails.VoteCount,
					"popularity":          tvDetails.Popularity,
					"poster_path":         tvDetails.PosterPath,
					"backdrop_path":       tvDetails.BackdropPath,
					"genres":              tvDetails.Genres,
					"networks":            tvDetails.Networks,
					"status":              tvDetails.Status,
					"type":                tvDetails.Type,
					"external_ids":        tvDetails.ExternalIDs,
					"credits":             tvDetails.Credits,
					"videos":              tvDetails.Videos,
					"poster_url":          tvDetails.PosterURL,
					"backdrop_url":        tvDetails.BackdropURL,
					"in_plex":             tvDetails.InPlex,
					"ratings":             ratings,
				}
				c.JSON(http.StatusOK, response)
				return
			}
		}

		details = tvDetails
	}

	c.JSON(http.StatusOK, details)
}

// fetchOrCacheRatings fetches ratings from cache or OMDB API
func (h *searchHandler) fetchOrCacheRatings(imdbID string) *services.OMDBRatings {
	// Check if OMDB service is available
	if h.omdbService == nil || h.db == nil {
		return nil
	}

	// Try to get from cache first
	var cachedRating models.Rating
	if err := h.db.Where("imdb_id = ?", imdbID).First(&cachedRating).Error; err == nil {
		// Found in cache
		return &services.OMDBRatings{
			IMDBRating:          cachedRating.IMDBRating,
			IMDBVotes:           cachedRating.IMDBVotes,
			RottenTomatoesScore: cachedRating.RottenTomatoesScore,
			Metascore:           cachedRating.Metascore,
			Awards:              cachedRating.Awards,
			BoxOffice:           cachedRating.BoxOffice,
		}
	}

	// Not in cache, fetch from OMDB
	ratings, err := h.omdbService.GetRatingsByIMDB(imdbID)
	if err != nil {
		// Failed to fetch, return nil
		return nil
	}

	// Cache the ratings
	newRating := models.Rating{
		IMDBID:              imdbID,
		IMDBRating:          ratings.IMDBRating,
		IMDBVotes:           ratings.IMDBVotes,
		RottenTomatoesScore: ratings.RottenTomatoesScore,
		Metascore:           ratings.Metascore,
		Awards:              ratings.Awards,
		BoxOffice:           ratings.BoxOffice,
	}
	h.db.Create(&newRating)

	return ratings
}