import { useState } from "react";
import "./App.css";
import "./index.css";
import MainComponent from "./components/01-intro-page/MainComponent.jsx";
import Dashboard from "./components/02-dashboard/Dashboard.jsx";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ProtectedRoute from "./components/01-intro-page/ProtectedRoute.jsx";

function App() {
  // Initialize isLoggedIn based on whether a token exists in localstorage
  const [isLoggedIn, setIsLoggedIn] = useState(
    // '!!' converts a truthy/falsy value to true/false boolean
    !!localStorage.getItem("token")
  );

  // (Optional but good practice) Effect to re-check auth status if localStorage changes externally
  // Or to handle initial token validation if needed
  useEffect(() => {
    const checkAuthStatus = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };
    // You might listen to storage events or just rely on component remounts/login calls
    window.addEventListener("storage", checkAuthStatus);
    return () => window.removeEventListener("storage", checkAuthStatus);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<MainComponent />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      {/* <Route path="*" element={<Navigate to="/" />} /> */}
    </Routes>
  );
}

export default App;
