import { Admin, Resource } from "react-admin";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";

import { dataProvider } from "./api/dataProvider";
import authProvider from "./authProvider";
import { lightTheme, darkTheme } from "./theme";
import { useThemeMode } from "./contexts/ThemeContext";

import { UserList, UserEdit } from "./components/users";
import { ProjectList, ProjectEdit } from "./components/projects";
import { DatasetList, DatasetEdit } from "./components/datasets";
import CustomLayout from "./layout/CustomLayout";
import CustomLoginPage from "./layout/CustomLoginPage";

function App() {
  const { mode } = useThemeMode();
  const theme = mode === "dark" ? darkTheme : lightTheme;

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Admin
        authProvider={authProvider}
        dataProvider={dataProvider}
        layout={CustomLayout}
        loginPage={CustomLoginPage}
        theme={theme}
        darkTheme={darkTheme}
        lightTheme={lightTheme}
      >
        <Resource name="users" list={UserList} edit={UserEdit} />
        <Resource name="projects" list={ProjectList} edit={ProjectEdit} />
        <Resource name="datasets" list={DatasetList} edit={DatasetEdit} />
      </Admin>
    </MuiThemeProvider>
  );
}

export default App;
