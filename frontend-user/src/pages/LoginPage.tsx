import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import { loginUser, clearAuthStatus } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { status, error, isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );

  // Effect to direct after login
  useEffect(() => {
    if (isLoggedIn && status === "succeeded") {
      alert(`Zalogowano pomyślnie.`);
      navigate("/");
      dispatch(clearAuthStatus());
    }
  }, [isLoggedIn, status, navigate, dispatch]);

  // Effect to to clear old status
  useEffect(() => {
    return () => {
      dispatch(clearAuthStatus());
    };
  }, [dispatch]);

  // function to submit button
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "loading") {
      return;
    }

    dispatch(loginUser({ username, password }));
  };

  return (
    <LoginForm
      username={username}
      password={password}
      setUsername={setUsername}
      setPassword={setPassword}
      handleSubmit={handleSubmit}
      status={status}
      error={error}
    />
  );
}

export default LoginPage;
