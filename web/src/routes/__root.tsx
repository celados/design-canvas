import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import appCss from '../styles.css?url'

const LazyDesignEntry = import.meta.env.DEV
	? lazy(() =>
			import('@/components/designer').then((module) => ({
				default: module.DesignEntry,
			})),
		)
	: null

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{ title: 'Design Canvas' },
		],
		links: [{ rel: 'stylesheet', href: appCss }],
	}),
	component: RootComponent,
	shellComponent: RootDocument,
})

function RootComponent() {
	return (
		<>
			<Outlet />
			{LazyDesignEntry ? (
				<Suspense fallback={null}>
					<LazyDesignEntry />
				</Suspense>
			) : null}
		</>
	)
}

function RootDocument(props: { children: React.ReactNode }) {
	const { children } = props
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	)
}
