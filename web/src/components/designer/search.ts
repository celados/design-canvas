export type StageSearch = {
	x?: number
	y?: number
	z?: number
	view?: string
}

function asNumber(value: unknown): number | undefined {
	const n =
		typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
	return Number.isFinite(n) ? n : undefined
}

export function validateStageSearch(
	search: Record<string, unknown>,
): StageSearch {
	const x = asNumber(search.x)
	const y = asNumber(search.y)
	const z = asNumber(search.z)
	return {
		...(x !== undefined ? { x } : {}),
		...(y !== undefined ? { y } : {}),
		...(z !== undefined ? { z } : {}),
		...(typeof search.view === 'string' ? { view: search.view } : {}),
	}
}
