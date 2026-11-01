import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Product, Batch, StockMovement } from '../../types/inventory';
import { api } from '../../services/api';
import { ExpiryStatusBadge, StockStatusBadge } from '../common/StatusBadge';
import { Plus, ArrowDownLeft, ArrowUpRight, AlertTriangle, ShieldCheck, ClockAlert } from 'lucide-react';

interface ProductDetailModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAddBatch: (product: Product) => void;
  onRefresh: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  isOpen,
  onClose,
  onAddBatch,
  onRefresh
}) => {
  const [data, setData] = useState<{
    product: Product & {
      batches: Batch[];
      movements: StockMovement[];
      disposals: any[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'batches' | 'movements' | 'disposals'>('batches');

  useEffect(() => {
    if (productId && isOpen) {
      setLoading(true);
      api.getProduct(productId)
        .then(res => setData(res))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setData(null);
    }
  }, [productId, isOpen]);

  if (!isOpen || !productId) return null;

  const product = data?.product;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? product.name : 'Loading Product Details...'}
      subtitle={product ? `SKU: ${product.sku} · Barcode: ${product.barcode || 'N/A'}` : ''}
      maxWidth="3xl"
    >
      {loading || !product ? (
        <div className="py-12 text-center text-slate-400">Loading comprehensive product telemetry...</div>
      ) : (
        <div className="space-y-6">
          {/* Top Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Usable (Active Stock)</span>
              <span className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono tabular-nums">
                {product.usable_stock} {product.unit}
              </span>
              <div className="mt-0.5">
                <StockStatusBadge status={product.usable_stock <= product.min_stock ? (product.usable_stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK') : 'IN_STOCK'} />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Expired (Quarantine)</span>
              <span className={`text-lg font-bold font-mono tabular-nums ${product.expired_stock > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {product.expired_stock} {product.unit}
              </span>
              <span className="text-[10px] text-slate-400 block">Excluded from FEFO</span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Min Threshold</span>
              <span className="text-lg font-bold text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                {product.min_stock} {product.unit}
              </span>
              <span className="text-[10px] text-slate-400 block">Reorder alert trigger</span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 block">Inventory Valuation</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                ${product.inventory_value.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
                Cost: ${product.purchase_price.toFixed(2)} · Sell: ${product.selling_price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Description & Metadata */}
          {product.description && (
            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-0.5">Clinical / Storage Specifications:</span>
              {product.description}
            </div>
          )}

          {/* Sub-tab controls */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('batches')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'batches'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Tracked Batches ({product.batches.length})
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'movements'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Movement History ({product.movements.length})
              </button>
              {product.disposals.length > 0 && (
                <button
                  onClick={() => setActiveTab('disposals')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'disposals'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Disposal Records ({product.disposals.length})
                </button>
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                onAddBatch(product);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Receive New Batch</span>
            </button>
          </div>

          {/* Sub-tab 1: Batches */}
          {activeTab === 'batches' && (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Batch No.</th>
                    <th className="px-4 py-2.5">Remaining / In</th>
                    <th className="px-4 py-2.5">Expiry Date</th>
                    <th className="px-4 py-2.5">Expiry Status</th>
                    <th className="px-4 py-2.5">Cost Each</th>
                    <th className="px-4 py-2.5">Total Value</th>
                    <th className="px-4 py-2.5">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {product.batches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        No batch records logged for this product.
                      </td>
                    </tr>
                  ) : (
                    product.batches.map(b => (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                          b.is_expired ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {b.batch_number}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums">
                          <span className={`font-semibold ${b.remaining_quantity === 0 ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {b.remaining_quantity}
                          </span>
                          <span className="text-slate-400"> / {b.quantity_received} {product.unit}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums">
                          {b.expiry_date}
                        </td>
                        <td className="px-4 py-2.5">
                          <ExpiryStatusBadge category={b.expiry_category} days={b.days_to_expiry} />
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          ${b.purchase_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          ${(b.remaining_quantity * b.purchase_price).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono tabular-nums">
                          {b.date_received}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 2: Movements */}
          {activeTab === 'movements' && (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Tx Code</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">Date & Time</th>
                    <th className="px-4 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {product.movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    product.movements.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {m.transaction_code}
                        </td>
                        <td className="px-4 py-2.5 font-semibold">
                          <span
                            className={
                              m.movement_type === 'PURCHASE'
                                ? 'text-teal-600'
                                : m.movement_type === 'DISPOSAL'
                                ? 'text-rose-600'
                                : 'text-blue-600'
                            }
                          >
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums font-semibold">
                          {m.movement_type === 'PURCHASE' ? '+' : '-'}{m.quantity} {product.unit}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          {m.user_name || 'System'}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-400">
                          {new Date(m.timestamp).toLocaleDateString()} {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">
                          {m.notes || m.reference_number || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Sub-tab 3: Disposals */}
          {activeTab === 'disposals' && (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Ref No.</th>
                    <th className="px-4 py-2.5">Disposed Qty</th>
                    <th className="px-4 py-2.5">Cost Loss</th>
                    <th className="px-4 py-2.5">Method</th>
                    <th className="px-4 py-2.5">Certificate</th>
                    <th className="px-4 py-2.5">Disposed By</th>
                    <th className="px-4 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {product.disposals.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono font-semibold text-rose-600">
                        {d.reference_no}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {d.quantity} {product.unit}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums font-semibold text-rose-600">
                        ${d.total_loss.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                        {d.disposal_method}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {d.certificate_no}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                        {d.disposed_by_name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
