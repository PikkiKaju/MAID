# Features (Redux)

Ten folder zawiera logikę Redux zorganizowaną według funkcjonalności (feature-based structure).

## Struktura

Każdy feature zawiera:

- **Slice** (`*Slice.ts`) - Redux slice z reducerami i akcjami synchronicznymi
- **Thunks** (`*Thunks.ts`) - Asynchroniczne akcje (API calls)

### `/auth`

Zarządzanie autoryzacją użytkownika:

- **authSlice.ts** - Stan autoryzacji (token, displayName, isLoggedIn, status, error)
- **loginThunks.ts** - Logowanie użytkownika
- **registerThunks.ts** - Rejestracja użytkownika z obsługą błędów (w tym "User already exists")

### `/dataset`

Zarządzanie zbiorami danych:

- **datasetSlice.ts** - Stan zbiorów danych
- **datasetThunks.ts** - Operacje na zbiorach danych (upload, pobieranie, usuwanie)

### `/project`

Zarządzanie projektami:

- **projectSlice.ts** - Stan projektów
- **projectThunks.ts** - Operacje na projektach (tworzenie, pobieranie, aktualizacja, usuwanie)

### `/search`

Zarządzanie wyszukiwaniem:

- **searchSlice.ts** - Stan wyszukiwania (term, results)
