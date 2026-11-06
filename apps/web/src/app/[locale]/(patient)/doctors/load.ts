// The doctor pages' loaders (U46 frontend-components § 3, WF13). Each is `cache()`d, so the page and
// its metadata share one query per request; status codes are decided here, before the first byte.
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { isPublicId } from '@rogikotha/contracts';
import { DEFAULT_PAGE_SIZE } from '@rogikotha/application';
import { redirect } from '@/i18n/routing';
import { filterHref, parseProfileFilters, type RawSearch } from '@/lib/doctor-filters';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

/** Release 1 lists one page (Question 10); an error reaches the error boundary. */
export const loadDoctorIndex = cache(async () => {
  const container = getContainer();
  const page = await runCommand(container.directory.listDoctors, {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  if (!page.ok) throw new Error(`directory.listDoctors: ${page.error.code}`);
  const { limitedDataThreshold } = await container.ports.config.current();
  return { cards: page.data.items, total: page.data.total, threshold: limitedDataThreshold };
});

// The search is passed as its query string, so `cache()` compares it by value.
const loadProfileBySearch = cache(async (id: string, search: string) => {
  if (!isPublicId(id)) notFound();
  const filters = parseProfileFilters(Object.fromEntries(new URLSearchParams(search)));
  const container = getContainer();
  const result = await runCommand(container.directory.getDoctor, { publicId: id, ...filters });
  if (!result.ok) {
    if (result.error.code === 'not_found' || result.error.code === 'validation') notFound();
    throw new Error(`directory.getDoctor: ${result.error.code}`);
  }
  // A condition the doctor has no account for is dropped from the URL (WF13).
  if (filters.condition && !result.data.selectedCondition) {
    const { condition: _dropped, ...rest } = filters;
    void _dropped;
    redirect({ href: filterHref(id, rest), locale: await getLocale() });
  }
  const { limitedDataThreshold } = await container.ports.config.current();
  return { vm: result.data, filters, threshold: limitedDataThreshold };
});

export function loadDoctorProfile(id: string, raw: RawSearch | undefined) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(raw ?? {})) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) search.set(key, first);
  }
  search.sort();
  return loadProfileBySearch(id, search.toString());
}
