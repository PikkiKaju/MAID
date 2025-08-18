import { Admin, Resource } from "react-admin";

import { dataProvider } from "./api/dataProvider";
import authProvider from "./authProvider";

import { UserList } from "./components/users";
import { ProjectList, ProjectEdit } from "./components/projects";
import { DatasetList, DatasetEdit } from "./components/datasets";

function App() {
  return (
    <Admin authProvider={authProvider} dataProvider={dataProvider}>
      <Resource name="users" list={UserList} />
      <Resource name="projects" list={ProjectList} edit={ProjectEdit} />
      <Resource name="datasets" list={DatasetList} edit={DatasetEdit} />
    </Admin>
  );
}

export default App;
