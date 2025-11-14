import {
  Edit,
  SimpleForm,
  TextInput,
  DateField,
  BooleanField,
  useRecordContext,
} from "react-admin";
import { Box, Paper, Typography, Divider, Avatar, Chip } from "@mui/material";
import {
  Folder,
  Public,
  Lock,
  Person,
  CalendarToday,
} from "@mui/icons-material";

const ProjectEditHeader = () => {
  const record = useRecordContext();
  if (!record) return null;

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(30, 30, 30, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: "secondary.main",
          }}
        >
          <Folder fontSize="large" />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={600}>
            {record.name || "Projekt"}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Chip
              icon={
                record.isPublic ? (
                  <Public fontSize="small" />
                ) : (
                  <Lock fontSize="small" />
                )
              }
              label={record.isPublic ? "Publiczny" : "Prywatny"}
              color={record.isPublic ? "success" : "default"}
              size="small"
            />
            {record.username && (
              <Chip
                icon={<Person fontSize="small" />}
                label={`Właściciel: ${record.username}`}
                size="small"
                variant="outlined"
              />
            )}
            {record.createdAt && (
              <Chip
                icon={<CalendarToday fontSize="small" />}
                label={`Utworzono: ${new Date(
                  record.createdAt
                ).toLocaleDateString()}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </Box>
      <Divider />
    </Paper>
  );
};

function ProjectEdit(props: any) {
  return (
    <Edit
      {...props}
      sx={{
        "& .RaEdit-main": {
          backgroundColor: "transparent",
        },
      }}
    >
      <SimpleForm
        sx={{
          "& .RaSimpleForm-content": {
            backgroundColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(30, 30, 30, 0.9)"
                : "rgba(255, 255, 255, 0.9)",
            borderRadius: 2,
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 2px 8px rgba(0,0,0,0.5)"
                : "0 2px 8px rgba(0,0,0,0.1)",
            p: 3,
          },
        }}
      >
        <ProjectEditHeader />
        <TextInput source="id" disabled fullWidth />
        <TextInput source="name" disabled fullWidth />
        <TextInput source="username" disabled fullWidth label="Właściciel" />
        <DateField source="createdAt" label="Data utworzenia" showTime />
        <BooleanField source="isPublic" label="Publiczny" />
      </SimpleForm>
    </Edit>
  );
}

export default ProjectEdit;
