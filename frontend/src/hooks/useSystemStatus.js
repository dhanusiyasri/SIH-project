import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";

const HEALTH_INTERVAL = 5000;

export function useSystemStatus() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await api.getNodes();
      setConnected(true);
      setError("");
      setLastChecked(new Date());
    } catch (err) {
      setConnected(false);
      setError(err?.message || "Monitoring backend is unreachable");
      setLastChecked(new Date());
    } finally {
      setChecking(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    check();
    const timer = window.setInterval(check, HEALTH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [check]);

  return { connected, checking, lastChecked, error, refresh: check };
}
