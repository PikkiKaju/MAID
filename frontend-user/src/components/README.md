# Components

Ten folder zawiera wszystkie komponenty React używane w aplikacji.

## Struktura

### Główne komponenty

- **Header.tsx** - Główny nagłówek aplikacji z wyszukiwarką, przełącznikiem języka, motywu i menu użytkownika
- **Sidebar.tsx** - Boczny panel nawigacyjny z linkami do głównych sekcji
- **PrivateRoute.tsx** - Komponent do ochrony tras wymagających autoryzacji

### Podfoldery

#### `/canvas`

Komponenty związane z wizualizacją i edycją modeli sieci neuronowych:

- ModelCanvas, LayerNode, LayerPalette, LayerInspector, TopToolbar, RemovableEdge

#### `/datasets`

Komponenty do zarządzania zbiorami danych:

- UploadArea, UploadDatasetDialog, DatasetDetailsDialog, AttachedDatasets, PublicDatasetsSection, HeaderDatasets, Tips

#### `/forms`

Formularze autoryzacji:

- LoginForm, RegisterForm

#### `/home`

Komponenty strony głównej:

- RecentSection, TrendingSection, FavoritesSection, CategorySection, CategoryGrid, SearchResultsSection

#### `/image`

Komponenty do obsługi obrazów:

- ImageWithFallback

#### `/language`

Komponenty do przełączania języka:

- LanguageSwitcher

#### `/profile`

Komponenty profilu użytkownika:

- ProfileOverview, PersonalInfoForm, SecurityForm, DangerZoneCard, AvatarPicker, StatsGrid, AchievementsGrid, SkillsList, RecentActivity, NotificationsCard
- `/Help` - Komponenty pomocy: FAQList, QuickActions, SearchBar, ContactAndResources

#### `/projects`

Komponenty do zarządzania projektami:

- ProjectsGrid, ProjectCard, CreateProjectWindow, DeleteConfirmationDialog, FiltersAndSearch, EmptyState, HeaderProfile

#### `/theme`

Komponenty do zarządzania motywem:

- ThemeProvider, ThemeToggle

#### `/header`

Komponenty nagłówka:

- ProfileDropdown - Menu rozwijane z profilem użytkownika

#### `/project-edit`

Komponenty do edycji projektów:

- ProjectEditSidebar - Boczny panel z formularzem edycji projektu
- ProjectEditTopbar - Górny pasek narzędzi w edytorze projektu
- AlgorithmSelect - Wybór algorytmu uczenia maszynowego
- DatasetSelect - Wybór zbioru danych
- ColumnSelect - Wybór kolumn z zbioru danych
- ParameterInputs - Pola do wprowadzania parametrów algorytmu
- StatusSelect - Wybór statusu projektu
- PublicCheckbox - Checkbox do ustawienia projektu jako publiczny
- CalculationResults - Wyświetlanie wyników obliczeń

#### `/toast`

Komponenty do wyświetlania powiadomień:

- ToastProvider - Provider kontekstu do zarządzania powiadomieniami toast
