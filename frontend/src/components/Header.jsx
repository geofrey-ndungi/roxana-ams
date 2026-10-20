import { Link } from "react-router-dom";
import logo from "../assets/logo3.jpg";
import "./Header.css";

function Header({ isLoggedIn, onLogout }) {
  return (
    <header>
     

      <div className="main-bar">
        <div className="brand">
          <img src={logo} alt="Roxana School logo" className="header-logo" />
          
        </div>

        <nav>
          <Link to="/">Home</Link>
          <Link to="/subjects">Subjects</Link>
          {isLoggedIn && <Link to="/attendance">Attendance</Link>}
          {isLoggedIn && <Link to="/profile">My Profile</Link>}
          <Link to="/help">Help</Link>
          {isLoggedIn && (
            <button className="logout-btn" onClick={onLogout}>
              Log Out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
