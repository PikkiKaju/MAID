import { Edit, SimpleForm, TextInput } from "react-admin";

function UserEdit(props: any) {
  return (
    <Edit {...props}>
      <SimpleForm>
        <TextInput source="id" disabled />
        <TextInput source="username" disabled />
      </SimpleForm>
    </Edit>
  );
}

export default UserEdit;
