import { Edit, SimpleForm, TextInput, useRecordContext } from "react-admin";
import { Box, Paper, Typography, Divider, Avatar, Chip } from "@mui/material";
import { Person, AdminPanelSettings, Block } from "@mui/icons-material";

const UserEditHeader = () => {
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
            bgcolor: "primary.main",
            fontSize: "1.5rem",
          }}
        >
          {record.username?.[0]?.toUpperCase() || "#"}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {record.username || "Użytkownik"}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Chip
              icon={
                record.role === "Admin" ? (
                  <AdminPanelSettings fontSize="small" />
                ) : (
                  <Person fontSize="small" />
                )
              }
              label={record.role || "User"}
              color={record.role === "Admin" ? "primary" : "default"}
              size="small"
            />
            <Chip
              icon={record.isBlocked ? <Block /> : <Person />}
              label={record.isBlocked ? "Zablokowany" : "Aktywny"}
              color={record.isBlocked ? "error" : "success"}
              size="small"
            />
          </Box>
        </Box>
      </Box>
      <Divider />
    </Paper>
  );
};

function UserEdit(props: any) {
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
        <UserEditHeader />
        <TextInput source="id" disabled fullWidth />
        <TextInput source="username" disabled fullWidth />
        <TextInput source="role" disabled fullWidth />
      </SimpleForm>
    </Edit>
  );
}

export default UserEdit;
