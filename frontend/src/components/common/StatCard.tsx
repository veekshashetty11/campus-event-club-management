import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
  gradient?: string; // e.g. 'from-violet-500 to-purple-600'
  accentColor?: string; // e.g. 'violet'
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-violet-100',
  trend,
  gradient,
  accentColor = 'violet',
}: StatCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all duration-300 overflow-hidden card-lift">
      {/* Gradient accent bar on top */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient ?? 'from-violet-500 to-blue-500'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Subtle glow on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br from-violet-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">{title}</p>
            <p className="text-3xl font-black text-slate-800 leading-none tracking-tight">
              {value}
            </p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{isPositive ? '+' : ''}{trend.value} {trend.label}</span>
              </div>
            )}
          </div>

          {/* Icon container with gradient background */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br ${gradient ?? 'from-violet-500 to-blue-500'} text-white`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
