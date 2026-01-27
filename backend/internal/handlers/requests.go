package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/models"
	"gorm.io/gorm"
)

type requestHandler struct {
	db *gorm.DB
}

// NewRequestHandler creates a new request handler
func NewRequestHandler(db *gorm.DB) *requestHandler {
	return &requestHandler{db: db}
}

// CreateRequestInput represents the request creation payload
type CreateRequestInput struct {
	Title       string             `json:"title" binding:"required"`
	Year        int                `json:"year"`
	MediaType   models.MediaType   `json:"media_type" binding:"required,oneof=movie tv"`
	TMDBId      int                `json:"tmdb_id"`
	IMDBId      string             `json:"imdb_id"`
	Overview    string             `json:"overview"`
	PosterPath  string             `json:"poster_path"`
	Notes       string             `json:"notes"`
}

// UpdateRequestInput represents the request update payload
type UpdateRequestInput struct {
	Status     models.RequestStatus `json:"status" binding:"omitempty,oneof=pending approved completed rejected"`
	Notes      string               `json:"notes"`
	AdminNotes string               `json:"admin_notes"`
}

// RequestResponse represents a request in API responses
type RequestResponse struct {
	ID          uint                 `json:"id"`
	UserID      uint                 `json:"user_id"`
	User        *UserResponse        `json:"user,omitempty"`
	Title       string               `json:"title"`
	Year        int                  `json:"year"`
	MediaType   models.MediaType     `json:"media_type"`
	TMDBId      int                  `json:"tmdb_id"`
	IMDBId      string               `json:"imdb_id"`
	Overview    string               `json:"overview"`
	PosterPath  string               `json:"poster_path"`
	Status      models.RequestStatus `json:"status"`
	Notes       string               `json:"notes"`
	AdminNotes  string               `json:"admin_notes"`
	CreatedAt   string               `json:"created_at"`
	UpdatedAt   string               `json:"updated_at"`
}

// GetRequests returns all requests with optional filtering
// @Summary Get all requests
// @Description Get all media requests with optional status filtering
// @Tags requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param status query string false "Filter by status (pending, approved, completed, rejected)"
// @Param user_id query int false "Filter by user ID (admin only)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /requests [get]
func (h *requestHandler) GetRequests(c *gin.Context) {
	// Get user info from context
	userID, _ := c.Get("userID")
	isAdmin, _ := c.Get("isAdmin")

	// Build query
	query := h.db.Preload("User")

	// Filter by status if provided
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by user_id if provided (admin only)
	if userIDParam := c.Query("user_id"); userIDParam != "" && isAdmin.(bool) {
		if uid, err := strconv.Atoi(userIDParam); err == nil {
			query = query.Where("user_id = ?", uid)
		}
	} else if !isAdmin.(bool) {
		// Non-admin users can only see their own requests
		query = query.Where("user_id = ?", userID)
	}

	// Get requests
	var requests []models.Request
	if err := query.Order("created_at DESC").Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch requests",
		})
		return
	}

	// Convert to response format
	responses := make([]RequestResponse, len(requests))
	for i, req := range requests {
		responses[i] = h.toRequestResponse(req)
	}

	c.JSON(http.StatusOK, gin.H{
		"requests": responses,
		"count":    len(responses),
	})
}

// CreateRequest creates a new media request
// @Summary Create a new request
// @Description Create a new media request
// @Tags requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateRequestInput true "Request details"
// @Success 201 {object} RequestResponse
// @Failure 400 {object} map[string]string
// @Failure 409 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /requests [post]
func (h *requestHandler) CreateRequest(c *gin.Context) {
	// Get user ID from context
	userID, _ := c.Get("userID")

	var input CreateRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
		})
		return
	}

	// Check if request already exists for this user
	var existingRequest models.Request
	err := h.db.Where("user_id = ? AND title = ? AND media_type = ?", 
		userID, input.Title, input.MediaType).First(&existingRequest).Error
	
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "You already have a request for this media",
		})
		return
	}

	// Create new request
	request := models.Request{
		UserID:     userID.(uint),
		Title:      input.Title,
		Year:       input.Year,
		MediaType:  input.MediaType,
		TMDBId:     input.TMDBId,
		IMDBId:     input.IMDBId,
		Overview:   input.Overview,
		PosterPath: input.PosterPath,
		Notes:      input.Notes,
		Status:     models.StatusPending,
	}

	if err := h.db.Create(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create request",
		})
		return
	}

	// Load user for response
	h.db.Preload("User").First(&request, request.ID)

	c.JSON(http.StatusCreated, h.toRequestResponse(request))
}

