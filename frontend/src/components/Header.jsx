import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import logo from "../assets/logo3.jpg";
import "./Header.css";

function Header({ isLoggedIn, onLogout }) {
  return (
    <header>
      <div className="top-bar">
        <span>
          <FontAwesomeIcon icon={faPhone} /> Call us: (+254) 700-000-000
        </span>
        <span>
          <FontAwesomeIcon icon={faEnvelope} /> Email: info@roxanaschool.ac.ke
        </span>
      </div>

      <div className="main-bar">
        <div className="brand">
          <img src={logo} alt="Roxana School logo" className="header-logo" />
          {/* <div className="brand-text">
            <span className="brand-name">Roxana School</span>
          </div> */}
        </div>

        <nav>
          <Link to="/">Home</Link>
          <Link to="/subjects">Subjects</Link>
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