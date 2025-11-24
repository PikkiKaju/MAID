import React from "react";
import {
  AppBar,
  TitlePortal,
  UserMenu,
  Logout,
  ToggleThemeButton,
  RefreshButton,
} from "react-admin";
import { MenuItem, ListItemIcon, ListItemText, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/PersonAdd";
import AddAdminDialog from "./AddAdminDialog";

const AddAdminMenuItem = ({ onClick }: { onClick: () => void }) => (
  <MenuItem onClick={onClick}>
    <ListItemIcon>
      <AddIcon fontSize="small" />
    </ListItemIcon>
    <ListItemText>Dodaj admina</ListItemText>
  </MenuItem>
);

export default function CustomAppBar() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <AppBar
        userMenu={
          <UserMenu>
            <AddAdminMenuItem onClick={() => setOpen(true)} />
            <Logout />
          </UserMenu>
        }
        toolbar={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <RefreshButton />
            <ToggleThemeButton />
          </Box>
        }
      >
        <TitlePortal />
      </AppBar>
      <AddAdminDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
