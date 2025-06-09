// src/users/UserList.tsx
import { List, Datagrid, TextField } from "react-admin";

export const UserList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="username" />
    </Datagrid>
  </List>
);
