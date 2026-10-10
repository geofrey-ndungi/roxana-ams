import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import api from "../api/axios";
import Header from "./Header";
import StudentSidebar from "./StudentSidebar";

function AppLayout({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await api.get("/profile/me/");
        setUser(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoaded(true); // runs on success AND on failure
      }
    };

    loadUser();
  }, []);

  // Show nothing for a moment while we find out who is logged in.
  if (!loaded) return null;

  // Students get the sidebar.
  if (user?.role === "STUDENT") {
    return (
      <div className="app-shell">
        <StudentSidebar user={user} onLogout={onLogout} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    );
  }

  // Everyone else keeps the top Header for now.
  return (
    <>
      <Header isLoggedIn={true} onLogout={onLogout} />
      <Outlet />
    </>
  );
}

export default AppLayout;