import React from "react";
import { AppBar, TitlePortal, UserMenu, Logout } from "react-admin";
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import AddIcon from "@mui/icons-material/PersonAdd";
import { useThemeMode } from "../contexts/ThemeContext";
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
  const { mode, toggleMode } = useThemeMode();

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
          <Tooltip title={mode === "dark" ? "Tryb jasny" : "Tryb ciemny"}>
            <IconButton
              onClick={toggleMode}
              color="inherit"
              sx={{ ml: 1 }}
              aria-label="Przełącz tryb motywu"
            >
              {mode === "dark" ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
        }
      >
        <TitlePortal />
      </AppBar>
      <AddAdminDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
