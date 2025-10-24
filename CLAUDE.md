# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Seerr Codebase Architecture Guide

## Overview

Seerr is a modern media request management system designed for Plex, Jellyfin, and Emby servers. It combines a Node.js/Express backend with a Next.js frontend, using TypeORM for database management and supporting both SQLite (default) and PostgreSQL databases.

**Key Facts:**
- Repository: https://github.com/seerr-team/seerr
- Architecture: Full-stack TypeScript monorepo
- Frontend Framework: Next.js 14 + React 18
- Backend: Express.js with Node.js 22+
- Database: TypeORM (SQLite or PostgreSQL)
- Package Manager: pnpm 10+
- Port: 5055 (default)

---

## 1. Overall Architecture Pattern

### Monorepo Structure

This is a **unified monorepo** containing both frontend and backend code:

```
seerr/
├── server/           # Backend (Express.js + TypeORM)
├── src/              # Frontend (Next.js)
├── public/           # Static assets
├── config/           # Configuration files
├── dist/             # Compiled backend (after build)
└── .next/            # Next.js build output
```

### Next.js + Express Setup

**Hybrid Architecture:**
1. **Next.js handles:**
   - Server-side rendering (SSR) for page requests
   - Client-side navigation and UI
   - API routes (though mostly delegated to Express)

2. **Express.js handles:**
   - RESTful API endpoints (mounted at `/api/v1/*`)
   - Authentication & session management
   - OpenAPI/Swagger validation
   - Image proxy services
   - File uploads

**Server Initialization Flow (server/index.ts):**
```
1. Next.js app.prepare()
2. Database initialization (TypeORM)
3. Run pending migrations
4. Load Settings from database
5. Initialize DNS cache (optional)
6. Configure HTTP proxy (optional)
7. Register notification agents
8. Start scheduled jobs
9. Bootstrap Discovery Sliders
10. Create Express server with middleware
11. Mount API routes at /api/v1
12. Mount image proxy routes
13. Pass remaining requests to Next.js handler
14. Listen on port 5055
```

---

## 2. Key Directories and Their Purposes

### Backend Structure (server/)

**API Layer (api/):**
- `plexapi.ts` - Plex server API client
- `jellyfin.ts` - Jellyfin server API client
- `plextv.ts` - Plex.tv authentication API
- `github.ts` - GitHub API for version checks
- `servarr/` - Sonarr & Radarr integration (sonarr.ts, radarr.ts, base.ts)
- `themoviedb/` - TMDB integration
- `tvdb/` - TheTVDB integration
- `tautulli.ts` - Plex statistics
- `externalapi.ts` - Generic external API wrapper

**Entity Layer (entity/):**
- `User.ts` - User with permissions & quotas
- `MediaRequest.ts` - Request entity with business logic
- `Media.ts` - Media tracking (movie/TV)
- `Season.ts` - TV Season entity
- `SeasonRequest.ts` - Season-specific requests
- `Issue.ts` - Issue tracker entity
- `IssueComment.ts` - Issue comments
- `Blacklist.ts` - Blacklisted media
- `DiscoverSlider.ts` - Discovery carousel config
- `OverrideRule.ts` - Request override rules
- `UserSettings.ts` - Per-user settings
- `UserPushSubscription.ts` - Web push subscriptions
- `Watchlist.ts` - Watchlist tracking
- `Session.ts` - Express session storage

**Routes Layer (routes/):**
- `index.ts` - Main router & status endpoints
- `auth.ts` - Authentication (Plex/Jellyfin)
- `media.ts` - Media CRUD operations
- `request.ts` - Media request endpoints
- `issue.ts` - Issue management
- `discover.ts` - Discovery/browsing
- `movie.ts` - Movie endpoints
- `tv.ts` - TV endpoints
- `search.ts` - Search functionality
- `blacklist.ts` - Blacklist management
- `user/` - User management routes
- `settings/` - System settings routes

**Core Services (lib/):**
- `notifications/` - Notification system with agents
- `scanners/` - Library scanning (Plex, Jellyfin, Radarr, Sonarr)
- `settings/` - Settings management
- `permissions.ts` - Permission bit flags
- `availabilitySync.ts` - Media availability tracking
- `watchlistsync.ts` - Watchlist syncing
- `downloadtracker.ts` - Download progress
- `imageproxy.ts` - Image caching

