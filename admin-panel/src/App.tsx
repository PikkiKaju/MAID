import { Admin, Resource } from "react-admin";
import { dataProvider } from "./dataProvider";
import { UserList } from "./users/UserList";
import { ProjectList } from "./projects/ProjectList";
import { DatasetList } from "./datasets/DatasetList";

function App() {
  return (
    <Admin dataProvider={dataProvider}>
      <Resource name="users" list={UserList} />
      <Resource name="projects" list={ProjectList} />
      <Resource name="datasets" list={DatasetList} />
    </Admin>
  );
}

export default App;
