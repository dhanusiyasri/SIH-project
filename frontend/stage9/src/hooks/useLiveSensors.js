import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";

const DEFAULT_INTERVAL = 2000;

export function useLiveSensors(interval = DEFAULT_INTERVAL) {
  const [nodes, setNodes] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [stale, setStale] = useState(false);
  const requestInFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;

    try {
      const [nodesResult, latestResult] = await Promise.all([
        api.getNodes(),
        api.getLatestSensors(),
      ]);

      const rawNodes = Array.isArray(nodesResult)
        ? nodesResult
        : nodesResult?.nodes || [];
      const nodeList = rawNodes
        .map((node) => (typeof node === "string" ? node : node?.node_id))
        .filter(Boolean);

      const readings = Array.isArray(latestResult) ? latestResult : [];

      setNodes(nodeList);
      setLatest(readings);
      setConnected(true);
      setStale(false);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      console.error("Live sensor refresh failed:", err);
      setConnected(false);
      setStale(true);
      setError(err?.message || "Unable to connect to monitoring server");
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (paused) return undefined;

    const timer = window.setInterval(refresh, interval);
    return () => window.clearInterval(timer);
  }, [interval, paused, refresh]);

  return {
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
  };
}
