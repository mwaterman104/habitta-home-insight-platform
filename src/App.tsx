import { AppRoutes } from "@/pages/AppRoutes";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEffect } from "react";

// Global error logging for runtime errors
const setupGlobalErrorHandlers = () => {
  window.addEventListener('error', (event) => {
    console.error('Global error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', {
      reason: event.reason,
      promise: event.promise,
    });
  });
};

export default function App() {
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}
