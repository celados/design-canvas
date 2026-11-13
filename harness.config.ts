import { defineHarnessConfig } from '@celados/harness'

export default defineHarnessConfig({
	typecheck: {
		exclude: {
			'packages/core/tsconfig.build.json':
				'Emit-only variant of tsconfig.json, which is checked.',
		},
	},
})
