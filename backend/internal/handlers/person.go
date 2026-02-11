package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/services"
)

type personHandler struct {
	tmdbService services.TMDBServiceInterface
}

// NewPersonHandler creates a new person handler
func NewPersonHandler(tmdbService services.TMDBServiceInterface) *personHandler {
	return &personHandler{
		tmdbService: tmdbService,
	}
}

// SearchPerson searches for people (actors, directors, crew)
// @Summary Search for people
// @Description Search for actors, directors, and crew members
// @Tags person
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Param page query int false "Page number (default: 1)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /person/search [get]
func (h *personHandler) SearchPerson(c *gin.Context) {
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

	// Search TMDB for people
	results, err := h.tmdbService.SearchPerson(query, page)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to search for people",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"page":          results.Page,
		"total_pages":   results.TotalPages,
		"total_results": results.TotalResults,
		"results":       results.Results,
	})
}

// GetPersonDetails fetches detailed information about a person
// @Summary Get person details
// @Description Get detailed information about a person
// @Tags person
// @Accept json
// @Produce json
// @Param id path int true "Person ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /person/{id} [get]
func (h *personHandler) GetPersonDetails(c *gin.Context) {
	idStr := c.Param("id")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid person ID",
		})
		return
	}

	// Get person details from TMDB
	person, err := h.tmdbService.GetPersonDetails(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get person details",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, person)
}

// GetPersonCredits fetches a person's complete filmography
// @Summary Get person filmography
// @Description Get complete filmography for a person (movies and TV shows)
// @Tags person
// @Accept json
// @Produce json
// @Param id path int true "Person ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /person/{id}/credits [get]
func (h *personHandler) GetPersonCredits(c *gin.Context) {
	idStr := c.Param("id")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid person ID",
		})
		return
	}

	// Get person credits from TMDB
	credits, err := h.tmdbService.GetPersonCredits(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "failed to get person credits",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, credits)
}
