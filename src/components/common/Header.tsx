import React, { useState } from 'react';
import {
  Bell, ChevronDown, ShieldCheck, UserCheck, LogOut, CheckCircle2
} from 'lucide-react';
import { useAuth, DEMO_PERSONAS } from '../../context/AuthContext';
import { UserRole } from '../../types/inventory';

interface HeaderProps {
  currentView: string;
  unreadCount: number;
  onOpenNotifications: () => void;
  onQuickAction: () => void;
  quickActionLabel: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  unreadCount,
  onOpenNotifications,
  onQuickAction,
  quickActionLabel
}) => {
  const { user, quickLoginAs, logout } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const viewTitles: Record<string, string> = {
    dashboard: 'Operational Overview',
    pos: 'Point of Sale (POS)',
    orders: 'Sales & Invoice Management',
    customers: 'Customer Relationship Management',
    products: 'Products Directory',
    batches: 'Batch & Expiry Lifecycle',
    movements: 'Stock Movements & FEFO',
    restock: 'Restocking & Replenishment',
    suppliers: 'Suppliers & Categories',
    reports: 'Valuation & Loss Reports',
    notifications: 'Notification Center',
    users: 'Role Permissions & Audit',
    settings: 'System Configuration'
  };

  const handleSwitchPersona = async (id: string) => {
    setShowPersonaMenu(false);
    await quickLoginAs(id);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* Zone 1: Wordmark and Context Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <a href="#dashboard" className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white text-xs font-black">
            SI
          </span>
          <span>Smart Inventory</span>
        </a>
        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">/</span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
          {viewTitles[currentView] || 'Inventory Portal'}
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-500">FEFO Enforced Mode</span>
        <span aria-hidden="true">·</span>
        <span className="text-slate-400 dark:text-slate-500">Real-time Batch Sync</span>
        <span aria-hidden="true">·</span>
        <span className="text-slate-400 dark:text-slate-500">Regulatory Audit Ready</span>
      </nav>

      {/* Zone 3: 1 Primary Action + Persona Menu & Notifications */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Notifications & Expiry Alerts"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
          )}
        </button>

        {/* Primary Context Action Button */}
        <button
          onClick={onQuickAction}
          className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          {quickActionLabel}
        </button>

        {/* User Persona & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            aria-expanded={showPersonaMenu}
          >
            <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-[10px] font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="hidden md:inline font-medium max-w-[120px] truncate">{user?.name}</span>
            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold uppercase">
              {user?.role === 'INVENTORY_MANAGER' ? 'Manager' : user?.role || 'User'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showPersonaMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Role: {user?.role}</span>
                </div>
              </div>

              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">
                  Switch Persona (Instant Testing)
                </p>
                {DEMO_PERSONAS.map(p => {
                  const isActive = user?.email === p.email || user?.name === p.name;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchPersona(p.id)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</span>
                        </div>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 block ml-5 font-medium">{p.profession}</span>
                      </div>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1 px-2">
                <button
                  onClick={() => {
                    setShowPersonaMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