**Job Scheduling (job/):**
- `schedule.ts` - Main scheduler (node-schedule)
- `blacklistedTagsProcessor.ts` - Tag processing

### Frontend Structure (src/)

**Pages (pages/):**
- `_app.tsx` - App wrapper with providers
- `login/` - Authentication pages
- `discover/` - Discovery/browsing
- `movie/`, `tv/` - Media detail pages
- `requests/` - Request management
- `issues/` - Issue tracker
- `settings/` - Settings pages
- `users/` - User management
- `search.tsx` - Search results

**Components:**
- `Common/` - Reusable UI components
- `RequestButton/`, `MediaSlider/` - Feature components
- 50+ total components organized by domain

**Hooks (hooks/):**
- `useUser.ts` - User authentication
- `useSettings.ts` - Settings context
- `useDiscover.ts` - Discovery filters
- 16 custom hooks total

**Context (context/):**
- `UserContext.tsx` - Authentication state
- `SettingsContext.tsx` - Global settings
- `LanguageContext.tsx` - Localization
- `InteractionContext.tsx` - UI state

**Utilities & i18n:**
- `utils/` - API helpers, Plex/Jellyfin auth
- `i18n/` - Internationalization (40+ language files)

---

## 3. How Frontend and Backend Interact

### Request Flow

```
Browser → Next.js (SSR/Client) → Express API (/api/v1)
         ↓
Sessions (TypeormStore, 30 days, httpOnly cookies)
         ↓
CSRF Protection (@dr.pogodin/csurf)
         ↓
Route Handlers (server/routes/*)
         ↓
TypeORM Repository Queries
         ↓
Database (SQLite or PostgreSQL)
```

### Communication Methods

1. **HTTP REST API** - Base: `/api/v1/*`
   - Session-based authentication
   - OpenAPI validation (seerr-api.yml)
   - Content-Type: application/json

2. **Session Management**
   - Store: TypeormStore (database backed)
   - Duration: 30 days
   - Secure: httpOnly, sameSite, secure cookies
   - Created via express-session middleware

3. **CSRF Protection**
   - Configurable in settings
   - Token in cookie + response header (XSRF-TOKEN)
   - Applied to all state-changing requests

4. **OpenAPI Validation**
   - Spec: seerr-api.yml (root)
   - Validator: express-openapi-validator middleware
   - Automatic request/response validation
   - UI: /api-docs endpoint

### Frontend API Usage

```typescript
// Using SWR + axios pattern
import useSWR from 'swr';
import axios from 'axios';

const { data, error, isLoading } = useSWR(
  '/api/v1/request',
  (url) => axios.get(url).then(res => res.data)
);

// POST example
const response = await axios.post('/api/v1/request', {
  mediaId: 12345,
  mediaType: 'movie'
});
```

---

## 4. Database Structure (TypeORM)

### Supported Databases

1. **SQLite (Default)**
   - File: `config/db/db.sqlite3`
   - WAL mode enabled (enableWAL: true)
   - Development: synchronize: true
   - Production: synchronize: false (use migrations)

2. **PostgreSQL (Optional)**
   - Environment: DB_TYPE=postgres
   - Supports TCP and Unix sockets
   - SSL/TLS configurable
   - Same entity definitions, different migrations

### Entity Relationships

```
User ──1:N──> MediaRequest
    ├─1:N──> Issue
    ├─1:1──> UserSettings
    └─1:N──> UserPushSubscription

Media ──1:N──> MediaRequest
     ├─1:N──> Season
     └─1:N──> Watchlist

Season ──1:N──> SeasonRequest
       └─1:N──> MediaRequest

MediaRequest ──> Issue (1:1)
            └──> IssueComment (1:N)

OverrideRule ──> MediaRequest (used in validation)
Blacklist ──> Media
Session ──> (No relations, session data)
```

### Key Entities

**User.ts:** id, email, username, password, plexId, plexToken, jellyfinUserId, jellyfinAuthToken, permissions (bit flags), avatar, quotas (movie/tv), relations: requests, settings, issues

**MediaRequest.ts:** id, type (MOVIE|TV), status (PENDING|APPROVED|DECLINED|FAILED|COMPLETED), is4k, tmdbId, tvdbId, requestedBy, modifiedBy, approvedBy, relations: media, seasonRequests, issue. Complex validation in static request() method.

