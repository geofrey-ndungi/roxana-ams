import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import api from "../api/axios";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { studentNav, teacherNav } from "./navConfig";

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
        setLoaded(true);
      }
    };

    loadUser();
  }, []);

  if (!loaded) return null;

  const role = user?.role;

  // Students and teachers get a sidebar, each with their own links.
  if (role === "STUDENT" || role === "TEACHER") {
    const nav = role === "TEACHER" ? teacherNav : studentNav;
    const subtitle =
      role === "TEACHER" ? "Class Teacher" : user.school_class || "No class yet";

    return (
      <div className="app-shell">
        <Sidebar
          user={user}
          subtitle={subtitle}
          mainItems={nav.main}
          schoolItems={nav.school}
          sectionTitle={nav.sectionTitle}
          onLogout={onLogout}
        />
        <main className="app-main">
          <Outlet context={{ user }} />
        </main>
      </div>
    );
  }

  // Admins keep the top Header for now.
  return (
    <>
      <Header isLoggedIn={true} onLogout={onLogout} />
      <Outlet context={{ user }} />
    </>
  );
}

export default AppLayout;