import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight, Search, Plus, Filter, Download,
  ArrowDownLeft, ArrowUpRight, AlertTriangle, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { StockMovement, Product, MovementType } from '../../types/inventory';
import { RecordMovementModal } from './RecordMovementModal';
import { useAuth } from '../../context/AuthContext';

interface StockMovementsViewProps {
  movements: StockMovement[];
  products: Product[];
  onRefresh: () => void;
  loading: boolean;
}

export const StockMovementsView: React.FC<StockMovementsViewProps> = ({
  movements,
  products,
  onRefresh,
  loading
}) => {
  const { isManagerOrAbove } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (selectedType !== 'all' && m.movement_type !== selectedType) return false;
      if (selectedProduct !== 'all' && m.product_id !== selectedProduct) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchCode = m.transaction_code.toLowerCase().includes(q);
        const matchProd = m.product_name.toLowerCase().includes(q);
        const matchSku = m.sku.toLowerCase().includes(q);
        const matchRef = m.reference_number ? m.reference_number.toLowerCase().includes(q) : false;
        const matchUser = m.user_name ? m.user_name.toLowerCase().includes(q) : false;
        if (!matchCode && !matchProd && !matchSku && !matchRef && !matchUser) return false;
      }

      return true;
    });
  }, [movements, selectedType, selectedProduct, search]);

  const exportCSV = () => {
    const headers = ['Transaction Code', 'Timestamp', 'Product Name', 'SKU', 'Movement Type', 'Batch No', 'Quantity', 'Unit', 'Unit Price ($)', 'Total Value ($)', 'User', 'Reference No', 'Notes'];
    const rows = filteredMovements.map(m => [
      `"${m.transaction_code}"`,
      `"${m.timestamp}"`,
      `"${m.product_name.replace(/"/g, '""')}"`,
      `"${m.sku}"`,
      `"${m.movement_type}"`,
      `"${m.batch_number || 'N/A'}"`,
      m.quantity,
      `"${m.unit}"`,
      m.unit_price,
      m.total_value,
      `"${m.user_name || 'System'}"`,
      `"${m.reference_number || ''}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Movements_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-teal-600" />
            <span>Stock Movements & FEFO Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete verifiable audit log of incoming shipments, sales dispatches, and quarantine adjustments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Movement</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by transaction code, product, SKU, user, or reference no..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Movement Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Operations' },
            { id: 'SALE', label: 'Sales / Dispenses' },
            { id: 'PURCHASE', label: 'Purchases (Inward)' },
            { id: 'USAGE', label: 'Internal Usage' },
            { id: 'DAMAGE', label: 'Damaged' },
            { id: 'DISPOSAL', label: 'Expired Disposals' },
            { id: 'ADJUSTMENT', label: 'Stock Adjustments' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedType === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-mono text-slate-400 tabular-nums shrink-0">
            {filteredMovements.length} transactions
          </span>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Operation Type</th>
                <th className="px-4 py-3">Product Name & SKU</th>
                <th className="px-4 py-3">Batch / Expiry</th>
                <th className="px-4 py-3 text-right">Quantity Delta</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Total Value</th>
                <th className="px-4 py-3">Responsible User</th>
                <th className="px-4 py-3">Reference / Notes</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="text-xs font-semibold">No stock movements found</p>
                    <p className="text-[11px] text-slate-500 mt-1">Record a sale, purchase, or adjustment to populate the ledger.</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => {
                  const isInward = m.movement_type === 'PURCHASE';
                  const isDisposal = m.movement_type === 'DISPOSAL';
                  const isDamage = m.movement_type === 'DAMAGE';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Transaction Code */}
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {m.transaction_code}
                      </td>

                      {/* Operation Type */}
                      <td className="px-4 py-3 font-semibold">
                        <span
                          className={`inline-flex items-center gap-1.5 ${
                            isInward
                              ? 'text-teal-600 dark:text-teal-400'
                              : isDisposal || isDamage
                              ? 'text-rose-600'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          {isInward ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : isDisposal ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          <span>{m.movement_type}</span>
                        </span>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="min-w-[160px]">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                            {m.product_name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                            {m.sku}
                          </span>
                        </div>
                      </td>

                      {/* Batch & Expiry */}
                      <td className="px-4 py-3 font-mono">
                        {m.batch_number ? (
                          <div>
                            <span className="text-slate-900 dark:text-slate-100 font-semibold block">
                              {m.batch_number}
                            </span>
                            {m.expiry_date && (
                              <span className="text-[10px] text-slate-400 block">
                                Exp: {m.expiry_date}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                        <span
                          className={
                            isInward
                              ? 'text-teal-600 dark:text-teal-400'
                              : isDisposal || isDamage
                              ? 'text-rose-600'
                              : 'text-slate-900 dark:text-slate-100'
                          }
                        >
                          {isInward ? '+' : '-'}{m.quantity} {m.unit}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        ${m.unit_price.toFixed(2)}
                      </td>

                      {/* Total Value */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        ${m.total_value.toFixed(2)}
                      </td>

                      {/* Responsible User */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {m.user_name || 'System Operator'}
                      </td>

                      {/* Reference / Notes */}
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {m.reference_number ? (
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block">
                            {m.reference_number}
                          </span>
                        ) : null}
                        <span className="text-[11px] text-slate-400 block truncate">{m.notes || '—'}</span>
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3 text-slate-400 font-mono tabular-nums whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordMovementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onRefresh}
        products={products}
      />
    </div>
  );
};
