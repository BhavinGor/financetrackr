import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    options?: Option[];
    placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className = '', label, error, helperText, options = [], placeholder = 'Select an option', children, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={`
              w-full appearance-none rounded-lg border bg-white px-3 py-2 text-sm transition-colors focus-ring pr-10
              ${error
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                                : 'border-slate-200 focus:border-primary-500 hover:border-slate-300'
                            }
              ${props.disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
              ${className}
            `}
                        {...props}
                    >
                        <option value="" disabled>{placeholder}</option>
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                        {children}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown size={16} />
                    </div>
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

Select.displayName = 'Select';
