import { harness } from '@celados/harness'
import { defineConfig } from 'vite-plus'

export default defineConfig(
	harness({
		react: ['web/src/**'],
		// TanStack Router's generated route tree, shadcn-owned ui primitives
		// keep the upstream style but are linted like our own code.
		ignore: ['dist/**', '**/*.gen.ts', '.output/**', '.tanstack/**'],
		fmt: {
			sortTailwindcss: {
				stylesheet: 'web/src/styles.css',
				functions: ['cn', 'cx', 'clsx', 'cva'],
			},
		},
	}),
)
