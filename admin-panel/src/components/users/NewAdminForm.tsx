import React, { useState } from "react";
import {
  Button,
  TextField,
  Box,
  Paper,
  Typography,
  Alert,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  Person,
  Email,
  Lock,
  PersonAdd,
  CheckCircle,
} from "@mui/icons-material";
import { httpClient, API_SERVER } from "../../api/httpClient";

const apiUrl = `${API_SERVER}/Admin`;

export default function NewAdminForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await httpClient(`${apiUrl}/newAdmin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (res.status < 200 || res.status >= 300)
        throw new Error("Błąd podczas dodawania admina");
      setSuccess(true);
      setUsername("");
      setEmail("");
      setPassword("");
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas dodawania admina");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        width: "100%",
        maxWidth: 500,
        mx: "auto",
      }}
    >
      <Box sx={{ textAlign: "center", mb: 1 }}>
        <PersonAdd
          sx={{
            fontSize: 48,
            color: "primary.main",
            mb: 1,
          }}
        />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Nowy administrator
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Wypełnij formularz, aby dodać nowego administratora
        </Typography>
      </Box>

      {success && (
        <Alert
          icon={<CheckCircle />}
          severity="success"
          sx={{
            borderRadius: 2,
            "& .MuiAlert-icon": {
              fontSize: "1.5rem",
            },
          }}
        >
          Administrator został dodany pomyślnie!
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            borderRadius: 2,
            "& .MuiAlert-icon": {
              fontSize: "1.5rem",
            },
          }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          backgroundColor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.02)",
          border: (theme) =>
            `1px solid ${
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)"
            }`,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Nazwa użytkownika"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            fullWidth
            disabled={loading || success}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            disabled={loading || success}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
          <TextField
            label="Hasło"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            disabled={loading || success}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      </Paper>

      <Button
        type="submit"
        variant="contained"
        disabled={loading || success}
        fullWidth
        size="large"
        startIcon={
          loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <PersonAdd />
          )
        }
        sx={{
          py: 1.5,
          borderRadius: 2,
          textTransform: "none",
          fontSize: "1rem",
          fontWeight: 600,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            transform: "translateY(-1px)",
            transition: "all 0.2s",
          },
          "&:disabled": {
            boxShadow: "none",
          },
        }}
      >
        {loading
          ? "Dodawanie..."
          : success
          ? "Dodano!"
          : "Dodaj administratora"}
      </Button>
    </Box>
  );
}
