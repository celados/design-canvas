const SIDEBAR = [
	'Overview',
	'Analytics',
	'Projects',
	'Members',
	'Billing',
	'Settings',
]

const STATS = [
	{ label: 'Active viewers', value: '8,412', delta: '+12.4%', up: true },
	{ label: 'Renders today', value: '192,384', delta: '+4.1%', up: true },
	{ label: 'Failed exports', value: '23', delta: '-18.0%', up: false },
	{ label: 'Storage', value: '61.2 GB', delta: '+2.3%', up: true },
]

const BARS = [42, 58, 40, 66, 52, 74, 62, 88, 70, 95, 82, 100, 78, 91]

const ACTIVITY = [
	['Ava Lindqvist', 'published Marketing / Hero v14', '2m ago'],
	['Tom Okafor', 'commented on Pricing / Team tier', '18m ago'],
	['Mira Chen', 'exported dashboard.png @2x', '1h ago'],
	['Jonas Weber', 'merged tokens/radius into main', '3h ago'],
]

function AreaChart() {
	const points = BARS.map((value, index) => [
		(index / (BARS.length - 1)) * 560,
		150 - (value / 100) * 140,
	])
	const line = points
		.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`)
		.join(' ')
	return (
		<svg
			viewBox="0 0 560 160"
			className="h-40 w-full"
			preserveAspectRatio="none"
		>
			<defs>
				<linearGradient id="dc-dash-fill" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
					<stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={`${line} L560,160 L0,160 Z`} fill="url(#dc-dash-fill)" />
			<path
				d={line}
				fill="none"
				stroke="#6366f1"
				strokeWidth="2.5"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function Sidebar() {
	return (
		<aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-neutral-800 bg-neutral-950 p-4">
			<div className="mb-4 flex items-center gap-2.5 px-2">
				<span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-600 text-sm font-black text-white">
					M
				</span>
				<span className="text-sm font-semibold text-neutral-100">Meridian</span>
			</div>
			{SIDEBAR.map((item, index) => (
				<span
					key={item}
					className={`rounded-lg px-3 py-2 text-sm font-medium ${
						index === 0
							? 'bg-neutral-800 text-white'
							: 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
					}`}
				>
					{item}
				</span>
			))}
			<div className="mt-auto rounded-xl border border-neutral-800 bg-neutral-900 p-3">
				<p className="text-xs font-semibold text-neutral-200">Usage</p>
				<div className="mt-2 h-1.5 rounded-full bg-neutral-800">
					<div className="h-full w-3/5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500" />
				</div>
				<p className="mt-2 text-[11px] text-neutral-500">61.2 GB of 100 GB</p>
			</div>
		</aside>
	)
}

function StatCards() {
	return (
		<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
			{STATS.map((stat) => (
				<div
					key={stat.label}
					className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
				>
					<p className="text-xs font-medium text-neutral-500">{stat.label}</p>
					<div className="mt-2 flex items-baseline justify-between gap-2">
						<span className="text-2xl font-semibold tracking-tight text-neutral-50">
							{stat.value}
						</span>
						<span
							className={`text-xs font-semibold ${stat.up ? 'text-emerald-400' : 'text-rose-400'}`}
						>
							{stat.delta}
						</span>
					</div>
				</div>
			))}
		</div>
	)
}

export function Dashboard() {
	return (
		<div className="flex min-h-full bg-neutral-950 text-neutral-100">
			<Sidebar />
			<main className="flex min-w-0 flex-1 flex-col gap-5 p-6">
				<header className="flex items-center justify-between gap-4">
					<div>
						<h1 className="text-xl font-semibold tracking-tight">Overview</h1>
						<p className="mt-0.5 text-sm text-neutral-500">
							Tuesday, Aug 18 · Workspace: Product
						</p>
					</div>
					<div className="flex items-center gap-3">
						<div className="w-56 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-500">
							Search…
						</div>
						<span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-bold text-white">
							AL
						</span>
					</div>
				</header>
				<StatCards />
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
					<section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 xl:col-span-2">
						<div className="mb-3 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-neutral-200">
								Renders
							</h2>
							<span className="text-xs text-neutral-500">Last 14 days</span>
						</div>
						<AreaChart />
					</section>
					<section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
						<h2 className="mb-3 text-sm font-semibold text-neutral-200">
							Recent activity
						</h2>
						<ul className="flex flex-col gap-3.5">
							{ACTIVITY.map(([who, what, when]) => (
								<li key={what} className="flex items-start gap-3">
									<span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-neutral-800 text-[10px] font-bold text-neutral-300">
										{who
											.split(' ')
											.map((part) => part[0])
											.join('')}
									</span>
									<div className="min-w-0">
										<p className="truncate text-[13px] text-neutral-300">
											<span className="font-semibold text-neutral-100">
												{who}
											</span>{' '}
											{what}
										</p>
										<p className="text-[11px] text-neutral-500">{when}</p>
									</div>
								</li>
							))}
						</ul>
					</section>
				</div>
			</main>
		</div>
	)
}

export function DashboardMobile() {
	return (
		<div className="flex min-h-full flex-col bg-neutral-950 text-neutral-100">
			<header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3.5">
				<span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-600 text-sm font-black text-white">
					M
				</span>
				<span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-[11px] font-bold text-white">
					AL
				</span>
			</header>
			<main className="flex flex-col gap-4 p-4">
				<div>
					<h1 className="text-lg font-semibold tracking-tight">Overview</h1>
					<p className="text-xs text-neutral-500">Tuesday, Aug 18</p>
				</div>
				<StatCards />
				<section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
					<div className="mb-2 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-neutral-200">Renders</h2>
						<span className="text-[11px] text-neutral-500">14 days</span>
					</div>
					<AreaChart />
				</section>
				<section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
					<h2 className="mb-3 text-sm font-semibold text-neutral-200">
						Recent activity
					</h2>
					<ul className="flex flex-col gap-3">
						{ACTIVITY.slice(0, 3).map(([who, what, when]) => (
							<li key={what} className="flex items-start gap-2.5">
								<span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-neutral-800 text-[9px] font-bold text-neutral-300">
									{who
										.split(' ')
										.map((part) => part[0])
										.join('')}
								</span>
								<div className="min-w-0">
									<p className="truncate text-xs text-neutral-300">
										<span className="font-semibold text-neutral-100">
											{who}
										</span>{' '}
										{what}
									</p>
									<p className="text-[10px] text-neutral-500">{when}</p>
								</div>
							</li>
						))}
					</ul>
				</section>
			</main>
		</div>
	)
}
