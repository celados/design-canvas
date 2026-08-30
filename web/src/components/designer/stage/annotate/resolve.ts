import type { AnnotationTarget } from './model'

import { sourceElementFor, sourceLocFor } from './capture'

/**
 * Anchor resolution for canvas annotations.
 *
 * Primary ref is a dev source location: TanStack devtools injects
 * `data-tsd-source` on JSX elements; the Astro compiler injects
 * `data-astro-source-file`/`-loc` on .astro output (strip-prone — see
 * capture.ts). Both normalize to `file:line:column`. Without any source
 * location, fall back to a stable CSS selector, then to artboard-relative
 * position.
 *
 * Selector strategy follows gloss's annotator: ids first, then test hooks, then
 * human-authored classes; nth-of-type only as a disambiguator; depth is capped
 * because longer selectors get more brittle, not more precise.
 */

const MAX_DEPTH = 5

// Hash-like class names from scoped-style compilers change every build.
function isStableClass(cls: string): boolean {
	if (cls.length > 30) return false
	if (/\d{4,}/.test(cls)) return false
	if (/^[a-z]+-[a-z0-9]{6,}$/i.test(cls)) return false
	return true
}

function testHookSegment(el: Element): string | null {
	for (const attr of ['data-testid', 'data-test', 'data-cy']) {
		const value = el.getAttribute(attr)
		if (value) return `[${attr}="${CSS.escape(value)}"]`
	}
	return null
}

function segmentFor(el: Element): string {
	const tag = el.tagName.toLowerCase()
	const hook = testHookSegment(el)
	if (hook) return `${tag}${hook}`

	const stable = [...el.classList].filter(isStableClass).slice(0, 2)
	if (stable.length > 0) {
		return tag + stable.map((cls) => `.${CSS.escape(cls)}`).join('')
	}

	const parent = el.parentElement
	if (parent) {
		const sameTag = [...parent.children].filter(
			(child) => child.tagName === el.tagName,
		)
		if (sameTag.length > 1) {
			return `${tag}:nth-of-type(${sameTag.indexOf(el) + 1})`
		}
	}
	return tag
}

function isUniqueWithin(root: Element | Document, selector: string): boolean {
	try {
		return root.querySelectorAll(selector).length === 1
	} catch {
		return false
	}
}

/** Selector unique within the frame (the same screen repeats across views). */
export function buildSelector(el: Element, frame: HTMLElement): string {
	if (el.id) {
		const byId = `#${CSS.escape(el.id)}`
		if (isUniqueWithin(frame, byId)) return byId
	}

	const segments: string[] = []
	let current: Element | null = el
	while (current && current !== frame) {
		segments.unshift(segmentFor(current))
		const candidate = segments.join(' > ')
		if (isUniqueWithin(frame, candidate)) return candidate
		if (segments.length >= MAX_DEPTH) break
		current = current.parentElement
	}
	return segments.join(' > ')
}

export function elementLabel(el: Element): string {
	const tag = el.tagName.toLowerCase()
	const raw =
		el instanceof HTMLImageElement
			? el.alt
			: el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
				? (el.placeholder ?? el.value)
				: ((el as HTMLElement).innerText ?? el.textContent ?? '')
	const text = raw.replace(/\s+/g, ' ').trim().slice(0, 24)
	return text ? `${tag} "${text}"` : tag
}

export function captureTarget(
	el: Element,
	frame: HTMLElement,
	screenToWorld: (screenX: number, screenY: number) => { x: number; y: number },
): AnnotationTarget {
	// The box wraps the element the ref points at: the nearest source-annotated
	// ancestor when dev tooling provides one, else the element itself.
	const boxed = sourceElementFor(el, frame)
	const sourceLoc = sourceLocFor(boxed, frame)
	const rect = boxed.getBoundingClientRect()
	const frameRect = frame.getBoundingClientRect()
	const anchor = screenToWorld(rect.left + 2, rect.top + 2)

	return {
		sourceLoc,
		selector: buildSelector(boxed, frame),
		label: elementLabel(boxed),
		relX:
			frameRect.width > 0 ? (rect.left - frameRect.left) / frameRect.width : 0,
		relY:
			frameRect.height > 0 ? (rect.top - frameRect.top) / frameRect.height : 0,
		worldX: anchor.x,
		worldY: anchor.y,
	}
}

/**
 * Re-locate the anchor after reloads: source location first (both attribute
 * families stay queryable while live, and the selector still names the element
 * otherwise). Returns null when the element is gone — the stored world position
 * remains as the stale pin.
 */
export function resolveTarget(
	target: AnnotationTarget,
	frame: HTMLElement,
): Element | null {
	if (target.sourceLoc) {
		// Stored sourceLocs are normalized (no leading slash); live tsd attributes
		// keep inject-source's cwd-relative `/src/...` form — accept both.
		const stored = target.sourceLoc
		const liveForm = stored.startsWith('/') ? stored.slice(1) : `/${stored}`
		const tsd = frame.querySelector(
			`[data-tsd-source="${CSS.escape(stored)}"], [data-tsd-source="${CSS.escape(liveForm)}"]`,
		)
		if (tsd) return tsd
		const [file] = stored.split(':')
		for (const el of frame.querySelectorAll('[data-astro-source-file]')) {
			if (el.getAttribute('data-astro-source-file') === file) return el
		}
	}
	try {
		return frame.querySelector(target.selector)
	} catch {
		return null
	}
}
