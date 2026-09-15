const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8080";
const REQUEST_TIMEOUT_MS = 8000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      ...options,
      signal: options.signal || controller.signal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = body?.detail ? `: ${body.detail}` : "";
      } catch {
        // Ignore non-JSON error bodies.
      }
      throw new Error(`${path} returned ${response.status}${detail}`);
    }

    if (response.status === 204) return null;
    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${path} request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  baseUrl: API_URL,
  getNodes: () => request("/api/nodes"),
  getLatestSensors: () => request("/api/sensors/latest"),
  getSensorHistory: (nodeId) =>
    request(`/api/sensors/history/${encodeURIComponent(nodeId)}`),
  getAILatest: () => request("/api/ai/latest"),
  getAIHistory: () => request("/api/ai/history"),
  getAISummary: () => request("/api/ai/summary"),
  getAlerts: () => request("/api/alerts?limit=200"),
  getLatestAlert: () => request("/api/alerts/latest"),
  acknowledgeAlert: (id) =>
    request(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, { method: "POST" }),
  resolveAlert: (id) =>
    request(`/api/alerts/${encodeURIComponent(id)}/resolve`, { method: "POST" }),
};
