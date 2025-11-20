import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import { clearAuthStatus } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import RegisterForm from "../components/forms/RegisterForm";
import { RegisterUserForm } from "../models/auth";
import { registerUser } from "../features/auth/registerThunks";
import { useToast } from "../components/toast/ToastProvider";
import { validatePasswordMatch } from "../utilis/authHelpers";

function RegisterPage() {
  const [userToRegister, setUserToRegister] = useState<RegisterUserForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const { showSuccess } = useToast();

  // Hooks Implementation
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { status, error, isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );

  const { t } = useTranslation();

  // Effect to inform about user action
  useEffect(() => {
    if (isLoggedIn && status === "succeeded") {
      showSuccess(t("auth.registrationSuccess"));
      setTimeout(() => {
        navigate("/");
        dispatch(clearAuthStatus());
      }, 2000); // Wait 2 seconds before redirecting
    }
  }, [isLoggedIn, status, showSuccess, t, navigate, dispatch]);

  // Effect to to clear old status
  useEffect(() => {
    return () => {
      dispatch(clearAuthStatus());
    };
  }, [dispatch]);

  // function to update user data
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserToRegister((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // function to submit button
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password match
    const passwordMatchError = validatePasswordMatch(
      userToRegister.password,
      userToRegister.confirmPassword,
      t
    );
    if (passwordMatchError) {
      setPasswordError(passwordMatchError);
      return;
    } else {
      setPasswordError("");
    }

    if (status === "loading") {
      return;
    }

    // Sending data to Redux Thunk
    dispatch(
      registerUser({
        username: userToRegister.username,
        email: userToRegister.email,
        password: userToRegister.password,
      })
    );
  };

  return (
    <RegisterForm
      userToRegister={userToRegister}
      handleChange={handleChange}
      handleSubmit={handleSubmit}
      status={status}
      error={error}
      passwordError={passwordError}
    />
  );
}

export default RegisterPage;
