import { useState } from "react";
import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTableCells,
  faUser,
  faBookOpen,
  faClipboardCheck,
  faCalendarDays,
  faComment,
  faBook,
  faCircleQuestion,
  faRightFromBracket,
  faChevronLeft,
  faBars,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import logo from "../assets/logo3.jpg";
import "./StudentSidebar.css";





// navigations 
const mainItems = [
  { label: "Dashboard", icon: faTableCells, soon: true },
  { label: "My Profile", icon: faUser, to: "/profile" },
  { label: "Subjects", icon: faBookOpen, to: "/subjects" },
  { label: "Attendance", icon: faClipboardCheck, soon: true },
  { label: "Timetable", icon: faCalendarDays, soon: true },
  { label: "Messages", icon: faComment, soon: true },
];

const schoolItems = [
  { label: "Library", icon: faBook, soon: true },
  { label: "Help", icon: faCircleQuestion, soon: true },
];

function StudentSidebar({ user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false); // desktop: 240px or 72px
  const [mobileOpen, setMobileOpen] = useState(false); // phone: drawer open?

  // Turns "Ian Mwangi" into "IM", used when there is no photo.
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const renderItem = (item) => {
    // A page that doesn't exist yet: not a link, just a greyed row.
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

    // A real page. NavLink tells us when this link is the current page.
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
      {/* Phones only: slim bar with a menu button */}
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

      {/* Phones only: dark overlay behind the open drawer */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? "visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      ></div>

      <aside
        className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        {/* White logo block */}
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

        {/* Links */}
        <nav className="sidebar-nav">
          {mainItems.map(renderItem)}
          <div className="sidebar-section">My School</div>
          {schoolItems.map(renderItem)}
        </nav>

        {/* Student + logout, pinned to the bottom */}
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
              <div className="sidebar-user-class">
                {user?.school_class || "No class yet"}
              </div>
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

export default StudentSidebar;