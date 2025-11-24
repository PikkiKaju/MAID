import React from "react";
import { Button, Tooltip, Box, Alert } from "@mui/material";
import { Block, CheckCircle, LockOpen } from "@mui/icons-material";
import { useRefresh } from "react-admin";
import { httpClient, ASP_NET_API_URL } from "../../api/httpClient";

const apiUrl = `${ASP_NET_API_URL}/Admin`;

export default function BlockUserButton({
  userId,
  isBlocked,
  onBlocked,
}: {
  userId: string;
  isBlocked?: boolean;
  onBlocked?: () => void;
}) {
  const refresh = useRefresh();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const handleToggleBlock = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Zatrzymaj propagację, aby nie przekierowywać do szczegółów
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await httpClient(`${apiUrl}/block/${userId}`, {
        method: "POST",
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        refresh(); // Odśwież listę użytkowników
      }, 2000);
      if (onBlocked) onBlocked();
    } catch (err: any) {
      console.error(
        `Error ${isBlocked ? "unblocking" : "blocking"} user:`,
        err
      );
      const errorMessage =
        err?.body?.message ||
        err?.message ||
        `Błąd podczas ${isBlocked ? "odblokowania" : "blokowania"} użytkownika`;
      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Tooltip
        title={
          isBlocked
            ? "Użytkownik został odblokowany"
            : "Użytkownik został zablokowany"
        }
      >
        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={<CheckCircle />}
          sx={{
            minWidth: 120,
            textTransform: "none",
            borderRadius: 2,
            boxShadow: "none",
            "&:hover": {
              boxShadow: "none",
            },
          }}
        >
          {isBlocked ? "Odblokowano" : "Zablokowano"}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Box>
      <Tooltip
        title={isBlocked ? "Odblokuj użytkownika" : "Zablokuj użytkownika"}
      >
        <Button
          variant="outlined"
          color={isBlocked ? "success" : "error"}
          size="small"
          startIcon={isBlocked ? <LockOpen /> : <Block />}
          onClick={handleToggleBlock}
          disabled={loading}
          sx={{
            minWidth: 120,
            textTransform: "none",
            borderRadius: 2,
            borderWidth: 1.5,
            fontWeight: 500,
            "&:hover": {
              borderWidth: 1.5,
              backgroundColor: isBlocked ? "success.light" : "error.light",
              color: isBlocked ? "success.contrastText" : "error.contrastText",
            },
          }}
        >
          {loading
            ? isBlocked
              ? "Odblokowywanie..."
              : "Blokowanie..."
            : isBlocked
            ? "Odblokuj"
            : "Zablokuj"}
        </Button>
      </Tooltip>
      {error && (
        <Alert
          severity="error"
          sx={{
            mt: 0.5,
            fontSize: "0.75rem",
            py: 0.5,
            "& .MuiAlert-icon": {
              fontSize: "1rem",
            },
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
}
