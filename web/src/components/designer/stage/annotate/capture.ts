/**
 * Source-location capture with strip resistance.
 *
 * Two dev toolchains annotate the dev DOM with source locations: - TanStack
 * devtools: `data-tsd-source="file:line:column"` on JSX elements. Nothing
 * removes them; live reads suffice. - Astro (compiler `annotateSourceFile`, dev
 * + devToolbar on): `data-astro-source-file` / `data-astro-source-loc`. The
 * built-in Audit dev-toolbar app moves them into a private WeakMap and REMOVES
 * them from the DOM at init — so by the time the lazily-loaded canvas chunk
 * reads the DOM, they are usually gone.
 *
 * This module snapshots both families into our own WeakMap. Install it as early
 * as possible (host bootstrap); a MutationObserver with attributeOldValue still
 * records values when the Audit app strips them later. Astro hosts wanting zero
 * race can install the inline-head recipe from the layer README.
 */

const TSD_ATTR = 'data-tsd-source'
const ASTRO_FILE_ATTR = 'data-astro-source-file'
const ASTRO_LOC_ATTR = 'data-astro-source-loc'

const snapshot = new WeakMap<Element, string>()
let installed = false

function normalizeTsd(value: string): string {
	// inject-source makes the path CWD-relative with a leading slash.
	return value.startsWith('/') ? value.slice(1) : value
}

function normalizeAstro(file: string, loc: string | null): string {
	return loc ? `${file}:${loc}` : file
}

/** Live DOM read of either attribute family. */
function readLive(el: Element): string | null {
	const tsd = el.getAttribute(TSD_ATTR)
	if (tsd) return normalizeTsd(tsd)
	const file = el.getAttribute(ASTRO_FILE_ATTR)
	if (file) return normalizeAstro(file, el.getAttribute(ASTRO_LOC_ATTR))
	return null
}

function sweep(root: Element | Document) {
	const selector = `[${TSD_ATTR}], [${ASTRO_FILE_ATTR}]`
	const elements: Element[] = []
	if (root instanceof Element && root.matches(selector)) elements.push(root)
	elements.push(...root.querySelectorAll(selector))
	for (const el of elements) {
		if (!snapshot.has(el)) {
			const value = readLive(el)
			if (value) snapshot.set(el, value)
		}
	}
}

export function installSourceCapture() {
	if (installed || typeof document === 'undefined') return
	installed = true

	sweep(document.documentElement)

	new MutationObserver((records) => {
		// The Audit app removes file and loc in two mutations delivered in one
		// batch, after which neither is readable from the DOM — collect per-batch
		// oldValues and pair them before snapshotting.
		const pending = new Map<
			Element,
			{ tsd?: string; file?: string; loc?: string }
		>()
		for (const record of records) {
			if (record.type === 'childList') {
				for (const node of record.addedNodes) {
					if (node instanceof Element) sweep(node)
				}
				continue
			}
			if (record.type !== 'attributes' || !(record.target instanceof Element))
				continue
			if (!record.oldValue) continue
			const entry = pending.get(record.target) ?? {}
			if (record.attributeName === TSD_ATTR) entry.tsd = record.oldValue
			else if (record.attributeName === ASTRO_FILE_ATTR)
				entry.file = record.oldValue
			else if (record.attributeName === ASTRO_LOC_ATTR)
				entry.loc = record.oldValue
			pending.set(record.target, entry)
		}
		for (const [el, entry] of pending) {
			if (snapshot.has(el)) continue
			if (entry.tsd) {
				snapshot.set(el, normalizeTsd(entry.tsd))
				continue
			}
			// Pair stripped oldValues; whichever side survived live fills the gap.
			const file = entry.file ?? el.getAttribute(ASTRO_FILE_ATTR)
			const loc = entry.loc ?? el.getAttribute(ASTRO_LOC_ATTR)
			if (file) snapshot.set(el, normalizeAstro(file, loc))
		}
	}).observe(document.documentElement, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeOldValue: true,
		attributeFilter: [TSD_ATTR, ASTRO_FILE_ATTR, ASTRO_LOC_ATTR],
	})
}

/**
 * Nearest source location at or above `el`, stopping at `boundary`. Live DOM
 * first, then the strip-resistant snapshot.
 */
export function sourceLocFor(
	el: Element,
	boundary: HTMLElement,
): string | null {
	let current: Element | null = el
	while (current && boundary.contains(current)) {
		const live = readLive(current)
		if (live) return live
		const snap = snapshot.get(current)
		if (snap) return snap
		if (current === boundary) break
		current = current.parentElement
	}
	return null
}

/** The element owning the source ref (nearest annotated ancestor-or-self). */
export function sourceElementFor(el: Element, boundary: HTMLElement): Element {
	let current: Element | null = el
	while (current && boundary.contains(current)) {
		if (current.hasAttribute(TSD_ATTR) || current.hasAttribute(ASTRO_FILE_ATTR))
			return current
		if (snapshot.has(current)) return current
		if (current === boundary) break
		current = current.parentElement
	}
	return el
}
