import { useCallback, useEffect, useState } from "react";
import SensorChart from "./SensorChart";
import "./index.css";
import AIAnalysis from "./components/AIAnalysis";
import AlertPanel from "./components/AlertPanel";
import GISMap from "./GISMap";
import { formatTime } from "./dateTime";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8080";

const POLL_INTERVAL = 2000;
const MAX_POINTS = 60;

function formatValue(value, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "--";

  return number.toFixed(decimals);
}

function getRiskInfo(risk) {
  const value = String(risk || "NORMAL").toUpperCase();

  if (value.includes("CRITICAL")) {
    return {
      text: "CRITICAL",
      className: "danger",
    };
  }

  if (
    value.includes("SIGNIFICANT") ||
    value.includes("WARNING")
  ) {
    return {
      text: "WARNING",
      className: "warning",
    };
  }

  return {
    text: "NORMAL",
    className: "normal",
  };
}

function App() {
  const [nodes, setNodes] = useState([]);
  const [latestData, setLatestData] = useState([]);
  const [history, setHistory] = useState({});

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  /*
   * Convert one backend reading into chart data.
   */
  const createChartPoint = useCallback((reading) => {
    return {
      uniqueKey: `${reading.node_id}-${reading.timestamp}`,

      timestamp: reading.timestamp,
      time: formatTime(reading.timestamp),

      tilt_change_deg:
        Number(reading.tilt_change_deg) || 0,

      fsr_mean:
        Number(reading.fsr_mean) || 0,

      accel_peak_g:
        Number(reading.accel_peak_g) || 0,

      vibration_events:
        Number(reading.vibration_events) || 0,
    };
  }, []);

  /*
   * Load the dashboard for the first time.
   *
   * History is loaded only ONCE here.
   */
  const initializeDashboard = useCallback(async () => {
    try {
      console.log(
        "Connecting to FastAPI:",
        API_URL
      );

      const [nodesResponse, latestResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/nodes`),
          fetch(`${API_URL}/api/sensors/latest`),
        ]);

      if (!nodesResponse.ok) {
        throw new Error(
          `Nodes API returned ${nodesResponse.status}`
        );
      }

      if (!latestResponse.ok) {
        throw new Error(
          `Latest API returned ${latestResponse.status}`
        );
      }

      const nodesResult =
        await nodesResponse.json();

      const latestResult =
        await latestResponse.json();

      console.log(
        "Nodes API:",
        nodesResult
      );

      console.log(
        "Latest API:",
        latestResult
      );

      const nodeListRaw =
  Array.isArray(nodesResult)
    ? nodesResult
    : nodesResult.nodes || [];

const nodeList = nodeListRaw
  .map((node) =>
    typeof node === "string" ? node : node.node_id
  )
  .filter(Boolean);

const readings =
  Array.isArray(latestResult)
    ? latestResult
    : [];

      setNodes(nodeList);
      setLatestData(readings);

      /*
       * Load historical data for every node.
       */
      const initialHistory = {};

      for (const nodeId of nodeList) {
        try {
          const response = await fetch(
            `${API_URL}/api/sensors/history/${encodeURIComponent(
              nodeId
            )}`
          );

          if (!response.ok) {
            initialHistory[nodeId] = [];
            continue;
          }

          const result =
            await response.json();

          const records =
            Array.isArray(result)
              ? result
              : [];

          /*
           * Backend normally returns newest first.
           * Reverse it for chronological graph order.
           */
          initialHistory[nodeId] = records
            .slice()
            .reverse()
            .map(createChartPoint)
            .slice(-MAX_POINTS);

        } catch (error) {
          console.error(
            `History error for ${nodeId}:`,
            error
          );

          initialHistory[nodeId] = [];
        }
      }

      setHistory(initialHistory);
      setConnected(true);

    } catch (error) {
      console.error(
        "Dashboard initialization failed:",
        error
      );

      setConnected(false);

    } finally {
      setLoading(false);
    }
  }, [createChartPoint]);

  /*
   * Fetch only the latest readings.
   *
   * IMPORTANT:
   * This does NOT reload history.
   *
   * Instead, the new readings are appended
   * to the existing chart data.
   */
  const updateLiveData = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/sensors/latest`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Latest API returned ${response.status}`
        );
      }

      const readings =
        await response.json();

      if (!Array.isArray(readings)) {
        console.error(
          "Unexpected latest response:",
          readings
        );

        return;
      }

      console.log(
        "Live readings:",
        readings
      );

      setLatestData(readings);
      setConnected(true);

      /*
       * Add the latest reading to the chart.
       */
      setHistory((previousHistory) => {
        const updatedHistory = {
          ...previousHistory,
        };

        readings.forEach((reading) => {
          const nodeId =
            reading.node_id;

          if (!nodeId) return;

          const oldPoints =
            updatedHistory[nodeId] || [];

          /*
           * Use NODE + TIMESTAMP as the unique
           * reading identifier.
           *
           * Do NOT use database id because
           * NODE_01 and NODE_02 can share the
           * same gateway packet id.
           */
          const uniqueKey =
            `${nodeId}-${reading.timestamp}`;

          const alreadyExists =
            oldPoints.some(
              (point) =>
                point.uniqueKey === uniqueKey
            );

          if (alreadyExists) {
            return;
          }

          const newPoint =
            createChartPoint(reading);

          updatedHistory[nodeId] = [
            ...oldPoints,
            newPoint,
          ].slice(-MAX_POINTS);
        });

        return updatedHistory;
      });

    } catch (error) {
      console.error(
        "Live update failed:",
        error
      );

      setConnected(false);
    }
  }, [createChartPoint]);

  /*
   * First dashboard load.
   */
  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  /*
   * Continue polling every 2 seconds.
   */
  useEffect(() => {
    if (loading) return;

    const timer = setInterval(
      updateLiveData,
      POLL_INTERVAL
    );

    return () => {
      clearInterval(timer);
    };
  }, [
    loading,
    updateLiveData,
  ]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />

        <h2>
          Mine Subsidence Monitoring System
        </h2>

        <p>
          Connecting to monitoring server...
        </p>
      </div>
    );
  }

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="top-header">

        <div>
          <span className="eyebrow">
            SMART MINE MONITORING
          </span>

          <h1>
            Mine Subsidence Monitoring System
          </h1>

          <p>
            Real-time structural movement,
            vibration and pressure monitoring
          </p>
        </div>

        <div className="live-status">

          <span
            className={`live-dot ${
              connected ? "" : "offline"
            }`}
          />

          {connected
            ? "LIVE"
            : "OFFLINE"}

        </div>

      </header>


      {/* ================= CONNECTION WARNING ================= */}

      {!connected && (
        <div className="connection-warning">
          Unable to receive live sensor data.
          Retrying connection...
        </div>
      )}


      <main>

        {/* ================= MONITORING NODES ================= */}

        <GISMap />

        <AlertPanel />

        <section className="section">

          <div className="section-header">

            <div>
              <h2>
                Monitoring Nodes
              </h2>

              <p>
                Current readings from the
                mine sensor network
              </p>
            </div>

            <div className="refresh-info">
              Auto refresh:{" "}
              <strong>2 sec</strong>
            </div>

          </div>


          <div className="node-grid">

            {nodes.length === 0 ? (

              <div className="empty-card">

                <h3>
                  No monitoring nodes
                </h3>

                <p>
                  Waiting for sensor data...
                </p>

              </div>

            ) : (

              nodes.map((nodeId) => {

                const data =
                  latestData.find(
                    (item) =>
                      item.node_id === nodeId
                  );

                /*
                 * Node exists but currently
                 * has no latest reading.
                 */
                if (!data) {
                  return (
                    <div
                      className="node-card"
                      key={nodeId}
                    >

                      <div className="node-header">

                        <div>
                          <span className="node-label">
                            Monitoring Node
                          </span>

                          <h3>
                            {nodeId}
                          </h3>
                        </div>

                        <span className="status offline">
                          OFFLINE
                        </span>

                      </div>

                      <div className="offline-message">
                        Waiting for sensor data...
                      </div>

                    </div>
                  );
                }

                const risk =
                  getRiskInfo(
                    data.edge_risk
                  );

                return (
                  <div
                    className="node-card"
                    key={nodeId}
                  >

                    <div className="node-header">

                      <div>
                        <span className="node-label">
                          Monitoring Node
                        </span>

                        <h3>
                          {nodeId}
                        </h3>
                      </div>

                      <span
                        className={`status ${risk.className}`}
                      >
                        {risk.text}
                      </span>

                    </div>


                    <div className="metrics-grid">

                      <div className="metric">

                        <span>
                          Tilt Change
                        </span>

                        <strong>
                          {formatValue(
                            data.tilt_change_deg
                          )}
                          <small>°</small>
                        </strong>

                      </div>


                      <div className="metric">

                        <span>
                          FSR Pressure
                        </span>

                        <strong>
                          {formatValue(
                            data.fsr_mean,
                            0
                          )}
                        </strong>

                      </div>


                      <div className="metric">

                        <span>
                          Peak Acceleration
                        </span>

                        <strong>
                          {formatValue(
                            data.accel_peak_g,
                            3
                          )}
                          <small>g</small>
                        </strong>

                      </div>


                      <div className="metric">

                        <span>
                          Vibration Events
                        </span>

                        <strong>
                          {formatValue(
                            data.vibration_events,
                            0
                          )}
                        </strong>

                      </div>


                      <div className="metric">

                        <span>
                          Roll Change
                        </span>

                        <strong>
                          {formatValue(
                            data.roll_change_deg
                          )}
                          <small>°</small>
                        </strong>

                      </div>


                      <div className="metric">

                        <span>
                          Pitch Change
                        </span>

                        <strong>
                          {formatValue(
                            data.pitch_change_deg
                          )}
                          <small>°</small>
                        </strong>

                      </div>

                    </div>


                    <div className="node-footer">

                      <span>
                        Last update
                      </span>

                      <strong>
                        {formatTime(
                          data.timestamp
                        )} IST
                      </strong>

                    </div>

                  </div>
                );
              })

            )}

          </div>

        </section>


        {/* ================= SENSOR CHARTS ================= */}

        <section className="section">

          <div className="section-header">

            <div>
              <h2>
                Real-Time Sensor Trends
              </h2>

              <p>
                Live sensor readings over time
              </p>
            </div>

          </div>


          {nodes.map((nodeId) => {

            const chartData =
              history[nodeId] || [];

            return (
              <div
                className="node-charts"
                key={nodeId}
              >

                <div className="node-chart-heading">

                  <div>
                    <h3>
                      {nodeId}
                    </h3>

                    <span>
                      {chartData.length} readings
                    </span>
                  </div>

                </div>


                <div className="chart-grid">

                  <SensorChart
                    title="Tilt Change"
                    subtitle="Structural inclination"
                    data={chartData}
                    dataKey="tilt_change_deg"
                    unit="°"
                  />


                  <SensorChart
                    title="FSR Pressure"
                    subtitle="Deformation indicator"
                    data={chartData}
                    dataKey="fsr_mean"
                    unit=""
                  />


                  <SensorChart
                    title="Peak Acceleration"
                    subtitle="IMU acceleration magnitude"
                    data={chartData}
                    dataKey="accel_peak_g"
                    unit="g"
                  />


                  <SensorChart
                    title="Vibration Events"
                    subtitle="Detected vibration events"
                    data={chartData}
                    dataKey="vibration_events"
                    unit=""
                  />

                </div>

              </div>
            );
          })}

        </section>
        
      <AIAnalysis />

      </main>


      <footer>

        <span>
          Mine Subsidence Monitoring System
        </span>

        <span>
          ESP32 • FastAPI • Real-Time Monitoring
        </span>

      </footer>

    </div>
  );
}

export default App;
