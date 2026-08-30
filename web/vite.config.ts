import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, lazyPlugins } from 'vite-plus'

const config = defineConfig({
	root: import.meta.dirname,
	resolve: { tsconfigPaths: true },
	plugins: lazyPlugins(() => [
		// Source annotations make Canvas feedback actionable at the owning JSX.
		...devtools(),
		...tailwindcss(),
		...tanstackStart({
			router: {
				generatedRouteTree: 'route-tree.gen.ts',
			},
		}),
		// Vite+ exposes a fetchable SSR environment, so Nitro owns the request
		// middleware in development and the standalone server output in builds.
		nitro(),
		viteReact(),
	]),
})

export default config
