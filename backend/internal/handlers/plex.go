package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jacob/plex-requests/internal/services"
)

type plexHandler struct {
	plexService services.PlexServiceInterface
}

// NewPlexHandler creates a new Plex handler with the service
func NewPlexHandler(plexService services.PlexServiceInterface) *plexHandler {
	return &plexHandler{
		plexService: plexService,
	}
}

// CheckMedia checks if a specific media item exists in Plex
// @Summary Check if media exists in Plex
// @Description Check if a movie or TV show exists in the Plex library
// @Tags plex
// @Accept json
// @Produce json
// @Param title query string true "Media title"
// @Param year query int false "Release year"
// @Param type query string true "Media type (movie or show)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /plex/check [get]
func (h *plexHandler) CheckMedia(c *gin.Context) {
	title := c.Query("title")
	yearStr := c.Query("year")
	mediaType := c.Query("type")

	if title == "" || mediaType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "title and type are required",
		})
		return
	}

	year := 0
	if yearStr != "" {
		var err error
		year, err = strconv.Atoi(yearStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid year format",
			})
			return
		}
	}

	exists, err := h.plexService.CheckIfExists(title, year, mediaType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to check Plex library",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"exists": exists,
		"title":  title,
		"type":   mediaType,
		"year":   year,
	})
}

// SearchPlex searches the Plex library
// @Summary Search Plex library
// @Description Search for movies and TV shows in the Plex library
// @Tags plex
// @Accept json
// @Produce json
// @Param q query string true "Search query"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /plex/search [get]
func (h *plexHandler) SearchPlex(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "search query is required",
		})
		return
	}

	results, err := h.plexService.SearchLibrary(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to search Plex library",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"count":   len(results),
	})
}

// GetLibraries returns all Plex libraries
// @Summary Get Plex libraries
// @Description Get a list of all available Plex libraries
// @Tags plex
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Router /plex/libraries [get]
func (h *plexHandler) GetLibraries(c *gin.Context) {
	libraries, err := h.plexService.GetLibraries()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to get Plex libraries",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"libraries": libraries,
		"count":     len(libraries),
	})
}