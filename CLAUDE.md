# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
A full-stack web application for managing movie and TV show requests for Plex Media Server, started on 2025-07-18. The project uses Go with Gin for the backend API and React with Vite for the frontend SPA.

## Architecture

### Backend (Go 1.23/Gin)
The backend follows a clean architecture pattern with clear separation of concerns:
- **Entry Point**: `backend/cmd/api/main.go` - Sets up router, middleware, and starts server
- **Database Layer**: `backend/internal/database/` - PostgreSQL connection and GORM migrations
- **HTTP Handlers**: `backend/internal/handlers/` - Request handling logic for each endpoint
- **Models**: `backend/internal/models/` - GORM models for User and Request entities
- **Middleware**: `backend/internal/middleware/` - CORS and JWT authentication middleware
- **API Routes**:
  - Public: `/api/v1/health`, `/api/v1/auth/register`, `/api/v1/auth/login`
  - Protected: `/api/v1/requests/*`, `/api/v1/search`

### Frontend (React/Vite)
The frontend is a Single Page Application with:
- **Components**: `frontend/src/components/` - Reusable UI components
- **Pages**: `frontend/src/pages/` - Route-specific page components
- **Services**: `frontend/src/services/` - API communication layer
- **Hooks**: `frontend/src/hooks/` - Custom React hooks
- **Styling**: Tailwind CSS with PostCSS configuration

### Database Schema
- **Users**: id, email, username, password (hashed), is_admin, timestamps
- **Requests**: id, user_id, title, year, media_type, tmdb_id, imdb_id, overview, poster_path, status, notes, admin_notes, timestamps

## Essential Commands

### Development Environment
```bash
# Start all services (from root directory)
docker-compose up

# Access services:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:8080
# - PostgreSQL: localhost:5432
```

### Backend Development
```bash
cd backend

# Run tests (when implemented)
go test ./...

# Tidy dependencies
go mod tidy

# Build manually (Air handles this in dev)
go build -o ./tmp/main ./cmd/api
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Run development server (handled by Docker in dev)
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

### Database Operations
```bash
# Access PostgreSQL container
docker exec -it plex-requests-db psql -U plexrequests -d plexrequests

# View logs
docker logs plex-requests-db
```

## Configuration

### Environment Setup
1. Copy `.env.example` to `.env` in the root directory
2. Required environment variables:
   - `TMDB_API_KEY`: Get from https://www.themoviedb.org/settings/api
   - `JWT_SECRET`: Change for production
   - `DATABASE_URL`: PostgreSQL connection string

### Development Features
- **Hot Reloading**: Air for Go backend, Vite for React frontend
- **CORS**: Configured for local development
- **Health Checks**: PostgreSQL container includes health check

## API Integration Points

### TMDB API
- Base URL: `https://api.themoviedb.org/3`
- Used for movie/TV show search and metadata
- Requires API key in environment variables

### Authentication Flow
- JWT tokens with Bearer authentication
- Token required in Authorization header for protected endpoints
- User registration creates account with hashed password
- Login returns JWT token for subsequent requests

## Code Patterns

### Backend Patterns
- Handlers receive `*gorm.DB` via closure pattern
- All handlers return JSON responses
- Error handling uses Gin's error response methods
- Models use GORM tags for validation and relationships

### Frontend Patterns
- React Query for data fetching and caching
- Axios for HTTP requests with interceptors
- React Router v6 for navigation
- Component-based architecture with hooks

## Testing Strategy
- Backend: Table-driven tests for handlers, integration tests with test database
- Frontend: React Testing Library for components, MSW for API mocking
- No test framework is currently set up - check with user before assuming

## Common Tasks

### Adding a New API Endpoint
1. Define handler in `backend/internal/handlers/`
2. Add route in `backend/cmd/api/main.go`
3. Update frontend service in `frontend/src/services/`
4. Add React Query hook if needed

### Adding a New Database Model
1. Create model in `backend/internal/models/`
2. Update `database.Migrate()` in `backend/internal/database/migration.go`
3. Create corresponding handlers and routes

### Debugging
- Backend logs visible in `docker-compose up` output
- Frontend console accessible in browser developer tools
- Database queries logged when `GIN_MODE=debug`

## Important Notes
- Always run `docker-compose up` from the root directory
- The backend uses Air for hot reloading - changes auto-rebuild
- Frontend uses Vite - changes reflect immediately
- Database migrations run automatically on backend startup
- CORS is configured for local development only