import { useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import LiveMonitoring from "./pages/LiveMonitoring";
import Sensors from "./pages/Sensors";
import AIAnalysisPage from "./pages/AIAnalysis";
import MineGISPage from "./pages/MineGIS";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import Settings from "./pages/Settings";
import { useSystemStatus } from "./hooks/useSystemStatus";
import "./index.css";

const pageMeta = {
  "/": ["Dashboard", "Operational overview of the mine monitoring network"],
  "/monitoring": ["Live Monitoring", "Real-time sensor readings from connected nodes"],
  "/sensors": ["Sensors", "Monitoring nodes and sensor details"],
  "/ai-analysis": ["AI Analysis", "Anomaly detection and risk analysis"],
  "/gis": ["Mine GIS", "Geographic view of monitored mine locations"],
  "/alerts": ["Alerts", "Current and historical monitoring alerts"],
  "/history": ["History", "Historical sensor and risk trends"],
  "/settings": ["Settings", "System status and application configuration"],
};

function normalizePath(path) {
  if (path === "/") return "/";
  if (path.startsWith("/sensors/")) return "/sensors";
  return pageMeta[path] ? path : "/";
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => normalizePath(window.location.pathname));
  const { connected, checking, error, lastChecked, refresh: refreshSystemStatus } = useSystemStatus();

  useEffect(() => {
    const onPopState = () => setCurrentPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(path) {
    const nextPath = normalizePath(path);
    window.history.pushState({}, "", nextPath);
    setCurrentPath(nextPath);
  }

  const [title, subtitle] = pageMeta[currentPath];

  let page;
  const sensorNode = window.location.pathname.startsWith("/sensors/")
    ? decodeURIComponent(window.location.pathname.split("/").slice(2).join("/"))
    : null;
  switch (currentPath) {
    case "/monitoring": page = <LiveMonitoring />; break;
    case "/sensors": page = <Sensors />; break;
    case "/ai-analysis": page = <AIAnalysisPage />; break;
    case "/gis": page = <MineGISPage />; break;
    case "/alerts": page = <Alerts />; break;
    case "/history": page = <History />; break;
    case "/settings": page = <Settings />; break;
    default: page = <Dashboard />;
  }

  return (
    <AppShell
      currentPath={currentPath}
      navigate={navigate}
      connected={connected}
      checking={checking}
      error={error}
      lastChecked={lastChecked}
      onRefresh={refreshSystemStatus}
      title={title}
      subtitle={subtitle}
    >
      {page}
    </AppShell>
  );
}
