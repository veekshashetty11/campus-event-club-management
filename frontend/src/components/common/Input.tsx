import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      wrapperClassName = '',
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`;

    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            {...props}
            className={[
              'w-full rounded-xl border bg-[#17243B] text-sm text-slate-100',
              'placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'transition-all duration-150',
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : 'border-[#263650] focus:border-[#4F46E5] focus:ring-[#4F46E5]/20 hover:border-slate-500',
              'disabled:bg-[#0D1426] disabled:text-slate-500 disabled:cursor-not-allowed',
              leftElement ? 'pl-10' : 'pl-3.5',
              rightElement ? 'pr-10' : 'pr-3.5',
              'py-2.5',
              className,
            ].join(' ')}
          />
          {rightElement && (
            <div className="absolute right-3.5 flex items-center text-slate-400">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-400 mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
