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
