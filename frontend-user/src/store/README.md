# Redux Store

Ten folder zawiera konfigurację Redux store i związane z nim narzędzia.

## Pliki

- **store.ts** - Główna konfiguracja Redux store:

  - Konfiguruje store z reducerami: auth, search, project, dataset
  - Eksportuje typy `RootState` i `AppDispatch`

- **hooks.ts** - Typowane hooki Redux:

  - `useAppDispatch` - Typowany dispatch hook
  - `useAppSelector` - Typowany selector hook

- **modelCanvasStore.ts** - Store dla modelu canvas (prawdopodobnie Zustand lub inny state manager)

## Użycie

Store jest inicjalizowany w `main.tsx` i dostępny w całej aplikacji przez Provider.
