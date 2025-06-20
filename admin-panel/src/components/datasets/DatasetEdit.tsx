import { Edit, SimpleForm, TextInput } from "react-admin";

function DatasetEdit(props: any) {
  return (
    <Edit {...props}>
      <SimpleForm>
        <TextInput source="id" disabled />
        <TextInput source="name" disabled />
      </SimpleForm>
    </Edit>
  );
}

export default DatasetEdit;
