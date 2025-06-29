import { Filter, TextInput } from "react-admin";

const UserFilter = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search by ID" source="id" />
    <TextInput label="Search by Username" source="username" />
    <TextInput label="Search by Role" source="role" />
    <TextInput label="Search by Blocked Status" source="isBlocked" />
  </Filter>
);

export default UserFilter;