**Media.ts:** id, tmdbId, tvdbId, status, status4k (UNKNOWN|PENDING|PROCESSING|PARTIALLY_AVAILABLE|AVAILABLE|BLACKLISTED|DELETED), mediaType (MOVIE|TV), mediaAddedAt, relations: requests, seasons, watchlists

**Issue.ts:** id, subject, description, status (OPEN|RESOLVED), createdBy, modifiedBy, relations: comments, mediaRequest

**UserSettings.ts:** language, theme, notifications preferences per notification type

### Migrations

Commands:
```bash
pnpm migration:generate -n DescriptiveName  # Generate from entities
pnpm migration:create -n DescriptiveName    # Create empty
pnpm migration:run                           # Run pending migrations
```

Locations: `server/migration/sqlite/` and `server/migration/postgres/`

Naming: `YYYYMMDDHHMMSS-Type.ts`

---

## 5. API Structure and Routes

### Base Path: `/api/v1`

**Authentication Routes:**
- `POST /auth/login` - Local login
- `POST /auth/plex` - Plex authentication
- `POST /auth/jellyfin` - Jellyfin authentication
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

**Media Request Routes:**
- `GET /request` - List requests (filterable)
- `POST /request` - Create request
- `GET /request/:id` - Request detail
- `PUT /request/:id` - Update request
- `DELETE /request/:id` - Delete request
- `GET /request/count` - Count pending

**Media Routes:**
- `GET /media` - List media (filterable/sortable)
- `GET /media/:id` - Media detail
- `POST /media/:id` - Update status

**Discover Routes:**
- `GET /discover/movies` - Movie discovery
- `GET /discover/tv` - TV discovery
- `GET /discover/trending` - Trending content
- `GET /discover/popular` - Popular content
- `GET /discover/upcoming` - Upcoming releases

**Search:**
- `GET /search` - Multi-type search
- `GET /search/keyword` - Keyword search

**Issue Routes:**
- `GET /issue` - List issues
- `POST /issue` - Create issue
- `GET /issue/:id` - Issue detail
- `POST /issue/:id/comment` - Add comment
- `POST /issue/:id/resolve` - Resolve issue

**Settings Routes:**
- `GET /settings` - Get all settings
- `POST /settings` - Update settings
- `GET /settings/radarr`, `POST /settings/radarr` - Radarr config
- `GET /settings/sonarr`, `POST /settings/sonarr` - Sonarr config
- `GET /settings/notifications`, `POST /settings/notifications` - Notification config

**User Routes:**
- `GET /user` - List users
- `POST /user` - Create user
- `GET /user/:id` - User detail
- `PUT /user/:id` - Update user
- `DELETE /user/:id` - Delete user
- `GET /user/:id/settings`, `POST /user/:id/settings` - User prefs
- `GET /user/:id/quota` - Quota status

**System:**
- `GET /status` - App status/version
- `GET /status/appdata` - AppData folder status
- `GET /service/availability` - Service health checks

### Middleware Chain

1. Cookie parser
2. JSON/URL-encoded body parser
3. IP detection (with request-ip)
4. CSRF protection (if enabled)
5. Session management (only /api routes)
6. OpenAPI validation
7. Date serialization workaround
8. Route handlers
9. Error handler (catches all errors)

---

## 6. Key Services and Integrations

### Media Server Integrations

**Plex (Primary)**
- Class: `PlexAPI` (server/api/plexapi.ts)
- Auth: Token-based
- Methods: getLibraries(), getLibraryContents(), getMetadata(), getRecentlyAdded(), syncLibraries()
- Scanning: plexRecentScanner (5 min), plexFullScanner (24 hours)
- External API: PlexTvAPI for authentication

**Jellyfin/Emby**
- Class: `JellyfinAPI` (server/api/jellyfin.ts)
- Auth: API key + User ID
- Methods: Similar to Plex
- Scanning: jellyfinRecentScanner (5 min), jellyfinFullScanner (24 hours)

### Download/Indexer Integrations

**Radarr (Movies)**
- Class: `RadarrAPI` (server/api/servarr/radarr.ts)
- Methods: getProfiles(), getAvailability(), addMovie(), editMovie(), getMovies()
- Sync Job: radarrScanner (24 hours)
- Config: API key, quality profile, root directory, tags, 4K support

