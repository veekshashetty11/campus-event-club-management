interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-brand-100',
  trend,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-soft p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <p
              className={[
                'text-xs font-medium mt-1',
                trend.value >= 0 ? 'text-emerald-600' : 'text-red-500',
              ].join(' ')}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)} {trend.label}
            </p>
          )}
        </div>
        <div
          className={[
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
            iconBg,
          ].join(' ')}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
