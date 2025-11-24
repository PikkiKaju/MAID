# Admin Panel

Panel administracyjny aplikacji zbudowany z użyciem React Admin i Material-UI.

## Technologie

- **React** - Biblioteka do budowy interfejsów użytkownika
- **React Admin** - Framework do tworzenia paneli administracyjnych
- **Material-UI (MUI)** - Biblioteka komponentów UI
- **TypeScript** - Typowany JavaScript
- **Vite** - Narzędzie do budowania aplikacji

## Struktura

### `/src/components`

Komponenty React Admin do zarządzania zasobami:

- **datasets/** - Zarządzanie zbiorami danych
- **projects/** - Zarządzanie projektami
- **users/** - Zarządzanie użytkownikami

### `/src/api`

Klienty API do komunikacji z backendem.

### `/src/layout`

Komponenty układu aplikacji (menu, nagłówek, sidebar).

### `/src/authProvider.ts`

Provider autoryzacji dla React Admin.

## Funkcjonalność

Panel administracyjny umożliwia:

- Zarządzanie użytkownikami (lista, edycja, blokowanie, nadawanie uprawnień)
- Zarządzanie projektami (lista, edycja, zmiana widoczności)
- Zarządzanie zbiorami danych (lista, edycja, zmiana widoczności)
- Filtrowanie i wyszukiwanie zasobów
- Wyświetlanie szczegółowych informacji o zasobach

## Uruchomienie

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
