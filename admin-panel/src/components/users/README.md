# User Components

Komponenty do zarządzania użytkownikami w panelu administracyjnym.

## Komponenty

- **UserList.tsx** - Lista wszystkich użytkowników z możliwością filtrowania i sortowania
- **UserEdit.tsx** - Formularz edycji użytkownika z możliwością zmiany roli i statusu
- **UserFilter.tsx** - Komponent filtrowania użytkowników (po roli, statusie, dacie rejestracji)
- **BlockUserButton.tsx** - Przycisk do blokowania/odblokowywania użytkowników
- **NewAdminForm.tsx** - Formularz do tworzenia nowego administratora
- **index.ts** - Eksport wszystkich komponentów

## Funkcjonalność

Komponenty umożliwiają:

- Przeglądanie listy wszystkich użytkowników w systemie
- Filtrowanie użytkowników po roli (Admin/User) i statusie (Aktywny/Zablokowany)
- Edycję danych użytkownika
- Zmianę roli użytkownika (nadawanie/odbieranie uprawnień administratora)
- Blokowanie i odblokowywanie użytkowników
- Tworzenie nowych kont administratorów

## Technologie

Komponenty wykorzystują React Admin do zarządzania danymi i Material-UI do stylizacji.
