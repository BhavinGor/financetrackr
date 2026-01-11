import React from 'react';
import { Card, CardContent } from '../ui/Card';

interface TransactionListProps {
    children: React.ReactNode;
}

export const TransactionList = ({ children }: TransactionListProps) => {
    return (
        <div className="grid grid-cols-1 gap-3">
            {children}
        </div>
    );
};
