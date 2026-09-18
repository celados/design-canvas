import { defineConfig } from 'vite-plus'

import { frameworkLintBase } from './tooling/lint'
import { oxfmtConfig } from './tooling/oxfmt'

const config = defineConfig({
	lint: {
		...frameworkLintBase,
		plugins: ['react'],
		ignorePatterns: ['**/*.gen.ts', '**/dist/**'],
		rules: {
			// React's own correctness rules; built into Oxlint, no extra dependency.
			'react/rules-of-hooks': 'error',
			// warn, not error: 8 existing hits sit in the canvas runtime's subscription
			// and activation effects, where omitted deps (e.g. preview priority) look
			// deliberate; adding them changes timing. Review before promoting.
			'react/exhaustive-deps': 'warn',
			'react/jsx-key': 'error',
		},
	},
	staged: {
		'*': 'vp check --fix',
	},
	fmt: {
		...oxfmtConfig,
		sortTailwindcss: {
			stylesheet: 'web/src/styles.css',
			functions: ['cn', 'cx', 'clsx', 'cva'],
		},
	},
})

export default config
