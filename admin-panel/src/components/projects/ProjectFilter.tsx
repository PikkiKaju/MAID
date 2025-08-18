import { Filter, TextInput } from "react-admin";

const ProjectFilter = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search by ID" source="id" />
    <TextInput label="Search by Name" source="name" />
    <TextInput label="Search by Username" source="username" />
    <TextInput label="Search by Created At" source="createdAt" />
  </Filter>
);

export default ProjectFilter;
