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
  const { t, i18n } = useTranslation();
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

  // Format blocked user error message with date
  const formatError = (errorMsg: string | null): string | null => {
    if (!errorMsg) return null;

    // Check if error is for blocked user
    if (errorMsg.startsWith("BLOCKED:")) {
      const blockedDateISO = errorMsg.replace("BLOCKED:", "");
      try {
        const blockedDate = new Date(blockedDateISO);
        if (!isNaN(blockedDate.getTime())) {
          // Format date based on current language
          const locale = i18n.language === "pl" ? "pl-PL" : "en-GB";
          const formattedDate = blockedDate.toLocaleString(locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          return t("auth.userBlocked", { date: formattedDate });
        }
      } catch (e) {
        console.error("Error formatting blocked date:", e);
        return t("auth.userBlockedGeneric");
      }
      return t("auth.userBlockedGeneric");
    }

    // Check if error is invalid credentials
    if (errorMsg === "INVALID_CREDENTIALS") {
      // For invalid credentials, we don't show a message since user might be blocked
      // This is a fallback - normally blocked users are caught above
      return (
        t("auth.invalidCredentials") ||
        "Niepoprawna nazwa użytkownika lub hasło."
      );
    }

    return errorMsg;
  };

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

  const displayError = formatError(validationError || error);

  return (
    <LoginForm
      username={username}
      password={password}
      setUsername={setUsername}
      setPassword={setPassword}
      handleSubmit={handleSubmit}
      status={status}
      error={displayError}
    />
  );
}

export default LoginPage;
