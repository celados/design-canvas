import type { CanvasDefinition } from '../../api'
import type { Annotation } from './model'

function pct(value: number): string {
	return `${Math.round(value * 1000) / 10}%`
}

/**
 * Agent-consumable review document. The source location leads every entry —
 * that is the ref an agent can open directly; selector and position are the
 * fallbacks for locating the element in a running page.
 */
export function annotationsToMarkdown(
	canvas: CanvasDefinition,
	annotations: Annotation[],
	pageUrl: string,
): string {
	const sorted = [...annotations].sort((a, b) => a.createdAt - b.createdAt)
	const lines: string[] = [
		`# Design review — ${canvas.title}`,
		'',
		`- Canvas: \`${canvas.id}\` (${canvas.group})`,
		`- Page: ${pageUrl}`,
		`- Comments: ${sorted.length}`,
		'',
	]

	let index = 0
	for (const view of canvas.views) {
		const entries = sorted.filter((annotation) => annotation.viewId === view.id)
		if (entries.length === 0) continue
		lines.push(`## ${view.label} · ${view.width}px`, '')
		for (const annotation of entries) {
			index++
			const ref = annotation.target.sourceLoc ?? annotation.target.selector
			lines.push(`### ${index}. ${annotation.target.label}`)
			lines.push('')
			lines.push(annotation.comment)
			lines.push('')
			lines.push(`- Ref: \`${ref}\``)
			if (annotation.target.sourceLoc) {
				lines.push(`- Selector: \`${annotation.target.selector}\``)
			}
			lines.push(
				`- Position: ${pct(annotation.target.relX)} × ${pct(annotation.target.relY)} of view`,
			)
			lines.push('')
		}
	}

	return lines.join('\n')
}
