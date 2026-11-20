import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  className = '',
  onClick,
  hover = false,
  padding = 'md',
}: CardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  }[padding];

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
        'bg-white rounded-xl border border-slate-200 shadow-soft',
        paddingClass,
        hover
          ? 'cursor-pointer hover:border-brand-300 hover:shadow-card transition-all duration-150'
          : '',
        onClick ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
