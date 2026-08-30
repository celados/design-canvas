import { defineConfig } from 'vitest/config'

// Designer unit tests only: the designer's logic is pure functions
// (api/layout/camera/markdown/model), so node environment suffices; the one
// DOM-dependent file opts into jsdom via a per-file annotation.
export default defineConfig({
	test: {
		environment: 'node',
		environmentOptions: {
			jsdom: { url: 'http://localhost/' },
		},
		include: ['web/src/**/*.test.ts', 'web/src/**/*.test.tsx'],
		setupFiles: ['./test/setup.ts'],
	},
})
