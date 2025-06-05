import { Admin, Resource, ListGuesser, EditGuesser } from "react-admin";

const App = () => (
  <Admin>
    <Resource name="users" list={ListGuesser} edit={EditGuesser} />
    <Resource name="posts" list={ListGuesser} edit={EditGuesser} />
  </Admin>
);

export default App;
