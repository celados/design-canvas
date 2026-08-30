import type { MouseEventHandler, ReactElement, ReactNode } from 'react'

import {
	Link,
	useNavigate,
	useParams,
	useRouterState,
	useSearch,
} from '@tanstack/react-router'

// Design routes are code-based and intentionally invisible to the host app's
// generated FileRouteTypes. All router type erasure for the layer is contained
// in this module; everything else in src/design/ stays fully typed.

type DesignLinkProps = {
	to: string
	search?: Record<string, unknown>
	params?: Record<string, string>
	className?: string
	title?: string
	onClick?: MouseEventHandler<HTMLAnchorElement>
	children?: ReactNode
}

// Link's public props are generic over the registered route tree; the layer's
// code-based routes never appear in that registry, so the cast lives here.
const UntypedLink = Link as unknown as (props: DesignLinkProps) => ReactElement

export function DesignLink(props: DesignLinkProps) {
	return <UntypedLink {...props} />
}

export function useDesignNavigate() {
	const navigate = useNavigate()
	return (
		to: string,
		options?: { search?: Record<string, unknown>; replace?: boolean },
	) =>
		navigate({
			to,
			search: options?.search,
			replace: options?.replace ?? false,
			resetScroll: false,
		} as never)
}

export function useDesignPathname(): string {
	return useRouterState({ select: (state) => state.location.pathname })
}

export function useCanvasIdParam(): string | undefined {
	const params = useParams({ strict: false }) as Record<string, unknown>
	return typeof params.canvasId === 'string' ? params.canvasId : undefined
}

/** Loose read of the current route's search params for stage state. */
export function useDesignSearch(): Record<string, unknown> {
	return useSearch({ strict: false }) as Record<string, unknown>
}
