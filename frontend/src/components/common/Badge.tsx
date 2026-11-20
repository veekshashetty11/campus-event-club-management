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
  default: 'bg-slate-100 text-slate-700 border border-slate-200',
  neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  primary: 'bg-blue-50 text-blue-700 border border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border border-violet-200',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  teal: 'bg-teal-50 text-teal-700 border border-teal-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-orange-50 text-orange-700 border border-orange-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-sky-50 text-sky-700 border border-sky-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  neutral: 'bg-slate-500',
  primary: 'bg-blue-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  teal: 'bg-teal-500',
  success: 'bg-emerald-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  amber: 'bg-amber-500',
};

const glowClasses: Record<BadgeVariant, string> = {
  default: '',
  neutral: '',
  primary: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]',
  violet: 'shadow-[0_0_8px_rgba(124,58,237,0.3)]',
  purple: 'shadow-[0_0_8px_rgba(147,51,234,0.3)]',
  teal: 'shadow-[0_0_8px_rgba(20,184,166,0.3)]',
  success: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
  warning: 'shadow-[0_0_8px_rgba(249,115,22,0.3)]',
  danger: 'shadow-[0_0_8px_rgba(239,68,68,0.3)]',
  info: 'shadow-[0_0_8px_rgba(14,165,233,0.3)]',
  amber: 'shadow-[0_0_8px_rgba(245,158,11,0.3)]',
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
        'inline-flex items-center gap-1.5 font-semibold rounded-full',
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1',
        variantClasses[variant],
        glow ? glowClasses[variant] : '',
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={['h-1.5 w-1.5 rounded-full shrink-0 animate-pulse', dotColors[variant]].join(' ')}
        />
      )}
      {children}
    </span>
  );
}
