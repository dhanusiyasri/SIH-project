import { useMemo, useState } from "react";
import { formatTime } from "../dateTime";
import { useLiveSensors } from "../hooks/useLiveSensors";
import SensorDetails from "./SensorDetails";

function risk(v) { const s=String(v||"NORMAL").toUpperCase(); if(s.includes("CRITICAL"))return ["CRITICAL","danger"]; if(s.includes("SIGNIFICANT")||s.includes("WARNING"))return ["WARNING","warning"]; return ["NORMAL","normal"]; }
function val(v,d=2){const x=Number(v);return Number.isFinite(x)?x.toFixed(d):"--"}

export default function Sensors(){
 const {nodes,latest,loading,connected,lastUpdated,error}=useLiveSensors(2000);
 const [selected,setSelected]=useState(null);
 const rows=useMemo(()=>nodes.map(id=>({id,reading:latest.find(x=>x.node_id===id)})),[nodes,latest]);
 if(selected) return <SensorDetails nodeId={selected} onBack={()=>setSelected(null)} />;
 if(loading) return <div className="loading-screen"><div className="loader"/><h2>Loading Sensors</h2><p>Connecting to the monitoring gateway...</p></div>;
 return <div className="sensors-page">
   <section className="page-intro panel"><div><div className="section-kicker">SENSOR NETWORK</div><h2>Nodes & Sensor Health</h2><p>Inspect every configured monitoring node and open a detailed live view without changing the hardware data contract.</p></div><div className={`connection-chip ${connected?"online":"offline"}`}><i/> {connected?"Gateway connected":"Gateway offline"}</div></section>
   {error&&<div className="connection-banner live-error">{error}</div>}
   <div className="sensor-summary"><div><strong>{nodes.length}</strong><span>Configured nodes</span></div><div><strong>{latest.length}</strong><span>Reporting now</span></div><div><strong>{nodes.length-latest.length}</strong><span>Without latest reading</span></div><div><strong>{lastUpdated?formatTime(lastUpdated.toISOString()):"--"}</strong><span>Last update</span></div></div>
   <section className="panel"><div className="panel-heading"><div><h2>Monitoring nodes</h2><p>Click a node for full sensor-level diagnostics.</p></div><span className="refresh-badge">Live · 2 sec</span></div>
    {rows.length===0?<div className="empty-state">No nodes returned by <code>/api/nodes</code>.</div>:<div className="sensor-table-wrap"><table className="sensor-table"><thead><tr><th>Node</th><th>Status</th><th>Risk</th><th>Tilt Δ</th><th>FSR mean</th><th>Accel peak</th><th>Vibration</th><th>Updated</th><th/></tr></thead><tbody>{rows.map(({id,reading})=>{const [r,t]=risk(reading?.edge_risk);return <tr key={id}><td><strong>{id}</strong></td><td><span className={`dot-status ${reading?"online":"offline"}`}><i/>{reading?"ONLINE":"OFFLINE"}</span></td><td><span className={`table-risk ${t}`}>{reading?r:"--"}</span></td><td>{val(reading?.tilt_change_deg)}°</td><td>{val(reading?.fsr_mean,1)}</td><td>{val(reading?.accel_peak_g,3)} g</td><td>{reading?.vibration_detected?"DETECTED":"CLEAR"}</td><td>{reading?.timestamp?formatTime(reading.timestamp):"--"}</td><td><button className="view-button" onClick={()=>setSelected(id)}>View details →</button></td></tr>})}</tbody></table></div>}
   </section>
 </div>;
}
