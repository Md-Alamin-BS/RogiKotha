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
    '@rogikotha/adapters',
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
  // Evidence uploads go through a server action and the proxy: both default limits (1 MB and
  // 10 MB) sit below a 10 MB file plus the form around it (MAX_EVIDENCE_BYTES, FR5).
  experimental: {
    serverActions: { bodySizeLimit: '11mb' },
    proxyClientMaxBodySize: '11mb',
  },
};

export default withNextIntl(nextConfig);
