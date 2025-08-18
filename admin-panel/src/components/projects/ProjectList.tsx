import { List, Datagrid, TextField } from "react-admin";
import ProjectFilter from "./ProjectFilter";

export const ProjectList = () => (
  <List filters={<ProjectFilter />}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="username" />
      <TextField source="createdAt" />
      <TextField source="isPublic" />
    </Datagrid>
  </List>
);
