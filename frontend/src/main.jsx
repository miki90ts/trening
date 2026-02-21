import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CalendarProvider } from "./context/CalendarContext";
import { NotificationProvider } from "./context/NotificationContext";
import { NutritionProvider } from "./context/NutritionContext";
import { MetricsProvider } from "./context/MetricsContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <CalendarProvider>
              <NutritionProvider>
                <MetricsProvider>
                  <NotificationProvider>
                    <App />
                    <ToastContainer
                      position="top-right"
                      autoClose={3000}
                      hideProgressBar={false}
                      newestOnTop
                      closeOnClick
                      pauseOnHover
                      theme="colored"
                    />
                  </NotificationProvider>
                </MetricsProvider>
              </NutritionProvider>
            </CalendarProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
