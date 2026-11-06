import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function DoctorLink({ publicId, label }: { publicId?: string | undefined; label: string }) {
  const t = useTranslations();
  if (!publicId) return <span>{label}</span>;
  return (
    <Link
      className="link-btn name-link"
      href={`/doctors/${publicId}`}
      title={t('nav.viewDoctor')}
      data-testid="doctor-link"
    >
      {label}
    </Link>
  );
}
