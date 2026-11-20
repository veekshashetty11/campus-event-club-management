import React from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700 shadow-sm hover:shadow-md focus-visible:ring-violet-500 disabled:from-violet-300 disabled:to-blue-300',
  secondary:
    'bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 shadow-sm hover:shadow-md focus-visible:ring-teal-500 disabled:opacity-50',
  outline:
    'border border-violet-200 bg-white/80 text-violet-700 hover:bg-violet-50 hover:border-violet-300 focus-visible:ring-violet-500 disabled:opacity-50',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-violet-500 disabled:opacity-50',
  danger:
    'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 shadow-sm hover:shadow-md focus-visible:ring-red-500 disabled:opacity-50',
  gradient:
    'bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 text-white hover:from-violet-700 hover:via-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg focus-visible:ring-violet-500 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  xs: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
  sm: 'text-sm px-3 py-2 rounded-xl gap-2',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
  lg: 'text-base px-5 py-3 rounded-xl gap-2.5 font-semibold',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed select-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
