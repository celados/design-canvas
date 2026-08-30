import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { validateStageSearch } from '@/components/designer/search'

const CanvasPage = import.meta.env.DEV
	? lazy(() =>
			import('@/components/designer').then((module) => ({
				default: module.CanvasPage,
			})),
		)
	: null

export const Route = createFileRoute('/_design/c/$canvasId')({
	validateSearch: validateStageSearch,
	component: CanvasRoute,
})

function CanvasRoute() {
	if (!CanvasPage) return null
	return (
		<Suspense fallback={null}>
			<CanvasPage />
		</Suspense>
	)
}
