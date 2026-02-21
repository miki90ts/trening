import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import UsersPage from "./pages/UsersPage";
import ExercisesPage from "./pages/ExercisesPage";
import ResultsPage from "./pages/ResultsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import TimerPage from "./pages/TimerPage";
import UserDetailPage from "./pages/UserDetailPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminFoodCatalogPage from "./pages/AdminFoodCatalogPage";
import CalendarPage from "./pages/CalendarPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NutritionIntakePage from "./pages/NutritionIntakePage";
import NutritionHistoryPage from "./pages/NutritionHistoryPage";
import MetricsPage from "./pages/MetricsPage";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div className={`app ${isAuthenticated ? "app-authenticated" : ""}`}>
      {isAuthenticated && <Navbar />}
      <main
        className={isAuthenticated ? "main-content app-main-with-sidebar" : ""}
      >
        <Routes>
          {/* Javne rute */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Zaštićene rute */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <UserDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exercises"
            element={
              <ProtectedRoute>
                <ExercisesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timer"
            element={
              <ProtectedRoute>
                <TimerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nutrition/intake"
            element={
              <ProtectedRoute>
                <NutritionIntakePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/nutrition/history"
            element={
              <ProtectedRoute>
                <NutritionHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics"
            element={
              <ProtectedRoute>
                <MetricsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin rute */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Navigate to="/admin/users" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/food-catalog"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminFoodCatalogPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
