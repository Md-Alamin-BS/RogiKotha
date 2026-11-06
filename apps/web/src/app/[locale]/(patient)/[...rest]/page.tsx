import { notFound } from 'next/navigation';

// BR4.2: an unmatched path under /{locale}/ reaches the patient 404 inside the layout, status 404.
export default function UnmatchedPatientPath(): never {
  notFound();
}
