import {
  List,
  Datagrid,
  TextField,
  FunctionField,
  ShowButton,
  DeleteButton,
  DateField,
} from "react-admin";
import { Box, Chip, Avatar } from "@mui/material";
import { Folder, Public, Lock, Person } from "@mui/icons-material";
import ProjectFilter from "./ProjectFilter";

const PublicChip = ({ isPublic }: { isPublic: boolean }) => (
  <Chip
    icon={isPublic ? <Public fontSize="small" /> : <Lock fontSize="small" />}
    label={isPublic ? "Publiczny" : "Prywatny"}
    color={isPublic ? "success" : "default"}
    size="small"
    sx={{ fontWeight: 500 }}
  />
);

export const ProjectList = () => (
  <List
    filters={<ProjectFilter />}
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
        render={() => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
              <Folder fontSize="small" />
            </Avatar>
            <TextField source="id" />
          </Box>
        )}
      />
      <TextField source="name" sx={{ fontWeight: 500 }} />
      <FunctionField
        label="Właściciel"
        render={() => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Person fontSize="small" color="action" />
            <TextField source="username" />
          </Box>
        )}
      />
      <DateField
        source="createdAt"
        label="Data utworzenia"
        showTime
        sx={{ color: "text.secondary" }}
      />
      <FunctionField
        label="Typ"
        render={(record: any) => <PublicChip isPublic={record.isPublic} />}
      />
      <FunctionField
        label="Akcje"
        render={(record: any) => (
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
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
            <DeleteButton
              record={record}
              mutationMode="pessimistic"
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
