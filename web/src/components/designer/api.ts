import type { ReactNode } from 'react'

/** Named artboard widths; authoring sugar so pages read like design intent. */
export const viewport = {
	desktop: 1440,
	laptop: 1280,
	tablet: 834,
	mobile: 390,
} as const

export type ViewportName = keyof typeof viewport

export type DeviceName = 'desktop' | 'tablet' | 'mobile'

export type DesignerPagePreview = {
	src: string
	width: number
	height: number
}

export type DesignerPrototypeLink = {
	id: string
	to: string
	label?: string
}

export type DesignerPageVariant = {
	name: string
	label?: string
	width?: number
	/** Change this value when an otherwise stable preview should be recaptured. */
	previewVersion?: string
	/** Pre-generated overview pixels; avoids mounting this view in the Wall. */
	preview?: DesignerPagePreview
	/**
	 * Explicit device class for the canvas switcher; when omitted the class is
	 * inferred from the width band.
	 */
	device?: DeviceName
	minHeight?: number
	dark?: boolean
	component: ReactNode
}

type DesignerPageBase = {
	/** Unique kebab-case id; becomes /_design/c/<name>. */
	name: string
	title?: string
	group?: string
	summary?: string
	tags?: string[]
	/** Default preview revision for this page and all variants. */
	previewVersion?: string
	preview?: DesignerPagePreview
	/**
	 * Canvas-level graph survives overview LOD when interactive DOM is
	 * rasterized.
	 */
	prototypeLinks?: DesignerPrototypeLink[]
}

/**
 * Exactly one of `component` or `variants` — the union makes a page with both
 * (or neither) a compile error at the definition site instead of a runtime
 * throw inside the designer.
 */
export type DesignerPage =
	| (DesignerPageBase & {
			/** Single tree shown at desktop width unless `variants` is set. */
			component: ReactNode
	  })
	| (DesignerPageBase & {
			variants: DesignerPageVariant[]
	  })

/** Normalized page used inside the designer runtime. */
export type CanvasView = {
	id: string
	label: string
	summary?: string
	width: number
	previewVersion?: string
	preview?: DesignerPagePreview
	device?: DeviceName
	minHeight?: number
	dark?: boolean
	render: () => ReactNode
}

export type CanvasDefinition = {
	id: string
	title: string
	group: string
	summary?: string
	tags?: string[]
	prototypeLinks?: DesignerPrototypeLink[]
	views: CanvasView[]
}

export function resolveDesignerPages(
	pages: DesignerPage[],
): CanvasDefinition[] {
	return pages.map((page) => {
		// The union makes both-or-neither unrepresentable in TS; this runtime
		// guard only exists for JS callers and empty variant arrays.
		const variants =
			'variants' in page
				? page.variants.length > 0
					? page.variants
					: []
				: page.component != null
					? [
							{
								name: 'desktop',
								label: 'Desktop',
								width: viewport.desktop,
								component: page.component,
							},
						]
					: []
		if (variants.length === 0) {
			throw new Error(
				`Designer page "${page.name}" needs component or variants`,
			)
		}
		return {
			id: page.name,
			title: page.title ?? page.name,
			group: page.group ?? 'Pages',
			summary: page.summary,
			tags: page.tags,
			prototypeLinks: page.prototypeLinks,
			views: variants.map((variant) => ({
				id: variant.name,
				label: variant.label ?? variant.name,
				width: variant.width ?? viewport.desktop,
				previewVersion: variant.previewVersion ?? page.previewVersion,
				preview: variant.preview ?? page.preview,
				device: variant.device,
				minHeight: variant.minHeight,
				dark: variant.dark,
				render: () => variant.component,
			})),
		}
	})
}
