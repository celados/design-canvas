# Design Canvas

A development-only visual workspace for reviewing React pages in TanStack
Start. It provides a searchable gallery, responsive artboards, a pan-and-zoom
stage, reference-image overlays, screenshots, and source-linked annotations.

The project is both a runnable reference application and a shadcn-compatible
GitHub registry. Consumers receive editable source code rather than a runtime
package dependency.

## Install in Celados TanStack Start

Run this from a project created from `celados/templates/templates/tanstack-start`:

```bash
bunx shadcn@latest add celados/design-canvas/tanstack-start#v0.4.0
bun run routegen
```

Start the app and open `http://localhost:3000/_design`.

The installer adds the Canvas runtime, TanStack Start routes, and example pages
under `web/src/design/`. Replace or delete those examples as the product takes
ownership of its own design surfaces.

Use another tag or full commit SHA when selecting a different release:

```bash
bunx shadcn@latest add celados/design-canvas/tanstack-start#<ref>
```

The installer deliberately does not edit `web/src/routes/__root.tsx`. To add
the optional floating Design entry outside the Canvas, lazy-load and render
`DesignEntry` from `@/components/designer` behind `import.meta.env.DEV` in the
root route. Keeping this host edit explicit avoids overwriting product-owned
root-route behavior.

## Prototype flows

Wrap an existing DOM element with `PrototypeLink` to declare a transition to
another canvas. The adapter adds no wrapper, so the child must either be a DOM
element or forward unknown DOM props.

```tsx
import { PrototypeLink } from '@/components/designer/prototype-link'

export function HeroCta() {
	return (
		<PrototypeLink id="hero-pricing" to="pricing" label="Explore pricing">
			<button type="button">View pricing</button>
		</PrototypeLink>
	)
}
```

Open `/_design/flow` to see one representative artboard per canvas with the
declared transitions. In Flow or a canvas page, use Command-click on macOS or
Control-click elsewhere to follow a prototype link. A normal click remains
owned by the rendered product surface.

## Develop

```bash
bun install
bun run dev
```

Validate the implementation and registry contract:

```bash
bun run check
bun run test
bun run build
```
