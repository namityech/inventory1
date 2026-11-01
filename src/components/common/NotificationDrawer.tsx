import React, { useState } from 'react';
import { X, Check, CheckCheck, RefreshCw, AlertTriangle, AlertCircle, Clock, Info } from 'lucide-react';
import { InventoryNotification } from '../../types/inventory';
import { api } from '../../services/api';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InventoryNotification[];
  onRefresh: () => void;
  onSelectProduct?: (productId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onRefresh,
  onSelectProduct
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const filtered = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'expired') return n.type === 'EXPIRED';
    if (filterType === 'critical') return n.type === 'CRITICAL_EXPIRY';
    if (filterType === 'warning') return n.type === 'WARNING_EXPIRY';
    if (filterType === 'low_stock') return n.type === 'LOW_STOCK';
    return true;
  });

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    onRefresh();
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await api.markAllNotificationsRead();
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'EXPIRED':
        return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />;
      case 'CRITICAL_EXPIRY':
        return <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
      case 'WARNING_EXPIRY':
        return <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'LOW_STOCK':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-slate-50 dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inventory Notifications</h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">({notifications.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMarkAllRead}
              disabled={loading}
              title="Mark all as read"
              className="p-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Segmented Buttons */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'critical', label: 'Critical' },
            { id: 'expired', label: 'Expired' },
            { id: 'warning', label: 'Warning' },
            { id: 'low_stock', label: 'Low Stock' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filterType === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <Check className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-medium">No alerts matching this filter</p>
              <p className="text-[11px] text-slate-400 mt-1">All inventory items are within safe operational thresholds.</p>
            </div>
          ) : (
            filtered.map(notif => (
              <div
                key={notif.id}
                className={`p-3 rounded-lg transition-colors ${
                  notif.is_read ? 'opacity-65 hover:opacity-100' : 'bg-slate-50/80 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getIcon(notif.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                        {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      {notif.product_id && onSelectProduct ? (
                        <button
                          onClick={() => {
                            onSelectProduct(notif.product_id!);
                            onClose();
                          }}
                          className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
                        >
                          View Product Details &rarr;
                        </button>
                      ) : (
                        <span />
                      )}
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500">
          <span>Automated inventory integrity scanner</span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-medium hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Scan Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
