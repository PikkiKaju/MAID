# Dataset Feature

Feature Redux do zarządzania zbiorami danych.

## Pliki

- **datasetSlice.ts** - Redux slice ze stanem zbiorów danych
- **datasetThunks.ts** - Async thunks do operacji na zbiorach danych:
  - Upload CSV
  - Upload photo
  - Pobieranie listy zbiorów danych
  - Pobieranie szczegółów zbioru danych
  - Usuwanie zbioru danych

## Funkcjonalność

Feature zarządza:

- Stanem zbiorów danych użytkownika
- Operacjami CRUD na zbiorach danych
- Synchronizacją z backendem API
