import { useEffect, useState } from "react";

const DEFAULTS = {
  autoRefresh: true,
  refreshInterval: "2000",
  browserNotifications: false,
  compactMode: false,
};

function readSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("minewatch.settings") || "{}") };
  } catch {
    return DEFAULTS;
  }
}

export default function Settings() {
  const [settings, setSettings] = useState(readSettings);
  const [saved, setSaved] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );

  useEffect(() => {
    document.documentElement.classList.toggle("compact-mode", settings.compactMode);
    localStorage.setItem("minewatch.settings", JSON.stringify(settings));
  }, [settings]);

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    update("browserNotifications", result === "granted");
  }

  function reset() {
    setSettings(DEFAULTS);
    localStorage.setItem("minewatch.settings", JSON.stringify(DEFAULTS));
    setSaved(true);
  }

  function save() {
    localStorage.setItem("minewatch.settings", JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="page-stack">
      <section className="page-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">APPLICATION</p>
            <h2>Settings</h2>
            <p className="muted">Configure lightweight MineWatch frontend preferences.</p>
          </div>
          <div className="settings-actions">
            <button className="secondary-button" onClick={reset}>Reset</button>
            <button className="primary-button" onClick={save}>Save changes</button>
          </div>
        </div>
        {saved && <div className="success-banner">Settings saved locally on this browser.</div>}
      </section>

      <section className="page-section settings-grid">
        <div className="settings-card">
          <div className="settings-card-heading">
            <div><p className="eyebrow">LIVE DATA</p><h3>Refresh behaviour</h3></div>
          </div>
          <label className="settings-row">
            <span><strong>Auto refresh</strong><small>Allow live pages to refresh data automatically.</small></span>
            <input type="checkbox" checked={settings.autoRefresh} onChange={(e) => update("autoRefresh", e.target.checked)} />
          </label>
          <label className="settings-field">
            <span className="field-label">Preferred refresh interval</span>
            <select value={settings.refreshInterval} onChange={(e) => update("refreshInterval", e.target.value)}>
              <option value="2000">2 seconds</option>
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
              <option value="30000">30 seconds</option>
            </select>
            <small>Saved as a frontend preference. Existing page-specific polling remains unchanged until it is wired to a shared settings context.</small>
          </label>
        </div>

        <div className="settings-card">
          <div className="settings-card-heading">
            <div><p className="eyebrow">NOTIFICATIONS</p><h3>Browser alerts</h3></div>
            <span className={`settings-status ${permission}`}>{permission}</span>
          </div>
          <label className="settings-row">
            <span><strong>Browser notifications</strong><small>Permit this browser to display MineWatch notifications.</small></span>
            <input type="checkbox" checked={settings.browserNotifications && permission === "granted"} onChange={enableNotifications} disabled={permission === "denied" || permission === "unsupported"} />
          </label>
          {permission !== "granted" && permission !== "unsupported" && permission !== "denied" && (
            <button className="secondary-button" onClick={enableNotifications}>Allow browser notifications</button>
          )}
          {permission === "denied" && <div className="settings-note">Notifications are blocked by the browser. Enable them from the browser's site permissions.</div>}
          {permission === "unsupported" && <div className="settings-note">This browser does not expose the Notifications API.</div>}
        </div>

        <div className="settings-card">
          <div className="settings-card-heading">
            <div><p className="eyebrow">DISPLAY</p><h3>Dashboard appearance</h3></div>
          </div>
          <label className="settings-row">
            <span><strong>Compact mode</strong><small>Reduce spacing on cards and tables for smaller screens.</small></span>
            <input type="checkbox" checked={settings.compactMode} onChange={(e) => update("compactMode", e.target.checked)} />
          </label>
        </div>

        <div className="settings-card">
          <div className="settings-card-heading">
            <div><p className="eyebrow">CONNECTION</p><h3>Backend configuration</h3></div>
          </div>
          <div className="settings-info-list">
            <div><span className="field-label">API endpoint</span><code>{import.meta.env.VITE_API_URL || "http://127.0.0.1:8080"}</code></div>
            <div><span className="field-label">Frontend storage</span><strong>Browser localStorage</strong></div>
            <div><span className="field-label">Backend changes</span><strong>None required for these settings</strong></div>
          </div>
        </div>
      </section>

      <section className="page-section settings-note-panel">
        <p className="eyebrow">IMPORTANT</p>
        <h3>Prototype configuration</h3>
        <p className="muted">These settings control frontend preferences only. They do not change ESP32 firmware, database configuration, AI model thresholds, or backend alert logic.</p>
      </section>
    </div>
  );
}
