import { defineConfig } from 'vite-plus'

import { oxfmtConfig } from './tooling/oxfmt'

const config = defineConfig({
	check: {
		lint: false,
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
