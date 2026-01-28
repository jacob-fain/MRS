package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/services"
)

type searchHandler struct {
	tmdbService services.TMDBServiceInterface
	plexService services.PlexServiceInterface
}

// NewSearchHandler creates a new search handler with TMDB and optional Plex services
func NewSearchHandler(tmdbService services.TMDBServiceInterface, plexService services.PlexServiceInterface) *searchHandler {
	return &searchHandler{
		tmdbService: tmdbService,
		plexService: plexService,
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
		
		details = tvDetails
	}
	
	c.JSON(http.StatusOK, details)
}