export function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="card">
      <span className="card-title">{title}</span>
      <strong className="card-value">{value}</strong>
    </article>
  );
}
