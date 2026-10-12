# Reverse Engineering Timestamp

## Run Record

- Date: 2026-10-12
- Commit: 4f05dc03185113c5dc1bc9f4a5efdae06285a69a
- Breadth: full scan of the repository root, with depth Minimal.
- Coverage notes: within the analyzed paths, all manifests, entry points, composition roots, configs and migrations were read in full, along with representative modules. The remaining files were inventoried by listing and targeted search. Build output, dependency folders, `.env`, agent tooling, the AI-DLC workspace and `docs/` were not opened, except for the three skimmed architecture and plan files.

## Scope of Analysis

```yaml
scope_version: 1
kind: full
intent: 261011-aidlc-adoption
fingerprint: ee8466e4754ec7602c2ee9f9b47bd7fd20584524
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
    - PRODUCT.md
    - README.md
    - docs/architecture/ARCHITECTURE-SPINE.md
    - docs/implementation/00-master-plan.md
    - docs/implementation/01-conventions.md
    - ui-design-prototype/
    - tools/
    - scripts/
```
