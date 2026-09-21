import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import logo from "../assets/logo3.jpg";
import "./Header.css";

function Header() {
  return (
    <header>
      <div className="top-bar">
        <span>
          <FontAwesomeIcon icon={faPhone} /> Call us: (+254) 700-000-000
        </span>
        <span>
          <FontAwesomeIcon icon={faEnvelope} /> Email: info@roxanaschool.edu
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
          <a href="/">Home</a>
          <a href="/subjects">Subjects</a>
          <a href="/help">Help</a>
        </nav>
      </div>
    </header>
  );
}

export default Header;