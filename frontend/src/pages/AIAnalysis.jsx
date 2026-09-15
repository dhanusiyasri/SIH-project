import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../services/api";

const POLL_INTERVAL = 2000;

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function riskClass(risk) {
  const value = String(risk || "NORMAL").toUpperCase();
  if (value.includes("CRITICAL")) return "risk-critical";
  if (value.includes("WARNING") || value.includes("SIGNIFICANT")) return "risk-warning";
  return "risk-normal";
}

function normalizeHistory(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function MetricCard({ label, value, hint, className = "" }) {
  return (
    <article className={`ai-metric ${className}`}>
      <div className="ai-metric-label">{label}</div>
      <div className="ai-metric-value">{value}</div>
      {hint && <div className="ai-metric-hint">{hint}</div>}
    </article>
  );
}

export default function AIAnalysis() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");

  async function loadAI() {
    try {
      const [latestData, historyData, summaryData] = await Promise.all([
        api.getAILatest(),
        api.getAIHistory(),
        api.getAISummary(),
      ]);

      setLatest(latestData);
      setHistory(normalizeHistory(historyData));
      setSummary(summaryData);
      setConnected(true);
      setError("");
    } catch (err) {
      setConnected(false);
      setError(err.message || "Unable to load AI analysis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAI();
    const timer = window.setInterval(loadAI, POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  const chartData = useMemo(
    () =>
      history.slice(-60).map((item, index) => ({
        index: index + 1,
        time: formatTime(item.timestamp),
        anomaly: Number(item.anomaly_score ?? 0),
        risk: Number(item.risk_score ?? 0),
      })),
    [history]
  );

  const anomalyCount = useMemo(
    () =>
      history.filter(
        (item) => String(item.anomaly_label || "").toUpperCase() === "ANOMALY"
      ).length,
    [history]
  );

  const riskScore = Number(latest?.risk_score ?? 0);
  const anomalyScore = Number(latest?.anomaly_score ?? 0);
  const contributors = Array.isArray(latest?.contributors)
    ? latest.contributors
    : [];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">INTELLIGENCE LAYER</span>
          <h1>AI Analysis</h1>
          <p>Real-time anomaly detection and subsidence risk assessment.</p>
        </div>
        <div className={`connection-pill ${connected ? "online" : "offline"}`}>
          <span className="status-dot" />
          {connected ? "Model data connected" : "Model data unavailable"}
        </div>
      </section>

      {error && (
        <div className="error-banner">
          <strong>AI service unavailable.</strong> {error}
        </div>
      )}

      <section className="ai-overview-grid">
        <MetricCard
          label="ANOMALY SCORE"
          value={loading ? "…" : anomalyScore.toFixed(1)}
          hint="0–100 normalized model score"
        />
        <MetricCard
          label="RISK SCORE"
          value={loading ? "…" : riskScore.toFixed(1)}
          hint="Current calculated risk"
        />
        <MetricCard
          label="CURRENT CLASS"
          value={latest?.anomaly_label || "—"}
          hint={latest?.risk ? `Risk: ${latest.risk}` : "Awaiting model output"}
          className={riskClass(latest?.risk)}
        />
        <MetricCard
          label="ANOMALIES IN HISTORY"
          value={loading ? "…" : anomalyCount}
          hint={`${history.length} model records loaded`}
        />
      </section>

      <section className="content-card">
        <div className="card-heading">
          <div>
            <h2>Model Trend</h2>
            <p>Anomaly and risk scores from the latest AI history.</p>
          </div>
          <span className="muted-text">Last update: {formatTime(latest?.timestamp)}</span>
        </div>

        <div className="ai-chart">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" minTickGap={32} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="anomaly"
                  name="Anomaly score"
                  fillOpacity={0.16}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  name="Risk score"
                  fillOpacity={0.10}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No AI history available.</div>
          )}
        </div>
      </section>

      <section className="ai-two-column">
        <article className="content-card">
          <div className="card-heading">
            <div>
              <h2>Latest Decision</h2>
              <p>Most recent output from the anomaly/risk pipeline.</p>
            </div>
            <span className={`risk-badge ${riskClass(latest?.risk)}`}>
              {latest?.risk || "—"}
            </span>
          </div>

          <div className="decision-grid">
            <div>
              <span>Timestamp</span>
              <strong>{formatTime(latest?.timestamp)}</strong>
            </div>
            <div>
              <span>Anomaly label</span>
              <strong>{latest?.anomaly_label || "—"}</strong>
            </div>
            <div>
              <span>Anomaly score</span>
              <strong>{Number.isFinite(anomalyScore) ? anomalyScore.toFixed(2) : "—"}</strong>
            </div>
            <div>
              <span>Risk score</span>
              <strong>{Number.isFinite(riskScore) ? riskScore.toFixed(2) : "—"}</strong>
            </div>
          </div>
        </article>

        <article className="content-card">
          <div className="card-heading">
            <div>
              <h2>Contributing Signals</h2>
              <p>Signals reported by the current backend risk engine.</p>
            </div>
          </div>

          {contributors.length ? (
            <div className="contributor-list">
              {contributors.map((item, index) => (
                <div className="contributor-row" key={`${item}-${index}`}>
                  <span className="contributor-index">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-inline">No contributing abnormal signals reported.</div>
          )}
        </article>
      </section>

      <section className="content-card">
        <div className="card-heading">
          <div>
            <h2>Model Summary</h2>
            <p>Summary returned by the existing AI endpoint.</p>
          </div>
        </div>
        <div className="summary-grid">
          {summary && typeof summary === "object" ? (
            Object.entries(summary).slice(0, 8).map(([key, value]) => (
              <div className="summary-item" key={key}>
                <span>{key.replaceAll("_", " ")}</span>
                <strong>
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </strong>
              </div>
            ))
          ) : (
            <div className="empty-inline">No summary data available.</div>
          )}
        </div>
      </section>
    </div>
  );
}
