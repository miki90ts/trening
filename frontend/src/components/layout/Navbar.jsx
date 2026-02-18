import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  FiHome,
  FiUsers,
  FiActivity,
  FiAward,
  FiClock,
  FiBarChart2,
  FiSun,
  FiMoon,
  FiMenu,
  FiX,
  FiLogOut,
  FiShield,
  FiCalendar,
  FiTrendingUp,
} from "react-icons/fi";
import NotificationBell from "../notifications/NotificationBell";

function Navbar() {
  const { darkMode, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/", label: "Početna", icon: <FiHome /> },
    { to: "/users", label: "Učesnici", icon: <FiUsers /> },
    { to: "/exercises", label: "Vežbe", icon: <FiActivity /> },
    { to: "/results", label: "Rezultati", icon: <FiAward /> },
    { to: "/calendar", label: "Kalendar", icon: <FiCalendar /> },
    { to: "/leaderboard", label: "Rang lista", icon: <FiBarChart2 /> },
    { to: "/analytics", label: "Analitika", icon: <FiTrendingUp /> },
    { to: "/timer", label: "Timer", icon: <FiClock /> },
  ];

  if (isAdmin) {
    links.push({ to: "/admin", label: "Admin", icon: <FiShield /> });
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setMobileOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🏋️</span>
          <span className="logo-text">FitRecords</span>
        </Link>
        <button
          className="mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      <div className={`navbar-links ${mobileOpen ? "open" : ""}`}>
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        ))}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          {darkMode ? <FiSun /> : <FiMoon />}
        </button>

        <NotificationBell />

        {/* User info & Logout */}
        <div className="navbar-user">
          <Link
            to={`/users/${user?.id}`}
            className="navbar-user-info"
            onClick={() => setMobileOpen(false)}
          >
            {user?.profile_image ? (
              <img
                src={user.profile_image}
                alt={user.first_name}
                className="navbar-avatar"
              />
            ) : (
              <span className="navbar-avatar-placeholder">
                {user?.first_name?.[0]}
              </span>
            )}
            <span className="navbar-username">
              {user?.nickname || user?.first_name}
              {isAdmin && <span className="admin-badge">Admin</span>}
            </span>
          </Link>
          <button
            className="btn-icon logout-btn"
            onClick={handleLogout}
            title="Odjavi se"
          >
            <FiLogOut />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
