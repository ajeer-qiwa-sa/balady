import React from "react";
import { Navigate, Outlet } from "react-router-dom";

// Helper to retrieve token from cookies or localStorage
export const getAuthToken = () => {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

function AuthMiddleware() {
  const token = getAuthToken();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AuthMiddleware;
