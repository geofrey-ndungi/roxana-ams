import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import "./Login.css";
import Header from "../components/Header";


function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpired = location.state?.sessionExpired || false;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const response = await api.post("/token/", { username, password });
    localStorage.setItem("access_token", response.data.access);
    localStorage.setItem("refresh_token", response.data.refresh);
    navigate("/subjects");
  } catch (err) {
    setError("Invalid username or password");
    setUsername("");
    setPassword("");
    console.error(err);
  }
};

  
 return (
    <>
    <Header isLoggedIn={false} />
    
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
        </>
);
}

export default Login;