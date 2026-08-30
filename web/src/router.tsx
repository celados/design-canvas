import { createRouter } from '@tanstack/react-router'

import { routeTree } from './route-tree.gen'

export function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: 'intent',
		defaultPreloadStaleTime: 0,
	})
}

declare module '@tanstack/react-router' {
	// TanStack owns this mergeable interface; a type alias cannot register the router.
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
