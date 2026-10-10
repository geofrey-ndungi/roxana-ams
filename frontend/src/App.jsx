import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Subjects from "./pages/Subjects";
import { Route, Routes, useNavigate, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Attendance from "./pages/Attendance";
import StudentProfile from "./pages/StudentProfile";
import AppLayout from "./components/AppLayout";






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
    navigate("/login"); // when session expired, navigate to /login
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/subjects" replace />} />

      {/* Pages that share the sidebar / header shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout onLogout={handleLogout} />
          </ProtectedRoute>
        }
      >
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/profile" element={<StudentProfile />} />
      </Route>
    </Routes>
  );
}

export default App;
