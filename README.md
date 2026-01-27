# Plex Requests

A modern web application for managing movie and TV show requests for your Plex Media Server.

## Features

- 🎬 Search for movies and TV shows using TMDB API
- 📝 Submit and track media requests
- 👥 User authentication and authorization
- 🔐 Admin panel for request management
- 📱 Responsive design for mobile and desktop
- 🚀 Fast and modern tech stack

## Tech Stack

### Backend
- **Go** with Gin web framework
- **PostgreSQL** database with GORM ORM
- **JWT** authentication
- **RESTful API** design

### Frontend
- **React** with Vite
- **Tailwind CSS** for styling
- **React Query** for data fetching
- **React Router** for navigation

### Infrastructure
- **Docker** and Docker Compose
- **Air** for Go hot reloading
- **GitHub Actions** for CI/CD (coming soon)

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git
- TMDB API key (get one at [themoviedb.org](https://www.themoviedb.org/settings/api))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/plex-requests.git
cd plex-requests
```

2. Copy the environment example file:
```bash
cp .env.example .env
```

3. Edit `.env` and add your TMDB API key and other configuration

4. Start the development environment:
```bash
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432

### Development

#### Backend Development

The backend uses Air for hot reloading. Any changes to Go files will automatically rebuild and restart the server.

Key directories:
- `backend/cmd/api` - Application entry point
- `backend/internal/handlers` - HTTP request handlers
- `backend/internal/models` - Database models
- `backend/internal/middleware` - HTTP middleware

#### Frontend Development

The frontend uses Vite for fast development. Changes to React components will hot reload in the browser.

Key directories:
- `frontend/src/pages` - Page components
- `frontend/src/components` - Reusable components
- `frontend/src/services` - API service layer
- `frontend/src/hooks` - Custom React hooks

## API Documentation

### Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Public Endpoints
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

#### Protected Endpoints
- `GET /api/v1/requests` - Get all requests
- `POST /api/v1/requests` - Create a new request
- `PUT /api/v1/requests/:id` - Update request status
- `DELETE /api/v1/requests/:id` - Delete a request
- `GET /api/v1/search?query=<query>` - Search for media

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for movie and TV show data
- [Plex Media Server](https://www.plex.tv/) for inspiration