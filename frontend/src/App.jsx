import { useState } from "react";
import Login from "./pages/Login";
import Subjects from "./pages/Subjects";

function App() {
  // On first load, check if a token already exists in localStorage
  // (e.g. user refreshed the page after already logging in).
  // `!!` converts the result to a true/false boolean:
  // getItem() returns either a string (token exists) or null (it doesn't).
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("access_token")
  );

  return (
    <div>
      {/* Ternary = shorthand if/else for JSX.
          If isLoggedIn is true, show the Subjects page.
          Otherwise, show the Login page. */}
      {isLoggedIn ? (
        <Subjects />
      ) : (
        // We pass a function into Login as a "prop" (onLoginSuccess).
        // This lets the Login component notify App when login worked,
        // so App can flip isLoggedIn to true and switch which page shows —
        // without Login needing to know anything about App's internals.
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </div>
  );
}

export default App;