import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
            {t("auth.login")}
          </h2>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-muted-foreground"
              >
                {t("auth.username")}
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
                {t("auth.password")}
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

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={status === "loading"}
            >
              {t("auth.loginButton")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary/90"
            >
              {t("auth.registerLink")}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default LoginForm;
