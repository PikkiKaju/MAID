import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

// PrivateRoute is a component that checks if the user is logged in and redirects to the login page if not
function PrivateRoute() {
  const isLoggedIn = useSelector((state: any) => state.auth.isLoggedIn);

  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

export default PrivateRoute;
