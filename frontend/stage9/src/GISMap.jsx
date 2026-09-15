import { useEffect, useRef, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8080";

function markerClass(status, risk) {
  if (status === "OFFLINE") return "gis-marker gis-marker-offline";
  if (String(risk).toUpperCase().includes("CRITICAL")) {
    return "gis-marker gis-marker-critical";
  }
  if (
    String(risk).toUpperCase().includes("WARNING") ||
    String(risk).toUpperCase().includes("SIGNIFICANT")
  ) {
    return "gis-marker gis-marker-warning";
  }
  return "gis-marker gis-marker-normal";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function GISMap() {
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [gisData, setGisData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGIS() {
      try {
        const response = await fetch(`${API_URL}/api/gis/nodes`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`GIS API returned ${response.status}`);
        }

        const data = await response.json();
        if (!cancelled) {
          setGisData(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    loadGIS();
    const timer = setInterval(loadGIS, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!gisData?.site || !window.L) return;

    const L = window.L;

    if (!mapRef.current) {
      mapRef.current = L.map("mine-gis-map", {
        zoomControl: true,
      }).setView(
        [gisData.site.latitude, gisData.site.longitude],
        15
      );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }
      ).addTo(mapRef.current);
    }

    mapRef.current.setView(
      [gisData.site.latitude, gisData.site.longitude],
      mapRef.current.getZoom() || 15
    );

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const site = gisData.site;
    const siteRisk = String(site.risk || "NO_DATA").toUpperCase();

    const siteCircle = L.circle(
      [site.latitude, site.longitude],
      {
        radius: 120,
        className: "gis-risk-zone",
        fillOpacity: siteRisk === "CRITICAL" ? 0.22 : siteRisk === "WARNING" ? 0.16 : 0.08,
        color: siteRisk === "CRITICAL" ? "#dc2626" : siteRisk === "WARNING" ? "#d97706" : "#16a34a",
        fillColor: siteRisk === "CRITICAL" ? "#dc2626" : siteRisk === "WARNING" ? "#d97706" : "#16a34a",
        weight: 2,
      }
    ).addTo(mapRef.current);

    siteCircle.bindPopup(`
      <strong>Mine Monitoring Area</strong><br/>
      Site risk: ${escapeHtml(siteRisk)}<br/>
      Risk score: ${Number(site.risk_score || 0).toFixed(1)}<br/>
      Last update: ${escapeHtml(site.last_seen || "--")}
    `);
    markersRef.current.push(siteCircle);

    (gisData.nodes || []).forEach((node) => {
      const icon = L.divIcon({
        className: "gis-marker-wrapper",
        html: `<div class="${markerClass(node.status, node.site_risk)}">${escapeHtml(node.node_id.replace("NODE_", "N"))}</div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([node.latitude, node.longitude], {
        icon,
      }).addTo(mapRef.current);

      marker.bindPopup(`
        <strong>${escapeHtml(node.node_id)}</strong><br/>
        Status: ${escapeHtml(node.status)}<br/>
        Site risk: ${escapeHtml(node.site_risk)}<br/>
        Risk score: ${Number(node.risk_score || 0).toFixed(1)}<br/>
        Risk scope: SITE<br/>
        Last update: ${escapeHtml(node.last_seen || "--")}
      `);

      markersRef.current.push(marker);
    });

    return () => {};
  }, [gisData]);

  return (
    <section className="section gis-section">
      <div className="section-header">
        <div>
          <h2>GIS Monitoring View</h2>
          <p>Spatial view of the sensor network and current site risk</p>
        </div>
        {gisData?.using_demo_coordinates && (
          <span className="gis-demo-badge">DEMO COORDINATES</span>
        )}
      </div>

      {error && <div className="connection-warning">GIS unavailable: {error}</div>}

      <div className="gis-card">
        <div id="mine-gis-map" className="mine-gis-map" />

        <div className="gis-legend">
          <span><i className="legend-dot normal" /> Normal</span>
          <span><i className="legend-dot warning" /> Warning</span>
          <span><i className="legend-dot critical" /> Critical</span>
          <span><i className="legend-dot offline" /> Offline</span>
        </div>
      </div>

      {gisData?.using_demo_coordinates && (
        <p className="gis-note">
          These coordinates are placeholders for the prototype. Replace MINE_LAT and MINE_LON with the actual mine reference coordinates before field deployment.
        </p>
      )}
    </section>
  );
}
