import type { OxfmtConfig } from 'vite-plus/fmt'

// Vite+ expects Oxfmt options in vite.config.ts, so this module keeps the
// organization baseline reusable without shipping a competing .oxfmtrc file.
// Sources: https://viteplus.dev/guide/fmt and https://oxc.rs/docs/guide/usage/formatter
export const oxfmtConfig = {
	printWidth: 80,
	singleQuote: true,
	semi: false,
	useTabs: true,
	jsdoc: true,
	sortImports: {
		groups: [
			['type-builtin', 'type-external'],
			['builtin', 'external'],
			['type-internal', 'type-subpath', 'internal', 'subpath'],
			['type-parent', 'type-sibling', 'type-index'],
			['parent', 'sibling', 'index'],
			['side_effect', 'side_effect_style', 'style'],
		],
	},
	ignorePatterns: [
		'node_modules',
		'externals',
		'dist',
		'*.lock',
		'.agents/**',
		'.claude/**',
		'.wireit/**',
		'**/*.gen.ts',
		'**/worker-configuration.d.ts',
		'convex/_generated',
	],
} satisfies OxfmtConfig
