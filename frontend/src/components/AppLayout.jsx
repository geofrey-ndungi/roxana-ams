import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import api from "../api/axios";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { studentNav, teacherNav, adminNav } from "./navConfig";

// Which sidebar links each role gets
const navByRole = {
  STUDENT: studentNav,
  TEACHER: teacherNav,
  ADMIN: adminNav,
};

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
  const nav = navByRole[role];

  // Students, teachers and admins get a sidebar, each with their own links.
  if (nav) {
    let subtitle = user.school_class || "No class yet";
    if (role === "TEACHER") subtitle = "Class Teacher";
    if (role === "ADMIN") subtitle = "Administrator";

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

  // Any other role keeps the top Header for now.
  return (
    <>
      <Header isLoggedIn={true} onLogout={onLogout} />
      <Outlet context={{ user }} />
    </>
  );
}

export default AppLayout;