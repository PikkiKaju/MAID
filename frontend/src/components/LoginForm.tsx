import React from "react";
import { Link } from "react-router-dom";
import "./Loader.css";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {/* If status is loading then create a loading view */}
        <div
          className={`loader ${status !== "loading" ? "loader-hidden" : ""}`}
        />

        {/* Login Form Box */}
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Logowanie
          </h2>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Nazwa użytkownika
              </label>
              <input
                type="text"
                id="username"
                name="username" // Dodaj atrybut name dla lepszej dostępności
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username" // Dodaj autocomplete
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Hasło
              </label>
              <input
                type="password"
                id="password"
                name="password" // Dodaj atrybut name
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password" // Dodaj autocomplete
              />
            </div>

            {error && <p className="text-center text-red-600">Błąd: {error}</p>}

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={status === "loading"}
            >
              Zaloguj się
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Nie masz konta?{" "}
            <Link
              to="/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
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
