# Router

Ten folder zawiera konfigurację routingu aplikacji.

## Pliki

- **router.tsx** - Konfiguracja React Router z wszystkimi trasami:
  - Publiczne trasy: `/`, `/login`, `/register`
  - Chronione trasy: `/projects/:id` (wymaga autoryzacji)
  - Trasy w layout: `/projects`, `/datasets-regresja`, `/profile`, `/settings`, `/help-support`, `/canvas`
  - 404 handler

## Użycie

Router jest inicjalizowany w `main.tsx` i zarządza nawigacją w całej aplikacji.
