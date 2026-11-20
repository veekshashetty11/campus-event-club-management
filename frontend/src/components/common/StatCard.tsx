import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: number; label: string };
  gradient?: string; // e.g. 'from-indigo-500 to-blue-500'
  accentColor?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  gradient = 'from-[#4F46E5] to-[#3B82F6]',
}: StatCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;

  return (
    <div className="group relative bg-[#111C32] rounded-2xl border border-[#263650] shadow-md hover:border-[#3B82F6]/50 transition-all duration-300 overflow-hidden card-lift">
      {/* Gradient accent bar on top */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Subtle glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{title}</p>
            <p className="text-3xl font-black text-white leading-none tracking-tight mt-0.5">
              {value}
            </p>
            {subtitle && <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{isPositive ? '+' : ''}{trend.value} {trend.label}</span>
              </div>
            )}
          </div>

          {/* Icon container with gradient background */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md bg-gradient-to-br ${gradient} text-white`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