**Sonarr (TV Series)**
- Class: `SonarrAPI` (server/api/servarr/sonarr.ts)
- Methods: getProfiles(), getSeries(), addSeries(), updateEpisodes()
- Sync Job: sonarrScanner (24 hours)
- Features: Anime series, season folder organization, multi-profile support

### Metadata Providers

**The Movie Database (TMDB)**
- Class: `TheMovieDb` (server/api/themoviedb/index.ts)
- Methods: getMovie(), getTvShow(), searchMovies(), searchTv(), getGenres(), getWatchProviders()
- Used for: All movie/TV details, descriptions, ratings, streaming availability
- Configurable: Region, language

**The TV Database (TVDB)**
- Class: `TvDB` (server/api/tvdb/index.ts)
- Used for: TV metadata especially anime
- Methods: search, details, images

**Tautulli (Plex Stats)**
- Class: `TautulliAPI` (server/api/tautulli.ts)
- Optional: For watch history statistics
- Methods: getStats(), getUsers(), getSeriesWatch(), getMovieWatch()

### Notification Integrations

**Email** - Nodemailer + email-templates, HTML templates, PGP encryption
**Discord** - Webhook-based with embeds
**Telegram** - Bot-based messaging
**Slack** - Formatted messages
**Pushover** - Mobile push notifications
**Pushbullet** - Cross-device notifications
**Web Push** - Browser notifications (PWA), VAPID-based
**Gotify** - Self-hosted push server
**Ntfy.sh** - Simple push notifications
**Webhooks** - Generic HTTP POST to custom endpoints

---

## 7. Job Scheduling and Background Tasks

### Job Scheduler (node-schedule)

**File:** `server/job/schedule.ts`

Jobs registered in startJobs() if users exist:

1. **Plex/Jellyfin Recently Added** (5 min) - Check new additions
2. **Plex/Jellyfin Full Library** (24 h) - Complete sync
3. **Plex Token Refresh** (periodic) - Keep tokens valid
4. **Plex Watchlist Sync** (periodic) - Sync user watchlists
5. **Radarr Scan** (24 h) - Sync movie library
6. **Sonarr Scan** (24 h) - Sync TV library
7. **Media Availability Sync** (24 h) - Check if available still
8. **Download Sync** (1 min) - Track download progress
9. **Download Sync Reset** (1 AM daily) - Reset daily counters
10. **Image Cache Cleanup** (24 h) - Clear TMDB/avatar cache
11. **Process Blacklisted Tags** (daily) - Auto-request processing

### Scanner Base Class

**File:** `server/lib/scanners/baseScanner.ts`

Features: Running status, cancellation, error handling, progress tracking, transactions

Methods: run(), cancel(), status()

All scanners (Plex, Jellyfin, Radarr, Sonarr) extend this base.

---

## 8. Notification System Architecture

### Notification Types (Enum)

```
MEDIA_PENDING = 2
MEDIA_APPROVED = 4
MEDIA_AVAILABLE = 8
MEDIA_FAILED = 16
MEDIA_DECLINED = 64
MEDIA_AUTO_APPROVED = 128
ISSUE_CREATED = 256
ISSUE_COMMENT = 512
ISSUE_RESOLVED = 1024
ISSUE_REOPENED = 2048
MEDIA_AUTO_REQUESTED = 4096
```

### Agent Architecture

**Base Interface:**
```typescript
interface NotificationAgent {
  shouldSend(): boolean;
  send(type: Notification, payload: NotificationPayload): Promise<boolean>;
}

abstract class BaseAgent<T extends NotificationAgentConfig> {
  protected settings?: T;
  protected abstract getSettings(): T;
}
```

**Flow:**
1. Action triggered (request, issue, etc.)
2. Code calls notificationManager.sendNotification()
3. Manager iterates registered agents
4. Each agent:
   - Checks if shouldSend()
   - Determines recipients (admin, user, system)
   - Formats message with localization
   - Sends via channel

**Payload Structure:**
- event, subject, notifySystem, notifyAdmin, notifyUser
- media, image, message, extra fields
- request, issue, comment
- pendingRequestsCount, isAdmin

**User Notification Preferences:**
- Per-user in UserSettings
- Which types enabled
- Delivery channels per type
- Email/push subscription state

---

## 9. Authentication and Session Management

### Authentication Methods

**1. Plex (Primary)**
- OAuth2 via Plex.tv
- Flow: Token → PlexTvAPI.getUser() → Check/create User → Session
- Creates user on first login (auto-admin)

