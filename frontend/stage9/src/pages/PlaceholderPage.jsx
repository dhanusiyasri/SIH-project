export default function PlaceholderPage({ title, description }) {
  return (
    <section className="placeholder-page">
      <div className="placeholder-icon">◌</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <span>This page is part of the MineWatch application shell and will use the existing backend modules.</span>
    </section>
  );
}
