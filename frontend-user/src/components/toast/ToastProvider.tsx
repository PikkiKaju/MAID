import React, { createContext, useContext, useState, useCallback } from "react";
import { ToastContainer, Toast } from "../../ui/toast";

interface ToastContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error") => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message: string) => showToast(message, "success"),
    [showToast]
  );

  const showError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
