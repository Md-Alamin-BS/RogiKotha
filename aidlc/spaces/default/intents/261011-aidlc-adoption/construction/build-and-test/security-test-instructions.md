# Security test instructions — RogiKotha release 1

The active Test Strategy is Minimal, but the requirements bind PRD §9.1 to §9.3 (requirements.md,
Constraints) and NFR10, and the high-risk Units (U8 and U9 auth, U11 identity, U48 evidence, U41
hardening) carry adversarial tests, so this file records the security checks and how to run them. The threat model is
`docs/security/local-demo-threat-notes.md` (U41); FD-116 records the release-1 posture. TLS, HSTS
in practice, a WAF, dependency and container scanning in a pipeline, and GlitchTip are out of scope
for the local demo (requirements.md, Constraints; D11).

## Framework and configuration

| Layer | Tooling | Where |
|---|---|---|
| Static (SAST-like) | ESLint flat config with `typescript-eslint` type-checked rules, `no-console` outside the two loggers (FD-116 (9)), `eslint-plugin-boundaries` import rules (the worker never imports Better Auth or identity reveal), `check:identity` (no tool or model identity), TypeScript strict | `pnpm lint`, `pnpm lint:boundaries`, `pnpm check:identity`, inside `pnpm check` |
| Unit security tests | Vitest: CSP, nonce, headers, Origin and Host checks, refusals, request limits, the sweep for inline scripts, settings, cookies, log policy and log scrubbing | `apps/web/src/lib/security/__tests__/`, `apps/web/src/proxy.test.ts`, `apps/web/src/security-settings.test.ts`, `apps/web/src/security-cookies.test.ts`, `packages/application/src/ports/log-policy.test.ts`, `apps/web/src/server/logger.test.ts`, `apps/worker/src/logger*.test.ts`, `apps/worker/src/log-scrub.test.ts` |
| Adversarial tests (separate agent per high-risk Unit) | Vitest unit and integration | every `*.adversarial.test.ts(x)` and `*.adversarial.int.test.ts` (auth, enumeration, reset tokens, sessions, identity boundary, persona links, ownership, signed-out access, evidence and storage, upload route, proxy, U41 A1 to A5) |
| Integration | Vitest `web-int`, `database` | `apps/web/src/log-scrub.int.test.ts`, `apps/web/src/security.adversarial.int.test.ts`, `packages/database/src/cr-006-adversarial.int.test.ts`, `packages/database/src/repositories/identity-private.adversarial.int.test.ts`, the grants smoke |
| Dynamic (DAST-like, built app) | Playwright on the production build | `apps/web/e2e/security/security.spec.ts` (CSP on public pages, foreign Origin refused on a server action and on the upload route, upload cap before the body), `apps/web/e2e/smoke/security-headers.spec.ts` (headers, a new nonce per load, no CSP violation, only the ENT-011 cookies), `apps/web/e2e/security/log-scan.spec.ts` (no sentinel or run email in any web or worker log line, every line JSON, every page carried the CSP) |
| Manual probe | `curl` against a separately started production server | Host header injection (`Host: evil.example`), threat notes §1 |

## How to run

```bash
pnpm check                                             # static checks plus every unit, adversarial and integration test
pnpm test:int                                          # integration and adversarial *.int tests
pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/lib/security/
pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/security.adversarial.int.test.ts
pnpm --filter @rogikotha/web --filter @rogikotha/worker build
pnpm --filter @rogikotha/web exec playwright test --project=chromium-desktop --retries=0 security/security.spec.ts smoke/security-headers.spec.ts
pnpm --filter @rogikotha/web exec playwright test --project=log-scan   # after the journey projects, as in `pnpm e2e`
```

Manual Host probe, against a production server started on a free port (never 3000):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: evil.example" http://127.0.0.1:<port>/en   # expect a refusal (4xx)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:<port>/en                           # expect 200
```

## Expected results

- `pnpm check` green, lint 0 errors; every adversarial test green (each break the adversarial
  agents found is fixed: ISS-696, ISS-697, ISS-718; ISS-699 stays a recorded residual).
- The browser security specs pass in `chromium-desktop`; the log scan finds no sentinel, no run
  email and no non-JSON line in the web and worker logs.
- A foreign Host is refused; a foreign or missing Origin on a state-changing request is refused
  (FD-116 (2)); an upload with a declared length over 15 794 176 bytes gets `413` before the body.

## Test data and environment

Synthetic accounts and content only; the sentinel strings the log scan looks for are planted by the
suite. The browser specs use `rogikotha_e2e_test` and port 3107; the manual probe uses a separate
server process and database, never the running demo.
