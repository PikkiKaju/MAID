import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import router from "./router/router";
import { ToastProvider } from "./components/toast/ToastProvider";

function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </Provider>
  );
}

export default App;