**2. Jellyfin (Alternative)**
- Direct API: Username + Password + Server URL
- Flow: Credentials → JellyfinAPI.getUser() → Check/create User → Session

**3. Local (Optional)**
- Username + bcrypt-hashed password
- Configurable in settings
- Password reset via email

### Session Management (express-session)

**Storage:** TypeormStore backed by Session entity

**Config:**
- Secret: Application clientId
- Duration: 30 days
- Cookie: httpOnly, sameSite (strict/lax), secure (auto)
- Cleanup: Every 2nd request (cleanupLimit: 2)

**Session Entity:**
```typescript
id: string (primary)
expiresAt: Date
json: string (session data)
```

### Authentication Middleware

**Function:** `isAuthenticated(requiredPermissions?: Permission[])`

Usage:
```typescript
// Require authentication
router.get('/protected', isAuthenticated(), (req, res) => {
  req.user // Authenticated User
});

// Require permission
router.post('/admin', isAuthenticated([Permission.ADMIN]), ...)
```

**Also:** `checkUser` middleware populates req.user if authenticated

### Frontend Auth Flow

**_app.tsx:**
1. App loads getInitialProps()
2. Requests /api/v1/auth/me
3. If authenticated, loads user data
4. If not, redirects to login
5. Sets UserContext
6. Route guards prevent unauthorized access

**Pages:**
- `/login` - Plex/Jellyfin/Local
- `/setup` - Initial admin setup

---

## 10. Important Patterns and Conventions

### Permission System (Bit Flags)

**All Permissions:**
- ADMIN, MANAGE_SETTINGS, MANAGE_USERS, MANAGE_REQUESTS
- REQUEST, REQUEST_MOVIE, REQUEST_TV, REQUEST_4K
- AUTO_APPROVE, AUTO_APPROVE_MOVIE, AUTO_APPROVE_TV
- VOTE, AUTO_REQUEST, AUTO_REQUEST_MOVIE, AUTO_REQUEST_TV
- MANAGE_ISSUES, VIEW_ISSUES, CREATE_ISSUES
- RECENT_VIEW, WATCHLIST_VIEW
- MANAGE_BLACKLIST, VIEW_BLACKLIST

**Usage:**
```typescript
// Single permission
user.hasPermission(Permission.ADMIN)

// Multiple (AND)
user.hasPermission([Permission.REQUEST, Permission.REQUEST_MOVIE])

// Multiple (OR)
user.hasPermission(
  [Permission.REQUEST_MOVIE, Permission.REQUEST_TV],
  { type: 'or' }
)
```

**Implementation:** Bitwise AND operations in hasPermission() function

### Error Handling

**Pattern:**
```typescript
try {
  // business logic
} catch (e) {
  next({
    status: 400,
    message: e.message,
    errors: [e.stack]
  });
}
```

**Custom Error Classes:**
- RequestPermissionError
- QuotaRestrictedError
- DuplicateMediaRequestError
- NoSeasonsAvailableError
- BlacklistedMediaError

**Error Middleware:** Catches all errors, formats JSON response

### Database Query Patterns

**Using Repositories:**
```typescript
const userRepository = getRepository(User);

// Find one
const user = await userRepository.findOne({
  where: { id: 1 },
  relations: ['requests', 'settings']
});

// Find and count
const [users, total] = await userRepository.findAndCount({
  where: { permissions: MoreThan(0) },
  take: 10,
  skip: 0
});

// Query builder
const requests = await getRepository(MediaRequest)
  .createQueryBuilder('request')
  .innerJoinAndSelect('request.media', 'media')
  .where('request.status = :status', { status: MediaRequestStatus.PENDING })
  .orderBy('request.createdAt', 'DESC')
  .getMany();
```

### TypeORM Decorators

**Common:**
- @Entity() - Mark as database entity
- @PrimaryGeneratedColumn() - Auto-increment ID
- @Column() - Database field
- @DbAwareColumn() - SQLite/PostgreSQL compatibility
- @RelationCount() - Count related rows
- @OneToMany(), @ManyToOne() - Relationships
- @AfterLoad(), @AfterInsert(), @AfterUpdate() - Lifecycle hooks

### Settings System

**Pattern:** Singleton-like loader

Usage:
```typescript
const settings = getSettings();
settings.plex.ip = '192.168.1.100';
await settings.save();
```

