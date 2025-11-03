import React from "react";
import { AppBar, TitlePortal, UserMenu, Logout } from "react-admin";
import { MenuItem, ListItemIcon, ListItemText } from "@mui/material";
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
      >
        <TitlePortal />
      </AppBar>
      <AddAdminDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
