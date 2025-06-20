import { List, Datagrid, TextField } from "react-admin";
import UserFilter from "./UserFilter";

export const UserList = () => (
  <List filters={<UserFilter />}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="username" />
    </Datagrid>
  </List>
);