**Storage:**
- JSON file: config/settings.json
- Defaults: config/settings.json.example
- Versioning: Migrations in server/lib/settings/migrations/

### Frontend Patterns

**SWR (Data Fetching):**
```typescript
const { data, error, isLoading } = useSWR(
  '/api/v1/request',
  (url) => axios.get(url).then(res => res.data),
  { revalidateOnFocus: false, errorRetryCount: 3 }
);
```

**Custom Hooks:**
```typescript
export const useUser = () => {
  const { user, error, isLoading } = useSWR(...);
  return { user, error, isLoading, hasPermission };
};
```

**React Context:**
```typescript
const UserContext = createContext(null);
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  return <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>;
};
export const useUserContext = () => useContext(UserContext);
```

### Logging (Winston)

**Levels:** error, warn, info, debug

**Usage:**
```typescript
logger.info('User login', { label: 'Auth', userId: user.id });
logger.warn('Permission denied', { label: 'Permissions' });
logger.error('DB error', { label: 'Database', message: error.message });
```

**Output:**
- Console (colored)
- Daily logs: config/logs/jellyseerr-YYYY-MM-DD.log
- Machine logs: config/logs/.machinelogs-YYYY-MM-DD.json

### Build Process

```bash
pnpm dev              # Development (watch mode)
pnpm build            # Build Next.js + TypeScript backend
pnpm build:next       # Frontend only
pnpm build:server     # Backend only
pnpm start            # Production (compiled)
pnpm lint             # ESLint
pnpm lintfix          # Auto-fix lint
pnpm format           # Prettier
pnpm typecheck        # Full TypeScript check
```

**Output:**
- Frontend: .next/
- Backend: dist/

### Configuration Management

**Config Directory:** config/ (created on first run)

**Files:**
- settings.json - Application settings
- db/db.sqlite3 - Default SQLite database
- logs/ - Application logs
- server/templates/ - Email templates (Pug format)

**Environment Variables:**
- NODE_ENV - production/development
- PORT - Server port (5055 default)
- HOST - Bind address
- CONFIG_DIRECTORY - Config path override
- LOG_LEVEL - Winston log level
- DB_TYPE - sqlite/postgres
- DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME - PostgreSQL
- DB_SOCKET_PATH - Unix socket (alternative to TCP)
- DB_USE_SSL, DB_SSL_* - SSL/TLS configuration
- COMMIT_TAG - Version tag

---

## Development Guidelines

### Adding API Endpoint

1. Create route handler in server/routes/
2. Define TypeScript interfaces for request/response
3. Add permission check if needed
4. Implement business logic using repositories
5. Add error handling with status codes
6. Mount route in server/routes/index.ts
7. Update OpenAPI spec (seerr-api.yml)
8. Test with CSRF/session if applicable

### Adding Notification Agent

1. Create file in server/lib/notifications/agents/
2. Extend BaseAgent class
3. Implement NotificationAgent interface
4. Implement settings getter
5. Register in server/index.ts
6. Add settings interface in server/lib/settings/

### Database Changes

1. Modify entity in server/entity/
2. Generate migration: `pnpm migration:generate -n Name`
3. Review generated SQL
4. Test locally: `pnpm migration:run`
5. Commit migration file with entity changes

### Frontend Components

