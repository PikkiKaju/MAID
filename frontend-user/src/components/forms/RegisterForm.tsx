import React from "react";
import { Link } from "react-router-dom";
import { RegisterUserForm } from "../../models/auth";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import "../../styles/Loader.css";

interface RegisterFormProps {
  userToRegister: RegisterUserForm;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  status: "inactive" | "loading" | "succeeded" | "failed";
  error: string | null;
  passwordError: string | null;
}

function RegisterForm({
  userToRegister,
  handleChange,
  handleSubmit,
  status,
  error,
  passwordError,
}: RegisterFormProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
      {/* If status is loading then create a loading view */}
      <div
        className={`loader ${status !== "loading" ? "loader-hidden" : ""}`}
      />

      {/* Register Form Box */}
      <div className="bg-background rounded-xl p-6 border border-border w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-foreground mb-6">
          Rejestracja
        </h2>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-muted-foreground"
            >
              Nazwa użytkownika
            </label>
            <Input
              type="text"
              id="username"
              name="username"
              className="mt-1"
              value={userToRegister.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-muted-foreground"
            >
              Email
            </label>
            <Input
              type="email"
              id="email"
              name="email"
              className="mt-1"
              value={userToRegister.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-muted-foreground"
            >
              Hasło
            </label>
            <Input
              type="password"
              id="password"
              name="password"
              className="mt-1"
              value={userToRegister.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-muted-foreground"
            >
              Potwierdź hasło
            </label>
            <Input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="mt-1"
              value={userToRegister.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
            {passwordError && (
              <p className="mt-1 text-sm text-red-600">{passwordError}</p>
            )}
          </div>

          {error && <p className="text-center text-red-600">Błąd: {error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={status === "loading"}
          >
            Zarejestruj się
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Masz już konto?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;
