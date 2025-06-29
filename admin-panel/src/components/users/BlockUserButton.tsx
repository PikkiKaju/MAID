import React from "react";
import { Button } from "@mui/material";
import { httpClient, API_SERVER } from "../../api/httpClient";

const apiUrl = `${API_SERVER}/Admin`;

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
      if (onBlocked) onBlocked();
    } catch (err: any) {
      setError(err.message || "Błąd podczas blokowania użytkownika");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        size="small"
        onClick={handleBlock}
        disabled={loading}
      >
        {loading ? "Blokowanie..." : "Zablokuj"}
      </Button>
      {error && <span style={{ color: "red", marginLeft: 8 }}>{error}</span>}
      {success && (
        <span style={{ color: "green", marginLeft: 8 }}>Zablokowano!</span>
      )}
    </>
  );
}
