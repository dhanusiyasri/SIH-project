import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatTime } from "../dateTime";

const API_URL = "http://127.0.0.1:8080";

/* =========================================================
   FORMAT TIMESTAMP
   Backend stores timestamps in UTC.
   Frontend displays them in IST.
========================================================= */
/* =========================================================
   GET TIMESTAMP FROM AI RESPONSE
========================================================= */
function getTimestamp(data) {
  if (!data) return null;

  /*
   AI backend may use server_timestamp.
   Keep timestamp as fallback for compatibility.
  */
  return (
    data.server_timestamp ||
    data.timestamp ||
    data.analysis_timestamp ||
    null
  );
}


/* =========================================================
   RISK CSS CLASS
========================================================= */
function riskClass(risk) {
  const value = String(risk || "NORMAL").toUpperCase();

  if (value === "CRITICAL") {
    return "critical";
  }

  if (
    value === "WARNING" ||
    value === "SIGNIFICANT"
  ) {
    return "warning";
  }

  return "normal";
}


/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function AIAnalysis() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  /* =======================================================
     LOAD AI DATA
  ======================================================= */
  async function loadAIData() {
    try {
      const [latestResponse, historyResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/ai/latest`, {
            cache: "no-store",
          }),

          fetch(`${API_URL}/api/ai/history`, {
            cache: "no-store",
          }),
        ]);


      /* -----------------------------------------------
         Check latest response
      ------------------------------------------------ */
      if (!latestResponse.ok) {
        throw new Error(
          `AI latest API returned ${latestResponse.status}`
        );
      }


      /* -----------------------------------------------
         Check history response
      ------------------------------------------------ */
      if (!historyResponse.ok) {
        throw new Error(
          `AI history API returned ${historyResponse.status}`
        );
      }


      /* -----------------------------------------------
         Convert responses to JSON
      ------------------------------------------------ */
      const latestData =
        await latestResponse.json();

      const historyData =
        await historyResponse.json();


      console.log(
        "AI Latest:",
        latestData
      );

      console.log(
        "AI History:",
        historyData
      );


      /* -----------------------------------------------
         Save latest AI result
      ------------------------------------------------ */
      setLatest(latestData);


      /* -----------------------------------------------
         Prepare graph history
      ------------------------------------------------ */
      const historyArray =
        Array.isArray(historyData)
          ? historyData
          : [];


      const formattedHistory =
        historyArray.map((item) => ({
          ...item,

          /*
           Create display time for X-axis.
          */
          time: formatTime(
            getTimestamp(item)
          ),
        }));


      /*
       Keep only latest 60 records.
      */
      setHistory(
        formattedHistory.slice(-60)
      );


      setError(null);

    } catch (err) {

      console.error(
        "AI API error:",
        err
      );

      setError(
        "AI service unavailable"
      );

    } finally {

      setLoading(false);
    }
  }


  /* =======================================================
     INITIAL LOAD + AUTO REFRESH
  ======================================================= */
  useEffect(() => {

    loadAIData();

    const interval =
      setInterval(
        loadAIData,
        2000
      );

    return () =>
      clearInterval(interval);

  }, []);


  /* =======================================================
     LOADING STATE
  ======================================================= */
  if (loading) {

    return (
      <section className="ai-section">

        <div className="section-header">

          <div>

            <h2>
              AI Risk Analysis
            </h2>

            <p>
              Loading anomaly detection...
            </p>

          </div>

        </div>


        <div className="ai-loading">
          Loading AI analysis...
        </div>

      </section>
    );
  }


  /* =======================================================
     ERROR STATE
  ======================================================= */
  if (error || !latest) {

    return (
      <section className="ai-section">

        <div className="section-header">

          <div>

            <h2>
              AI Risk Analysis
            </h2>

            <p>
              Real-time anomaly detection
            </p>

          </div>

        </div>


        <div className="ai-error">
          {error || "No AI data available"}
        </div>

      </section>
    );
  }


  /* =======================================================
     CURRENT AI VALUES
  ======================================================= */

  const risk =
    String(
      latest.risk || "NORMAL"
    ).toUpperCase();


  const score =
    Number(
      latest.risk_score ?? 0
    );


  const anomalyScore =
    Number(
      latest.anomaly_score ?? 0
    );


  const latestTimestamp =
    getTimestamp(latest);


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section className="ai-section">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="section-header">

        <div>

          <h2>
            AI Risk Analysis
          </h2>

          <p>
            Isolation Forest anomaly detection +
            sensor-based risk analysis
          </p>

        </div>


        <div className="ai-live">

          <span className="live-dot"></span>

          AI LIVE

        </div>

      </div>



      {/* =================================================
          KPI CARDS
      ================================================= */}

      <div className="ai-cards">


        {/* -----------------------------------------------
            RISK SCORE
        ------------------------------------------------ */}

        <div className="ai-card">

          <div className="ai-card-label">
            RISK SCORE
          </div>


          <div className="risk-score">

            {Number.isFinite(score)
              ? score.toFixed(1)
              : "0.0"}

            <span>
              /100
            </span>

          </div>


          <div
            className={`risk-badge ${riskClass(
              risk
            )}`}
          >
            {risk}
          </div>

        </div>



        {/* -----------------------------------------------
            ANOMALY SCORE
        ------------------------------------------------ */}

        <div className="ai-card">

          <div className="ai-card-label">
            ANOMALY SCORE
          </div>


          <div className="anomaly-score">

            {Number.isFinite(anomalyScore)
              ? anomalyScore.toFixed(1)
              : "0.0"}

            <span>
              /100
            </span>

          </div>


          <div
            className={`anomaly-status ${
              latest.anomaly_label === "ANOMALY"
                ? "detected"
                : "normal"
            }`}
          >
            {latest.anomaly_label || "NORMAL"}
          </div>

        </div>



        {/* -----------------------------------------------
            LAST ANALYSIS
        ------------------------------------------------ */}

        <div className="ai-card">

          <div className="ai-card-label">
            LAST ANALYSIS
          </div>


          <div className="last-analysis">

            {formatTime(
              latestTimestamp
            )}

          </div>


          <div className="analysis-subtitle">

            Updated every 2 seconds

          </div>

        </div>

      </div>



      {/* =================================================
          GRAPHS
      ================================================= */}

      <div className="ai-charts">


        {/* -----------------------------------------------
            ANOMALY SCORE CHART
        ------------------------------------------------ */}

        <div className="chart-card">

          <div className="chart-title">

            <div>

              <h3>
                Anomaly Score
              </h3>

              <p>
                AI deviation from learned normal behavior
              </p>

            </div>

          </div>


          <ResponsiveContainer
            width="100%"
            height={280}
          >

            <LineChart
              data={history}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />


              <XAxis
                dataKey="time"
                minTickGap={35}
              />


              <YAxis
                domain={[0, 100]}
              />


              <Tooltip />


              <Line
                type="monotone"
                dataKey="anomaly_score"
                name="Anomaly Score"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>



        {/* -----------------------------------------------
            RISK SCORE CHART
        ------------------------------------------------ */}

        <div className="chart-card">

          <div className="chart-title">

            <div>

              <h3>
                Risk Score
              </h3>

              <p>
                Combined AI + sensor risk assessment
              </p>

            </div>

          </div>


          <ResponsiveContainer
            width="100%"
            height={280}
          >

            <LineChart
              data={history}
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />


              <XAxis
                dataKey="time"
                minTickGap={35}
              />


              <YAxis
                domain={[0, 100]}
              />


              <Tooltip />


              <Line
                type="monotone"
                dataKey="risk_score"
                name="Risk Score"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>



      {/* =================================================
          CONTRIBUTORS
      ================================================= */}

      <div className="contributors-card">


        <div>

          <h3>
            Contributing Indicators
          </h3>


          <p>
            Sensor signals contributing to the
            current risk assessment
          </p>

        </div>


        <div className="contributors-list">

          {Array.isArray(
            latest.contributors
          ) &&
          latest.contributors.length > 0 ? (

            latest.contributors.map(
              (item, index) => (

                <div
                  className="contributor"
                  key={`${String(
                    item
                  )}-${index}`}
                >

                  <span className="contributor-dot"></span>

                  <span>
                    {String(item)}
                  </span>

                </div>

              )
            )

          ) : (

            <div className="no-contributors">

              No significant indicators detected

            </div>

          )}

        </div>

      </div>



      {/* =================================================
          DISCLAIMER
      ================================================= */}

      <div className="ai-note">

        <strong>
          AI Prototype:
        </strong>{" "}

        The AI identifies abnormal sensor patterns
        and combines them with sensor-based indicators.
        It is not yet calibrated against real mine
        subsidence ground-truth data.

      </div>


    </section>
  );
}
