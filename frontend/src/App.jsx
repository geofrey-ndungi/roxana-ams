import { useState } from "react";
import Login from "./pages/Login";
import Subjects from "./pages/Subjects";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("access_token")
  );

  // Clears both tokens from storage and flips the app back to
  // the logged-out state, so App re-renders and shows Login again.
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setIsLoggedIn(false);
  };

  return (
    <div>
      {isLoggedIn ? (
        <Subjects onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </div>
  );
}

export default App;