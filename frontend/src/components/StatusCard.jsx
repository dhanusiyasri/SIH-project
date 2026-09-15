export default function StatusCard({ label, value, detail, tone = "neutral" }) {
  return (
    <article className={`status-card ${tone}`}>
      <span className="status-card-label">{label}</span>
      <strong>{value}</strong>
      {detail && <span className="status-card-detail">{detail}</span>}
    </article>
  );
}
