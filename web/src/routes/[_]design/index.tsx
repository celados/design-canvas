import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const GalleryPage = import.meta.env.DEV
	? lazy(() =>
			import('@/components/designer').then((module) => ({
				default: module.GalleryPage,
			})),
		)
	: null

export const Route = createFileRoute('/_design/')({
	component: GalleryRoute,
})

function GalleryRoute() {
	if (!GalleryPage) return null
	return (
		<Suspense fallback={null}>
			<GalleryPage />
		</Suspense>
	)
}
