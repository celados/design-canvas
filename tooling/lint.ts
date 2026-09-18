import type { OxlintConfig } from 'vite-plus/lint'

// Lint exists only for rules a framework defines for itself (Solid reactivity,
// React hooks, Convex function contracts, StyleX compile constraints) — mistakes
// that type checking cannot see. Oxlint otherwise enables its default plugins
// and `correctness` category; those general-purpose presets stay off.
// Source: https://oxc.rs/docs/guide/usage/linter/config
export const frameworkLintBase = {
	plugins: [],
	categories: { correctness: 'off' },
} satisfies OxlintConfig
