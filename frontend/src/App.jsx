import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Subjects from "./pages/Subjects";
import { Route, Routes ,useNavigate , Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleSessionExpired = () => {
      // Navigate to login, passing a flag along so Login knows to
      // show the "session timed out" message.
      navigate("/login", { state: { sessionExpired: true } });
    };

    window.addEventListener("session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("session-expired", handleSessionExpired);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");  // when session expired, navigate to /login
  };

  return (
    <Routes>
      {/* This is now the root "/" */}
      <Route path="/" element={<Navigate to="/subjects" replace />} /> 


      <Route path="/login" element={<Login />} />
      <Route
        path="/subjects"
        element={
          <ProtectedRoute>
            <Subjects onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;