# MRS Development Workflow

## Current Status
After initial development session (2026-01-27), MRS has:
- Working TMDB integration for movie search
- Plex server connection for availability checking  
- User authentication and registration
- Basic admin panel framework

## Git Workflow Going Forward

### Branch Protection
Main branch should be protected. All changes via pull requests.

### Feature Development
```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/issue-name

# Make changes and commit
git add .
git commit -m "feat: description of change"

# Push and create PR
git push origin feature/issue-name
# Create pull request on GitHub
```

### Bug Fixes
```bash
# Start bug fix
git checkout -b fix/bug-description

# Fix and test
git commit -m "fix: description of fix"

# Push for review
git push origin fix/bug-description
```

### Issue-Driven Development
1. Create GitHub issue first
2. Reference issue in branch name: `feature/5-admin-dashboard`
3. Reference issue in commits: `feat: add bulk actions (closes #5)`
4. Link PR to issue

## Commit Message Format
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix  
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Build/tooling

## Development Notes
- Always use `docker-compose down && docker-compose up -d` for .env changes
- Test authentication and search after any API changes
- Document environment variable changes in SETUP.md
- Keep commits focused and atomic

## Lessons Learned
1. Docker restart ≠ environment variable refresh
2. Frontend needs localhost URLs, not Docker container names
3. CORS issues manifest as "network request failed"
4. Port conflicts on Windows require high random ports (19xxx)