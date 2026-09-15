import { formatTime } from "../dateTime";

export default function Topbar({ connected, title, subtitle, lastChecked, onRefresh }) {
  return (
    <header className="topbar">
      <div>
        <div className="breadcrumb">MINEWATCH / {title.toUpperCase()}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-status">
        <div className={`connection-pill ${connected ? "online" : "offline"}`}>
          <span className="connection-dot" />
          {connected ? "SYSTEM ONLINE" : "SYSTEM OFFLINE"}
        </div>
        <div className="sync-time">
          {lastChecked ? `Backend checked · ${formatTime(lastChecked.toISOString())}` : "Checking backend…"}
        </div>
        <button type="button" className="notification-button" aria-label="Refresh system status" onClick={onRefresh}>
          ↻
        </button>
      </div>
    </header>
  );
}
