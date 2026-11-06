import { Link } from '@/i18n/routing';

/** BR3.11: a branch reads "name — branch label" when it has a label of its own. */
export function facilityLabel({
  name,
  branchName,
}: {
  name: string;
  branchName?: string | undefined;
}): string {
  return branchName ? `${name} — ${branchName}` : name;
}

export function FacilityLink({
  publicId,
  label,
}: {
  publicId?: string | undefined;
  label: string;
}) {
  if (!publicId) return <span>{label}</span>;
  return (
    <Link
      className="link-btn name-link"
      href={`/facilities/${publicId}`}
      data-testid="facility-link"
    >
      {label}
    </Link>
  );
}
