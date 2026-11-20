import React from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'teal'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'amber'
  | 'neutral'
  | 'violet'
  | 'purple';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  glow?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#17243B] text-slate-300 border border-[#263650]',
  neutral: 'bg-[#17243B] text-slate-400 border border-[#263650]',
  primary: 'bg-indigo-950/70 text-indigo-300 border border-indigo-700/60',
  violet: 'bg-indigo-950/70 text-indigo-300 border border-indigo-700/60',
  purple: 'bg-purple-950/70 text-purple-300 border border-purple-700/60',
  teal: 'bg-teal-950/70 text-teal-300 border border-teal-700/60',
  success: 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/60',
  warning: 'bg-amber-950/70 text-amber-300 border border-amber-700/60',
  danger: 'bg-rose-950/70 text-rose-300 border border-rose-700/60',
  info: 'bg-cyan-950/70 text-cyan-300 border border-cyan-700/60',
  amber: 'bg-amber-950/70 text-amber-300 border border-amber-700/60',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  neutral: 'bg-slate-400',
  primary: 'bg-indigo-400',
  violet: 'bg-indigo-400',
  purple: 'bg-purple-400',
  teal: 'bg-teal-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-cyan-400',
  amber: 'bg-amber-400',
};

const glowClasses: Record<BadgeVariant, string> = {
  default: '',
  neutral: '',
  primary: 'shadow-[0_0_8px_rgba(79,70,229,0.4)]',
  violet: 'shadow-[0_0_8px_rgba(79,70,229,0.4)]',
  purple: 'shadow-[0_0_8px_rgba(168,85,247,0.4)]',
  teal: 'shadow-[0_0_8px_rgba(20,184,166,0.4)]',
  success: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  warning: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  danger: 'shadow-[0_0_8px_rgba(244,63,94,0.4)]',
  info: 'shadow-[0_0_8px_rgba(6,182,212,0.4)]',
  amber: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
  md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
  glow = false,
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium leading-none tracking-tight transition-all',
        variantClasses[variant],
        sizeClasses[size],
        glow ? glowClasses[variant] : '',
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]} ${glow ? 'animate-pulse' : ''}`}
        />
      )}
      {children}
    </span>
  );
}
