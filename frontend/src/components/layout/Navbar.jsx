import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/images/pcnlogo.webp";
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
  FiPieChart,
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiMessageSquare,
  FiClipboard,
  FiDroplet,
  FiPackage,
} from "react-icons/fi";
import NotificationBell from "../notifications/NotificationBell";
import ContactModal from "../common/ContactModal";

function Navbar() {
  const { darkMode, toggleTheme } = useTheme();
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(
    location.pathname.startsWith("/nutrition"),
  );
  const [metricsOpen, setMetricsOpen] = useState(
    location.pathname.startsWith("/metrics"),
  );
  const [adminOpen, setAdminOpen] = useState(
    location.pathname.startsWith("/admin"),
  );

  const links = [
    { to: "/", label: "Početna", icon: <FiHome /> },
    { to: "/users", label: "Učesnici", icon: <FiUsers /> },
    { to: "/results", label: "Rezultati", icon: <FiAward /> },
    { to: "/calendar", label: "Kalendar", icon: <FiCalendar /> },
    { to: "/leaderboard", label: "Rang lista", icon: <FiBarChart2 /> },
    { to: "/analytics", label: "Analitika", icon: <FiTrendingUp /> },
    { to: "/activity", label: "Aktivnost", icon: <FiActivity /> },
    { to: "/plans", label: "Plan treninga", icon: <FiClipboard /> },
    { to: "/meal-plans", label: "Plan ishrane", icon: <FiBookOpen /> },
  ];

  const metricsLinks = [
    { to: "/metrics/weight", label: "Kilaža", icon: <FiPackage /> },
    { to: "/metrics/steps", label: "Koraci", icon: <FiActivity /> },
    { to: "/metrics/sleep", label: "San", icon: <FiMoon /> },
  ];

  const nutritionLinks = [
    { to: "/nutrition/intake", label: "Unos hrane", icon: <FiPieChart /> },
    { to: "/nutrition/history", label: "Pregled hrane", icon: <FiBookOpen /> },
    { to: "/nutrition/hydration", label: "Hidratacija", icon: <FiDroplet /> },
  ];

  const adminLinks = [
    { to: "/admin/users", label: "Korisnici", icon: <FiUsers /> },
    { to: "/admin/exercises", label: "Vežbe", icon: <FiActivity /> },
    {
      to: "/admin/food-catalog",
      label: "Katalog hrane",
      icon: <FiBookOpen />,
    },
    {
      to: "/admin/activity-types",
      label: "Tipovi aktivnosti",
      icon: <FiActivity />,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    setMobileOpen(false);
  };

  useEffect(() => {
    if (location.pathname.startsWith("/nutrition")) {
      setNutritionOpen(true);
    }
    if (location.pathname.startsWith("/metrics")) {
      setMetricsOpen(true);
    }
    if (location.pathname.startsWith("/admin")) {
      setAdminOpen(true);
    }
  }, [location.pathname]);

  const isLinkActive = (to) =>
    location.pathname === to ||
    (to !== "/" && location.pathname.startsWith(`${to}/`));

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <header className="navbar-top">
        <div className="navbar-brand">
          <button
            className="mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Otvori navigaciju"
          >
            {mobileOpen ? <FiX /> : <FiMenu />}
          </button>

          <Link to="/" className="navbar-logo" onClick={closeMobileSidebar}>
            <img src={logo} alt="Logo" className="logo-image" />
          </Link>
        </div>

        <div className="navbar-actions">
          <Link
            key="/timer"
            to="/timer"
            className={`nav-link ${isLinkActive("/timer") ? "active" : ""}`}
            onClick={closeMobileSidebar}
          >
            <FiClock />
            <span>Timer</span>
          </Link>

          <NotificationBell />

          <button
            className="theme-toggle"
            onClick={() => setContactOpen(true)}
            title="Kontakt podrška"
          >
            <FiMessageSquare />
          </button>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>

          <div className="navbar-user">
            <Link
              to="/profile"
              className="navbar-user-info"
              onClick={closeMobileSidebar}
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
      </header>

      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-label="Zatvori navigaciju"
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="navbar-links">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${isLinkActive(link.to) ? "active" : ""}`}
              onClick={closeMobileSidebar}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}

          <button
            className={`nav-link nav-dropdown-trigger ${location.pathname.startsWith("/metrics") ? "active" : ""}`}
            onClick={() => setMetricsOpen((prev) => !prev)}
          >
            <span className="nav-link-content">
              <FiTrendingUp />
              <span>Metrics</span>
            </span>
            {metricsOpen ? <FiChevronDown /> : <FiChevronRight />}
          </button>

          {metricsOpen && (
            <div className="nav-dropdown-menu">
              {metricsLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link nav-link-child ${isLinkActive(link.to) ? "active" : ""}`}
                  onClick={closeMobileSidebar}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}

          <button
            className={`nav-link nav-dropdown-trigger ${location.pathname.startsWith("/nutrition") ? "active" : ""}`}
            onClick={() => setNutritionOpen((prev) => !prev)}
          >
            <span className="nav-link-content">
              <FiPieChart />
              <span>Ishrana i hidratacija</span>
            </span>
            {nutritionOpen ? <FiChevronDown /> : <FiChevronRight />}
          </button>

          {nutritionOpen && (
            <div className="nav-dropdown-menu">
              {nutritionLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-link nav-link-child ${isLinkActive(link.to) ? "active" : ""}`}
                  onClick={closeMobileSidebar}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          )}

          {isAdmin && (
            <>
              <button
                className={`nav-link nav-dropdown-trigger ${location.pathname.startsWith("/admin") ? "active" : ""}`}
                onClick={() => setAdminOpen((prev) => !prev)}
              >
                <span className="nav-link-content">
                  <FiShield />
                  <span>Admin</span>
                </span>
                {adminOpen ? <FiChevronDown /> : <FiChevronRight />}
              </button>

              {adminOpen && (
                <div className="nav-dropdown-menu">
                  {adminLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`nav-link nav-link-child ${isLinkActive(link.to) ? "active" : ""}`}
                      onClick={closeMobileSidebar}
                    >
                      {link.icon}
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </>
  );
}

export default Navbar;
