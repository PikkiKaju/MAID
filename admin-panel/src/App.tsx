import { Admin, Resource } from "react-admin";

import { dataProvider } from "./api/dataProvider";
import authProvider from "./authProvider";

import { UserList } from "./components/users/UserList";
import { ProjectList } from "./components/projects/ProjectList";
import { DatasetList } from "./components/datasets/DatasetList";

function App() {
  return (
    <Admin authProvider={authProvider} dataProvider={dataProvider}>
      <Resource name="users" list={UserList} />
      <Resource name="projects" list={ProjectList} />
      <Resource name="datasets" list={DatasetList} />
    </Admin>
  );
}

export default App;
