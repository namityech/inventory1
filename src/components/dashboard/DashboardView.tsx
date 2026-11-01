import React, { useState, useEffect } from 'react';
import {
  Package, Boxes, AlertTriangle, ClockAlert, DollarSign,
  TrendingDown, TrendingUp, ArrowUpRight, ArrowDownLeft,
  ChevronRight, RefreshCw, Plus, CheckCircle, ShieldAlert,
  ShoppingCart, Receipt, UserCheck, CreditCard
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';
import { DashboardSummary, StockMovement, InventoryNotification, SalesAnalytics } from '../../types/inventory';
import { ExpiryStatusBadge } from '../common/StatusBadge';
import { api } from '../../services/api';

interface DashboardViewProps {
  summary: DashboardSummary | null;
  expiryDistribution: { expired: number; critical: number; warning: number; upcoming: number; safe: number };
  monthlyMovements: Array<{ month: string; inward: number; outward: number; disposed: number }>;
  fastMoving: Array<{ id: string; name: string; sku: string; units_moved: number; revenue_generated: number }>;
  slowMoving: Array<{ id: string; name: string; sku: string; units_moved: number; revenue_generated: number }>;
  recentMovements: StockMovement[];
  urgentAlerts: InventoryNotification[];
  valuationByCategory: Array<{ category_name: string; color: string; product_count: number; total_value: number; total_units: number }>;
  onNavigate: (view: any) => void;
  onRecordMovement: () => void;
  onAddProduct: () => void;
  onRefresh: () => void;
  loading: boolean;
}

const EXPIRY_COLORS = {
  expired: '#e11d48', // rose-600
  critical: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
  upcoming: '#0ea5e9', // sky-500
  safe: '#10b981' // emerald-500
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  expiryDistribution,
  monthlyMovements,
  fastMoving,
  slowMoving,
  recentMovements,
  urgentAlerts,
  valuationByCategory,
  onNavigate,
  onRecordMovement,
  onAddProduct,
  onRefresh,
  loading
}) => {
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);

  useEffect(() => {
    api.getSalesAnalytics()
      .then(res => setSalesAnalytics(res.analytics))
      .catch(err => console.error('Failed to load sales analytics:', err));
  }, [loading]);

  if (loading && !summary) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  const expiryPieData = [
    { name: 'Safe (>60d)', value: expiryDistribution.safe, color: EXPIRY_COLORS.safe },
    { name: 'Upcoming (31-60d)', value: expiryDistribution.upcoming, color: EXPIRY_COLORS.upcoming },
    { name: 'Warning (8-30d)', value: expiryDistribution.warning, color: EXPIRY_COLORS.warning },
    { name: 'Critical (≤7d)', value: expiryDistribution.critical, color: EXPIRY_COLORS.critical },
    { name: 'Expired', value: expiryDistribution.expired, color: EXPIRY_COLORS.expired }
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Smart Inventory Operations Center
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>FEFO Protocol: Active</span>
            <span aria-hidden="true">·</span>
            <span>Live Expiry Monitoring</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-medium"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('pos')}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Point of Sale (POS)</span>
          </button>
          <button
            onClick={onRecordMovement}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            Record Movement
          </button>
          <button
            onClick={onAddProduct}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Urgent Alerts Notification Strip if critical items exist */}
      {urgentAlerts && urgentAlerts.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                  Immediate Expiry Attention Required ({urgentAlerts.length} Critical Items)
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                  {urgentAlerts[0]?.title}: {urgentAlerts[0]?.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('batches')}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-slate-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100/50 transition-colors whitespace-nowrap shrink-0"
            >
              Resolve in Expiry Desk &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards Grid (7 Key Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Products */}
        <div
          onClick={() => onNavigate('products')}
          className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Total Catalog
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {summary?.totalProducts || 0}
            </span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Active SKUs</span>
        </div>

        {/* 2. Total Stock Units (Usable vs Expired) */}
        <div
          onClick={() => onNavigate('products')}
          className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Usable Stock
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-teal-600 dark:text-teal-400 font-mono tabular-nums">
              {summary?.usableStockQuantity || 0}
            </span>
            <Boxes className="w-4 h-4 text-teal-500" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono tabular-nums">
            Total {summary?.totalStockQuantity || 0} units
          </span>
        </div>

        {/* 3. Low Stock */}
        <div
          onClick={() => onNavigate('restock')}
          className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Low Stock
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {summary?.lowStockProductsCount || 0}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">Needs Reorder</span>
        </div>

        {/* 4. Expiring Soon (Critical + Warning) */}
        <div
          onClick={() => onNavigate('batches')}
          className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Expiring &le;30d
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-orange-600 dark:text-orange-400 font-mono tabular-nums">
              {summary?.expiringSoonProductsCount || 0}
            </span>
            <ClockAlert className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono tabular-nums">
            {summary?.criticalExpiringCount || 0} &le;7 days
          </span>
        </div>

        {/* 5. Expired Units */}
        <div
          onClick={() => onNavigate('batches')}
          className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Expired Units
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {summary?.expiredStockQuantity || 0}
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 block">Quarantined</span>
        </div>

        {/* 6. Total Inventory Valuation */}
        <div
          onClick={() => onNavigate('reports')}
          className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Inventory Value
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              ${(summary?.totalInventoryValue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono tabular-nums">
            At cost valuation
          </span>
        </div>

        {/* 7. Expiry Losses & Risk */}
        <div
          onClick={() => onNavigate('reports')}
          className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Confirmed Loss
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              ${(summary?.totalEstimatedExpiryLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono tabular-nums">
            Risk: ${(summary?.stockAtRiskValue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Commercial Sales Performance & CRM Receivables Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <ShoppingCart className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Commercial Sales & Customer Receivables
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Point of Sale velocity, credit sales recovery, and institutional customer accounts
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigate('pos')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Launch POS Counter</span>
            </button>
            <button
              onClick={() => onNavigate('orders')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Orders & Invoices</span>
            </button>
            <button
              onClick={() => onNavigate('customers')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>CRM Directory</span>
            </button>
          </div>
        </div>

        {/* 4 Financial Sales Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] font-medium text-slate-500 block">Today's Sales</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                ${(salesAnalytics?.daily_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">FMT settlement</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] font-medium text-slate-500 block">7-Day Weekly Turnover</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                ${(salesAnalytics?.weekly_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Trailing 7 days</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] font-medium text-slate-500 block">30-Day Monthly Sales</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                ${(salesAnalytics?.monthly_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                {salesAnalytics?.total_orders || 0} orders
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Fulfilled transactions</span>
          </div>

          <div
            onClick={() => onNavigate('orders')}
            className="p-4 bg-slate-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-xl cursor-pointer hover:border-amber-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Outstanding Receivables</span>
              <CreditCard className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                ${(salesAnalytics?.total_outstanding_receivables || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] font-mono text-amber-600 font-bold">Unpaid Credit</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Across client accounts</span>
          </div>
        </div>

        {/* 14-day Sales Trend & Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  14-Day Sales Velocity & Cashflow Trend
                </h4>
                <p className="text-[11px] text-slate-500">Gross revenue generated through POS and commercial orders</p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-teal-600 dark:text-teal-400">
                Daily Revenue ($)
              </span>
            </div>
            <div className="h-48 w-full">
              {salesAnalytics?.sales_trend && salesAnalytics.sales_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesAnalytics.sales_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No sales recorded yet in this period
                </div>
              )}
            </div>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Top Client Accounts
              </h4>
              <button
                onClick={() => onNavigate('customers')}
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-semibold"
              >
                All Accounts
              </button>
            </div>
            <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-52">
              {salesAnalytics?.top_customers && salesAnalytics.top_customers.length > 0 ? (
                salesAnalytics.top_customers.map((c, i) => (
                  <div key={c.id || i} className="py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {c.name}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {c.orders_count} orders &bull; balance: ${Number(c.outstanding_balance || 0).toFixed(0)}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono tabular-nums shrink-0">
                      ${Number(c.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No customer activity recorded yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Stock Movement Chart (2 Columns) */}
        <div className="lg:col-span-2 p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Monthly Stock Movement (Inward vs Outward vs Disposal)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Purchases received, sales/usage dispatches, and expired disposals
              </p>
            </div>
            <button
              onClick={() => onNavigate('movements')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>View Ledger</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyMovements} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="inward" name="Purchases In" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outward" name="Sales / Dispensed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disposed" name="Expired Waste" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expiry Status Breakdown (1 Column) */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Expiry Status Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Stock units categorized by days to expiration
            </p>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expiryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expiryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value} units`, 'Quantity']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span>Expired (Quarantined)</span>
              </span>
              <span className="font-mono tabular-nums font-semibold text-rose-600">
                {expiryDistribution.expired}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Critical (&le;7 days)</span>
              </span>
              <span className="font-mono tabular-nums font-semibold text-red-500">
                {expiryDistribution.critical}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Warning (8-30 days)</span>
              </span>
              <span className="font-mono tabular-nums font-semibold text-amber-500">
                {expiryDistribution.warning}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Safe (&gt;60 days)</span>
              </span>
              <span className="font-mono tabular-nums font-semibold text-emerald-600">
                {expiryDistribution.safe}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Velocity & Recent Transactions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast vs Slow Moving Velocity */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Product Turnover & Velocity (Last 30 Days)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fast-moving high demand vs stagnant slow-moving products
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider block mb-2">
                Fast-Moving High Turnover
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {fastMoving.map(item => (
                  <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                      <span className="text-[11px] font-mono text-slate-400">{item.sku}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                        {item.units_moved} units
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono tabular-nums">
                        ${item.revenue_generated.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Slow-Moving Stagnant Stock
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {slowMoving.map(item => (
                  <div key={item.id} className="py-1.5 flex items-center justify-between text-xs text-slate-500">
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-slate-700 dark:text-slate-300">{item.name}</p>
                      <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono tabular-nums text-slate-400">
                        {item.units_moved} units moved
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Stock Movement Activities */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recent Stock Movements & Issues
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time transaction history with batch allocation tags
              </p>
            </div>
            <button
              onClick={() => onNavigate('movements')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              All Movements &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentMovements.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent stock movements</p>
            ) : (
              recentMovements.map(m => {
                const isIncoming = m.movement_type === 'PURCHASE';
                const isDisposal = m.movement_type === 'DISPOSAL';
                return (
                  <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isIncoming
                            ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600'
                            : isDisposal
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600'
                        }`}
                      >
                        {isIncoming ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isDisposal ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {m.product_name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono">{m.transaction_code}</span>
                          <span aria-hidden="true">·</span>
                          <span>{m.movement_type}</span>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          isIncoming
                            ? 'text-teal-600 dark:text-teal-400'
                            : isDisposal
                            ? 'text-rose-600'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {isIncoming ? '+' : '-'}{m.quantity} {m.unit}
                      </span>
                      {m.total_value > 0 && (
                        <span className="block text-[11px] text-slate-400 font-mono tabular-nums">
                          ${m.total_value.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
