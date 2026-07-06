# Muscle Tracker

Mobile-first React app for running a fixed bodybuilding program in the gym.

## Features

- 9-week Pure Bodybuilding Upper/Lower program
- Workout history saved on the VPS in a JSON file
- Active workout continuation
- Per-set weight, reps, RPE, completion, and notes
- Exercise rest timers
- Exercise substitutions for the current session
- Previous-performance lookup
- Exercise notes and YouTube demo links
- JSON export/import/reset in Settings

## Local Development

```bash
pnpm install
pnpm run dev:api
```

In another terminal:

```bash
pnpm run dev --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173/
```

## Production Build

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm start
```

The Node server serves the built React app from `dist/` and exposes the persistence API at `/api/data`.

## VPS Deployment: Docker

Build and run:

```bash
docker compose up -d --build
```

The app will be served on port `8080` by default:

```text
http://YOUR_SERVER_IP:8080
```

Change the host port in `docker-compose.yml` if needed.

## Data Storage

The app does not use browser `localStorage` for workout data.

Data is stored on the VPS by `server.mjs` in:

```text
/data/muscle-tracker.json
```

With Docker Compose, `/data` is backed by the named volume:

```text
muscle-tracker-data
```

There is no login, payment, or cloud sync.
