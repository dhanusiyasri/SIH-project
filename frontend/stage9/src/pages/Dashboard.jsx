import { useCallback, useEffect, useMemo, useState } from "react";
import SensorChart from "../SensorChart";
import GISMap from "../GISMap";
import AlertPanel from "../components/AlertPanel";
import StatusCard from "../components/StatusCard";
import { api } from "../services/api";
import { formatTime } from "../dateTime";

const POLL_INTERVAL = 2000;
const MAX_POINTS = 60;

function riskInfo(risk) {
  const value = String(risk || "NORMAL").toUpperCase();
  if (value.includes("CRITICAL")) return { text: "CRITICAL", tone: "danger" };
  if (value.includes("SIGNIFICANT") || value.includes("WARNING")) return { text: "WARNING", tone: "warning" };
  return { text: "NORMAL", tone: "normal" };
}

function number(value, decimals = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : "--";
}

function chartPoint(reading) {
  return {
    uniqueKey: `${reading.node_id}-${reading.timestamp}`,
    timestamp: reading.timestamp,
    time: formatTime(reading.timestamp),
    tilt_change_deg: Number(reading.tilt_change_deg) || 0,
    fsr_mean: Number(reading.fsr_mean) || 0,
    accel_peak_g: Number(reading.accel_peak_g) || 0,
    vibration_events: Number(reading.vibration_events) || 0,
  };
}

