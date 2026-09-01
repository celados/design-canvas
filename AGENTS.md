# Design Canvas

This repository owns the Design Canvas implementation, its published headless
core, and its shadcn-compatible GitHub registry item. `packages/core/` is the
single source of truth for reusable algorithms; `web/src/components/designer/`
owns the adaptable React integration used by the runnable app and registry
consumers.

## Change routing

- Camera, LOD, and snapshot scheduling behavior belongs in `packages/core/`.
- React canvas behavior and styling belong in `web/src/components/designer/`.
- Registry consumers depend on `@celados/design-canvas-core`; keep copied
  files focused on host integration and components.
- TanStack Start integration routes belong in `web/src/routes/[_]design*`.
- Project-owned examples belong in `web/src/design/`; keep runtime code free of
  example imports.
- Keep `registry.json` targets aligned with the standard Celados TanStack Start
  layout under `web/src/`.

## Validation

Run `bun run check`, `bun run test`, and `bun run build`. Changes to registry
files also require an install into a clean TanStack Start consumer; repository
validation alone does not prove target paths or generated routes.

Read current sources before changing framework or registry behavior:

- https://ui.shadcn.com/docs/registry/github
- https://tanstack.com/start/latest/llms.txt
