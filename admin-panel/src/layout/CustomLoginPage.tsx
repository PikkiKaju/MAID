import { Login, type LoginProps } from "react-admin";
import { Box, Paper, Typography } from "@mui/material";

export default function CustomLoginPage(props: LoginProps) {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 20% 20%, rgba(25,118,210,0.1), transparent 40%), radial-gradient(circle at 80% 30%, rgba(156,39,176,0.12), transparent 40%), radial-gradient(circle at 40% 80%, rgba(76,175,80,0.1), transparent 40%)",
        p: 2,
        overflow: "auto",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: { xs: 3, sm: 4, md: 6 },
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Maid Admin
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Zaloguj się, aby zarządzać platformą
          </Typography>
        </Box>
        <Login {...props} sx={{ minHeight: "500px" }} />
      </Paper>
    </Box>
  );
}
