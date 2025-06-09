import { List, Datagrid, TextField } from "react-admin";

export const DatasetList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
    </Datagrid>
  </List>
);
