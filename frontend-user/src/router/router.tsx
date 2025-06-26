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
        element: <PrivateRoute />,
        children: [
          {
            path: "projects",
            element: <ProjectsPage />,
          },
        ],
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
