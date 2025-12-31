import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', containerClassName, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus-ring
              placeholder:text-slate-400
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                : 'border-slate-200 focus:border-primary-500 hover:border-slate-300'
                            }
              ${props.disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
              ${className}
            `}
                        {...props}
                    />
                    {rightIcon && !error && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            {rightIcon}
                        </div>
                    )}
                    {error && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
                            <AlertCircle size={16} />
                        </div>
                    )}
                </div>
                {(error || helperText) && (
                    <p className={`mt-1.5 text-xs ${error ? 'text-red-500' : 'text-slate-500'}`}>
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
