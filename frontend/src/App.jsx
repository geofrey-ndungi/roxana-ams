import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Subjects from "./pages/Subjects";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("access_token")
  );
  const [sessionExpired, setSessionExpired] = useState(false);

  console.log("App rendering — isLoggedIn:", isLoggedIn, "sessionExpired:", sessionExpired);

  // ...rest stays the same

  useEffect(() => {
  const handleSessionExpired = () => {
    setIsLoggedIn(false);
    setSessionExpired(true);
  };

  window.addEventListener("session-expired", handleSessionExpired);

  return () => {
    window.removeEventListener("session-expired", handleSessionExpired);
  };
}, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setIsLoggedIn(false);
  };

  const handleLoginSuccess = () => {
    setSessionExpired(false);
    setIsLoggedIn(true);
  };

  return (
    <div>
      {isLoggedIn ? (
        <Subjects onLogout={handleLogout} />
      ) : (
        <Login
          onLoginSuccess={handleLoginSuccess}
          sessionExpired={sessionExpired}
        />
      )}
    </div>
  );
}

export default App;