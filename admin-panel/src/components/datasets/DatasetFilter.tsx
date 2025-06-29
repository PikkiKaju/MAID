import { Filter, TextInput } from "react-admin";

const DatasetFilter = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search by ID" source="id" />
    <TextInput label="Search by Name" source="name" />
    <TextInput label="Search by Username" source="username" />
  </Filter>
);

export default DatasetFilter;
