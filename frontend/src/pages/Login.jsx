import { useState } from "react";
import api from "../api/axios";
import "./Login.css"

function Login({ onLoginSuccess , sessionExpired }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/token/", { username, password });
      console.log("Login Success: ", response.data);


      // Saving the tokens
      localStorage.setItem("access_token", response.data.access);  //saves the access token under the name "access_token"
      localStorage.setItem("refresh_token", response.data.refresh); // saves the refresh token under the name "refresh token"
      onLoginSuccess();




    } catch (err) {
      setError("Invalid username or password");
      setUsername("");
      setPassword("");
      console.error(err);
    }
  };

  
  return (
  <div className="login-container">
    <div className="login-box">

      <h1>Roxana School Academic Management System</h1>

      {sessionExpired && (
  <p className="login-error">Your session has timed out. Please log in again.</p>
     )}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type="text"
            placeholder=" "
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label>Username</label>
        </div>

        <div className="input-group">
          <input
            type="password"
            placeholder=" "
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label>Password</label>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit">Log In</button>
      </form>
    </div>
  </div>
);
}

export default Login;