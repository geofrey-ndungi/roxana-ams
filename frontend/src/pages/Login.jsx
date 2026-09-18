import { useState } from "react";
import api from "../api/axios";

function Login({ onLoginSuccess }) {
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
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Log In</button>
      </form>
    </div>
  );
}

export default Login;