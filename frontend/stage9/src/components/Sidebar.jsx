const navigation = [
  { path: "/", icon: "⌂", label: "Dashboard" },
  { path: "/monitoring", icon: "◉", label: "Live Monitoring" },
  { path: "/sensors", icon: "⌁", label: "Sensors" },
  { path: "/ai-analysis", icon: "✦", label: "AI Analysis" },
  { path: "/gis", icon: "⌖", label: "Mine GIS" },
  { path: "/alerts", icon: "!", label: "Alerts" },
  { path: "/history", icon: "▥", label: "History" },
  { path: "/settings", icon: "⚙", label: "Settings" },
];

export default function Sidebar({ currentPath, navigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div>
          <strong>MINEWATCH</strong>
          <span>SMART MINE MONITORING</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="nav-label">MONITORING</span>
        {navigation.slice(0, 6).map((item) => (
          <button
            type="button"
            key={item.path}
            className={`nav-item ${currentPath === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        <span className="nav-label nav-label-spaced">DATA & SYSTEM</span>
        {navigation.slice(6).map((item) => (
          <button
            type="button"
            key={item.path}
            className={`nav-item ${currentPath === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-state">
          <span className="state-dot" />
          <div>
            <strong>System Online</strong>
            <span>Monitoring gateway</span>
          </div>
        </div>
        <div className="gateway-list">
          <span>Gateway</span>
          <span>NODE 01</span>
          <span>NODE 02</span>
        </div>
      </div>
    </aside>
  );
}
