import { useEffect, useMemo, useState } from "react";
import GISMap from "../GISMap";
import { api } from "../services/api";

const POLL_INTERVAL = 2000;

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.nodes)) return value.nodes;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function normalizeNodeId(node) {
  return node?.node_id || node?.nodeId || node?.id || node?.name || "NODE";
}

function riskClass(value) {
  const risk = String(value || "NORMAL").toUpperCase();
  if (risk.includes("CRITICAL")) return "risk-critical";
  if (risk.includes("WARNING") || risk.includes("SIGNIFICANT")) return "risk-warning";
  return "risk-normal";
}

export default function MineGIS() {
  const [nodes, setNodes] = useState([]);
  const [sensorRows, setSensorRows] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);

  async function loadGISData() {
    try {
      const [nodeData, latestData] = await Promise.all([
        api.getNodes(),
        api.getLatestSensors(),
      ]);

      const nodeList = normalizeArray(nodeData);
      const latestList = normalizeArray(latestData);

      setNodes(nodeList);
      setSensorRows(latestList);
      setConnected(true);
      setError("");

      if (selectedNode) {
        const id = normalizeNodeId(selectedNode);
        const refreshed = latestList.find((row) => normalizeNodeId(row) === id);
        if (refreshed) setSelectedNode(refreshed);
      }
    } catch (err) {
      setConnected(false);
      setError(err.message || "Unable to load GIS monitoring data");
    }
  }

  useEffect(() => {
    loadGISData();
    const timer = window.setInterval(loadGISData, POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  const mapNodes = useMemo(() => {
    const latestById = new Map(
      sensorRows.map((row) => [normalizeNodeId(row), row])
    );

    return nodes.map((node) => {
      const id = normalizeNodeId(node);
      const latest = latestById.get(id) || {};
      return { ...node, ...latest, node_id: id };
    });
  }, [nodes, sensorRows]);

  // GISMap already knows how to render the project's existing map data.
  // Keep this adapter permissive because backend node metadata can vary.
  const mapData = mapNodes.length ? mapNodes : sensorRows;

  const onlineCount = mapNodes.filter((node) => {
    const status = String(node.status || node.state || "").toUpperCase();
    return status === "ONLINE" || status === "CONNECTED" || node.online === true;
  }).length;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">SPATIAL MONITORING</span>
          <h1>Mine GIS</h1>
          <p>View monitoring nodes and their current sensor/risk state on the mine map.</p>
        </div>
        <div className={`connection-pill ${connected ? "online" : "offline"}`}>
          <span className="status-dot" />
          {connected ? "GIS data connected" : "GIS data unavailable"}
        </div>
      </section>

      {error && (
        <div className="error-banner">
          <strong>GIS data unavailable.</strong> {error}
        </div>
      )}

      <section className="gis-summary-grid">
        <div className="gis-summary-card">
          <span>MONITORING NODES</span>
          <strong>{mapNodes.length || "—"}</strong>
        </div>
        <div className="gis-summary-card">
          <span>ONLINE</span>
          <strong>{mapNodes.length ? onlineCount : "—"}</strong>
        </div>
        <div className="gis-summary-card">
          <span>MAP DATA</span>
          <strong>{mapData.length ? "LIVE" : "—"}</strong>
        </div>
      </section>

      <section className="gis-layout">
        <article className="content-card gis-map-card">
          <div className="card-heading">
            <div>
              <h2>Monitoring Map</h2>
              <p>Node positions and current monitoring state.</p>
            </div>
          </div>
          <div className="gis-map-frame">
            <GISMap nodes={mapData} sensorData={sensorRows} />
          </div>
        </article>

        <aside className="content-card gis-node-list">
          <div className="card-heading">
            <div>
              <h2>Node Status</h2>
              <p>Select a node to inspect its current state.</p>
            </div>
          </div>

          {mapNodes.length ? (
            <div className="gis-node-items">
              {mapNodes.map((node) => {
                const id = normalizeNodeId(node);
                const risk = node.risk || node.edge_risk || "NORMAL";
                const active = normalizeNodeId(selectedNode || {}) === id;

                return (
                  <button
                    className={`gis-node-item ${active ? "selected" : ""}`}
                    key={id}
                    onClick={() => setSelectedNode(node)}
                  >
                    <div>
                      <strong>{id}</strong>
                      <span>{node.name || "Monitoring node"}</span>
                    </div>
                    <span className={`risk-badge ${riskClass(risk)}`}>{risk}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-inline">
              No node metadata is available yet.
            </div>
          )}

          {selectedNode && (
            <div className="gis-selected">
              <span>SELECTED NODE</span>
              <strong>{normalizeNodeId(selectedNode)}</strong>
              <div className="gis-selected-grid">
                <div>
                  <span>Tilt change</span>
                  <b>{Number(selectedNode.tilt_change_deg ?? 0).toFixed(2)}°</b>
                </div>
                <div>
                  <span>FSR mean</span>
                  <b>{Number(selectedNode.fsr_mean ?? 0).toFixed(2)}</b>
                </div>
                <div>
                  <span>Vibration</span>
                  <b>{selectedNode.vibration_detected ? "DETECTED" : "CLEAR"}</b>
                </div>
                <div>
                  <span>Risk</span>
                  <b>{selectedNode.risk || selectedNode.edge_risk || "NORMAL"}</b>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
