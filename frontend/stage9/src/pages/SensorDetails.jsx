import { useEffect, useMemo, useState } from "react";
import SensorChart from "../SensorChart";
import { formatTime } from "../dateTime";
import { api } from "../services/api";

const MAX_POINTS = 90;

function n(v, d = 2) { const x = Number(v); return Number.isFinite(x) ? x.toFixed(d) : "--"; }
function state(v) { return Boolean(v) ? "DETECTED" : "CLEAR"; }
function risk(v) {
  const s = String(v || "NORMAL").toUpperCase();
  if (s.includes("CRITICAL")) return ["CRITICAL", "danger"];
  if (s.includes("SIGNIFICANT") || s.includes("WARNING")) return ["WARNING", "warning"];
  return ["NORMAL", "normal"];
}

export default function SensorDetails({ nodeId, onBack }) {
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!nodeId) return;
    try {
      setError("");
      const [latest, hist] = await Promise.all([api.getLatestSensors(), api.getSensorHistory(nodeId)]);
      const current = (Array.isArray(latest) ? latest : []).find(x => x.node_id === nodeId);
      setReading(current || null);
      const points = (Array.isArray(hist) ? hist : []).slice().reverse().slice(-MAX_POINTS).map(x => ({
        uniqueKey: `${x.node_id}-${x.timestamp}`,
        timestamp: x.timestamp,
        time: formatTime(x.timestamp),
        tilt_change_deg: Number(x.tilt_change_deg) || 0,
        fsr_mean: Number(x.fsr_mean) || 0,
        accel_peak_g: Number(x.accel_peak_g) || 0,
        vibration_events: Number(x.vibration_events) || 0,
      }));
      setHistory(points);
    } catch (e) { setError(e.message || "Unable to load sensor details"); }
    finally { setLoading(false); }
  }

  useEffect(() => { setLoading(true); load(); const id = setInterval(load, 2000); return () => clearInterval(id); }, [nodeId]);

  const [riskText, riskTone] = useMemo(() => risk(reading?.edge_risk), [reading]);
  if (loading && !reading) return <div className="loading-screen"><div className="loader" /><h2>Loading {nodeId}</h2><p>Reading sensor data...</p></div>;

  return <div className="sensor-details-page">
    <div className="page-actions"><button className="secondary-button" onClick={onBack}>← Back to Sensors</button><span className={`connection-chip ${reading ? "online" : "offline"}`}><i /> {reading ? "Live reading" : "No current reading"}</span></div>
    {error && <div className="connection-banner live-error">{error}</div>}
    <section className="detail-hero panel">
      <div><div className="section-kicker">SENSOR NODE</div><h2>{nodeId}</h2><p>Live health and measurements from the backend sensor stream.</p></div>
      <div className={`risk-badge ${riskTone}`}>{riskText}</div>
    </section>
    {!reading ? <div className="empty-state panel">No latest reading is available for this node.</div> : <>
      <section className="metric-grid">
        <Metric label="Tilt change" value={n(reading.tilt_change_deg)} unit="°" />
        <Metric label="Roll change" value={n(reading.roll_change_deg)} unit="°" />
        <Metric label="Pitch change" value={n(reading.pitch_change_deg)} unit="°" />
        <Metric label="FSR mean" value={n(reading.fsr_mean, 1)} />
        <Metric label="Accel RMS" value={n(reading.accel_rms_g, 3)} unit="g" />
        <Metric label="Accel peak" value={n(reading.accel_peak_g, 3)} unit="g" />
        <Metric label="Gyro mean" value={n(reading.gyro_mean_dps, 2)} unit="dps" />
        <Metric label="Gyro peak" value={n(reading.gyro_peak_dps, 2)} unit="dps" />
      </section>
      <section className="panel sensor-state-panel"><div className="panel-heading"><div><h2>Sensor states</h2><p>Digital/event indicators reported by this node.</p></div><span className="refresh-badge">2 sec refresh</span></div><div className="state-grid">
        {[['Vibration',reading.vibration_detected],['Shock',reading.shock_detected],['Tilt',reading.tilt_detected],['Pressure',reading.pressure_detected],['Sudden pressure',reading.sudden_pressure_detected]].map(([label,val])=><div className="boolean-state large" key={label}><span>{label}</span><b className={val ? "active" : "inactive"}>{state(val)}</b></div>)}
      </div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Recent trends</h2><p>Last {history.length} readings retained in the browser view.</p></div><span className="timestamp-badge">{reading.timestamp ? formatTime(reading.timestamp) : "--"}</span></div><div className="charts-grid"><SensorChart data={history} dataKey="tilt_change_deg" title="Tilt Change" unit="°" /><SensorChart data={history} dataKey="fsr_mean" title="FSR Mean" unit="" /><SensorChart data={history} dataKey="accel_peak_g" title="Acceleration Peak" unit="g" /><SensorChart data={history} dataKey="vibration_events" title="Vibration Events" unit="" /></div></section>
    </>}
  </div>;
}
function Metric({label,value,unit}) { return <div className="metric-tile"><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>; }
