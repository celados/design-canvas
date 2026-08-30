import { describe, expect, it } from 'vitest'

import { fuzzyScore } from './palette'

describe('fuzzyScore', () => {
	it('matches any text for an empty query', () => {
		expect(fuzzyScore('', 'anything')).toBe(1)
	})

	it('returns 0 when the query is not a subsequence', () => {
		expect(fuzzyScore('zx', 'canvas')).toBe(0)
	})

	it('scores subsequence matches and rewards consecutive runs', () => {
		const scattered = fuzzyScore('hd', 'hero desktop')
		const consecutive = fuzzyScore('he', 'hero desktop')
		expect(scattered).toBeGreaterThan(0)
		expect(consecutive).toBeGreaterThan(scattered)
	})

	it('is case-sensitive by design (query is lowercased upstream)', () => {
		expect(fuzzyScore('H', 'hero')).toBe(0)
	})
})
