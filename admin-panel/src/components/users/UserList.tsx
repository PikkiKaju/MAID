import {
  List,
  Datagrid,
  TextField,
  FunctionField,
  ShowButton,
} from "react-admin";
import { Box, Chip, Avatar } from "@mui/material";
import { Person, Block, AdminPanelSettings } from "@mui/icons-material";
import UserFilter from "./UserFilter";
import BlockUserButton from "./BlockUserButton";

const RoleChip = ({ role }: { role: string }) => {
  if (role === "Admin") {
    return (
      <Chip
        icon={<AdminPanelSettings fontSize="small" />}
        label={role}
        color="primary"
        size="small"
        sx={{ fontWeight: 500 }}
      />
    );
  }
  return (
    <Chip
      icon={<Person fontSize="small" />}
      label={role}
      color="default"
      size="small"
      sx={{ fontWeight: 500 }}
    />
  );
};

const StatusChip = ({ isBlocked }: { isBlocked: boolean }) => (
  <Chip
    icon={isBlocked ? <Block /> : <Person />}
    label={isBlocked ? "Zablokowany" : "Aktywny"}
    color={isBlocked ? "error" : "success"}
    size="small"
    sx={{ fontWeight: 500 }}
  />
);

export const UserList = () => (
  <List
    filters={<UserFilter />}
    sx={(theme) => ({
      "& .RaList-content": {
        backgroundColor:
          theme.palette.mode === "dark"
            ? "rgba(30, 30, 30, 0.9)"
            : "rgba(255, 255, 255, 0.9)",
        borderRadius: 2,
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 2px 8px rgba(0,0,0,0.5)"
            : "0 2px 8px rgba(0,0,0,0.1)",
        margin: 2,
      },
    })}
  >
    <Datagrid
      rowClick="edit"
      sx={(theme) => ({
        "& .RaDatagrid-row": {
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "dark"
                ? "rgba(144, 202, 249, 0.08)"
                : "rgba(25, 118, 210, 0.04)",
          },
        },
        "& .RaDatagrid-headerCell": {
          backgroundColor:
            theme.palette.mode === "dark"
              ? "rgba(144, 202, 249, 0.15)"
              : "rgba(25, 118, 210, 0.08)",
          fontWeight: 600,
        },
      })}
    >
      <FunctionField
        label="ID"
        render={(record: any) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
              {record.username?.[0]?.toUpperCase() || "#"}
            </Avatar>
            <TextField source="id" />
          </Box>
        )}
      />
      <TextField source="username" sx={{ fontWeight: 500 }} />
      <FunctionField
        label="Rola"
        render={(record: any) => <RoleChip role={record.role} />}
      />
      <FunctionField
        label="Status"
        render={(record: any) => <StatusChip isBlocked={record.isBlocked} />}
      />
      <FunctionField
        label="Akcje"
        render={(record: any) => (
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <BlockUserButton userId={record.id} />
            <ShowButton
              record={record}
              sx={{
                "& .RaButton-icon": {
                  fontSize: "1rem",
                },
                minWidth: 100,
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 500,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                "&:hover": {
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  transform: "translateY(-1px)",
                  transition: "all 0.2s",
                },
              }}
            />
          </Box>
        )}
      />
    </Datagrid>
  </List>
);
