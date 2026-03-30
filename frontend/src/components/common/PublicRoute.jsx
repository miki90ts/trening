import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loading from "./Loading";

function PublicRoute({ children }) {
  const { isAuthenticated, loading, initialized } = useAuth();

  if (!initialized || loading) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PublicRoute;
