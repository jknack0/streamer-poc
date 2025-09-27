# Jungle Champ Select

Real-time poll board for picking League of Legends jungle champions. The project is split into a Vite-powered React client and an Express + SQLite API with Socket.IO for live updates.

## Project Structure

- `client/` – React 19 + TypeScript front-end. Users can create polls, share links, and see top votes update in real time.
- `api/` – Express server backed by SQLite (via better-sqlite3). Exposes REST endpoints for polls and votes, and a Socket.IO server for live status/vote streams.

## Tech Stack

### Front-end
- React 19 with TypeScript
- Vite build tool
- Socket.IO client for realtime updates
- CSS modules (plain CSS files scoped by classnames)

### Back-end
- Node.js + Express 4
- SQLite database using better-sqlite3
- Socket.IO server for realtime communication
- Migration-less bootstrap SQL (first-run migration is executed automatically)

## Environment Variables

### API (`api/`)
Create a `.env` file or set variables before starting the server.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port for the API | `3000` |
| `DATABASE_PATH` | Absolute/relative path to the SQLite database file | `api/data/polls.sqlite` |
| `CLIENT_ORIGIN` | Allowed origin for REST & sockets in production | _not set_ (disabled) |
| `DEV_CLIENT_ORIGIN` | Allowed origin for dev CORS if `CLIENT_ORIGIN` missing | `http://localhost:5173` |
| `NODE_ENV` | Set to `production` to disable dev CORS defaults | _not set_ |

### Client (`client/`)
Create a `.env` file at the repo root or under `client/` with the `VITE_` prefix.

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL for REST requests | `http://localhost:3000` |
| `VITE_SOCKET_URL` | Socket.IO endpoint; falls back to `VITE_API_URL` | same as `VITE_API_URL` |

## Getting Started

### 1. Install Dependencies

```bash
cd api
npm install

cd ../client
npm install
```

### 2. Run API (dev)

```bash
cd api
npm start
```

The API listens on `PORT` (defaults to `3000`) and creates `data/polls.sqlite` if missing.

### 3. Run Client (dev)

```bash
cd client
npm run dev
```

Vite serves the client at `http://localhost:5173`. The client expects the API to run at `http://localhost:3000` unless you override `VITE_API_URL`.

## API Overview

All endpoints live under the API root (default `http://localhost:3000`). JSON payloads only.

### `POST /polls`
Creates a poll.

```json
{
  "id": "optional-custom-id",
  "status": "idle" // optional, defaults to idle
}
```

Response `201`:
```json
{
  "id": "...",
  "status": "idle",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `GET /polls/:id`
Returns poll metadata. `404` if not found.

### `POST /polls/:id/status`
Updates poll status (`idle` | `active` | `stopped`). Broadcasts via sockets.

```json
{
  "status": "active"
}
```

Response: poll object; `404` if missing.

### `POST /polls/:id/votes`
Records a vote.

```json
{
  "championSlug": "lee-sin",
  "voterId": "optional-client-id"
}
```

Response `201`:
```json
{
  "poll": { ... },
  "votes": [ ...raw votes... ],
  "topVotes": [{ "championSlug": "", "count": 3 }, ...],
  "totalVotes": 12
}
```
Broadcasts updated standings via sockets.

### `GET /polls/:id/votes`
Returns all votes plus summary (top three and total).

### `DELETE /polls/:id/votes`
Clears votes for the poll (admin restart). Emits empty standings.

## Socket Events

Namespace: same origin as REST.

- Client emit `poll:join` with poll ID to start receiving updates.
- Client emit `poll:leave` to stop listening.
- Server emits:
  - `poll:update` `{ poll }`
  - `poll:status` `{ pollId, status }`
  - `poll:votes` `{ pollId, topVotes, totalVotes }`
  - `poll:error` `{ pollId, error }`

## Development Notes

- Admin rights are stored in localStorage when a poll is created.
- Voter IDs also live in localStorage per poll to prevent duplicate submissions.
- Restart deletes all votes, reactivates the poll, and triggers a new version key to reset client state.
- For more strict auth, introduce signed tokens/headers and use them in both REST and socket connections.

## Database

SQLite file created at `api/data/polls.sqlite`. The API auto-runs migrations on boot:

- `polls` table with status and timestamps
- `poll_votes` table with optional `voter_id`, champion slug, timestamps
- `migrations` table tracks applied SQL files

Add new migrations under `api/db/migrations/*.sql` and they’ll run automatically.

## Production Considerations

- Set `CLIENT_ORIGIN` to the deployed client URL to lock CORS.
- Provision persistent storage for `DATABASE_PATH`.
- Serve the client statically (e.g., from Vite build output) and update `VITE_API_URL`/`VITE_SOCKET_URL` accordingly.
- Add rate limiting and auth if polls need to be private.

Enjoy locking in your jungler!
