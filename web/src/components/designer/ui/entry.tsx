import { DesignLink, useDesignPathname } from '../nav'

import '../entry.css'

/**
 * Floating entry point into the canvas, rendered by the host app's root route.
 * Hidden once inside the design surface. The host renders it dev-only, and the
 * routes it targets only exist in development.
 */
export function DesignEntry() {
	const pathname = useDesignPathname()
	if (pathname.startsWith('/_design')) return null

	return (
		<DesignLink to="/_design" className="dc-entry">
			<span className="dc-brand-mark">◈</span> Design
		</DesignLink>
	)
}
