import React from "react";
import { Link } from "react-router-dom";
import { RegisterUserForm } from "../models/auth";
import "./Loader.css";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {/* If status is loading then create a loading view */}
      <div
        className={`loader ${status !== "loading" ? "loader-hidden" : ""}`}
      />

      {/* Register Form Box */}
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Rejestracja
        </h2>

        {/* Register Form */}
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
              name="username"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={userToRegister.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={userToRegister.email}
              onChange={handleChange}
              required
              autoComplete="email"
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
              name="password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={userToRegister.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Potwierdź hasło
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={status === "loading"}
          >
            Zarejestruj się
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
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
