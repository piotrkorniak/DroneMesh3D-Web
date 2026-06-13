# DroneMesh3D Web

Frontend Angular do aplikacji DroneMesh3D — planowanie tras lotów dronów z interaktywną mapą, definiowaniem obszarów i generowaniem plików misji.

## Wymagania

- Node.js 22+
- npm 10+
- Chrome/Chromium (do testów headless)

## Start

```bash
npm install
npm start
```

Aplikacja pod `http://localhost:4200/`. Requesty `/api` są proxy'owane do backendu (`localhost:5000`).

## Skrypty

| Skrypt                 | Opis                                |
| ---------------------- | ----------------------------------- |
| `npm start`            | Dev server z proxy do API           |
| `npm run build`        | Build produkcyjny                   |
| `npm run test`         | Testy jednostkowe (Karma + Jasmine) |
| `npm run lint`         | Sprawdzenie ESLint                  |
| `npm run format`       | Formatowanie Prettierem             |
| `npm run format:check` | Weryfikacja formatowania            |
| `npm run api:generate` | Regeneracja klienta API z OpenAPI   |

## Generowanie klienta API

Typowany klient HTTP jest generowany z OpenAPI spec backendu:

```bash
# Backend musi działać na localhost:5000
npm run api:generate
```

Wygenerowane pliki w `src/app/api/` — wyłączone z formatowania Prettier.

## Docker

### Produkcja

```bash
docker build -t dronemesh3d-web .
```

Multi-stage build (Node → Nginx). Nginx obsługuje SPA routing i proxy `/api/` do backendu.

### Development (Docker Compose)

```bash
docker compose up
```

Kontener dev serwuje Angular z hot-reload i proxy'uje `/api` do serwisu `api`.

## Git Hooks

Konfigurowane automatycznie przez `npm install` (ustawia `core.hooksPath` na `hooks/`):

- **pre-commit**: Auto-format staged plików Prettierem + lint ESLint
- **pre-push**: Build produkcyjny + testy (łapie problemy przed CI)

## Struktura projektu

```
src/
├── app/
│   ├── api/            # Auto-generowany klient API (OpenAPI)
│   ├── components/     # Komponenty UI (mapa, panele, dialogi)
│   ├── directives/     # Dyrektywy (focus trap, nawigacja klawiaturą)
│   ├── models/         # Interfejsy TypeScript
│   ├── pipes/          # Custom pipes
│   ├── services/       # Logika biznesowa
│   └── utils/          # Funkcje pomocnicze
├── styles/             # Globalne SCSS (tokeny, accessibility, responsive)
└── index.html
```

## Stack

- Angular 21
- OpenLayers (mapy)
- RxJS
- Karma + Jasmine + fast-check (property-based testing)
- ESLint + Prettier
- Docker + Nginx
