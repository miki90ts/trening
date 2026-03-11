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
import ActivityPage from "./pages/ActivityPage";
import ActivityStatsPage from "./pages/ActivityStatsPage";
import ActivityFormPage from "./pages/ActivityFormPage";
import ActivityDetailPage from "./pages/ActivityDetailPage";
import AdminActivityTypesPage from "./pages/AdminActivityTypesPage";
import PlansPage from "./pages/PlansPage";
import PlanBuilderPage from "./pages/PlanBuilderPage";
import SessionExecutionPage from "./pages/SessionExecutionPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import StepsPage from "./pages/StepsPage";
import HydrationPage from "./pages/HydrationPage";
import SleepPage from "./pages/SleepPage";
import ImportActivityPage from "./pages/ImportActivityPage";
import MealPlansPage from "./pages/MealPlansPage";
import MealPlanBuilderPage from "./pages/MealPlanBuilderPage";
import MealSessionExecutionPage from "./pages/MealSessionExecutionPage";
import MealSessionDetailPage from "./pages/MealSessionDetailPage";
import ActivityPlansPage from "./pages/ActivityPlansPage";
import ActivityPlanBuilderPage from "./pages/ActivityPlanBuilderPage";
import ActivityPlanSessionPage from "./pages/ActivityPlanSessionPage";

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
            path="/nutrition/hydration"
            element={
              <ProtectedRoute>
                <HydrationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/weight"
            element={
              <ProtectedRoute>
                <MetricsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/steps"
            element={
              <ProtectedRoute>
                <StepsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/sleep"
            element={
              <ProtectedRoute>
                <SleepPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <ActivityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/stats"
            element={
              <ProtectedRoute>
                <ActivityStatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/import"
            element={
              <ProtectedRoute>
                <ImportActivityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/new"
            element={
              <ProtectedRoute>
                <ActivityFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:id/edit"
            element={
              <ProtectedRoute>
                <ActivityFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:id"
            element={
              <ProtectedRoute>
                <ActivityDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/activity-plans"
            element={
              <ProtectedRoute>
                <ActivityPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-plans/new"
            element={
              <ProtectedRoute>
                <ActivityPlanBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-plans/:id/edit"
            element={
              <ProtectedRoute>
                <ActivityPlanBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-plans/session/:sessionId"
            element={
              <ProtectedRoute>
                <ActivityPlanSessionPage />
              </ProtectedRoute>
            }
          />

          {/* Plan rute */}
          <Route
            path="/plans"
            element={
              <ProtectedRoute>
                <PlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/sessions"
            element={
              <ProtectedRoute>
                <PlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/sent"
            element={
              <ProtectedRoute requiredRole="admin">
                <PlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/new"
            element={
              <ProtectedRoute>
                <PlanBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/:id/edit"
            element={
              <ProtectedRoute>
                <PlanBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/session/:sessionId"
            element={
              <ProtectedRoute>
                <SessionExecutionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans/session/:sessionId/detail"
            element={
              <ProtectedRoute>
                <SessionDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Meal plan rute */}
          <Route
            path="/meal-plans"
            element={
              <ProtectedRoute>
                <MealPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-plans/sessions"
            element={
              <ProtectedRoute>
                <MealPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-plans/sent"
            element={
              <ProtectedRoute requiredRole="admin">
                <MealPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-plans/new"
            element={
              <ProtectedRoute>
                <MealPlanBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-plans/:id/edit"
            element={
              <ProtectedRoute>
                <MealPlanBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-plans/session/:sessionId"
            element={
              <ProtectedRoute>
                <MealSessionExecutionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meal-plans/session/:sessionId/detail"
            element={
              <ProtectedRoute>
                <MealSessionDetailPage />
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
            path="/admin/exercises"
            element={
              <ProtectedRoute requiredRole="admin">
                <ExercisesPage />
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
          <Route
            path="/admin/activity-types"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminActivityTypesPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
