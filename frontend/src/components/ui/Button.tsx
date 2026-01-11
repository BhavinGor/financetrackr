import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {

        const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md',
            secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm',
            outline: 'bg-transparent hover:bg-primary-50 text-primary-600 border border-primary-200',
            ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
            danger: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs gap-1.5',
            md: 'h-10 px-4 text-sm gap-2',
            lg: 'h-12 px-6 text-base gap-2.5',
        };

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} />}
                {!isLoading && leftIcon}
                <span>{children}</span>
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';
