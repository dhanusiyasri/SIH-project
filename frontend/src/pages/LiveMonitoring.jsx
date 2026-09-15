import { useEffect, useMemo, useState } from "react";
import SensorChart from "../SensorChart";
import { formatTime } from "../dateTime";
import { api } from "../services/api";
import { useLiveSensors } from "../hooks/useLiveSensors";

const MAX_POINTS = 60;

function riskInfo(risk) {
  const value = String(risk || "NORMAL").toUpperCase();
  if (value.includes("CRITICAL")) return { text: "CRITICAL", tone: "danger" };
  if (value.includes("SIGNIFICANT") || value.includes("WARNING")) {
    return { text: "WARNING", tone: "warning" };
  }
  return { text: "NORMAL", tone: "normal" };
}

function valueOf(value, decimals = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(decimals) : "--";
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

function SensorValue({ label, value, unit = "", emphasis = false }) {
  return (
    <div className={`live-value ${emphasis ? "emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{value}<small>{unit}</small></strong>
    </div>
  );
}

function BooleanState({ label, value }) {
  const active = Boolean(value);
  return (
    <div className="boolean-state">
      <span>{label}</span>
      <b className={active ? "active" : "inactive"}>
        {active ? "DETECTED" : "CLEAR"}
      </b>
    </div>
  );
}

export default function LiveMonitoring() {
  const {
    nodes,
    latest,
    loading,
    connected,
    lastUpdated,
    error,
    paused,
    setPaused,
    stale,
    refresh,
  } = useLiveSensors(2000);

  const [selectedNode, setSelectedNode] = useState("");
  const [history, setHistory] = useState({});
  const [historyLoading, setHistoryLoading] = useState({});

  const activeNodeId = selectedNode || nodes[0] || "";
  const selectedReading = latest.find((item) => item.node_id === activeNodeId);

  const overallRisk = useMemo(() => {
    const risks = latest.map((item) => riskInfo(item.edge_risk).text);
    if (risks.includes("CRITICAL")) return { text: "CRITICAL", tone: "danger" };
    if (risks.includes("WARNING")) return { text: "WARNING", tone: "warning" };
    return { text: "NORMAL", tone: "normal" };
  }, [latest]);

  async function loadHistory(nodeId) {
    if (!nodeId || history[nodeId]) return;
    setHistoryLoading((previous) => ({ ...previous, [nodeId]: true }));
    try {
      const result = await api.getSensorHistory(nodeId);
      const points = (Array.isArray(result) ? result : [])
        .slice()
        .reverse()
        .map(chartPoint)
        .slice(-MAX_POINTS);
      setHistory((previous) => ({ ...previous, [nodeId]: points }));
    } catch (err) {
      console.error(`History load failed for ${nodeId}:`, err);
      setHistory((previous) => ({ ...previous, [nodeId]: [] }));
    } finally {
      setHistoryLoading((previous) => ({ ...previous, [nodeId]: false }));
    }
  }

  function selectNode(nodeId) {
    setSelectedNode(nodeId);
  }

  useEffect(() => {
    if (activeNodeId && !history[activeNodeId]) {
      loadHistory(activeNodeId);
    }
  }, [activeNodeId]);

  useEffect(() => {
    if (!activeNodeId || !selectedReading || !history[activeNodeId]) return;
    const point = chartPoint(selectedReading);
    setHistory((previous) => {
      const current = previous[activeNodeId] || [];
      if (current.some((item) => item.uniqueKey === point.uniqueKey)) return previous;
      return { ...previous, [activeNodeId]: [...current, point].slice(-MAX_POINTS) };
    });
  }, [activeNodeId, selectedReading, history]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <h2>Loading Live Monitoring</h2>
        <p>Connecting to the sensor gateway...</p>
      </div>
    );
  }

  return (
    <div className="live-monitoring-page">
      <section className="live-toolbar panel">
        <div>
          <div className="section-kicker">REAL-TIME MONITORING</div>
          <h2>Sensor Network</h2>
          <p>
            Gateway data is read directly from the existing FastAPI sensor API.
            No hardware-specific logic is required in the frontend.
          </p>
        </div>
        <div className="live-actions">
          <span className={`connection-chip ${connected ? "online" : "offline"}`}>
            <i /> {connected ? "Gateway connected" : "Gateway offline"}
          </span>
          <button className="secondary-button" type="button" onClick={refresh}>
            Refresh now
          </button>
          <button
            className={`secondary-button ${paused ? "active-button" : ""}`}
            type="button"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "Resume live" : "Pause live"}
          </button>
        </div>
      </section>

      {!connected && (
        <div className="connection-banner live-error">
          {error || "Unable to receive live sensor data. Retrying connection..."}
        </div>
      )}

      {connected && stale && (
        <div className="connection-banner live-error">Live readings are stale. Waiting for a fresh gateway response.</div>
      )}

      <section className="overview-grid live-overview-grid">
        <div className="status-card">
          <span className="status-card-label">Monitoring Nodes</span>
          <strong className="status-card-value">{nodes.length}</strong>
          <span className="status-card-detail">Configured in backend</span>
        </div>
        <div className="status-card">
          <span className="status-card-label">Online Feeds</span>
          <strong className="status-card-value">{latest.length}/{nodes.length}</strong>
          <span className="status-card-detail">Latest reading available</span>
        </div>
        <div className="status-card">
          <span className="status-card-label">Network State</span>
          <strong className={`status-card-value ${connected ? "value-normal" : "value-warning"}`}>
            {connected ? "ONLINE" : "OFFLINE"}
          </strong>
          <span className="status-card-detail">
            {lastUpdated ? `Updated ${formatTime(lastUpdated.toISOString())}` : "Waiting for update"}
          </span>
        </div>
        <div className="status-card">
          <span className="status-card-label">Overall Risk</span>
          <strong className={`status-card-value value-${overallRisk.tone}`}>
            {overallRisk.text}
          </strong>
          <span className="status-card-detail">Latest node status</span>
        </div>
      </section>

      <section className="live-node-selector panel">
        <div className="panel-heading">
          <div>
            <h2>Node Selection</h2>
            <p>Select a node to inspect its live sensor values and recent trends.</p>
          </div>
          <span className="refresh-badge">{paused ? "Updates paused" : "Auto refresh · 2 sec"}</span>
        </div>
        <div className="node-tabs">
          {nodes.length === 0 ? (
            <div className="empty-state compact-empty">No monitoring nodes returned by the backend.</div>
          ) : (
            nodes.map((nodeId) => {
              const reading = latest.find((item) => item.node_id === nodeId);
              const risk = riskInfo(reading?.edge_risk);
              return (
                <button
                  type="button"
                  className={`node-tab ${activeNodeId === nodeId ? "selected" : ""}`}
                  key={nodeId}
                  onClick={() => selectNode(nodeId)}
                >
                  <span>{nodeId}</span>
                  <small className={risk.tone}>{reading ? risk.text : "OFFLINE"}</small>
                </button>
              );
            })
          )}
        </div>
      </section>

      {selectedReading ? (
        <>
          <section className="panel live-node-detail">
            <div className="panel-heading">
              <div>
                <div className="section-kicker">SELECTED NODE</div>
                <h2>{activeNodeId}</h2>
                <p>Latest gateway reading received from this monitoring node.</p>
              </div>
              <div className="selected-node-status">
                <span className={`status ${riskInfo(selectedReading.edge_risk).tone}`}>
                  {riskInfo(selectedReading.edge_risk).text}
                </span>
                <span className="last-seen">{formatTime(selectedReading.timestamp)} IST</span>
              </div>
            </div>

            <div className="live-values-grid">
              <SensorValue label="Tilt Change" value={valueOf(selectedReading.tilt_change_deg)} unit="°" emphasis />
              <SensorValue label="Roll Change" value={valueOf(selectedReading.roll_change_deg)} unit="°" />
              <SensorValue label="Pitch Change" value={valueOf(selectedReading.pitch_change_deg)} unit="°" />
              <SensorValue label="FSR Mean" value={valueOf(selectedReading.fsr_mean, 0)} />
              <SensorValue label="FSR Min" value={valueOf(selectedReading.fsr_min, 0)} />
              <SensorValue label="FSR Max" value={valueOf(selectedReading.fsr_max, 0)} />
              <SensorValue label="Acceleration RMS" value={valueOf(selectedReading.accel_rms_g, 3)} unit="g" />
              <SensorValue label="Acceleration Peak" value={valueOf(selectedReading.accel_peak_g, 3)} unit="g" />
              <SensorValue label="Gyro Mean" value={valueOf(selectedReading.gyro_mean_dps)} unit="dps" />
              <SensorValue label="Gyro Peak" value={valueOf(selectedReading.gyro_peak_dps)} unit="dps" />
              <SensorValue label="Vibration Events" value={valueOf(selectedReading.vibration_events, 0)} />
              <SensorValue label="Vibration Duration" value={valueOf(selectedReading.vibration_duration_ms, 0)} unit="ms" />
            </div>

            <div className="sensor-state-grid">
              <BooleanState label="Vibration" value={selectedReading.vibration_detected} />
              <BooleanState label="Shock" value={selectedReading.shock_detected} />
              <BooleanState label="Tilt" value={selectedReading.tilt_detected} />
              <BooleanState label="Pressure" value={selectedReading.pressure_detected} />
              <BooleanState label="Sudden Pressure" value={selectedReading.sudden_pressure_detected} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>{activeNodeId} Sensor Trends</h2>
                <p>Latest historical readings retained for the selected node.</p>
              </div>
              {historyLoading[activeNodeId] && <span className="refresh-badge">Loading history...</span>}
            </div>

            <div className="chart-grid live-chart-grid">
              <SensorChart title="Tilt Change" subtitle="Structural inclination change" data={history[activeNodeId] || []} dataKey="tilt_change_deg" unit="°" />
              <SensorChart title="FSR Pressure" subtitle="Deformation indicator" data={history[activeNodeId] || []} dataKey="fsr_mean" unit="" />
              <SensorChart title="Peak Acceleration" subtitle="IMU acceleration magnitude" data={history[activeNodeId] || []} dataKey="accel_peak_g" unit="g" />
              <SensorChart title="Vibration Events" subtitle="Detected vibration events" data={history[activeNodeId] || []} dataKey="vibration_events" unit="" />
            </div>
          </section>
        </>
      ) : (
        <div className="panel empty-state">
          <h2>No live reading available</h2>
          <p>Start the backend and simulator, or connect the gateway, then refresh this page.</p>
        </div>
      )}
    </div>
  );
}
