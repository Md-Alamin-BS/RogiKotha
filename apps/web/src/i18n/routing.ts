// Thin re-export: @rogikotha/i18n owns the routing config (T-006); this
// file exists only because next-intl's plugin/proxy wiring expects a
// project-local module path (docs/implementation/tasks/T-008-web-shell.md
// "Owned paths").
export { routing, Link, redirect, usePathname, useRouter, getPathname } from '@rogikotha/i18n';
export type { Locale } from '@rogikotha/i18n';
