// The topic pages' loaders (U46 frontend-components § 3, WF13), `cache()`d so the page and its
// metadata share one query per request. The condition page also carries the emergency settings.
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { isPublicId } from '@rogikotha/contracts';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

export const loadTopicIndex = cache(async () => {
  const result = await runCommand(getContainer().taxonomy.listConditions, {});
  if (!result.ok) throw new Error(`taxonomy.listConditions: ${result.error.code}`);
  return { cards: result.data, total: result.data.length };
});

export const loadConditionPage = cache(async (id: string) => {
  if (!isPublicId(id)) notFound();
  const container = getContainer();
  const result = await runCommand(container.taxonomy.getCondition, { publicId: id });
  if (!result.ok) {
    if (result.error.code === 'not_found' || result.error.code === 'validation') notFound();
    throw new Error(`taxonomy.getCondition: ${result.error.code}`);
  }
  const config = await container.ports.config.current();
  return { vm: result.data, threshold: config.limitedDataThreshold, emergency: config.emergency };
});
