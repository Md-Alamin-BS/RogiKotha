export function IndexHead({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note: string;
}) {
  return (
    <section className="a-head index-head">
      <span className="kicker">{kicker}</span>
      <h1 className="display">{title}</h1>
      <p className="lead">{note}</p>
    </section>
  );
}
