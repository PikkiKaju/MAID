import { Filter, TextInput } from "react-admin";

const ProjectFilter = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search by ID" source="id" />
    <TextInput label="Search by Name" source="name" />
  </Filter>
);

export default ProjectFilter;
