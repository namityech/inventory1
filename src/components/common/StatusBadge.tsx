import React from 'react';
import { ExpiryCategory } from '../../types/inventory';

interface ExpiryBadgeProps {
  category: ExpiryCategory;
  days?: number;
  className?: string;
}

export const ExpiryStatusBadge: React.FC<ExpiryBadgeProps> = ({ category, days, className = '' }) => {
  switch (category) {
    case 'EXPIRED':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-500" aria-hidden="true" />
          <span>Expired {days !== undefined ? `(${Math.abs(days)}d ago)` : ''}</span>
        </span>
      );
    case 'CRITICAL':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden="true" />
          <span>Critical {days !== undefined ? `(${days}d left)` : ''}</span>
        </span>
      );
    case 'WARNING':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          <span>Warning {days !== undefined ? `(${days}d left)` : ''}</span>
        </span>
      );
    case 'UPCOMING':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-400 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" aria-hidden="true" />
          <span>Upcoming {days !== undefined ? `(${days}d)` : ''}</span>
        </span>
      );
    case 'SAFE':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>Safe {days !== undefined ? `(>${days}d)` : ''}</span>
        </span>
      );
  }
};

interface StockBadgeProps {
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  usableStock?: number;
  unit?: string;
}

export const StockStatusBadge: React.FC<StockBadgeProps> = ({ status, usableStock, unit }) => {
  switch (status) {
    case 'OUT_OF_STOCK':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" aria-hidden="true" />
          <span>Out of Stock</span>
        </span>
      );
    case 'LOW_STOCK':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
          <span>Low Stock ({usableStock} {unit})</span>
        </span>
      );
    case 'IN_STOCK':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
          <span>In Stock ({usableStock} {unit})</span>
        </span>
      );
  }
};
