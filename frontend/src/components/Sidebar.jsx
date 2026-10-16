import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LogOut, ChevronLeft, Menu, X } from "lucide-react";
import logo from "../assets/logo2.jpg"; // keep the same file name you had before
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

  // Turns "Ian Mwangi" into "IM", used when there is no photo.
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const renderItem = (item) => {
    const Icon = item.icon; // a capital letter tells React this is a component

    // A page that doesn't exist yet: not a link, just a greyed row.
    if (item.soon) {
      return (
        <span
          key={item.label}
          className="nav-item nav-item-soon"
          title={`${item.label} (coming soon)`}
        >
          <Icon className="nav-icon" size={20} strokeWidth={1.75} />
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
        <Icon className="nav-icon" size={20} strokeWidth={1.75} />
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
          <Menu size={20} strokeWidth={1.75} />
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
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Links */}
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

        {/* User and logout, pinned to the bottom */}
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
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;