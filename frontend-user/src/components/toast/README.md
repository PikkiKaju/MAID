# Toast Components

Komponenty do wyświetlania powiadomień toast w aplikacji.

## Komponenty

- **ToastProvider.tsx** - Provider kontekstu React do zarządzania powiadomieniami toast

## Funkcjonalność

Komponent umożliwia:

- Wyświetlanie powiadomień typu success, error, info
- Automatyczne zarządzanie cyklem życia powiadomień
- Programowe wywoływanie powiadomień z dowolnego miejsca w aplikacji
- Integrację z komponentami UI do wyświetlania toastów

## Użycie

Komponent ToastProvider powinien być opakowany wokół głównej aplikacji, aby udostępnić funkcje showSuccess, showError, showInfo przez kontekst React.
