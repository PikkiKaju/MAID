import React, { useState } from "react";
import { Button, TextField, Box } from "@mui/material";
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
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}
    >
      <TextField
        label="Nazwa użytkownika"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <TextField
        label="Hasło"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" variant="contained" disabled={loading}>
        {loading ? "Dodawanie..." : "Dodaj admina"}
      </Button>
      {error && <Box color="error.main">{error}</Box>}
      {success && <Box color="success.main">Dodano nowego admina!</Box>}
    </Box>
  );
}
