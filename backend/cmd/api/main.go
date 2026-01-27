package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jacob-fain/MRS/internal/database"
	"github.com/jacob-fain/MRS/internal/handlers"
	"github.com/jacob-fain/MRS/internal/middleware"
	"github.com/jacob-fain/MRS/internal/services"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	db, err := database.Initialize()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize auth service
	authService, err := services.NewAuthService()
	if err != nil {
		log.Fatal("Failed to initialize auth service:", err)
	}

	// Initialize TMDB service
	tmdbService, err := services.NewTMDBService()
	if err != nil {
		log.Fatal("Failed to initialize TMDB service:", err)
	}

	// Initialize Plex service
	plexService, err := services.NewPlexService()
	if err != nil {
		log.Printf("Warning: Plex service initialization failed: %v", err)
		log.Printf("Plex features will be disabled")
	}

	router := gin.Default()
	
	router.Use(middleware.CORS())
	
	api := router.Group("/api/v1")
	{
		api.GET("/health", handlers.HealthCheck)
		
		// Auth endpoints
		authHandler := handlers.NewAuthHandler(db, authService)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.GET("/me", middleware.AuthRequired(authService), authHandler.GetCurrentUser)
		}
		
		// Protected endpoints (require authentication)
		protected := api.Group("/")
		protected.Use(middleware.AuthRequired(authService))
		{
			// Request endpoints
			requestHandler := handlers.NewRequestHandler(db)
			protected.GET("/requests", requestHandler.GetRequests)
			protected.POST("/requests", requestHandler.CreateRequest)
			protected.PUT("/requests/:id", requestHandler.UpdateRequest)
			protected.DELETE("/requests/:id", requestHandler.DeleteRequest)
			protected.GET("/requests/stats", middleware.AdminRequired(authService), requestHandler.GetRequestStats)
			
			// Search endpoints
			searchHandler := handlers.NewSearchHandler(tmdbService, plexService)
			protected.GET("/search", searchHandler.SearchMedia)
			protected.GET("/search/:type/:id", searchHandler.GetMediaDetails)
			
			// Plex endpoints (only if service is available)
			if plexService != nil {
				plexHandler := handlers.NewPlexHandler(plexService)
				plex := protected.Group("/plex")
				{
					plex.GET("/check", plexHandler.CheckMedia)
					plex.GET("/search", plexHandler.SearchPlex)
					plex.GET("/libraries", plexHandler.GetLibraries)
				}
			}
		}
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}