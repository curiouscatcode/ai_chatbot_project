import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null: checking, true: authenticated, false: not authenticated

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      // If no token is found, user is definitely not authenticated
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      // If a token exists, validate it with the backend
      try {
        const response = await fetch("http://localhost:5000/auth/dashboard", {
          method: "GET", // Use GET for simply checking status/fetching dashboard data
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Send the token for validation
          },
        });

        // Check if the response was successful (HTTP status 200-299)
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // If response is not OK (e.g., 401 Unauthorized, 403 Forbidden)
          // This means the token is invalid or expired
          const errorData = await response.json(); // Attempt to read error message from backend
          console.error(
            "Frontend authentication check failed:",
            response.status,
            errorData.message || "Unknown error"
          );
          setIsAuthenticated(false);
          localStorage.removeItem("token"); // Clear the invalid token
        }
      } catch (error) {
        // This catches network errors or other issues preventing the fetch call
        console.error("Network error during authentication check:", error);
        setIsAuthenticated(false);
        localStorage.removeItem("token"); // Clear token on network errors too, just in case
      }
    };

    checkAuth();
  }, []); // Empty dependency array means this runs only once on component mount.

  // While checking authentication, show a loading message
  if (isAuthenticated === null) {
    return <div>Loading authentication...</div>;
  }

  // Based on authentication status, either render the protected content or redirect
  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
