import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: [
    '@rogikotha/contracts',
    '@rogikotha/i18n',
    '@rogikotha/application',
    '@rogikotha/domain',
    '@rogikotha/database',
  ],
  // Stable since Next 15.5 (docs/status/dependency-check-log.md 2026-09-13 T-008 entry) —
  // top-level, not experimental.typedRoutes.
  typedRoutes: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // `next dev` otherwise regenerates a pair of agent-instruction files under
  // apps/web on every run (node_modules/next/dist/server/lib/generate-agent-files.js).
  // This repo's own root-level agent-instruction files already carry
  // specific, deliberate rules (see AGENTS.md); an unrelated, differently
  // scoped pair nested inside apps/web would only confuse future agents
  // reading the tree. ASSUMPTION(T-008).
  agentRules: false,
};

export default withNextIntl(nextConfig);
