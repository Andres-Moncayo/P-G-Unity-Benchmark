interface FeedStatsProps {
  stats?: {
    forumsCount: number | null;
    bugsCount: number | null;
    competitorsCount: number | null;
    postsCount: number | null;
  };
}

export function FeedStats({ stats = { forumsCount: null, bugsCount: null, competitorsCount: null, postsCount: null } }: FeedStatsProps) {
  const display = [
    { label: 'monitored forums', value: stats.forumsCount ?? '—', accent: 'border-orange-500/35 shadow-[0_0_0_1px_rgba(249,115,22,0.08),0_0_24px_rgba(249,115,22,0.08)]', valueColor: 'text-orange-300', bgClass: 'bg-orange-500/6' },
    { label: 'monitored competitors', value: stats.competitorsCount ?? '—', accent: 'border-blue-500/35 shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_0_24px_rgba(59,130,246,0.08)]', valueColor: 'text-blue-200', bgClass: 'bg-blue-500/6' },
    { label: 'monitored bugs', value: stats.bugsCount ?? '—', accent: 'border-purple-500/35 shadow-[0_0_0_1px_rgba(168,85,247,0.08),0_0_24px_rgba(168,85,247,0.08)]', valueColor: 'text-purple-200', bgClass: 'bg-purple-500/6' },
    { label: 'total posts fetched', value: stats.postsCount ?? '—', accent: 'border-cyan-500/35 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_24px_rgba(34,211,238,0.08)]', valueColor: 'text-cyan-200', bgClass: 'bg-cyan-500/6' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {display.map((stat, index) => (
        <div
          key={index}
          className={`rounded-[14px] border px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 ${stat.accent} ${stat.bgClass}`}
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gray-500">
            <span className={`inline-block h-2 w-2 rounded-full ${stat.valueColor.replace('text-', 'bg-')}`} />
            Live metric
          </div>
          <div className={`mb-1 text-2xl font-bold ${stat.valueColor}`}>{stat.value}</div>
          <div className="text-sm text-gray-300">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}