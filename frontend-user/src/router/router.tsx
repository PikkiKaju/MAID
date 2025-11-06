import { createBrowserRouter } from "react-router-dom";
import AppLayout from "../pages/AppLayout";
import HomePage from "../pages/HomePage";
import PrivateRoute from "../components/PrivateRoute";
import ProjectsPage from "../pages/ProjectsPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import NotFoundPage from "../pages/NotFoundPage";
import { loginFromStorage } from "../features/auth/authSlice";
import { store } from "../store/store";
import ProjectEditPage from "../pages/ProjectEditPage";
import DatasetPageUpload from "../pages/DatasetPageUpload";
import DatasetsListPage from "../pages/DatasetsListPage";
import CanvasPage from "../pages/CanvasPage";
import { ProfileSettingsPage } from "../pages/ProfileSettingPage";
import { ProfileInfoPage } from "../pages/ProfileInfoPage";
import { ProfileHelpPage } from "../pages/ProfileHelpPage";

const rootLoader = async () => {
  store.dispatch(loginFromStorage());
  return null;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    loader: rootLoader,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "projects",
        element: <ProjectsPage />,
      },
      {
        path: "upload-regression",
        element: <DatasetPageUpload />,
      },
      {
        path: "datasets-regresja",
        element: <DatasetsListPage />,
      },
      {
        path: "/profile",
        element: <ProfileInfoPage />,
      },
      {
        path: "/settings",
        element: <ProfileSettingsPage />,
      },
      {
        path: "/help-support",
        element: <ProfileHelpPage />,
      },
      {
        path: "canvas",
        element: <CanvasPage />,
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        path: "/projects/:id",
        element: <ProjectEditPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
