import React from "react";
import { Link } from "react-router-dom";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import "../../styles/Loader.css";

interface LoginFormProps {
  username: string;
  password: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  status: "inactive" | "loading" | "succeeded" | "failed";
  error: string | null;
}

function LoginForm({
  username,
  password,
  setUsername,
  setPassword,
  handleSubmit,
  status,
  error,
}: LoginFormProps) {
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        {/* If status is loading then create a loading view */}
        <div
          className={`loader ${status !== "loading" ? "loader-hidden" : ""}`}
        />

        {/* Login Form Box - match FavoritesSection background and use theme border */}
        <div className="bg-background rounded-xl p-6 border border-border w-full max-w-md">
          <h2 className="text-2xl font-bold text-center text-foreground mb-6">
            Logowanie
          </h2>

          {/* Login Form */}
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-center text-red-600">Błąd: {error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={status === "loading"}
            >
              Zaloguj się
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Nie masz konta?{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary/90"
            >
              Zarejestruj się
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default LoginForm;
