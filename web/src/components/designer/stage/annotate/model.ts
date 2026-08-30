export type AnnotationTarget = {
	/**
	 * Normalized source location (`file:line:column`) when any dev tooling
	 * provides it.
	 */
	sourceLoc: string | null
	/** Stable CSS selector fallback (id > test hook > authored classes). */
	selector: string
	/** Human-readable summary, e.g. `button "Get started"`. */
	label: string
	/** Position within the artboard content box, 0–1 fractions. */
	relX: number
	relY: number
	/** Pin anchor in world coordinates; re-resolved on load when possible. */
	worldX: number
	worldY: number
}

export type Annotation = {
	id: string
	canvasId: string
	viewId: string
	comment: string
	createdAt: number
	target: AnnotationTarget
}

const storageKey = (canvasId: string) =>
	`design-canvas:annotations:v1:${canvasId}`

/** Structural validation shared by localStorage loads and file imports. */
export function parseAnnotations(raw: unknown): Annotation[] {
	if (!Array.isArray(raw)) return []
	return raw.filter(
		(entry): entry is Annotation =>
			typeof entry === 'object' &&
			entry !== null &&
			typeof (entry as Annotation).id === 'string' &&
			typeof (entry as Annotation).comment === 'string' &&
			typeof (entry as Annotation).target === 'object',
	)
}

/** Union by id; on collision the newer comment wins so re-imports update. */
export function mergeAnnotations(
	current: Annotation[],
	incoming: Annotation[],
): Annotation[] {
	const byId = new Map(current.map((annotation) => [annotation.id, annotation]))
	for (const annotation of incoming) {
		const existing = byId.get(annotation.id)
		if (!existing || annotation.createdAt > existing.createdAt) {
			byId.set(annotation.id, annotation)
		}
	}
	return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt)
}

export function loadAnnotations(canvasId: string): Annotation[] {
	try {
		const raw = localStorage.getItem(storageKey(canvasId))
		if (!raw) return []
		return parseAnnotations(JSON.parse(raw))
	} catch {
		return []
	}
}

export function saveAnnotations(canvasId: string, annotations: Annotation[]) {
	try {
		localStorage.setItem(storageKey(canvasId), JSON.stringify(annotations))
	} catch {
		console.warn('[design] annotations could not be persisted (quota)')
	}
}
