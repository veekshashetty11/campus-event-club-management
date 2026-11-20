type BadgeVariant =
  | 'default'
  | 'primary'
  | 'teal'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'amber'
  | 'neutral';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  neutral: 'bg-slate-100 text-slate-700',
  primary: 'bg-brand-100 text-brand-800',
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
  primary: 'bg-brand-600',
  teal: 'bg-teal-500',
  success: 'bg-emerald-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  amber: 'bg-amber-500',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={['h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant]].join(' ')}
        />
      )}
      {children}
    </span>
  );
}
