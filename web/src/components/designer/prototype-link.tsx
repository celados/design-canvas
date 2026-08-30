import type { ReactElement } from 'react'

import { cloneElement } from 'react'

type PrototypeElementProps = {
	'data-dc-prototype-id'?: string
	'data-dc-prototype-label'?: string
	'data-dc-prototype-to'?: string
}

export type PrototypeLinkProps = {
	/** Target canvas id from the Designer page registry. */
	to: string
	/** Stable id for reviews and connection identity. */
	id?: string
	label?: string
	/** The child must forward DOM props when it is a custom component. */
	children: ReactElement<PrototypeElementProps>
}

/**
 * Declares a prototype hotspot without adding a wrapper that could alter the
 * artboard's layout. The Stage owns navigation so normal clicks remain the
 * product surface's responsibility.
 */
export function PrototypeLink(props: PrototypeLinkProps) {
	const { children, id, label, to } = props
	return cloneElement(children, {
		'data-dc-prototype-id': id,
		'data-dc-prototype-label': label,
		'data-dc-prototype-to': to,
	})
}