1. Use functional components with hooks
2. Use SWR for data fetching
3. Use React context for app-wide state
4. Use Tailwind CSS for styling
5. Wrap strings in react-intl for i18n
6. Use TypeScript for all new code
7. Import from absolute paths (@app/*, @server/*)

---

## Troubleshooting Reference

### Common Issues & Solutions

**Database Lock:**
- SQLite WAL mode active
- Check config/db/ for -shm and -wal files
- Solution: Restart application

**Missing Permissions:**
- Clear cookies/session
- Re-login with appropriate user
- Check user permissions in database

**Plex Connection Failed:**
- Verify Plex server IP/port in settings
- Check firewall/network connectivity
- Ensure Plex token is valid
- Check logs for details

**Notifications Not Sending:**
- Check agent enabled in settings
- Verify user/admin notification preferences
- Check server logs for errors
- Verify webhook/API credentials

**Build Fails:**
- Clear node_modules and dist/
- Run `pnpm install` again
- Check TypeScript errors: `pnpm typecheck`

---

## Key Concepts Summary

1. **Sessions are database-backed** - Persist across restarts
2. **Permissions use bit flags** - Efficient storage/checking
3. **Notifications are async** - Fire-and-forget pattern
4. **Scanners can be cancelled** - Long-running jobs interruptible
5. **Settings are singleton** - Loaded once, changes need save
6. **CSRF is optional** - Configurable but enabled by default
7. **SQLite swappable for PostgreSQL** - Same code works both
8. **Frontend uses SWR** - Automatic caching/revalidation
9. **TypeORM handles relationships** - Automatic joins/cascades
10. **Structured logging** - Each entry has metadata for filtering

---

## Project Structure Summary

```
seerr-dizzle/
├── CLAUDE.md              # This architecture guide
├── README.md              # Project README
└── seerr/                 # Main project
    ├── server/            # Express backend + TypeORM
    ├── src/               # Next.js 14 + React 18 frontend
    ├── public/            # Static assets
    ├── config/            # Config files (created on first run)
    ├── package.json       # Dependencies
    ├── next.config.js     # Next.js config
    ├── tsconfig.json      # TypeScript config
    ├── seerr-api.yml      # OpenAPI specification
    ├── Dockerfile         # Container image
    └── docker-compose.yaml # Local stack
```

---

## Resources & Links

- **GitHub:** https://github.com/seerr-team/seerr
- **Documentation:** https://docs.seerr.dev
- **Community Discord:** Join for support
- **API Docs:** /api-docs endpoint (running instance)
- **OpenAPI Spec:** seerr-api.yml (root directory)

---

## TypeScript Path Aliases

**In tsconfig.json:**
- `@server/*` → Maps to server/
- `@app/*` → Maps to src/

**Example imports:**
```typescript
import { getRepository } from '@server/datasource';
import Layout from '@app/components/Layout';
```

---

## Dependency Overview

**Backend Key Libraries:**
- `express` 4.21 - Web framework
- `typeorm` 0.3 - ORM
- `node-schedule` 2.1 - Job scheduler
- `axios` 1.10 - HTTP client
- `nodemailer` 6.10 - Email
- `winston` 3.8 - Logging
- `bcrypt` 5.1 - Password hashing
- `web-push` 3.5 - Web notifications
- `connect-typeorm` 1.1 - Session store

**Frontend Key Libraries:**
- `next` 14.2 - Framework
- `react` 18.3 - UI
- `axios` 1.10 - HTTP client
- `swr` 2.2 - Data fetching
- `react-intl` 6.6 - Internationalization
- `tailwindcss` 3.2 - Styling
- `headlessui` 1.7 - Components
- `formik` 2.4 - Form handling

---

## Performance Considerations

1. **Database:**
   - SQLite: Single file, sufficient for small-medium installations
   - PostgreSQL: Better for high-concurrency setups
   - Indexes on frequently queried fields

2. **Caching:**
   - node-cache: In-memory for TMDB results
   - Image proxy cache: TMDB images cached on disk
   - Frontend SWR: Browser-level caching

3. **Background Jobs:**
   - Scheduled scans don't block request handling
   - Cancellable for responsive UI
   - Error recovery built-in

4. **Frontend:**
   - SWR handles deduplication
   - Lazy image loading
   - Code splitting with Next.js

---

## Security Considerations

1. **Authentication:**
   - Session tokens stored in secure httpOnly cookies
   - CSRF protection via tokens
   - Password hashing with bcrypt
   - Plex/Jellyfin integration reduces password exposure

2. **Authorization:**
   - Middleware enforces permissions
   - Bit flags prevent permission escalation
   - Database-level user isolation

3. **Data Protection:**
   - Sensitive fields (passwords, tokens) marked select: false
   - Email/Plex filtering for user lists
   - API key protection in settings

4. **Network:**
   - SSL/TLS support for databases
   - Proxy agent support for outbound requests
   - IP detection/logging

---

## Notes for Future AI Assistants

- Always check permissions before operations
- Use getRepository() instead of direct queries
- Send notifications after state changes
- Validate user input with Yup/Zod
- Test with both SQLite and PostgreSQL if possible
- Check OpenAPI spec before endpoint changes
- Use logger instead of console.log
- Prefer SWR over direct fetch in frontend
- Follow existing component/hook patterns
- Localize UI strings with react-intl
- Use TypeScript strict mode

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Seerr Version:** 0.1.0
**Node Version:** 22+
**Status:** Comprehensive Architecture Guide

