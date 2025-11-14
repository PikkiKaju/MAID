# Auth Feature

Feature Redux do zarządzania autoryzacją użytkownika.

## Pliki

- **authSlice.ts** - Redux slice z:

  - Stanem: `token`, `displayName`, `isLoggedIn`, `status`, `error`
  - Reducerami: `login`, `logout`, `clearAuthStatus`, `loginFromStorage`
  - Extra reducers dla async thunks

- **loginThunks.ts** - Async thunk do logowania:

  - Wysyła żądanie POST do `/Auth/login`
  - Obsługuje błędy i zwraca odpowiednie komunikaty

- **registerThunks.ts** - Async thunk do rejestracji:
  - Wysyła żądanie POST do `/Auth/register`
  - Obsługuje błąd "User already exists" i zwraca specjalny klucz dla tłumaczeń
  - Obsługuje inne błędy rejestracji

## Funkcjonalność

Feature zarządza:

- Logowaniem i wylogowywaniem użytkownika
- Rejestracją nowych użytkowników
- Przechowywaniem tokena w localStorage
- Przywracaniem sesji po odświeżeniu strony
