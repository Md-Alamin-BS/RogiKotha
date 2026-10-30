# Reverse Engineering Timestamp

## Run Record

- Date: 2026-10-30
- Commit: d22b3b911bb0c89a4be659ff233812b124c14c49
- Breadth: full rescan of the repository root, depth Minimal, for intent `261030-demo-slice`. This replaces the store built on 2026-10-12 at `4f05dc0`; T-010 and T-011 and the CR-006/CR-012 work merged in between.
- Coverage notes: all manifests, configs, entry points, composition roots, schema modules, repository stubs, migrations and seed steps were read; components, tests and styles were listed and sampled. Dependency folders, build output, `.env`, `.data/`, and AI-DLC's own install and workspace were not opened. The scan handoff is `inception/reverse-engineering/developer-scan.md` in the intent record.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 261030-demo-slice
fingerprint: 75349852b2f8d47b1473960e7644ee7c7496bbc8
analyzed:
  paths:
    - ./
  components:
    - apps/web
    - apps/worker
    - packages/adapters
    - packages/application
    - packages/contracts
    - packages/database
    - packages/domain
    - packages/i18n
    - packages/test-support
    - infra/compose
shallow:
  paths:
    - scripts/
    - tools/
    - lint-fixtures/
    - ui-design-prototype/
    - docs/
    - PRODUCT.md
    - DESIGN.md
    - README.md
    - _bmad/
    - .impeccable/
    - .github/agents/
```
