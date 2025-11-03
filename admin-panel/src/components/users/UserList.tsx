import { List, Datagrid, TextField, FunctionField } from "react-admin";
import UserFilter from "./UserFilter";
import BlockUserButton from "./BlockUserButton";

export const UserList = () => (
  <>
    <List filters={<UserFilter />}>
      <Datagrid rowClick="edit">
        <TextField source="id" />
        <TextField source="username" />
        <TextField source="role" />
        <TextField source="isBlocked" />
        <FunctionField
          label="Akcje"
          render={(record) => <BlockUserButton userId={record.id} />}
        />
      </Datagrid>
    </List>
  </>
);
