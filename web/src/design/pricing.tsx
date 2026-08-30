const TIERS = [
	{
		name: 'Starter',
		price: '$0',
		cadence: 'forever',
		blurb: 'For side projects and evaluation.',
		features: [
			'3 canvases',
			'Community components',
			'7-day version history',
			'PNG export',
		],
		featured: false,
		cta: 'Start free',
	},
	{
		name: 'Team',
		price: '$24',
		cadence: 'per editor / month',
		blurb: 'For product teams shipping weekly.',
		features: [
			'Unlimited canvases',
			'Shared token pipelines',
			'Unlimited version history',
			'Dev handoff mode',
			'Priority support',
		],
		featured: true,
		cta: 'Start 14-day trial',
	},
	{
		name: 'Enterprise',
		price: 'Custom',
		cadence: 'annual',
		blurb: 'For orgs with security reviews.',
		features: [
			'SSO / SCIM',
			'Audit log',
			'Dedicated region',
			'Design-system SLA',
		],
		featured: false,
		cta: 'Talk to sales',
	},
]

function PricingTable({ compact }: { compact?: boolean }) {
	return (
		<section
			className={`mx-auto grid max-w-6xl gap-5 px-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}
		>
			{TIERS.map((tier) => (
				<div
					key={tier.name}
					className={`relative flex flex-col rounded-2xl p-7 ${
						tier.featured
							? 'bg-neutral-950 text-white shadow-2xl ring-1 shadow-indigo-950/30 ring-white/10'
							: 'border border-neutral-200 bg-white'
					} ${compact ? '' : tier.featured ? 'md:-my-4 md:py-11' : ''}`}
				>
					{tier.featured ? (
						<span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-[11px] font-bold tracking-wide uppercase">
							Most popular
						</span>
					) : null}
					<h3
						className={`text-sm font-semibold tracking-wide uppercase ${
							tier.featured ? 'text-indigo-300' : 'text-neutral-500'
						}`}
					>
						{tier.name}
					</h3>
					<div className="mt-4 flex items-baseline gap-2">
						<span
							className={`text-4xl font-semibold tracking-tight ${
								tier.featured ? 'text-white' : 'text-neutral-950'
							}`}
						>
							{tier.price}
						</span>
						<span
							className={`text-sm ${tier.featured ? 'text-neutral-400' : 'text-neutral-400'}`}
						>
							{tier.cadence}
						</span>
					</div>
					<p
						className={`mt-2 text-sm ${tier.featured ? 'text-neutral-400' : 'text-neutral-500'}`}
					>
						{tier.blurb}
					</p>
					<ul className="mt-6 flex flex-col gap-2.5">
						{tier.features.map((feature) => (
							<li
								key={feature}
								className={`flex items-center gap-2.5 text-sm ${
									tier.featured ? 'text-neutral-200' : 'text-neutral-700'
								}`}
							>
								<span
									className={`grid size-4.5 shrink-0 place-items-center rounded-full text-[10px] ${
										tier.featured
											? 'bg-indigo-500/25 text-indigo-300'
											: 'bg-neutral-100 text-neutral-600'
									}`}
								>
									✓
								</span>
								{feature}
							</li>
						))}
					</ul>
					<span
						className={`mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
							tier.featured
								? 'bg-white text-neutral-950'
								: 'border border-neutral-300 text-neutral-800'
						}`}
					>
						{tier.cta}
					</span>
				</div>
			))}
		</section>
	)
}

export function Pricing({ compact }: { compact?: boolean }) {
	return (
		<div className="min-h-full bg-neutral-50 pb-24">
			<header className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-14 text-center">
				<span className="text-xs font-bold tracking-[0.14em] text-indigo-600 uppercase">
					Pricing
				</span>
				<h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance text-neutral-950 sm:text-5xl">
					Pay when the canvas pays off
				</h1>
				<p className="mt-4 max-w-lg text-lg leading-8 text-neutral-500">
					Free for evaluation, fairly priced for teams, boringly predictable for
					finance.
				</p>
			</header>
			<PricingTable compact={compact} />
			<p className="mx-auto mt-14 max-w-md px-6 text-center text-sm text-neutral-400">
				All plans include unlimited viewers. Prices in USD, taxes may apply.
			</p>
		</div>
	)
}
