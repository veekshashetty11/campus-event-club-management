import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'gradient';
  gradient?: string;
}

export default function Card({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
  variant = 'default',
  gradient,
}: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }[padding];

  const variantClass = {
    default: 'bg-white border border-slate-200/80 shadow-sm',
    glass: 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm',
    gradient: `bg-gradient-to-br ${gradient ?? 'from-violet-50 to-blue-50'} border border-violet-100/80 shadow-sm`,
  }[variant];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick()
          : undefined
      }
      className={[
        'rounded-2xl',
        variantClass,
        paddingClass,
        hover
          ? 'cursor-pointer hover:border-violet-300 hover:shadow-lg transition-all duration-200 card-lift'
          : '',
        onClick ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
