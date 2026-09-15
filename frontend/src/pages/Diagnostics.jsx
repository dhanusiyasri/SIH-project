import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const checks = [
  ["nodes", "Node registry", api.getNodes],
  ["sensors", "Latest sensor readings", api.getLatestSensors],
  ["ai-latest", "Latest AI result", api.getAILatest],
  ["ai-history", "AI history", api.getAIHistory],
  ["ai-summary", "AI summary", api.getAISummary],
  ["alerts", "Alert service", api.getAlerts],
];

function summarize(key, data) {
  if (Array.isArray(data)) return `${data.length} records returned`;
  if (data && typeof data === "object") {
    if (key === "ai-latest") return data.anomaly_label ? `${data.anomaly_label} · ${data.risk || "NORMAL"}` : "Valid response";
    if (key === "ai-summary") return "Summary response received";
    return "Valid response received";
  }
  return "Response received";
}

export default function Diagnostics({ onBack }) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setStartedAt(new Date());
    const next = {};
    for (const [key, label, fn] of checks) {
      const started = performance.now();
      try {
        const data = await fn();
        next[key] = { label, ok: true, message: summarize(key, data), ms: Math.round(performance.now() - started) };
      } catch (error) {
        next[key] = { label, ok: false, message: error?.message || "Request failed", ms: Math.round(performance.now() - started) };
      }
      setResults({ ...next });
    }
    setRunning(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const passed = useMemo(() => Object.values(results).filter((item) => item.ok).length, [results]);
  const total = checks.length;

  return (
    <div className="page-stack">
      <section className="page-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">INTEGRATION</p>
            <h2>System Diagnostics</h2>
            <p className="muted">Read-only checks against the existing MineWatch API contract.</p>
          </div>
          <div className="settings-actions">
            {onBack && <button className="secondary-button" onClick={onBack}>← Settings</button>}
            <button className="primary-button" onClick={runChecks} disabled={running}>{running ? "Running…" : "Run checks"}</button>
          </div>
        </div>
      </section>

      <section className="diagnostics-summary">
        <div><strong>{passed}/{total}</strong><span>Checks passing</span></div>
        <div><strong>{running ? "RUNNING" : passed === total ? "READY" : "REVIEW"}</strong><span>Integration status</span></div>
        <div><strong>{startedAt ? startedAt.toLocaleTimeString() : "—"}</strong><span>Last test run</span></div>
      </section>

      <section className="page-section">
        <div className="panel-heading"><div><h2>API contract checks</h2><p>These tests use only GET requests and do not modify sensor, AI, or alert records.</p></div></div>
        <div className="diagnostics-list">
          {checks.map(([key, label]) => {
            const item = results[key];
            return (
              <article className="diagnostic-row" key={key}>
                <div className={`diagnostic-icon ${item?.ok ? "pass" : item ? "fail" : "pending"}`}>{item?.ok ? "✓" : item ? "!" : "·"}</div>
                <div className="diagnostic-main"><strong>{item?.label || label}</strong><span>{item?.message || "Not checked yet"}</span></div>
                <div className="diagnostic-meta"><span>{item ? `${item.ms} ms` : "—"}</span><b className={item?.ok ? "pass-text" : item ? "fail-text" : "muted"}>{item?.ok ? "PASS" : item ? "FAIL" : "PENDING"}</b></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-section settings-note-panel">
        <p className="eyebrow">READINESS NOTE</p>
        <h3>Hardware integration remains separate</h3>
        <p className="muted">A passing frontend diagnostic confirms that the browser can reach the configured backend endpoints. It does not prove ESP32 sensor accuracy, ESP-NOW reliability, database persistence, or ML calibration.</p>
      </section>
    </div>
  );
}
