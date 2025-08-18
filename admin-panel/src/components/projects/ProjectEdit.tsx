import { Edit, SimpleForm, TextInput } from "react-admin";

function ProjectEdit(props: any) {
  return (
    <Edit {...props}>
      <SimpleForm>
        <TextInput source="id" disabled />
        <TextInput source="name" disabled />
      </SimpleForm>
    </Edit>
  );
}

export default ProjectEdit;
