# Wedding Invitation Website

A Next.js-based digital wedding invitation system with RSVP functionality. Data is stored in Google Sheets, making it accessible to non-technical users who can access, view, transform, and manage data directly within Sheets.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run development server
npm run dev
```

Visit `http://localhost:3000/admin` to view the dashboard (requires Basic Auth).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INVITE_TOKEN_SECRET` | Yes | Secret for signing invite tokens |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | No* | Google Sheets spreadsheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No* | Service account email |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | No* | Service account private key |
| `ADMIN_BASIC_AUTH_USER` | No | Basic Auth username for `/admin` |
| `ADMIN_BASIC_AUTH_PASS` | No | Basic Auth password for `/admin` |

*When unset, the app uses built-in sample data for development.

Optional tuning variables:
- `GOOGLE_SHEETS_PAGE_SIZE` - Rows per page fetch (default: 500)
- `GOOGLE_SHEETS_SQLITE_CACHE_TTL_SECONDS` - Cache TTL in seconds (default: 60)
- `WEDDING_SQLITE_PATH` - SQLite cache file path (default: `/tmp/wedding-invitation.sqlite`)

## Google Sheets Setup

Create a Google Sheets spreadsheet with these sheets:

### `Weddings` Sheet
| Column | Description |
|--------|-------------|
| `groomName` | Groom's name |
| `groomFamily` | Groom's family name |
| `brideName` | Bride's name |
| `brideFamily` | Bride's family name |
| `eventDateIso` | Event date (ISO 8601 format) |
| `eventTimeLabel` | Event time display (e.g., "10 PM") |
| `eventLabel` | Event type (e.g., "Wedding Reception") |
| `venueName` | Venue name |
| `venueAddress` | Venue address |
| `accentColor` | Theme accent color (hex) |
| `accentSoftColor` | Theme light accent color (hex) |
| `textColor` | Theme text color (hex) |
| `backgroundGlow` | Theme background glow (rgba) |
| `active` | `true`/`false` - whether this wedding is active |

### `Guests` Sheet
| Column | Description |
|--------|-------------|
| `guestSlug` | Unique identifier (lowercase, no spaces) |
| `guestName` | Guest's name |
| `maxHeadcount` | Maximum party size |
| `groupLabel` | Group category (e.g., "Family", "Friends") |
| `active` | `true`/`false` |

### `RSVPs` Sheet
| Column | Description |
|--------|-------------|
| `guestSlug` | Must match a guest's slug |
| `guestName` | Guest's name |
| `status` | `attending` or `declined` |
| `headcount` | Number attending |
| `submittedAt` | Timestamp of submission |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
├─────────────────────────────────────────────────────────────┤
│  /[guestSlug]/[inviteToken]   │   /admin   │   /api/rsvp   │
└─────────────────┬─────────────┴─────────────┴──────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    lib/sheets/index.ts                      │
│         Data layer (mappers, loaders, public API)           │
└─────────────────┬───────────────────────────────────────────┘
                   │
           ┌───────┴───────┐
           ▼               ▼
┌─────────────────┐  ┌─────────────────────────────────────┐
│  lib/sheets/    │  │         lib/sheets/cache-sqlite.ts  │
│  client.ts      │  │    SQLite disk cache (node:sqlite)  │
│  Sheets API     │  │    TTL-based caching + A1 notation  │
└────────┬────────┘  └─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                      lib/config.ts                          │
│                  Zod validation + env                       │
└─────────────────────────────────────────────────────────────┘
```

## Design Decisions

### Google Sheets as Database

Google Sheets serves as the data store to minimize the barrier to entry for non-technical users. Wedding planners can directly edit guest lists, RSVPs, and wedding details without needing:
- A database administration tool
- SQL knowledge
- A separate admin dashboard
- Technical deployment of database infrastructure

This trade-off accepts higher latency (HTTP requests vs. local DB) in exchange for accessibility.

### Disk-Based Caching (SQLite)

The app uses SQLite (via `node:sqlite`) for disk-based caching between Google Sheets API calls for two reasons:

1. **Rate Limiting**: Google Sheets API has quota limits (typically 100 requests/100 seconds per project). Disk caching amortizes API calls across requests.

2. **Latency Reduction**: Each Sheets API call involves HTTP round-trip latency. Caching recent responses significantly improves response times for repeat visitors.

The cache uses a time-to-live (TTL) strategy:
- Default TTL: 60 seconds
- If cache is fresh → serve from SQLite
- If cache is stale → fetch from Sheets, update cache
- On fetch error → gracefully degrade to stale cache

This architecture prioritizes reliability over freshness. The wedding invitation use case doesn't require real-time data—it's acceptable for the dashboard to be delayed by up to 60 seconds.

### Invite Token Security

Invite URLs contain a HMAC-SHA256 signature of the guest name, generated using `INVITE_TOKEN_SECRET`. This prevents enumeration attacks—guests can only access their own invitation page if they have the correct token.