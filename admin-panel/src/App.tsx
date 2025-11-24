import { Admin, Resource } from "react-admin";

import { dataProvider } from "./api/dataProvider";
import authProvider from "./authProvider";
import { lightTheme, darkTheme } from "./theme";

import { UserList, UserEdit } from "./components/users";
import { ProjectList, ProjectEdit } from "./components/projects";
import { DatasetList, DatasetEdit } from "./components/datasets";
import CustomLayout from "./layout/CustomLayout";
import CustomLoginPage from "./layout/CustomLoginPage";

// Synchronizuj z localStorage react-admin's theme
const REACT_ADMIN_THEME_KEY = "theme";
const MAID_ADMIN_THEME_KEY = "maid-admin-theme";

// Sync theme keys
const savedReactAdminTheme = localStorage.getItem(REACT_ADMIN_THEME_KEY);
const savedMaidTheme = localStorage.getItem(MAID_ADMIN_THEME_KEY);

if (savedMaidTheme && !savedReactAdminTheme) {
  // Migracja z naszego klucza do klucza react-admin
  localStorage.setItem(REACT_ADMIN_THEME_KEY, savedMaidTheme);
} else if (savedReactAdminTheme && !savedMaidTheme) {
  // Sync w drugą stronę
  localStorage.setItem(MAID_ADMIN_THEME_KEY, savedReactAdminTheme);
}

function App() {
  return (
    <Admin
      authProvider={authProvider}
      dataProvider={dataProvider}
      layout={CustomLayout}
      loginPage={CustomLoginPage}
      theme={lightTheme}
      darkTheme={darkTheme}
    >
      <Resource name="users" list={UserList} edit={UserEdit} />
      <Resource name="projects" list={ProjectList} edit={ProjectEdit} />
      <Resource name="datasets" list={DatasetList} edit={DatasetEdit} />
    </Admin>
  );
}

export default App;
