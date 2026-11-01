import React, { useState, useMemo } from 'react';
import {
  ClockAlert, AlertTriangle, Search, Plus, Filter,
  DollarSign, Trash2, ShieldAlert, ArrowUpDown, RefreshCw,
  CheckCircle, FileSpreadsheet
} from 'lucide-react';
import { Batch, Product, Supplier } from '../../types/inventory';
import { ExpiryStatusBadge } from '../common/StatusBadge';
import { DisposeModal } from './DisposeModal';
import { BatchFormModal } from './BatchFormModal';
import { useAuth } from '../../context/AuthContext';

interface BatchesViewProps {
  batches: Batch[];
  products: Product[];
  suppliers: Supplier[];
  onRefresh: () => void;
  loading: boolean;
}

export const BatchesView: React.FC<BatchesViewProps> = ({
  batches,
  products,
  suppliers,
  onRefresh,
  loading
}) => {
  const { isManagerOrAbove } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'expired' | 'critical' | 'warning' | 'upcoming' | 'safe'>('all');
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');

  // Modal states
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [disposeTarget, setDisposeTarget] = useState<Batch | null>(null);

  // Financial calculations on current batch set
  const metrics = useMemo(() => {
    let totalBatches = 0;
    let expiredLoss = 0;
    let criticalRisk = 0;
    let warningRisk = 0;
    let activeStockValue = 0;

    for (const b of batches) {
      if (b.remaining_quantity <= 0) continue;
      totalBatches++;
      const val = b.remaining_quantity * b.purchase_price;

      if (b.is_expired) {
        expiredLoss += val;
      } else {
        activeStockValue += val;
        if (b.expiry_category === 'CRITICAL') {
          criticalRisk += val;
        } else if (b.expiry_category === 'WARNING') {
          warningRisk += val;
        }
      }
    }

    return {
      totalBatches,
      expiredLoss,
      criticalRisk,
      warningRisk,
      totalAtRisk: criticalRisk + warningRisk,
      activeStockValue
    };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      // Exclude depleted batches from expiry warning tabs unless viewing 'all'
      if (b.remaining_quantity <= 0 && activeTab !== 'all') return false;

      if (activeTab === 'expired' && !b.is_expired) return false;
      if (activeTab === 'critical' && b.expiry_category !== 'CRITICAL') return false;
      if (activeTab === 'warning' && b.expiry_category !== 'WARNING') return false;
      if (activeTab === 'upcoming' && b.expiry_category !== 'UPCOMING') return false;
      if (activeTab === 'safe' && b.expiry_category !== 'SAFE') return false;

      if (selectedSupplier !== 'all' && b.supplier_id !== selectedSupplier) {
        return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const matchesLot = b.batch_number.toLowerCase().includes(q);
        const matchesProd = b.product_name ? b.product_name.toLowerCase().includes(q) : false;
        const matchesSku = b.sku ? b.sku.toLowerCase().includes(q) : false;
        if (!matchesLot && !matchesProd && !matchesSku) return false;
      }

      return true;
    }).sort((a, b) => {
      // Earliest expiry date first
      return a.expiry_date.localeCompare(b.expiry_date);
    });
  }, [batches, activeTab, selectedSupplier, search]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClockAlert className="w-5 h-5 text-teal-600" />
            <span>Batch & Expiry Management Desk</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time batch lifecycle tracking, statutory expiry classification, and waste write-offs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Batches"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isManagerOrAbove && (
            <button
              onClick={() => setIsNewBatchOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Receive New Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Risk & Expiry Exposure Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Total Active Batches</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
              {metrics.totalBatches}
            </span>
            <span className="text-xs text-slate-400">batches tracked</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Multi-lot tracking enabled</span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-950/60 rounded-xl">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 block">
            Expired Quarantined Loss
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-rose-600 tabular-nums">
              ${metrics.expiredLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-[10px] text-rose-600/80 mt-1 block">Blocked from sales/FEFO</span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-amber-200 dark:border-amber-950/60 rounded-xl">
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 block">
            Immediate Expiry Risk (&le;30d)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums">
              ${metrics.totalAtRisk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <ClockAlert className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-[10px] text-amber-600/80 mt-1 block font-mono tabular-nums">
            &le;7d: ${metrics.criticalRisk.toFixed(0)} · 8-30d: ${metrics.warningRisk.toFixed(0)}
          </span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Active Usable Valuation</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400 tabular-nums">
              ${metrics.activeStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <CheckCircle className="w-4 h-4 text-teal-500" />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Unexpired valid inventory</span>
        </div>
      </div>

      {/* Expiry Category Filter Tabs & Search */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by batch/lot number, product name, or SKU..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="sm:w-60">
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Segmented Expiry Milestone Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Batches' },
            { id: 'expired', label: 'Expired (<0d)' },
            { id: 'critical', label: 'Critical (≤7d)' },
            { id: 'warning', label: 'Warning (8-30d)' },
            { id: 'upcoming', label: 'Upcoming (31-60d)' },
            { id: 'safe', label: 'Safe (>60d)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-mono text-slate-400 tabular-nums shrink-0">
            {filteredBatches.length} batch records
          </span>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="px-4 py-3">Batch / Lot No.</th>
                <th className="px-4 py-3">Product Name & SKU</th>
                <th className="px-4 py-3 text-right">Remaining Stock</th>
                <th className="px-4 py-3 font-mono">Expiry Date</th>
                <th className="px-4 py-3">Lifecycle Status</th>
                <th className="px-4 py-3 text-right">Unit Cost</th>
                <th className="px-4 py-3 text-right">Batch Value</th>
                <th className="px-4 py-3">Supplier & Storage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-xs font-semibold">No batches match the selected criteria</p>
                    <p className="text-[11px] text-slate-500 mt-1">Select another expiry status tab or clear filters.</p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map(b => (
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                      b.is_expired ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    {/* Batch Number */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-1.5">
                        {b.is_expired ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        ) : (
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            b.expiry_category === 'CRITICAL' ? 'bg-red-500' :
                            b.expiry_category === 'WARNING' ? 'bg-amber-500' :
                            b.expiry_category === 'UPCOMING' ? 'bg-sky-500' : 'bg-emerald-500'
                          }`} />
                        )}
                        <span>{b.batch_number}</span>
                      </div>
                    </td>

                    {/* Product Name & SKU */}
                    <td className="px-4 py-3">
                      <div className="min-w-[170px]">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                          {b.product_name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          {b.sku}
                        </span>
                      </div>
                    </td>

                    {/* Remaining Stock */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span className={`text-sm font-bold ${
                        b.remaining_quantity === 0
                          ? 'text-slate-400'
                          : b.is_expired
                          ? 'text-rose-600'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {b.remaining_quantity}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-1">/ {b.quantity_received} {b.unit}</span>
                    </td>

                    {/* Expiry Date */}
                    <td className="px-4 py-3 font-mono tabular-nums">
                      <span className={`font-semibold block ${b.is_expired ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                        {b.expiry_date}
                      </span>
                      {b.manufacturing_date && (
                        <span className="text-[10px] text-slate-400 block">Mfg: {b.manufacturing_date}</span>
                      )}
                    </td>

                    {/* Lifecycle Status */}
                    <td className="px-4 py-3">
                      <ExpiryStatusBadge category={b.expiry_category} days={b.days_to_expiry} />
                    </td>

                    {/* Unit Cost */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      ${b.purchase_price.toFixed(2)}
                    </td>

                    {/* Batch Value */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                      <span className={b.is_expired ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}>
                        ${(b.remaining_quantity * b.purchase_price).toFixed(2)}
                      </span>
                    </td>

                    {/* Supplier & Storage */}
                    <td className="px-4 py-3 text-slate-500">
                      <span className="block truncate max-w-[130px] font-medium text-slate-700 dark:text-slate-300">
                        {b.supplier_name || 'Standard Supplier'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                        {b.notes || `Rec: ${b.date_received}`}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {isManagerOrAbove && b.remaining_quantity > 0 && (
                        <button
                          onClick={() => setDisposeTarget(b)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ml-auto ${
                            b.is_expired
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          }`}
                          title="Write Off Expired/Damaged Stock"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{b.is_expired ? 'Dispose Waste' : 'Write-Off'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <BatchFormModal
        isOpen={isNewBatchOpen}
        onClose={() => setIsNewBatchOpen(false)}
        onSuccess={onRefresh}
        products={products}
        suppliers={suppliers}
      />

      <DisposeModal
        batch={disposeTarget}
        isOpen={Boolean(disposeTarget)}
        onClose={() => setDisposeTarget(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
};
