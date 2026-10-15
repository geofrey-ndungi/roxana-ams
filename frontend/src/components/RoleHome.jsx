import { Navigate, useOutletContext } from "react-router-dom";

// Where each role lands when they go to "/" (for example, right after login).
function RoleHome() {
  const { user } = useOutletContext();

  if (user?.role === "TEACHER") return <Navigate to="/dashboard" replace />;
  if (user?.role === "STUDENT") return <Navigate to="/profile" replace />;
  return <Navigate to="/subjects" replace />;
}

export default RoleHome;