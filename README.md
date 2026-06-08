# DroneMesh3D Web

Angular frontend for DroneMesh3D — a drone flight path planning application with interactive map-based area definition and mission file generation.

## Prerequisites

- Node.js 22+
- npm 10+
- Chrome/Chromium (for headless tests)

## Getting Started

```bash
npm install
npm start
```

Open `http://localhost:4200/`. The app proxies `/api` requests to `http://localhost:5000` (the .NET backend).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start dev server with API proxy |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (Karma + Jasmine) |
| `npm run lint` | ESLint check |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Verify formatting |
| `npm run api:generate` | Regenerate API client from OpenAPI spec |

## API Client Generation

The typed Angular HTTP client is auto-generated from the backend's OpenAPI spec:

```bash
# Ensure the API is running on localhost:5000
npm run api:generate
```

Generated files live in `src/app/api/` and are excluded from Prettier formatting.

## Docker

### Production

```bash
docker build -t dronemesh3d-web .
```

Uses multi-stage build (Node → Nginx). The Nginx config handles SPA routing and proxies `/api/` to the backend service.

### Development (Docker Compose)

```bash
docker compose up
```

The dev container serves Angular with hot-reload and proxies API calls to the `api` service.

## Git Hooks

Hooks are auto-configured via `npm install` (sets `core.hooksPath` to `hooks/`):

- **pre-commit**: Auto-formats staged files with Prettier, then lints TS/HTML with ESLint
- **pre-push**: Runs production build + tests to catch issues before CI

## Project Structure

```
src/
├── app/
│   ├── api/            # Auto-generated API client (OpenAPI)
│   ├── components/     # UI components (map, panels, dialogs)
│   ├── directives/     # Custom directives (focus trap, keyboard nav)
│   ├── models/         # TypeScript interfaces
│   ├── pipes/          # Custom pipes
│   ├── services/       # Business logic services
│   └── utils/          # Utility functions
├── styles/             # Global SCSS (tokens, accessibility, responsive)
└── index.html
```

## Tech Stack

- Angular 21
- OpenLayers (interactive maps)
- RxJS
- Karma + Jasmine + fast-check (property-based testing)
- ESLint + Prettier
- Docker + Nginx
