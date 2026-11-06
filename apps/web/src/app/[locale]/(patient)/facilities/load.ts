// The facility pages' loaders (U46 frontend-components § 3, WF13), `cache()`d so the page and its
// metadata share one query per request.
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { isPublicId } from '@rogikotha/contracts';
import { DEFAULT_PAGE_SIZE } from '@rogikotha/application';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

export const loadFacilityIndex = cache(async () => {
  const container = getContainer();
  const page = await runCommand(container.directory.listFacilities, {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  if (!page.ok) throw new Error(`directory.listFacilities: ${page.error.code}`);
  const { limitedDataThreshold } = await container.ports.config.current();
  return { cards: page.data.items, total: page.data.total, threshold: limitedDataThreshold };
});

export const loadFacilityProfile = cache(async (id: string) => {
  if (!isPublicId(id)) notFound();
  const container = getContainer();
  const result = await runCommand(container.directory.getFacility, { publicId: id });
  if (!result.ok) {
    if (result.error.code === 'not_found' || result.error.code === 'validation') notFound();
    throw new Error(`directory.getFacility: ${result.error.code}`);
  }
  const { limitedDataThreshold } = await container.ports.config.current();
  return { vm: result.data, threshold: limitedDataThreshold };
});
