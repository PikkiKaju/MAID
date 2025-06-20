import { Filter, TextInput } from "react-admin";

const UserFilter = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search by ID" source="id" />
    <TextInput label="Search by Username" source="username" />
  </Filter>
);

export default UserFilter;