export default function Dashboard({ onConnectionChange }) {
  const [nodes, setNodes] = useState([]);
  const [latestData, setLatestData] = useState([]);
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const setConnection = useCallback((value) => {
    setConnected(value);
    onConnectionChange?.(value);
  }, [onConnectionChange]);

  const initialize = useCallback(async () => {
    try {
      const [nodesResult, latestResult] = await Promise.all([
        api.getNodes(),
        api.getLatestSensors(),
      ]);

      const rawNodes = Array.isArray(nodesResult) ? nodesResult : nodesResult.nodes || [];
      const nodeList = rawNodes.map((node) => typeof node === "string" ? node : node.node_id).filter(Boolean);
      const readings = Array.isArray(latestResult) ? latestResult : [];

      setNodes(nodeList);
      setLatestData(readings);

      const initialHistory = {};
      await Promise.all(nodeList.map(async (nodeId) => {
        try {
          const result = await api.getSensorHistory(nodeId);
          initialHistory[nodeId] = (Array.isArray(result) ? result : [])
            .slice().reverse().map(chartPoint).slice(-MAX_POINTS);
        } catch {
          initialHistory[nodeId] = [];
        }
      }));

      setHistory(initialHistory);
      setConnection(true);
    } catch (error) {
      console.error("Dashboard initialization failed:", error);
      setConnection(false);
    } finally {
      setLoading(false);
    }
  }, [setConnection]);

  const updateLive = useCallback(async () => {
    try {
      const result = await api.getLatestSensors();
      if (!Array.isArray(result)) throw new Error("Unexpected latest sensor response");
      setLatestData(result);
      setConnection(true);

      setHistory((previous) => {
        const next = { ...previous };
        result.forEach((reading) => {
          const nodeId = reading.node_id;
          if (!nodeId) return;
          const points = next[nodeId] || [];
          const point = chartPoint(reading);
          if (!points.some((item) => item.uniqueKey === point.uniqueKey)) {
            next[nodeId] = [...points, point].slice(-MAX_POINTS);
          }
        });
        return next;
      });
    } catch (error) {
      console.error("Live update failed:", error);
      setConnection(false);
    }
  }, [setConnection]);

  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
    if (loading) return undefined;
    const timer = setInterval(updateLive, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loading, updateLive]);

  const onlineCount = useMemo(() => latestData.filter((item) => item?.node_id).length, [latestData]);
  const overallRisk = useMemo(() => {
    const risks = latestData.map((item) => riskInfo(item.edge_risk).text);
    if (risks.includes("CRITICAL")) return "CRITICAL";
    if (risks.includes("WARNING")) return "WARNING";
    return "NORMAL";
  }, [latestData]);

  if (loading) {
    return <div className="loading-screen"><div className="loader" /><h2>Loading MineWatch</h2><p>Connecting to monitoring server...</p></div>;
  }

  return (
    <div className="dashboard-page">
      {!connected && <div className="connection-banner">Unable to receive live sensor data. Retrying connection...</div>}

      <section className="overview-grid">
        <StatusCard label="Monitoring Nodes" value={nodes.length || 0} detail="Configured nodes" />
        <StatusCard label="Online Nodes" value={`${onlineCount}/${nodes.length || 0}`} detail="Current sensor feed" tone={onlineCount === nodes.length && nodes.length ? "normal" : "warning"} />
        <StatusCard label="Active Alerts" value="—" detail="Existing alert module" tone="neutral" />
        <StatusCard label="Current Risk" value={overallRisk} detail="Based on latest readings" tone={riskInfo(overallRisk).tone} />
      </section>

      <section className="dashboard-two-column">
        <div className="panel map-panel">
          <div className="panel-heading"><div><h2>Mine Overview</h2><p>Current monitoring locations and status</p></div></div>
          <GISMap />
        </div>
        <div className="panel alerts-panel">
          <div className="panel-heading"><div><h2>Recent Alerts</h2><p>Current alert information</p></div></div>
          <AlertPanel />
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>Monitoring Nodes</h2><p>Latest readings from the mine sensor network</p></div><span className="refresh-badge">Auto refresh · 2 sec</span></div>
        <div className="node-grid dashboard-node-grid">
          {nodes.map((nodeId) => {
            const data = latestData.find((item) => item.node_id === nodeId);
            if (!data) return <div className="node-card offline-card" key={nodeId}><div><span className="node-label">Monitoring Node</span><h3>{nodeId}</h3></div><span className="status offline">OFFLINE</span><p>Waiting for sensor data...</p></div>;
            const risk = riskInfo(data.edge_risk);
            return <div className="node-card" key={nodeId}>
              <div className="node-header"><div><span className="node-label">Monitoring Node</span><h3>{nodeId}</h3></div><span className={`status ${risk.tone}`}>{risk.text}</span></div>
              <div className="metrics-grid">
                <div className="metric"><span>Tilt Change</span><strong>{number(data.tilt_change_deg)}<small>°</small></strong></div>
                <div className="metric"><span>FSR Pressure</span><strong>{number(data.fsr_mean, 0)}</strong></div>
                <div className="metric"><span>Peak Acceleration</span><strong>{number(data.accel_peak_g, 3)}<small>g</small></strong></div>
                <div className="metric"><span>Vibration Events</span><strong>{number(data.vibration_events, 0)}</strong></div>
                <div className="metric"><span>Roll Change</span><strong>{number(data.roll_change_deg)}<small>°</small></strong></div>
                <div className="metric"><span>Pitch Change</span><strong>{number(data.pitch_change_deg)}<small>°</small></strong></div>
              </div>
              <div className="node-footer"><span>Last update</span><strong>{formatTime(data.timestamp)} IST</strong></div>
            </div>;
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h2>Sensor Trends</h2><p>Latest 60 readings retained for dashboard visualization</p></div></div>
        {nodes.map((nodeId) => {
          const data = history[nodeId] || [];
          return <div className="node-charts" key={nodeId}>
            <div className="node-chart-heading"><h3>{nodeId}</h3><span>{data.length} readings</span></div>
            <div className="chart-grid">
              <SensorChart title="Tilt Change" subtitle="Structural inclination" data={data} dataKey="tilt_change_deg" unit="°" />
              <SensorChart title="FSR Pressure" subtitle="Deformation indicator" data={data} dataKey="fsr_mean" unit="" />
              <SensorChart title="Peak Acceleration" subtitle="IMU acceleration magnitude" data={data} dataKey="accel_peak_g" unit="g" />
              <SensorChart title="Vibration Events" subtitle="Detected vibration events" data={data} dataKey="vibration_events" unit="" />
            </div>
          </div>;
        })}
      </section>
    </div>
  );
}
