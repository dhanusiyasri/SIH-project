import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const POLL_INTERVAL = 2000;

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function severityClass(severity) {
  return String(severity || "NORMAL").toLowerCase();
}

function lifecycle(alert) {
  if (alert.event_type === "RECOVERY") return "RECOVERY";
  if (alert.resolved) return "RESOLVED";
  return alert.acknowledged ? "ACTIVE • ACKNOWLEDGED" : "ACTIVE • UNACKNOWLEDGED";
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const timer = window.setInterval(loadAlerts, POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, [loadAlerts]);

  const activeAlerts = useMemo(
    () => alerts.filter((alert) => !alert.resolved),
    [alerts]
  );

  const criticalCount = activeAlerts.filter(
    (alert) => String(alert.severity).toUpperCase() === "CRITICAL"
  ).length;

  const warningCount = activeAlerts.filter(
    (alert) => String(alert.severity).toUpperCase() === "WARNING"
  ).length;

  async function handleAction(id, action) {
    setBusyId(id);
    try {
      if (action === "acknowledge") {
        await api.acknowledgeAlert(id);
      } else {
        await api.resolveAlert(id);
      }
      await loadAlerts();
    } catch (err) {
      setError(err.message || "Alert action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">EVENT MANAGEMENT</p>
            <h2>Alerts</h2>
            <p className="muted">
              Persistent alerts synchronized from the backend AI/risk state.
            </p>
          </div>
          <button className="secondary-button" onClick={loadAlerts} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="status-card-grid alert-summary-grid">
          <div className="status-card">
            <span className="status-card-label">Active</span>
            <strong>{activeAlerts.length}</strong>
            <small>Unresolved alerts</small>
          </div>
          <div className="status-card">
            <span className="status-card-label">Critical</span>
            <strong>{criticalCount}</strong>
            <small>Active critical events</small>
          </div>
          <div className="status-card">
            <span className="status-card-label">Warning</span>
            <strong>{warningCount}</strong>
            <small>Active warning events</small>
          </div>
          <div className="status-card">
            <span className="status-card-label">History</span>
            <strong>{alerts.length}</strong>
            <small>Persistent alert records</small>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">ACTIVE ALERTS</p>
            <h3>Open events</h3>
          </div>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="empty-state">
            <strong>No active alerts</strong>
            <span>The current backend alert state has no unresolved events.</span>
          </div>
        ) : (
          <div className="alert-list">
            {activeAlerts.map((alert) => (
              <article className={`alert-card ${severityClass(alert.severity)}`} key={alert.id}>
                <div className="alert-card-main">
                  <div className="alert-card-title-row">
                    <span className={`severity-badge ${severityClass(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <strong>{alert.event_type}</strong>
                    <span className="lifecycle-badge">{lifecycle(alert)}</span>
                  </div>
                  <p>{alert.message}</p>
                  <div className="alert-meta">
                    <span>Node: {alert.node_id}</span>
                    <span>Risk: {Number(alert.risk_score ?? 0).toFixed(1)}</span>
                    <span>Anomaly: {Number(alert.anomaly_score ?? 0).toFixed(1)}</span>
                    <span>{formatDate(alert.created_at)}</span>
                  </div>
                  {Array.isArray(alert.contributors) && alert.contributors.length > 0 && (
                    <div className="contributor-list">
                      {alert.contributors.map((item) => <span key={item}>{item}</span>)}
                    </div>
                  )}
                </div>
                <div className="alert-actions">
                  {!alert.acknowledged && (
                    <button
                      className="secondary-button"
                      onClick={() => handleAction(alert.id, "acknowledge")}
                      disabled={busyId === alert.id}
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    className="primary-button"
                    onClick={() => handleAction(alert.id, "resolve")}
                    disabled={busyId === alert.id}
                  >
                    {busyId === alert.id ? "Updating…" : "Resolve"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="page-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">AUDIT TRAIL</p>
            <h3>Alert history</h3>
            <p className="muted">All persistent records, including recovery events.</p>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="empty-state">No alert records available.</div>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Node</th>
                  <th>Severity</th>
                  <th>Event</th>
                  <th>Risk</th>
                  <th>Lifecycle</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={`history-${alert.id}`}>
                    <td>{formatDate(alert.created_at)}</td>
                    <td>{alert.node_id}</td>
                    <td><span className={`severity-badge ${severityClass(alert.severity)}`}>{alert.severity}</span></td>
                    <td>{alert.event_type}</td>
                    <td>{Number(alert.risk_score ?? 0).toFixed(1)}</td>
                    <td>{lifecycle(alert)}</td>
                    <td>{alert.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
