# Models (TypeScript Interfaces)

Ten folder zawiera definicje typów TypeScript i interfejsów używanych w całej aplikacji.

## Pliki

- **auth.ts** - Typy związane z autoryzacją:

  - `AuthState` - Stan autoryzacji w Redux
  - `AuthResponse` - Odpowiedź z API po logowaniu/rejestracji
  - `LoginPayload`, `RegisterPayload` - Dane do wysłania do API
  - `RegisterUserForm` - Formularz rejestracji

- **profile.ts** - Typy związane z profilem użytkownika:

  - `ProfileStats` - Statystyki profilu (projekty, zbiory danych)
  - `PersonalInfo` - Informacje osobiste
  - `SecurityData` - Dane bezpieczeństwa (hasła)
  - `ProfileData` - Pełne dane profilu z API
  - `FAQItem` - Element FAQ

- **project.ts** - Typy związane z projektami

- **dataset.ts** / **dataset.tsx** - Typy związane ze zbiorami danych

- **search.ts** - Typy związane z wyszukiwaniem

## Użycie

Wszystkie modele są eksportowane i używane w komponentach, serwisach API i Redux slices/thunks.
