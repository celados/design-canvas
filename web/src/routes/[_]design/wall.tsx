import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { validateStageSearch } from '@/components/designer/search'

const WallPage = import.meta.env.DEV
	? lazy(() =>
			import('@/components/designer').then((module) => ({
				default: module.WallPage,
			})),
		)
	: null

export const Route = createFileRoute('/_design/wall')({
	validateSearch: validateStageSearch,
	component: WallRoute,
})

function WallRoute() {
	if (!WallPage) return null
	return (
		<Suspense fallback={null}>
			<WallPage />
		</Suspense>
	)
}
