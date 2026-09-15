import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../services/api";

const MAX_CHART_POINTS = 100;

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function riskClass(value) {
  const risk = String(value || "NORMAL").toUpperCase();
  if (risk.includes("CRITICAL")) return "risk-critical";
  if (risk.includes("WARNING") || risk.includes("SIGNIFICANT")) return "risk-warning";
  return "risk-normal";
}

function Metric({ label, value, hint }) {
  return (
    <article className="history-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

function HistoryChart({ title, data, lines, yDomain }) {
  return (
    <section className="content-card history-chart-card">
      <div className="card-heading">
        <div>
          <h2>{title}</h2>
          <p>Historical readings returned by the backend.</p>
        </div>
        <span className="muted-text">{data.length} points</span>
      </div>
      <div className="history-chart">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" minTickGap={36} />
              <YAxis domain={yDomain || ["auto", "auto"]} />
              <Tooltip />
              {lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state"><strong>No history available</strong><span>There are no records for the selected node.</span></div>
        )}
      </div>
    </section>
  );
}

export default function History() {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState("NODE_01");
  const [sensorHistory, setSensorHistory] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    try {
      const [nodesData, sensorData, aiData, alertsData] = await Promise.all([
        api.getNodes(),
        api.getSensorHistory(selectedNode),
        api.getAIHistory(),
        api.getAlerts(),
      ]);
      const normalizedNodes = normalizeArray(nodesData);
      setNodes(normalizedNodes);
      setSensorHistory(normalizeArray(sensorData));
      setAiHistory(normalizeArray(aiData));
      setAlerts(normalizeArray(alertsData));
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load historical data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [selectedNode]);

  const sensorChart = useMemo(() => {
    return sensorHistory.slice(-MAX_CHART_POINTS).map((item) => ({
      time: formatTime(item.timestamp),
      tilt: Number(item.tilt_change_deg ?? 0),
      accel: Number(item.accel_peak_g ?? 0),
      gyro: Number(item.gyro_peak_dps ?? 0),
      fsr: Number(item.fsr_mean ?? 0),
      vibration: Number(item.vibration_events ?? 0),
    }));
  }, [sensorHistory]);

  const aiChart = useMemo(() => {
    return aiHistory.slice(-MAX_CHART_POINTS).map((item) => ({
      time: formatTime(item.timestamp),
      anomaly: Number(item.anomaly_score ?? 0),
      risk: Number(item.risk_score ?? 0),
    }));
  }, [aiHistory]);

  const criticalCount = alerts.filter((a) => String(a.severity).toUpperCase() === "CRITICAL").length;
  const warningCount = alerts.filter((a) => String(a.severity).toUpperCase() === "WARNING").length;
  const anomalyCount = aiHistory.filter((a) => String(a.anomaly_label).toUpperCase() === "ANOMALY").length;
  const latestSensor = sensorHistory[sensorHistory.length - 1];
  const latestAI = aiHistory[aiHistory.length - 1];

  const availableNodes = nodes.length
    ? nodes.map((node) => typeof node === "string" ? node : node.node_id || node.id).filter(Boolean)
    : ["NODE_01", "NODE_02"];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">HISTORICAL DATA</span>
          <h1>History</h1>
          <p>Review sensor measurements, AI risk trends, and alert records without changing the live monitoring flow.</p>
        </div>
        <button className="secondary-button" onClick={() => loadHistory(true)} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh history"}
        </button>
      </section>

      {error && <div className="error-banner"><strong>History service unavailable.</strong> {error}</div>}

      <section className="history-toolbar content-card">
        <div>
          <span className="field-label">Sensor node</span>
          <select value={selectedNode} onChange={(event) => setSelectedNode(event.target.value)}>
            {availableNodes.map((node) => <option key={node} value={node}>{node}</option>)}
          </select>
        </div>
        <div className="history-note">
          <strong>Backend history</strong>
          <span>Charts show the latest {MAX_CHART_POINTS} points; the source history remains available in the table below.</span>
        </div>
      </section>

      <section className="history-metric-grid">
        <Metric label="SENSOR RECORDS" value={loading ? "…" : sensorHistory.length} hint={selectedNode} />
        <Metric label="AI RECORDS" value={loading ? "…" : aiHistory.length} hint={`${anomalyCount} anomaly classifications`} />
        <Metric label="CRITICAL ALERTS" value={loading ? "…" : criticalCount} hint="From alert history" />
        <Metric label="WARNING ALERTS" value={loading ? "…" : warningCount} hint="From alert history" />
      </section>

      <HistoryChart
        title={`${selectedNode} — Motion and Tilt`}
        data={sensorChart}
        lines={[
          { dataKey: "tilt", name: "Tilt change (deg)" },
          { dataKey: "accel", name: "Acceleration peak (g)" },
        ]}
      />

      <HistoryChart
        title={`${selectedNode} — Gyroscope and Deformation`}
        data={sensorChart}
        lines={[
          { dataKey: "gyro", name: "Gyro peak (dps)" },
          { dataKey: "fsr", name: "FSR mean (raw)" },
        ]}
      />

      <HistoryChart
        title={`${selectedNode} — Vibration Events`}
        data={sensorChart}
        lines={[{ dataKey: "vibration", name: "Vibration events" }]}
        yDomain={[0, "auto"]}
      />

      <HistoryChart
        title="AI Risk and Anomaly Trend"
        data={aiChart}
        lines={[
          { dataKey: "anomaly", name: "Anomaly score" },
          { dataKey: "risk", name: "Risk score" },
        ]}
        yDomain={[0, 100]}
      />

      <section className="content-card">
        <div className="card-heading">
          <div><h2>Latest Historical Snapshot</h2><p>Most recent records returned for the selected node and AI engine.</p></div>
          <span className={`history-risk-pill ${riskClass(latestAI?.risk)}`}>{latestAI?.risk || "—"}</span>
        </div>
        <div className="history-snapshot-grid">
          <div><span>Sensor timestamp</span><strong>{formatDate(latestSensor?.timestamp)}</strong></div>
          <div><span>Tilt change</span><strong>{latestSensor?.tilt_change_deg != null ? `${Number(latestSensor.tilt_change_deg).toFixed(2)}°` : "—"}</strong></div>
          <div><span>FSR mean</span><strong>{latestSensor?.fsr_mean != null ? Number(latestSensor.fsr_mean).toFixed(1) : "—"}</strong></div>
          <div><span>AI timestamp</span><strong>{formatDate(latestAI?.timestamp)}</strong></div>
          <div><span>Anomaly score</span><strong>{latestAI?.anomaly_score != null ? Number(latestAI.anomaly_score).toFixed(1) : "—"}</strong></div>
          <div><span>Risk score</span><strong>{latestAI?.risk_score != null ? Number(latestAI.risk_score).toFixed(1) : "—"}</strong></div>
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading"><div><h2>Sensor History</h2><p>Raw historical fields exposed by <code>/api/sensors/history/{selectedNode}</code>.</p></div></div>
        <div className="table-shell">
          <table className="data-table history-table">
            <thead><tr><th>Time</th><th>Node</th><th>Tilt Δ</th><th>Accel peak</th><th>Gyro peak</th><th>FSR mean</th><th>Vibration</th><th>Risk</th></tr></thead>
            <tbody>
              {sensorHistory.slice().reverse().slice(0, 100).map((item, index) => (
                <tr key={item.id ?? `${item.timestamp}-${index}`}>
                  <td>{formatDate(item.timestamp)}</td><td>{item.node_id || selectedNode}</td>
                  <td>{item.tilt_change_deg != null ? Number(item.tilt_change_deg).toFixed(2) : "—"}</td>
                  <td>{item.accel_peak_g != null ? Number(item.accel_peak_g).toFixed(3) : "—"}</td>
                  <td>{item.gyro_peak_dps != null ? Number(item.gyro_peak_dps).toFixed(2) : "—"}</td>
                  <td>{item.fsr_mean != null ? Number(item.fsr_mean).toFixed(1) : "—"}</td>
                  <td>{item.vibration_events ?? 0}</td>
                  <td><span className={`history-risk-pill ${riskClass(item.risk)}`}>{item.risk || "NORMAL"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sensorHistory.length && <div className="empty-state"><strong>No sensor records</strong><span>Run the simulator or connect a node, then refresh this page.</span></div>}
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading"><div><h2>AI History</h2><p>Historical anomaly and risk classifications.</p></div></div>
        <div className="table-shell">
          <table className="data-table history-table">
            <thead><tr><th>Time</th><th>Anomaly score</th><th>Risk score</th><th>Risk</th><th>Classification</th></tr></thead>
            <tbody>
              {aiHistory.slice().reverse().slice(0, 100).map((item, index) => (
                <tr key={`${item.timestamp}-${index}`}>
                  <td>{formatDate(item.timestamp)}</td><td>{Number(item.anomaly_score ?? 0).toFixed(1)}</td><td>{Number(item.risk_score ?? 0).toFixed(1)}</td>
                  <td><span className={`history-risk-pill ${riskClass(item.risk)}`}>{item.risk || "NORMAL"}</span></td>
                  <td>{item.anomaly_label || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!aiHistory.length && <div className="empty-state"><strong>No AI history</strong><span>The AI endpoint has not returned historical model records.</span></div>}
        </div>
      </section>

      <section className="content-card">
        <div className="card-heading"><div><h2>Alert History</h2><p>Persistent alert and recovery records from the backend alert lifecycle.</p></div></div>
        <div className="table-shell">
          <table className="data-table history-table">
            <thead><tr><th>Created</th><th>Node</th><th>Severity</th><th>Event</th><th>Risk</th><th>Lifecycle</th></tr></thead>
            <tbody>
              {alerts.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100).map((alert) => {
                const lifecycle = alert.event_type === "RECOVERY" ? "RECOVERY" : alert.resolved ? "RESOLVED" : alert.acknowledged ? "ACKNOWLEDGED" : "ACTIVE";
                return <tr key={alert.id}>
                  <td>{formatDate(alert.created_at)}</td><td>{alert.node_id || "—"}</td>
                  <td><span className={`history-risk-pill ${riskClass(alert.severity)}`}>{alert.severity || "—"}</span></td>
                  <td>{alert.event_type || "—"}</td><td>{Number(alert.risk_score ?? 0).toFixed(1)}</td><td>{lifecycle}</td>
                </tr>;
              })}
            </tbody>
          </table>
          {!alerts.length && <div className="empty-state"><strong>No alert history</strong><span>No persistent alert records have been returned.</span></div>}
        </div>
      </section>
    </div>
  );
}
