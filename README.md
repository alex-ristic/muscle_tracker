# Muscle Tracker

Mobile-first React app for running a fixed bodybuilding program in the gym.

## Features

- 9-week Pure Bodybuilding Upper/Lower program
- Local workout history saved in `localStorage`
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
```

The static site is generated in `dist/`.

## VPS Deployment Option 1: Docker

Build and run:

```bash
docker compose up -d --build
```

The app will be served on port `8080` by default:

```text
http://YOUR_SERVER_IP:8080
```

Change the host port in `docker-compose.yml` if needed.

## VPS Deployment Option 2: Static Files

```bash
pnpm install --frozen-lockfile
pnpm run build
```

Serve the `dist/` directory with Nginx/Caddy/Apache. For single-page-app fallback, route unknown paths to `index.html`.

## Data Storage

This app uses browser `localStorage` only. There is no backend, login, payment, or cloud sync.
