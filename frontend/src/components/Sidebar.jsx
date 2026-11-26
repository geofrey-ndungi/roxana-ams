import { Fragment, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../assets/logo2.jpg";
import collapseIcon from "../assets/sidebar/collapse.svg";
import dashboardIcon from "../assets/sidebar/dashboard.svg";
import studentsIcon from "../assets/sidebar/students.svg";
import teachersIcon from "../assets/sidebar/teachers.svg";
import classesIcon from "../assets/sidebar/classes.svg";
import subjectsIcon from "../assets/sidebar/subjects.svg";
import academicYearsIcon from "../assets/sidebar/academic-years.svg";
import attendanceIcon from "../assets/sidebar/attendance.svg";
import timetableIcon from "../assets/sidebar/timetable.svg";
import examinationsIcon from "../assets/sidebar/examinations.svg";
import expandExaminationsIcon from "../assets/sidebar/expand-examinations.svg";
import messagesIcon from "../assets/sidebar/messages.svg";
import settingsIcon from "../assets/sidebar/settings.svg";
import accountAvatar from "../assets/sidebar/account-avatar.svg";
import signOutIcon from "../assets/sidebar/sign-out.svg";
import "./Sidebar.css";

const iconByLabel = {
  Dashboard: dashboardIcon,
  Students: studentsIcon,
  Teachers: teachersIcon,
  Classes: classesIcon,
  Subjects: subjectsIcon,
  "Academic years": academicYearsIcon,
  Attendance: attendanceIcon,
  Timetable: timetableIcon,
  Examinations: examinationsIcon,
  Messages: messagesIcon,
};

function Sidebar({
  user,
  subtitle,
  mainItems,
  schoolItems = [],
  sectionTitle,
  onLogout,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [examinationsOpen, setExaminationsOpen] = useState(null);
  const isExaminationsOpen =
    examinationsOpen ?? location.pathname.startsWith("/examinations/");

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  };

  const renderIcon = (item, className = "nav-icon") => {
    const asset = iconByLabel[item.label];
    if (asset) {
      return <img className={className} src={asset} alt="" aria-hidden="true" />;
    }

    const Icon = item.icon;
    return <Icon className={className} size={20} strokeWidth={1.75} aria-hidden="true" />;
  };

  const renderItem = (item) => {
    if (item.children) {
      return (
        <div className="nav-group" key={item.label}>
          <button
            type="button"
            className={`nav-item nav-group-toggle ${
              location.pathname.startsWith("/examinations/") ? "active" : ""
            }`}
            aria-expanded={isExaminationsOpen}
            onClick={() => setExaminationsOpen(!isExaminationsOpen)}
          >
            {renderIcon(item)}
            <span className="sidebar-label">{item.label}</span>
            <img
              className={`nav-group-chevron ${isExaminationsOpen ? "open" : ""}`}
              src={expandExaminationsIcon}
              alt=""
              aria-hidden="true"
            />
          </button>
          {isExaminationsOpen && (
            <div className="nav-group-children">
              {item.children.map((child) => (
                <NavLink
                  key={child.label}
                  to={child.to}
                  title={child.label}
                  className={({ isActive }) =>
                    `nav-item nav-child ${isActive ? "active" : ""}`
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {renderIcon(child)}
                  <span className="sidebar-label">{child.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (item.soon) {
      return (
        <span
          key={item.label}
          className="nav-item nav-item-soon"
          title={`${item.label} (coming soon)`}
          aria-disabled="true"
        >
          {renderIcon(item)}
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
        {renderIcon(item)}
        <span className="sidebar-label">{item.label}</span>
      </NavLink>
    );
  };

  const renderGroupedItems = (items) => {
    let previousSection = null;

    return items.map((item) => {
      const showSection = item.section && item.section !== previousSection;
      previousSection = item.section;

      return (
        <Fragment key={item.label}>
          {showSection && (
            <div className="sidebar-section">{item.section}</div>
          )}
          {renderItem(item)}
        </Fragment>
      );
    });
  };

  const renderBrand = () => (
    <div className="sidebar-brand">
      <img src={logo} alt="Roxana School" />
    </div>
  );

  return (
    <>
      <div className="mobile-topbar">
        {renderBrand()}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </div>

      <button
        type="button"
        className={`sidebar-backdrop ${mobileOpen ? "visible" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-label="Close menu"
        tabIndex={mobileOpen ? 0 : -1}
      />

      <aside
        className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
        aria-label="Main navigation"
      >
        <div className="sidebar-logo">
          {renderBrand()}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse or expand the sidebar"
            aria-expanded={!collapsed}
          >
            <img src={collapseIcon} alt="" aria-hidden="true" />
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

        <nav className="sidebar-nav">
          {renderGroupedItems(mainItems)}
          {schoolItems.length > 0 && (
            <>
              <div className="sidebar-section">{sectionTitle}</div>
              {schoolItems.map((item) => renderItem(item))}
            </>
          )}
        </nav>

        <div className="sidebar-utilities">
          <div className="sidebar-divider" />
          <button
            type="button"
            className="sidebar-settings"
            disabled
            title="Settings are not available yet"
          >
            <img src={settingsIcon} alt="" aria-hidden="true" />
            <span className="sidebar-label">Settings</span>
          </button>
          <div className="sidebar-divider" />
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt=""
                  className="sidebar-avatar sidebar-avatar-photo"
                />
              ) : (
                <span className="sidebar-avatar">
                  <img src={accountAvatar} alt="" aria-hidden="true" />
                  <span>{getInitials(user?.full_name)}</span>
                </span>
              )}
              <span className="sidebar-user-text sidebar-label">
                <span className="sidebar-user-name">{user?.full_name}</span>
                <span className="sidebar-user-class">{subtitle}</span>
              </span>
            </div>

            <button
              type="button"
              className="sidebar-logout"
              onClick={onLogout}
              title="Log out"
              aria-label="Log out"
            >
              <img src={signOutIcon} alt="" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
