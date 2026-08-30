import { Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { useDesignPathname } from '../nav'
import { Navigator } from './navigator'
import { CommandPalette } from './palette'
import { ShortcutsOverlay } from './shortcuts'

import '../design.css'

const COLLAPSE_KEY = 'design-canvas:nav-collapsed'

export function DesignShell() {
	const pathname = useDesignPathname()
	// null = not yet hydrated from localStorage; renders collapsed until then.
	const [navOpen, setNavOpen] = useState<boolean | null>(null)

	useEffect(() => {
		const stored = localStorage.getItem(COLLAPSE_KEY)
		// First visit: expanded on the gallery, collapsed over stages.
		setNavOpen(
			stored === null
				? pathname === '/_design' || pathname === '/_design/'
				: stored !== '1',
		)
		// Default derives from the first landing page only.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const toggleNav = (next: boolean) => {
		setNavOpen(next)
		localStorage.setItem(COLLAPSE_KEY, next ? '0' : '1')
	}

	return (
		<div className="dc-root">
			<div className="dc-body" data-nav-open={navOpen === true || undefined}>
				<Outlet />
			</div>
			<Navigator open={navOpen === true} onToggle={toggleNav} />
			<CommandPalette />
			<ShortcutsOverlay />
		</div>
	)
}
