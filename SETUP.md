# MRS Setup Documentation

## TMDB API Integration ✅ COMPLETED

**Status:** Working  
**Date:** 2026-01-28  

### Configuration
- TMDB API token configured in  file
- Search endpoint operational at 
- Movie metadata includes: title, year, overview, posters, ratings

### Test Account Created
- Email: test@test.com
- Password: testpass123  

### Testing
To test TMDB integration:
1. Go to http://localhost:19173
2. Login with test account above
3. Use Search page to search for movies
4. Results should show with proper movie posters and data

## Next Steps

### Issue #2: Plex Server Connection
- Plex server likely at: http://192.168.0.125:32400
- Need to generate Plex authentication token
- Configure Already in Plex detection

### Issue #3: End-to-End Testing  
- Test complete request workflow
- Verify admin approval process
- Test request status updates


## Critical Fix: CORS and Docker Networking ✅ COMPLETED

**Issue:** CORS errors when trying to login/register  
**Error:** "Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://mrs-backend:8080"

### The Problem


### The Solution  


### Key Learning
- **Docker internal networking** (mrs-backend:8080) works for container-to-container
- **Browser networking** needs accessible hostnames (localhost, IP addresses)  
- Frontend React apps run client-side, not inside Docker containers

### Working Test Account
- Email: final@test.com
- Password: test123

**Status:** Authentication (login/register) and search now fully functional.

