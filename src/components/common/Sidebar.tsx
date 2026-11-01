import React from 'react';
import {
  LayoutDashboard,
  Package,
  ClockAlert,
  ArrowLeftRight,
  TrendingUp,
  Building2,
  FileBarChart2,
  Bell,
  Users,
  Settings,
  LogOut,
  Boxes,
  ShoppingCart,
  Receipt,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationItemKey =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'customers'
  | 'products'
  | 'batches'
  | 'movements'
  | 'restock'
  | 'suppliers'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'settings';

interface SidebarProps {
  currentView: NavigationItemKey;
  onSelectView: (view: NavigationItemKey) => void;
  unreadCount?: number;
  criticalExpiryCount?: number;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  unreadCount = 0,
  criticalExpiryCount = 0,
  lowStockCount = 0
}) => {
  const { user, isAdmin, isManagerOrAbove, logout } = useAuth();

  const navItems = [
    {
      key: 'dashboard' as NavigationItemKey,
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'INVENTORY_MANAGER', 'STAFF']
    },
    {
      key: 'pos' as NavigationItemKey,
      label: 'Point of Sale (POS)',
      icon: ShoppingCart,
      roles: ['ADMIN', 'INVENTORY_MANAGER', 'STAFF']
    },
    {
      key: 'orders' as NavigationItemKey,
      label: 'Sales & Invoices',
      icon: Receipt,
      roles: ['ADMIN', 'INVENTORY_MANAGER', 'STAFF']
    },
    {
      key: 'customers' as NavigationItemKey,
      label: 'Customers (CRM)',
      icon: UserCheck,
      roles: ['ADMIN', 'INVENTORY_MANAGER', 'STAFF']
    },
    {
      key: 'products' as NavigationItemKey,
      label: 'Products',
      icon: Package,
      roles: ['ADMIN', 'INVENTORY_MANAGER', 'STAFF']
    },
    {
      key: 'batches' as NavigationItemKey,
      label: 'Expiry Management',
      icon: ClockAlert,
      badge: criticalExpiryCount > 0 ? criticalExpiryCount : undefined,
      badgeColor: 'text-rose-600 dark:text-rose-400 font-mono font-semibold',
      roles: ['ADMIN', 'INVENTORY_MANAGER', 'STAFF']
    },
    {
      key: 'movements' as NavigationItemKey,
      label: 'Stock Movements',
      icon: ArrowLeftRight,
      roles: ['ADMIN', 'INVENTORY_MANAGER', 'STAFF']
    },
    {
      key: 'restock' as NavigationItemKey,
      label: 'Restock & Orders',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'text-amber-600 dark:text-amber-400 font-mono font-semibold',
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    {
      key: 'suppliers' as NavigationItemKey,
      label: 'Suppliers & Categories',
      icon: Building2,
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    {
      key: 'reports' as NavigationItemKey,
      label: 'Reports & Valuation',
      icon: FileBarChart2,
      roles: ['ADMIN', 'INVENTORY_MANAGER']
    },
    {
      key: 'notifications' as NavigationItemKey,
      label: 'Notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeColor: 'text-teal-600 dark:text-teal-400 font-mono font-semibold',
      roles: ['ADMIN', 'INVENTORY_MANAGER', 'STAFF']
    },
    {
      key: 'users' as NavigationItemKey,
      label: 'User Management',
      icon: Users,
      roles: ['ADMIN']
    },
    {
      key: 'settings' as NavigationItemKey,
      label: 'Settings',
      icon: Settings,
      roles: ['ADMIN']
    }
  ];

  const visibleItems = navItems.filter(item =>
    item.roles.includes(user?.role || 'STAFF')
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 select-none border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-8 h-8 rounded-lg bg-teal-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
          SI
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight leading-none">Apex Inventory</h1>
          <p className="text-[11px] text-teal-400 font-medium mt-1">Smart Expiry & FEFO</p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Navigation
        </div>
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectView(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/15 text-teal-300 font-semibold border-l-2 border-teal-400 pl-2.5'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`text-[11px] tabular-nums ${item.badgeColor || 'text-slate-400'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Authorized Staff'}</p>
            <p className="text-[11px] text-slate-500 capitalize truncate">{user?.role?.toLowerCase().replace('_', ' ')}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
