import * as React from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "../utils/tailwind";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastComponent({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Animacja wejścia
    setTimeout(() => setIsVisible(true), 10);

    // Auto-zamknięcie po 5 sekundach
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 300); // Czeka na animację wyjścia
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 300);
  };

  const bgColor =
    toast.type === "success"
      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
      : toast.type === "error"
      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
      : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-5 rounded-lg border shadow-lg min-w-[350px] max-w-[500px] transition-all duration-300",
        bgColor,
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      )}
    >
      <div className="flex-shrink-0 text-foreground">
        {toast.type === "success" ? (
          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
        ) : toast.type === "error" ? (
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        ) : (
          <Info className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        )}
      </div>
      <div className="flex-1 text-base font-medium text-foreground">
        {toast.message}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 rounded-md p-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10 text-foreground"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}
