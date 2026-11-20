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
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  }[padding];

  const variantClass = {
    default: 'bg-[#111C32] border border-[#263650] shadow-md text-slate-100',
    glass: 'bg-[#111C32]/80 backdrop-blur-xl border border-[#263650] shadow-xl text-slate-100',
    gradient: `bg-gradient-to-br ${gradient ?? 'from-[#111C32] to-[#17243B]'} border border-[#263650] shadow-md text-slate-100`,
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
        'rounded-2xl transition-all duration-200',
        variantClass,
        paddingClass,
        hover
          ? 'cursor-pointer hover:border-[#3B82F6]/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] card-lift'
          : '',
        onClick ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
