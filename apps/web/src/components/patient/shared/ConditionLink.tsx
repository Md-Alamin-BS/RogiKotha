import { Link } from '@/i18n/routing';

/** A free-text condition tag has no id and stays plain text, as written (BR3.9). */
export function ConditionLink({
  publicId,
  label,
}: {
  publicId?: string | undefined;
  label: string;
}) {
  if (!publicId) return <span>{label}</span>;
  return (
    <Link className="link-btn name-link" href={`/topics/${publicId}`} data-testid="condition-link">
      {label}
    </Link>
  );
}
