import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/store";
import { registerUser, clearAuthStatus } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";
import { RegisterUserForm } from "../models/auth";

function RegisterPage() {
  const [userToRegister, setUserToRegister] = useState<RegisterUserForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");

  // Hooks Implementation
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { status, error, isLoggedIn } = useSelector(
    (state: RootState) => state.auth
  );

  // Effect to inform about user action
  useEffect(() => {
    if (isLoggedIn && status === "succeeded") {
      alert("Rejestracja zakończona sukcesem!");
      navigate("/");
      dispatch(clearAuthStatus());
    }
    //  TODO
    //  inne informacje np o tym, że użytkownik się wylogował
  }, [isLoggedIn, status, navigate, dispatch]);

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

    if (userToRegister.password !== userToRegister.confirmPassword) {
      setPasswordError("Hasła nie pasują do siebie!");
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