// UpdateRequest updates a media request
// @Summary Update a request
// @Description Update request status or notes (admin can update any request, users can only update notes on their own)
// @Tags requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Request ID"
// @Param request body UpdateRequestInput true "Update details"
// @Success 200 {object} RequestResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /requests/{id} [put]
func (h *requestHandler) UpdateRequest(c *gin.Context) {
	// Get request ID
	requestID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request ID",
		})
		return
	}

	// Get user info from context
	userID, _ := c.Get("userID")
	isAdmin, _ := c.Get("isAdmin")

	// Find request
	var request models.Request
	if err := h.db.First(&request, requestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Request not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to find request",
			})
		}
		return
	}

	// Check permissions
	if !isAdmin.(bool) && request.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "You can only update your own requests",
		})
		return
	}

	var input UpdateRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
		})
		return
	}

	// Apply updates based on permissions
	updates := make(map[string]interface{})
	
	if isAdmin.(bool) {
		// Admins can update everything
		if input.Status != "" {
			updates["status"] = input.Status
		}
		if input.AdminNotes != "" {
			updates["admin_notes"] = input.AdminNotes
		}
	}
	
	// Users can update their own notes
	if request.UserID == userID.(uint) && input.Notes != "" {
		updates["notes"] = input.Notes
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No valid updates provided",
		})
		return
	}

	// Update request
	if err := h.db.Model(&request).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update request",
		})
		return
	}

	// Load user for response
	h.db.Preload("User").First(&request, request.ID)

	c.JSON(http.StatusOK, h.toRequestResponse(request))
}

// DeleteRequest deletes a media request
// @Summary Delete a request
// @Description Delete a media request (users can delete their own, admins can delete any)
// @Tags requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Request ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /requests/{id} [delete]
func (h *requestHandler) DeleteRequest(c *gin.Context) {
	// Get request ID
	requestID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request ID",
		})
		return
	}

	// Get user info from context
	userID, _ := c.Get("userID")
	isAdmin, _ := c.Get("isAdmin")

	// Find request
	var request models.Request
	if err := h.db.First(&request, requestID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Request not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to find request",
			})
		}
		return
	}

	// Check permissions
	if !isAdmin.(bool) && request.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "You can only delete your own requests",
		})
		return
	}

	// Delete request
	if err := h.db.Delete(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete request",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Request deleted successfully",
	})
}

// GetRequestStats returns statistics about requests (admin only)
// @Summary Get request statistics
// @Description Get statistics about media requests (admin only)
// @Tags requests
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /requests/stats [get]
func (h *requestHandler) GetRequestStats(c *gin.Context) {
	// Check if user is admin
	isAdmin, _ := c.Get("isAdmin")
	if !isAdmin.(bool) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Admin privileges required",
		})
		return
	}

	type StatusCount struct {
		Status models.RequestStatus `json:"status"`
		Count  int64                `json:"count"`
	}

	var statusCounts []StatusCount
	if err := h.db.Model(&models.Request{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusCounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get statistics",
		})
		return
	}

	// Get total requests
	var totalRequests int64
	h.db.Model(&models.Request{}).Count(&totalRequests)

	// Get requests by media type
	type MediaTypeCount struct {
		MediaType models.MediaType `json:"media_type"`
		Count     int64            `json:"count"`
	}

	var mediaTypeCounts []MediaTypeCount
	h.db.Model(&models.Request{}).
		Select("media_type, COUNT(*) as count").
		Group("media_type").
		Scan(&mediaTypeCounts)

	c.JSON(http.StatusOK, gin.H{
		"total_requests":   totalRequests,
		"by_status":        statusCounts,
		"by_media_type":    mediaTypeCounts,
	})
}

// Helper function to convert model to response
func (h *requestHandler) toRequestResponse(req models.Request) RequestResponse {
	resp := RequestResponse{
		ID:         req.ID,
		UserID:     req.UserID,
		Title:      req.Title,
		Year:       req.Year,
		MediaType:  req.MediaType,
		TMDBId:     req.TMDBId,
		IMDBId:     req.IMDBId,
		Overview:   req.Overview,
		PosterPath: req.PosterPath,
		Status:     req.Status,
		Notes:      req.Notes,
		AdminNotes: req.AdminNotes,
		CreatedAt:  req.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:  req.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	// Include user info if loaded
	if req.User.ID != 0 {
		resp.User = &UserResponse{
			ID:       req.User.ID,
			Email:    req.User.Email,
			Username: req.User.Username,
			IsAdmin:  req.User.IsAdmin,
		}
	}

	return resp
}