import { Layout, type LayoutProps } from "react-admin";
import { Box, useTheme } from "@mui/material";
import CustomAppBar from "./CustomAppBar";

export default function CustomLayout(props: LayoutProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: isDark
          ? "radial-gradient(circle at 20% 20%, rgba(144,202,249,0.1), transparent 40%), radial-gradient(circle at 80% 30%, rgba(206,147,216,0.12), transparent 40%), radial-gradient(circle at 40% 80%, rgba(129,199,132,0.1), transparent 40%), linear-gradient(135deg, #0a0a0a 0%, #121212 100%)"
          : "radial-gradient(circle at 20% 20%, rgba(25,118,210,0.08), transparent 40%), radial-gradient(circle at 80% 30%, rgba(156,39,176,0.1), transparent 40%), radial-gradient(circle at 40% 80%, rgba(76,175,80,0.08), transparent 40%), linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)",
      }}
    >
      <Layout {...props} appBar={CustomAppBar} />
    </Box>
  );
}
