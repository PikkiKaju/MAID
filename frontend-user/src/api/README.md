# API Services

Ten folder zawiera serwisy do komunikacji z backendem API.

## Pliki

- **axiosConfig.ts** - Konfiguracja instancji Axios z podstawowymi ustawieniami (baseURL, headers)
- **datasetService.ts** - Serwis do zarządzania zbiorami danych (upload CSV, upload photo, pobieranie listy, szczegóły)
- **networkGraphService.ts** - Serwis do zarządzania grafami sieci neuronowych
- **profileService.ts** - Serwis do zarządzania profilem użytkownika:
  - Pobieranie danych profilu (GET `/Profile/profile`)
  - Aktualizacja profilu (PUT `/Profile/profile`)
  - Usuwanie profilu (DELETE `/Profile/profile`)
  - Pobieranie dostępnych avatarów (GET `/Profile/avatar`)
  - Aktualizacja avatara (PUT `/Profile/avatar`)

