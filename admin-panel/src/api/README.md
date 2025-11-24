# API

Moduł do komunikacji z backendem ASP.NET.

## Pliki

- **dataProvider.ts** - Data provider dla React Admin, implementujący interfejs DataProvider do zarządzania danymi (getList, getOne, create, update, delete)
- **httpClient.ts** - Klient HTTP do wykonywania zapytań do API z automatycznym dodawaniem tokenu autoryzacji

## Funkcjonalność

### dataProvider

Implementuje wszystkie operacje CRUD wymagane przez React Admin:

- `getList` - Pobieranie listy zasobów z filtrowaniem, sortowaniem i paginacją
- `getOne` - Pobieranie pojedynczego zasobu
- `create` - Tworzenie nowego zasobu
- `update` - Aktualizacja istniejącego zasobu
- `delete` - Usuwanie zasobu

### httpClient

- Automatyczne dodawanie tokenu autoryzacji z localStorage do nagłówków
- Konfiguracja URL API z zmiennych środowiskowych
- Obsługa błędów i odpowiedzi JSON

## Konfiguracja

Wymaga zmiennej środowiskowej `VITE_ASP_NET_BASE_URL` z adresem bazowym backendu ASP.NET.
