import React from "react";
import { Button, Tooltip, Box, Alert } from "@mui/material";
import { Block, CheckCircle } from "@mui/icons-material";
import { httpClient, ASP_NET_API_URL } from "../../api/httpClient";

const apiUrl = `${ASP_NET_API_URL}/Admin`;

export default function BlockUserButton({
  userId,
  onBlocked,
}: {
  userId: string;
  onBlocked?: () => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const handleBlock = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await httpClient(`${apiUrl}/block/${userId}`, { method: "POST" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      if (onBlocked) onBlocked();
    } catch (err: any) {
      setError(err.message || "Błąd podczas blokowania użytkownika");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Tooltip title="Użytkownik został zablokowany">
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
          Zablokowano
        </Button>
      </Tooltip>
    );
  }

  return (
    <Box>
      <Tooltip title="Zablokuj użytkownika">
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<Block />}
          onClick={handleBlock}
          disabled={loading}
          sx={{
            minWidth: 120,
            textTransform: "none",
            borderRadius: 2,
            borderWidth: 1.5,
            fontWeight: 500,
            "&:hover": {
              borderWidth: 1.5,
              backgroundColor: "error.light",
              color: "error.contrastText",
            },
          }}
        >
          {loading ? "Blokowanie..." : "Zablokuj"}
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
