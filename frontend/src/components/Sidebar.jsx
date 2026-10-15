import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faChevronLeft,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import logo from "../assets/logo2.jpg"; 
import "./Sidebar.css";

function Sidebar({
  user,
  subtitle,
  mainItems,
  schoolItems = [],
  sectionTitle,
  onLogout,
}) {
  const [collapsed, setCollapsed] = useState(false); // desktop: 240px or 72px
  const [mobileOpen, setMobileOpen] = useState(false); // phone: drawer open?

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const renderItem = (item) => {
    if (item.soon) {
      return (
        <span
          key={item.label}
          className="nav-item nav-item-soon"
          title={`${item.label} (coming soon)`}
        >
          <FontAwesomeIcon icon={item.icon} className="nav-icon" />
          <span className="sidebar-label">{item.label}</span>
          <span className="soon-pill">Soon</span>
        </span>
      );
    }

    return (
      <NavLink
        key={item.label}
        to={item.to}
        title={item.label}
        className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        onClick={() => setMobileOpen(false)}
      >
        <FontAwesomeIcon icon={item.icon} className="nav-icon" />
        <span className="sidebar-label">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <>
      <div className="mobile-topbar">
        <img src={logo} alt="Roxana School" />
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      <div
        className={`sidebar-backdrop ${mobileOpen ? "visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      ></div>

      <aside
        className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-logo">
          <img src={logo} alt="Roxana School" />
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse or expand the sidebar"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {mainItems.map(renderItem)}

          {/* Only show the second group if this role has one */}
          {schoolItems.length > 0 && (
            <>
              <div className="sidebar-section">{sectionTitle}</div>
              {schoolItems.map(renderItem)}
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            {user?.photo ? (
              <img
                src={user.photo}
                alt={user.full_name}
                className="sidebar-avatar"
              />
            ) : (
              <div className="sidebar-avatar">
                {getInitials(user?.full_name)}
              </div>
            )}
            <div className="sidebar-user-text sidebar-label">
              <div className="sidebar-user-name">{user?.full_name}</div>
              <div className="sidebar-user-class">{subtitle}</div>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;