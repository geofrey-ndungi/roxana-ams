import { Navigate, useOutletContext } from "react-router-dom";
import AdminDashboard from "./AdminDashboard.jsx";
import TeacherDashboard from "./TeacherDashboard";

// "/dashboard" shows a different page depending on who is logged in.
function Dashboard() {
  const { user } = useOutletContext();

  if (user?.role === "ADMIN") return <AdminDashboard />;
  if (user?.role === "TEACHER") return <TeacherDashboard />;

  // Students have no dashboard yet
  return <Navigate to="/" replace />;
}

export default Dashboard;