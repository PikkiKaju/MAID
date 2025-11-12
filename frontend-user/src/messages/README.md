# Translation Messages

Ten folder zawiera pliki JSON z tłumaczeniami dla różnych języków.

## Pliki

- **pl.json** - Tłumaczenia polskie
- **en.json** - Tłumaczenia angielskie

## Struktura

Tłumaczenia są zorganizowane według sekcji:

- `common` - Wspólne teksty (przyciski, etykiety)
- `header` - Teksty nagłówka
- `sidebar` - Teksty sidebaru
- `auth` - Teksty autoryzacji (logowanie, rejestracja)
- `home` - Teksty strony głównej
- `projects` - Teksty związane z projektami
- `datasets` - Teksty związane ze zbiorami danych
- `profile` - Teksty profilu użytkownika
- `language` - Teksty przełącznika języka

## Użycie

Tłumaczenia są używane przez i18next i dostępne w komponentach przez `t("klucz.sekcji")`.
