'use client';

import { useEffect, useRef } from 'react';
import type { Outcome, Relationship } from '@rogikotha/contracts';
import { Link } from '@/i18n/routing';
import { useAnnounce } from '@/lib/announce';
import { filterHref, type ProfileFilters as Filters } from '@/lib/doctor-filters';

export interface PillOption<T extends string> {
  value: T;
  label: string;
}

export interface ProfileFilterLabels {
  outcomeGroup: string;
  relationshipGroup: string;
  documentsGroup: string;
  hasDocuments: string;
}

// The profile's account filters (U46 frontend-components § 5.3). Every pill is a link built by
// `filterHref`, so the page works without script and the server renders the pressed state. Labels
// are resolved on the server, so this client bundle carries no messages.
export function ProfileFilters({
  publicId,
  filters,
  outcomes,
  relationships,
  labels,
  showing,
  showingText,
}: {
  publicId: string;
  filters: Filters;
  outcomes: PillOption<Outcome>[];
  relationships: PillOption<Relationship>[];
  labels: ProfileFilterLabels;
  /** Accounts shown after the filters; a change is announced once. */
  showing: number;
  showingText: string;
}) {
  const announce = useAnnounce();
  const previous = useRef(showing);

  useEffect(() => {
    if (previous.current === showing) return;
    previous.current = showing;
    announce(showingText);
  }, [announce, showing, showingText]);

  // A link cannot carry aria-pressed, so the pressed pill is marked with aria-current.
  const pill = (key: string, label: string, selected: boolean, next: Filters) => (
    <Link
      key={key}
      href={filterHref(publicId, next)}
      scroll={false}
      prefetch={false}
      aria-current={selected ? 'true' : undefined}
      data-testid={`filter-pill-${key}`}
    >
      {label}
    </Link>
  );

  const { outcome: _o, ...withoutOutcome } = filters;
  const { relationship: _r, ...withoutRelationship } = filters;
  const { docs: _d, ...withoutDocs } = filters;
  void _o;
  void _r;
  void _d;

  return (
    <div className="profile-filters" data-testid="profile-filters">
      <div className="pillrow" role="group" aria-label={labels.outcomeGroup}>
        {outcomes.map(({ value, label }) => {
          const selected = filters.outcome === value;
          return pill(
            `outcome-${value}`,
            label,
            selected,
            selected ? withoutOutcome : { ...withoutOutcome, outcome: value },
          );
        })}
      </div>
      <div className="pillrow" role="group" aria-label={labels.documentsGroup}>
        {pill(
          'docs',
          labels.hasDocuments,
          filters.docs === true,
          filters.docs ? withoutDocs : { ...withoutDocs, docs: true },
        )}
      </div>
      <div className="pillrow" role="group" aria-label={labels.relationshipGroup}>
        {relationships.map(({ value, label }) => {
          const selected = filters.relationship === value;
          return pill(
            `relationship-${value}`,
            label,
            selected,
            selected ? withoutRelationship : { ...withoutRelationship, relationship: value },
          );
        })}
      </div>
    </div>
  );
}
