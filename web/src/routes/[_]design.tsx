import { createFileRoute, notFound } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

// Isolated so production DCE drops Designer + src/design pages with this branch.
const DesignLayout = import.meta.env.DEV
	? lazy(() => import('@/design/layout'))
	: null

export const Route = createFileRoute('/_design')({
	beforeLoad: () => {
		if (!import.meta.env.DEV) throw notFound()
	},
	component: DesignRoute,
})

function DesignRoute() {
	if (!DesignLayout) return null
	return (
		<Suspense fallback={null}>
			<DesignLayout />
		</Suspense>
	)
}
