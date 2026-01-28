# MRS Development Issues

## High Priority - Core Functionality

### Issue #1: Rebrand from "Plex Requests" to "MRS" throughout application
**Priority:** High
**Effort:** Low

**Description:**
Remove all references to "Plex Requests" and replace with "MRS" or "Media Request System" throughout the application.

**Files to update:**
- `frontend/index.html` - Update page title
- `frontend/src/components/Layout.jsx` - Update navigation brand text
- `frontend/src/pages/Home.jsx` - Update welcome messages and headings
- `README.md` - Ensure all references are to MRS
- Any other UI text referencing "Plex Requests"

**Acceptance Criteria:**
- [ ] No "Plex Requests" text visible in UI
- [ ] Application consistently refers to itself as "MRS"
- [ ] Page title shows "MRS" in browser tab

---

### Issue #2: Get TMDB API Key and Configure Integration
**Priority:** High
**Effort:** Low

**Description:**
Obtain a TMDB API key and configure the application to use it for movie/TV show search functionality.

**Tasks:**
- [ ] Create account at https://www.themoviedb.org/
- [ ] Request API key from TMDB
- [ ] Update `.env` file with real TMDB_API_KEY
- [ ] Test search functionality works end-to-end
- [ ] Verify movie posters and metadata load correctly

**Acceptance Criteria:**
- [ ] Search page returns real results
- [ ] Movie posters display correctly
- [ ] Movie metadata (year, rating, description) shows properly
- [ ] No TMDB API errors in browser console

---

### Issue #3: Configure Plex Server Connection
**Priority:** High
**Effort:** Medium

**Description:**
Connect MRS to the existing Plex server running on the Beelink to enable "already available" detection.

**Tasks:**
- [ ] Determine Plex server URL (likely http://192.168.0.125:32400)
- [ ] Generate Plex authentication token
- [ ] Update `.env` with correct PLEX_SERVER_URL and PLEX_TOKEN
- [ ] Test Plex API connection from backend
- [ ] Verify "Already in Plex" detection works in search results

**Acceptance Criteria:**
- [ ] Backend can successfully connect to Plex server
- [ ] Movies already in Plex library show "In Plex" badge
- [ ] Search results accurately reflect Plex availability
- [ ] No Plex connection errors in application logs

---

### Issue #4: Test Complete Request Workflow
**Priority:** High
**Effort:** Medium

**Description:**
Ensure the full user journey works from search to admin approval.

**Test Scenarios:**
- [ ] User registration and login
- [ ] Search for a movie not in Plex
- [ ] Submit request for new movie
- [ ] Admin login and view pending requests
- [ ] Admin approve/reject request
- [ ] User sees updated request status

**Acceptance Criteria:**
- [ ] All user authentication flows work
- [ ] Requests are properly stored in database
- [ ] Admin panel shows all pending requests
- [ ] Status updates are reflected in user interface
- [ ] Email addresses and usernames are unique

---

## Medium Priority - User Experience

### Issue #5: Improve Search Results Display
**Priority:** Medium
**Effort:** Medium

**Description:**
Enhance the search results to better show movie information and Plex availability.

**Improvements:**
- [ ] Add movie descriptions/overviews to cards
- [ ] Show more movie metadata (genre, runtime)
- [ ] Improve "In Plex" indicator styling
- [ ] Add loading states for search
- [ ] Handle search errors gracefully
- [ ] Add pagination for large result sets

**Acceptance Criteria:**
- [ ] Search results are visually appealing
- [ ] Users can easily identify if content is available
- [ ] Search handles edge cases (no results, API errors)
- [ ] Performance is acceptable for large searches

---

### Issue #6: Admin Dashboard Improvements
**Priority:** Medium  
**Effort:** Medium

**Description:**
Improve the admin interface for managing requests.

**Features:**
- [ ] Request statistics dashboard
- [ ] Bulk approval/rejection actions
- [ ] Request filtering and sorting
- [ ] User management interface
- [ ] Request notes and communication
- [ ] Request history and audit log

**Acceptance Criteria:**
- [ ] Admins can efficiently manage many requests
- [ ] Clear overview of system activity
- [ ] Easy user management
- [ ] Request communication is clear

---

## Future Enhancements

### Issue #7: Mobile Responsiveness Testing
**Priority:** Low
**Effort:** Low

**Description:**
Ensure the application works well on mobile devices.

**Testing:**
- [ ] Test on various screen sizes
- [ ] Ensure touch targets are appropriate
- [ ] Verify navigation works on mobile
- [ ] Test search functionality on phones
- [ ] Optimize for common mobile browsers

---

### Issue #8: Request Notifications
**Priority:** Low
**Effort:** High

**Description:**
Add notification system for request status changes.

**Features:**
- [ ] Email notifications for users
- [ ] Admin notifications for new requests
- [ ] In-app notification system
- [ ] Configurable notification preferences

---

### Issue #9: Sonarr/Radarr Integration Planning
**Priority:** Future
**Effort:** High

**Description:**
Design integration with Sonarr/Radarr for automated downloading.

**Research:**
- [ ] Investigate Sonarr/Radarr APIs
- [ ] Design workflow for automatic request processing
- [ ] Plan configuration interface
- [ ] Consider security implications
- [ ] Document integration architecture