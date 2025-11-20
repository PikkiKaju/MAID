import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import { clearAuthStatus } from "../features/auth/authSlice";
import { loginUser } from "../features/auth/loginThunks";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/forms/LoginForm";
import { validateLoginForm } from "../utils/authHelpers";

function LoginPage() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { status, error, isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );

  // Effect to direct after login
  useEffect(() => {
    if (isLoggedIn && status === "succeeded") {
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

    // Clear previous errors
    setValidationError(null);
    dispatch(clearAuthStatus());

    // Client-side validation
    const validation = validateLoginForm(username, password, t);
    if (!validation.isValid) {
      setValidationError(validation.error);
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
      error={validationError || error}
    />
  );
}

export default LoginPage;
