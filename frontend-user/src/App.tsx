import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { useEffect } from "react";
import { store } from "./store/store";
import router from "./router/router";
import { ToastProvider } from "./components/toast/ToastProvider";
import { startTokenExpiryChecker } from "./utils/tokenExpiryChecker";

function AppContent() {
  // Check token expiry every minute
  useEffect(() => {
    const stopChecker = startTokenExpiryChecker(60 * 1000);

    return () => {
      stopChecker();
    };
  }, []);

  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
