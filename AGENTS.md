# Design Canvas

This repository owns the Design Canvas implementation and its shadcn-compatible
GitHub registry item. `web/src/components/designer/` is the single source of
truth used by both the runnable app and registry consumers.

## Change routing

- Canvas behavior and styling belong in `web/src/components/designer/`.
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
