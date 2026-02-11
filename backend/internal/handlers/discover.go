package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/services"
)

type discoverHandler struct {
	tmdbService services.TMDBServiceInterface
	plexService services.PlexServiceInterface
}

// NewDiscoverHandler creates a new discover handler
func NewDiscoverHandler(tmdbService services.TMDBServiceInterface, plexService services.PlexServiceInterface) *discoverHandler {
	return &discoverHandler{
		tmdbService: tmdbService,
		plexService: plexService,
	}
}

// GetTrending returns trending movies and TV shows
// Query params: media_type (all/movie/tv), time_window (day/week), page
func (h *discoverHandler) GetTrending(c *gin.Context) {
	mediaType := c.DefaultQuery("media_type", "all")
	timeWindow := c.DefaultQuery("time_window", "week")
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	// Validate mediaType
	if mediaType != "all" && mediaType != "movie" && mediaType != "tv" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid media_type, must be 'all', 'movie', or 'tv'",
		})
		return
	}

	// Validate timeWindow
	if timeWindow != "day" && timeWindow != "week" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid time_window, must be 'day' or 'week'",
		})
		return
	}

	results, err := h.tmdbService.GetTrending(mediaType, timeWindow, page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get trending content",
			"details": err.Error(),
		})
		return
	}

	// Check Plex availability for results
	if h.plexService != nil {
		for i := range results.Results {
			year := 0
			if results.Results[i].ReleaseDate != "" {
				year, _ = strconv.Atoi(results.Results[i].ReleaseDate[:4])
			} else if results.Results[i].FirstAirDate != "" {
				year, _ = strconv.Atoi(results.Results[i].FirstAirDate[:4])
			}
			title := results.Results[i].Title
			if title == "" {
				title = results.Results[i].Name
			}
			results.Results[i].InPlex, _ = h.plexService.CheckIfExists(title, year, results.Results[i].MediaType)
		}
	}

	c.JSON(http.StatusOK, results)
}

// GetPopularMovies returns popular movies
func (h *discoverHandler) GetPopularMovies(c *gin.Context) {
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	results, err := h.tmdbService.GetPopularMovies(page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get popular movies",
			"details": err.Error(),
		})
		return
	}

	// Check Plex availability for results
	if h.plexService != nil {
		for i := range results.Results {
			year := 0
			if results.Results[i].ReleaseDate != "" {
				year, _ = strconv.Atoi(results.Results[i].ReleaseDate[:4])
			}
			results.Results[i].InPlex, _ = h.plexService.CheckIfExists(results.Results[i].Title, year, "movie")
		}
	}

	c.JSON(http.StatusOK, results)
}

// GetPopularTV returns popular TV shows
func (h *discoverHandler) GetPopularTV(c *gin.Context) {
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	results, err := h.tmdbService.GetPopularTV(page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get popular TV shows",
			"details": err.Error(),
		})
		return
	}

	// Check Plex availability for results
	if h.plexService != nil {
		for i := range results.Results {
			year := 0
			if results.Results[i].FirstAirDate != "" {
				year, _ = strconv.Atoi(results.Results[i].FirstAirDate[:4])
			}
			results.Results[i].InPlex, _ = h.plexService.CheckIfExists(results.Results[i].Name, year, "tv")
		}
	}

	c.JSON(http.StatusOK, results)
}

// GetTopRatedMovies returns top rated movies
func (h *discoverHandler) GetTopRatedMovies(c *gin.Context) {
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	results, err := h.tmdbService.GetTopRatedMovies(page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get top rated movies",
			"details": err.Error(),
		})
		return
	}

	// Check Plex availability for results
	if h.plexService != nil {
		for i := range results.Results {
			year := 0
			if results.Results[i].ReleaseDate != "" {
				year, _ = strconv.Atoi(results.Results[i].ReleaseDate[:4])
			}
			results.Results[i].InPlex, _ = h.plexService.CheckIfExists(results.Results[i].Title, year, "movie")
		}
	}

	c.JSON(http.StatusOK, results)
}

// GetTopRatedTV returns top rated TV shows
func (h *discoverHandler) GetTopRatedTV(c *gin.Context) {
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	results, err := h.tmdbService.GetTopRatedTV(page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get top rated TV shows",
			"details": err.Error(),
		})
		return
	}

	// Check Plex availability for results
	if h.plexService != nil {
		for i := range results.Results {
			year := 0
			if results.Results[i].FirstAirDate != "" {
				year, _ = strconv.Atoi(results.Results[i].FirstAirDate[:4])
			}
			results.Results[i].InPlex, _ = h.plexService.CheckIfExists(results.Results[i].Name, year, "tv")
		}
	}

	c.JSON(http.StatusOK, results)
}

// GetUpcomingMovies returns upcoming movies
func (h *discoverHandler) GetUpcomingMovies(c *gin.Context) {
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	results, err := h.tmdbService.GetUpcomingMovies(page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get upcoming movies",
			"details": err.Error(),
		})
		return
	}

	// Check Plex availability for results
	if h.plexService != nil {
		for i := range results.Results {
			year := 0
			if results.Results[i].ReleaseDate != "" {
				year, _ = strconv.Atoi(results.Results[i].ReleaseDate[:4])
			}
			results.Results[i].InPlex, _ = h.plexService.CheckIfExists(results.Results[i].Title, year, "movie")
		}
	}

	c.JSON(http.StatusOK, results)
}

// GetUpcomingTV returns upcoming TV shows (premiering within 180 days)
func (h *discoverHandler) GetUpcomingTV(c *gin.Context) {
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	results, err := h.tmdbService.GetUpcomingTV(page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get upcoming TV shows",
			"details": err.Error(),
		})
		return
	}

	// Check Plex availability for results
	if h.plexService != nil {
		for i := range results.Results {
			year := 0
			if results.Results[i].FirstAirDate != "" {
				year, _ = strconv.Atoi(results.Results[i].FirstAirDate[:4])
			}
			results.Results[i].InPlex, _ = h.plexService.CheckIfExists(results.Results[i].Name, year, "tv")
		}
	}

	c.JSON(http.StatusOK, results)
}
