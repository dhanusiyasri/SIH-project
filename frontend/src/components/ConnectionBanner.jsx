export default function ConnectionBanner({ connected, checking = false, error = "" }) {
  if (connected) return null;

  return (
    <div className="global-connection-banner" role="status" aria-live="polite">
      <span className="connection-banner-icon">!</span>
      <div>
        <strong>{checking ? "Checking monitoring backend…" : "Monitoring backend offline"}</strong>
        <p>{error || "Live data may be unavailable. The application will retry automatically."}</p>
      </div>
    </div>
  );
}
