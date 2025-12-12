import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hoverEffect?: boolean;
}

export const Card = ({ children, className = '', onClick, hoverEffect = false }: CardProps) => {
    return (
        <div
            className={`bg-white rounded-xl shadow-soft border border-slate-100 overflow-hidden ${hoverEffect ? 'card-hover cursor-pointer' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`px-6 py-4 border-b border-slate-50 ${className}`}>
        {children}
    </div>
);

export const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`text-lg font-semibold text-slate-800 ${className}`}>
        {children}
    </h3>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);

export const CardFooter = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`px-6 py-4 bg-slate-50 border-t border-slate-100 ${className}`}>
        {children}
    </div>
);
