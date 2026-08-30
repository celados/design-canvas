import type { ReactNode } from 'react'

import { createContext, useContext, useMemo } from 'react'

import type { CanvasDefinition, DesignerPage } from './api'

import { resolveDesignerPages } from './api'

const DesignerPagesContext = createContext<CanvasDefinition[] | null>(null)

export function DesignerProvider(props: {
	pages: DesignerPage[]
	children: ReactNode
}) {
	const canvases = useMemo(
		() => resolveDesignerPages(props.pages),
		[props.pages],
	)
	return (
		<DesignerPagesContext.Provider value={canvases}>
			{props.children}
		</DesignerPagesContext.Provider>
	)
}

export function useDesignerPages(): CanvasDefinition[] {
	const pages = useContext(DesignerPagesContext)
	if (!pages) {
		throw new Error('useDesignerPages must be used under <Designer pages={…}>')
	}
	return pages
}

export function useDesignerPage(
	id: string | undefined,
): CanvasDefinition | undefined {
	const pages = useDesignerPages()
	return id ? pages.find((page) => page.id === id) : undefined
}
