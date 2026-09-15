import { useCallback, useEffect, useState } from "react";
import { formatTime } from "../dateTime";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8080";

const POLL_INTERVAL = 5000;

function severityClass(severity) {
  const value = String(severity || "NORMAL").toUpperCase();

  if (value === "CRITICAL") return "critical";
  if (value === "WARNING") return "warning";
  if (value === "OFFLINE") return "offline";
  return "normal";
}

function severityLabel(severity) {
  const value = String(severity || "NORMAL").toUpperCase();
  if (value === "OFFLINE") return "OFFLINE";
  return value;
}

function eventLabel(eventType) {
  return String(eventType || "ALERT").toUpperCase() === "RECOVERY"
    ? "RECOVERY"
    : "ALERT";
}

function formatAlertTime(timestamp) {
  if (!timestamp) return "--";
  return `${formatTime(timestamp)} IST`;
}

export default function AlertPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/alerts?limit=50`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Alerts API returned ${response.status}`);
      }

      const result = await response.json();
      setAlerts(Array.isArray(result) ? result : []);
      setError(null);
    } catch (err) {
      console.error("Alerts API error:", err);
      setError("Alert service unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();

    const timer = setInterval(loadAlerts, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  async function updateAlert(id, action) {
    try {
      setBusyId(id);

      const response = await fetch(
        `${API_URL}/api/alerts/${id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Alert ${action} returned ${response.status}`);
      }

      const updated = await response.json();

      setAlerts((previous) =>
        previous.map((alert) =>
          alert.id === updated.id ? updated : alert
        )
      );
    } catch (err) {
      console.error(`Alert ${action} failed:`, err);
      setError(`Unable to ${action} alert`);
    } finally {
      setBusyId(null);
    }
  }

  const activeAlerts = alerts.filter(
    (alert) =>
      !alert.resolved &&
      ["CRITICAL", "WARNING", "OFFLINE"].includes(
        String(alert.severity).toUpperCase()
      )
  );

  const latestActive = activeAlerts[0] || null;

  return (
    <section className="alert-section">
      <div className="section-header">
        <div>
          <h2>Alerts & Events</h2>
          <p>
            AI/risk state changes and monitoring-node communication events
          </p>
        </div>

        <div className="alert-refresh">
          Auto refresh: <strong>5 sec</strong>
        </div>
      </div>

      {latestActive && (
        <div
          className={`active-alert-banner ${severityClass(
            latestActive.severity
          )}`}
        >
          <div className="active-alert-icon">!</div>

          <div className="active-alert-content">
            <div className="active-alert-title">
              {severityLabel(latestActive.severity)} · {latestActive.node_id}
            </div>
            <div className="active-alert-message">
              {latestActive.message}
            </div>
          </div>

          <div className="active-alert-score">
            <span>Risk score</span>
            <strong>{Number(latestActive.risk_score || 0).toFixed(1)}</strong>
          </div>
        </div>
      )}

      <div className="alerts-card">
        {loading ? (
          <div className="alerts-empty">Loading alerts...</div>
        ) : error ? (
          <div className="alerts-error">{error}</div>
        ) : alerts.length === 0 ? (
          <div className="alerts-empty">
            <strong>No alerts yet</strong>
            <span>
              The system will create an alert when the monitored state changes.
            </span>
          </div>
        ) : (
          <div className="alert-list">
            {alerts.map((alert) => {
              const severity = severityClass(alert.severity);
              const isRecovery = alert.event_type === "RECOVERY";
              const busy = busyId === alert.id;

              return (
                <article
                  className={`alert-row ${severity} ${
                    alert.resolved ? "resolved" : ""
                  }`}
                  key={alert.id}
                >
                  <div className={`alert-severity-dot ${severity}`} />

                  <div className="alert-main">
                    <div className="alert-row-top">
                      <span className={`alert-badge ${severity}`}>
                        {severityLabel(alert.severity)}
                      </span>
                      <span className="alert-event">
                        {eventLabel(alert.event_type)}
                      </span>
                      <strong>{alert.node_id}</strong>
                    </div>

                    <p>{alert.message}</p>

                    {alert.contributors?.length > 0 && (
                      <div className="alert-contributors">
                        {alert.contributors.map((item, index) => (
                          <span key={`${alert.id}-${index}`}>{item}</span>
                        ))}
                      </div>
                    )}

                    <div className="alert-meta">
                      <span>{formatAlertTime(alert.created_at)}</span>
                      {alert.risk_score > 0 && (
                        <span>
                          Risk {Number(alert.risk_score).toFixed(1)}
                        </span>
                      )}
                      {alert.anomaly_score > 0 && (
                        <span>
                          AI {Number(alert.anomaly_score).toFixed(1)}%
                        </span>
                      )}
                      {alert.acknowledged && <span>Acknowledged</span>}
                      {alert.resolved && <span>Resolved</span>}
                    </div>
                  </div>

                  {!isRecovery && !alert.resolved && (
                    <div className="alert-actions">
                      {!alert.acknowledged && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateAlert(alert.id, "acknowledge")
                          }
                        >
                          {busy ? "..." : "Acknowledge"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => updateAlert(alert.id, "resolve")}
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="alert-note">
        Alerts are generated from the existing AI anomaly result, risk engine
        state, and Node 2 communication status. They are prototype monitoring
        events and are not a mine-safety certification or calibrated emergency
        threshold system.
      </div>
    </section>
  );
}
