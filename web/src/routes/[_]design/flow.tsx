import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const FlowPage = import.meta.env.DEV
	? lazy(() =>
			import('@/components/designer').then((module) => ({
				default: module.FlowPage,
			})),
		)
	: null

export const Route = createFileRoute('/_design/flow')({
	component: FlowRoute,
})

function FlowRoute() {
	if (!FlowPage) return null
	return (
		<Suspense fallback={null}>
			<FlowPage />
		</Suspense>
	)
}
