import { List, Datagrid, TextField } from "react-admin";
import DatasetFilter from "./DatasetFilter";

export const DatasetList = () => (
  <List filters={<DatasetFilter />}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="createdAt" />
      <TextField source="username" />
      <TextField source="isPublic" />
    </Datagrid>
  </List>
);
