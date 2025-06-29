import { List, Datagrid, TextField, FunctionField } from "react-admin";
import UserFilter from "./UserFilter";
import BlockUserButton from "./BlockUserButton";
import NewAdminForm from "./NewAdminForm";

export const UserList = () => (
  <>
    <NewAdminForm />
    <List filters={<UserFilter />}>
      <Datagrid rowClick="edit">
        <TextField source="id" />
        <TextField source="username" />
        <FunctionField
          label="Akcje"
          render={(record) => <BlockUserButton userId={record.id} />}
        />
      </Datagrid>
    </List>
  </>
);
