import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { securityHeaderRoutes } from './src/lib/security/headers';
import { parseSecuritySettings } from './src/lib/security/settings';
import { optionalEnv } from './src/server/env';

const withNextIntl = createNextIntlPlugin('./src/server/i18n-request.ts');

// WF5: a present but invalid APP_ALLOWED_ORIGINS fails the build or start (BR7.1); a build without
// `.env` has no APP_URL and trusts no extra origin for server actions.
const appUrl = optionalEnv('APP_URL');
const allowedOrigins: string[] =
  appUrl === undefined
    ? []
    : [
        ...parseSecuritySettings({
          appUrl,
          allowedOrigins: optionalEnv('APP_ALLOWED_ORIGINS'),
          nodeEnv: optionalEnv('NODE_ENV'),
        }).allowedHosts,
      ];

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
  // BR2.1, BR2.2: static headers on every response, applied before the proxy runs.
  headers: () => Promise.resolve(securityHeaderRoutes()),
  // BR4.6: no server action takes a file since U48 (ISS-690); evidence goes to
  // `/api/evidence/upload`, which the proxy matcher skips and which caps its own body (WF3).
  experimental: {
    serverActions: { bodySizeLimit: '1mb', allowedOrigins },
    proxyClientMaxBodySize: '1mb',
  },
};

export default withNextIntl(nextConfig);
