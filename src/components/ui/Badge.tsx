import React from 'react';
import { X } from 'lucide-react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    onRemove?: () => void;
    className?: string;
    icon?: React.ReactNode;
}

export const Badge = ({ children, variant = 'primary', size = 'md', onRemove, className = '', icon }: BadgeProps) => {
    const variants = {
        primary: 'bg-primary-50 text-primary-700 border-primary-200',
        secondary: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-green-50 text-green-700 border-green-200',
        warning: 'bg-orange-50 text-orange-700 border-orange-200',
        danger: 'bg-red-50 text-red-700 border-red-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    const sizes = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-0.5',
    };

    return (
        <span className={`
      inline-flex items-center gap-1.5 font-medium rounded-full border
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering parent click events
                        onRemove();
                    }}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                    <X size={12} />
                </button>
            )}
        </span>
    );
};
