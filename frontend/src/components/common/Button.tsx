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
    'bg-gradient-to-r from-[#4F46E5] to-[#3B82F6] text-white hover:from-[#4338CA] hover:to-[#2563EB] shadow-sm hover:shadow-[0_0_16px_rgba(79,70,229,0.4)] focus-visible:ring-[#4F46E5] disabled:opacity-50 active:scale-[0.98]',
  secondary:
    'bg-[#17243B] text-slate-200 border border-[#263650] hover:bg-[#263650] hover:text-white hover:border-slate-500 shadow-sm focus-visible:ring-[#4F46E5] disabled:opacity-50 active:scale-[0.98]',
  outline:
    'border border-[#263650] bg-[#111C32]/70 text-slate-200 hover:bg-[#17243B] hover:border-indigo-500/60 hover:text-white focus-visible:ring-[#4F46E5] disabled:opacity-50 active:scale-[0.98]',
  ghost:
    'bg-transparent text-slate-400 hover:bg-[#17243B] hover:text-white focus-visible:ring-[#4F46E5] disabled:opacity-50 active:scale-[0.98]',
  danger:
    'bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-700 hover:to-red-700 shadow-sm hover:shadow-[0_0_16px_rgba(244,63,94,0.4)] focus-visible:ring-rose-500 disabled:opacity-50 active:scale-[0.98]',
  gradient:
    'bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#3B82F6] text-white hover:opacity-90 shadow-md hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] focus-visible:ring-[#4F46E5] disabled:opacity-50 active:scale-[0.98]',
};

const sizeClasses: Record<Size, string> = {
  xs: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5 font-medium',
  sm: 'text-xs px-3.5 py-2 rounded-xl gap-2 font-semibold',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2 font-semibold',
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
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-150 select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080D1B]',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
