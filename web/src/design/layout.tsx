import { Designer, viewport } from '@/components/designer'

import { Dashboard, DashboardMobile } from './dashboard'
import { Hero, HeroMobile } from './hero'
import { Pricing } from './pricing'

export default function DesignLayout() {
	return (
		<Designer
			pages={[
				{
					name: 'hero',
					title: 'Hero',
					group: 'Marketing',
					summary: 'Landing hero with product mock, two breakpoints',
					variants: [
						{
							name: 'desktop',
							label: 'Desktop',
							width: viewport.desktop,
							minHeight: 900,
							component: <Hero />,
						},
						{
							name: 'mobile',
							label: 'Mobile',
							width: viewport.mobile,
							minHeight: 844,
							component: <HeroMobile />,
						},
					],
				},
				{
					name: 'pricing',
					title: 'Pricing',
					group: 'Marketing',
					summary: 'Three-tier pricing with featured plan',
					component: <Pricing />,
				},

				{
					name: 'dashboard',
					title: 'Dashboard',
					group: 'Product',
					summary: 'Analytics overview, dark surface',
					variants: [
						{
							name: 'desktop',
							label: 'Desktop',
							width: viewport.desktop,
							minHeight: 900,
							dark: true,
							component: <Dashboard />,
						},
						{
							name: 'mobile',
							label: 'Mobile',
							width: viewport.mobile,
							minHeight: 844,
							dark: true,
							component: <DashboardMobile />,
						},
					],
				},
			]}
		/>
	)
}
