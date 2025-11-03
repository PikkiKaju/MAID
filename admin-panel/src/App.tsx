import { Admin, Resource } from "react-admin";

import { dataProvider } from "./api/dataProvider";
import authProvider from "./authProvider";

import { UserList } from "./components/users";
import { ProjectList, ProjectEdit } from "./components/projects";
import { DatasetList, DatasetEdit } from "./components/datasets";
import CustomLayout from "./layout/CustomLayout";
import CustomLoginPage from "./layout/CustomLoginPage";

function App() {
  return (
    <Admin
      authProvider={authProvider}
      dataProvider={dataProvider}
      layout={CustomLayout}
      loginPage={CustomLoginPage}
    >
      <Resource name="users" list={UserList} />
      <Resource name="projects" list={ProjectList} edit={ProjectEdit} />
      <Resource name="datasets" list={DatasetList} edit={DatasetEdit} />
    </Admin>
  );
}

export default App;
