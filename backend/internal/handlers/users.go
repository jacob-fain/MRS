package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/models"
	"gorm.io/gorm"
)

type userHandler struct {
	db *gorm.DB
}

// NewUserHandler creates a new user handler
func NewUserHandler(db *gorm.DB) *userHandler {
	return &userHandler{db: db}
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID       uint   `json:"id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"is_admin"`
	CreatedAt string `json:"created_at"`
}

// UpdateUserInput represents the user update payload
type UpdateUserInput struct {
	IsAdmin *bool `json:"is_admin"`
}

// GetUsers returns all users with their request counts (admin only)
// @Summary Get all users
// @Description Get all users with their request counts (admin only)
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users [get]
func (h *userHandler) GetUsers(c *gin.Context) {
	var users []models.User
	if err := h.db.Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch users",
		})
		return
	}

	// Get request counts for each user
	type UserWithCount struct {
		UserResponse
		RequestCount int64 `json:"request_count"`
	}

	usersWithCounts := make([]UserWithCount, len(users))
	for i, user := range users {
		var requestCount int64
		h.db.Model(&models.Request{}).Where("user_id = ?", user.ID).Count(&requestCount)

		usersWithCounts[i] = UserWithCount{
			UserResponse: UserResponse{
				ID:       user.ID,
				Email:    user.Email,
				Username: user.Username,
				IsAdmin:  user.IsAdmin,
				CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
			},
			RequestCount: requestCount,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"users": usersWithCounts,
		"count": len(usersWithCounts),
	})
}

// GetUser returns a specific user (admin only)
// @Summary Get user by ID
// @Description Get a specific user by ID (admin only)
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} UserResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{id} [get]
func (h *userHandler) GetUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to fetch user",
			})
		}
		return
	}

	c.JSON(http.StatusOK, UserResponse{
		ID:       user.ID,
		Email:    user.Email,
		Username: user.Username,
		IsAdmin:  user.IsAdmin,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// UpdateUser updates a user (admin only)
// @Summary Update a user
// @Description Update user details (admin only - currently only admin status)
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param user body UpdateUserInput true "Update details"
// @Success 200 {object} UserResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{id} [put]
func (h *userHandler) UpdateUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Prevent user from modifying themselves
	currentUserID, _ := c.Get("userID")
	if uint(userID) == currentUserID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "You cannot modify your own admin status",
		})
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to find user",
			})
		}
		return
	}

	var input UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
		})
		return
	}

	// Update user
	updates := make(map[string]interface{})
	if input.IsAdmin != nil {
		updates["is_admin"] = *input.IsAdmin
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No valid updates provided",
		})
		return
	}

	if err := h.db.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update user",
		})
		return
	}

	c.JSON(http.StatusOK, UserResponse{
		ID:       user.ID,
		Email:    user.Email,
		Username: user.Username,
		IsAdmin:  user.IsAdmin,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// DeleteUser deletes a user (admin only)
// @Summary Delete a user
// @Description Delete a user and all their requests (admin only)
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /users/{id} [delete]
func (h *userHandler) DeleteUser(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Prevent user from deleting themselves
	currentUserID, _ := c.Get("userID")
	if uint(userID) == currentUserID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "You cannot delete your own account",
		})
		return
	}

	var user models.User
	if err := h.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "User not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to find user",
			})
		}
		return
	}

	// Delete user's requests first (cascade delete)
	if err := h.db.Where("user_id = ?", userID).Delete(&models.Request{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete user's requests",
		})
		return
	}

	// Delete user
	if err := h.db.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User deleted successfully",
	})
}
