import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Product, Batch, MovementType } from '../../types/inventory';
import { api } from '../../services/api';
import { ExpiryStatusBadge } from '../common/StatusBadge';
import { ArrowUpRight, CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface RecordMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  initialProduct?: Product | null;
}

export const RecordMovementModal: React.FC<RecordMovementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
  initialProduct
}) => {
  const [movementType, setMovementType] = useState<'SALE' | 'USAGE' | 'DAMAGE' | 'ADJUSTMENT'>('SALE');
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('5');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [useFefo, setUseFefo] = useState<boolean>(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  // Active product batches
  const [productBatches, setProductBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<any[] | null>(null);

  useEffect(() => {
    if (initialProduct) {
      setProductId(initialProduct.id);
      setUnitPrice(String(initialProduct.selling_price || 0));
    } else if (products.length > 0) {
      setProductId(products[0].id);
      setUnitPrice(String(products[0].selling_price || 0));
    }
    setMovementType('SALE');
    setQuantity('5');
    setReferenceNumber(`REC-${Math.floor(1000 + Math.random() * 9000)}`);
    setNotes('');
    setUseFefo(true);
    setSelectedBatchId('');
    setError(null);
    setDispatchResult(null);
  }, [initialProduct, products, isOpen]);

  // Load product batches whenever product changes
  useEffect(() => {
    if (productId && isOpen) {
      setLoadingBatches(true);
      api.getBatches({ productId, status: 'active' })
        .then(res => {
          setProductBatches(res.batches);
          if (res.batches.length > 0 && !selectedBatchId) {
            setSelectedBatchId(res.batches[0].id);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingBatches(false));

      const p = products.find(prod => prod.id === productId);
      if (p) {
        if (movementType === 'SALE') {
          setUnitPrice(String(p.selling_price || 0));
        } else {
          setUnitPrice(String(p.purchase_price || 0));
        }
      }
    }
  }, [productId, movementType, isOpen, products]);

  const activeProduct = useMemo(() => {
    return products.find(p => p.id === productId);
  }, [products, productId]);

  // FEFO Preview calculation:
  // Shows user exactly which unexpired batches will be depleted!
  const fefoPreview = useMemo(() => {
    if (!['SALE', 'USAGE'].includes(movementType) || !useFefo) return null;
    const reqQty = parseInt(quantity, 10) || 0;
    if (reqQty <= 0) return null;

    // Filter unexpired batches with remaining quantity
    const usable = productBatches
      .filter(b => !b.is_expired && b.remaining_quantity > 0)
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

    let remaining = reqQty;
    const allocated: Array<{ batch: Batch; qtyToTake: number }> = [];

    for (const b of usable) {
      if (remaining <= 0) break;
      const take = Math.min(b.remaining_quantity, remaining);
      allocated.push({ batch: b, qtyToTake: take });
      remaining -= take;
    }

    const isSufficient = remaining === 0;
    return {
      allocated,
      unfulfilled: remaining,
      isSufficient
    };
  }, [movementType, useFefo, quantity, productBatches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numQty = parseInt(quantity, 10);
    if (!numQty || numQty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (['SALE', 'USAGE'].includes(movementType)) {
      if (useFefo) {
        if (fefoPreview && !fefoPreview.isSufficient) {
          setError(`Insufficient unexpired stock. Short by ${fefoPreview.unfulfilled} units. Expired batches cannot be issued!`);
          return;
        }
      } else {
        if (!selectedBatchId) {
          setError('Please select a specific batch');
          return;
        }
        const b = productBatches.find(bat => bat.id === selectedBatchId);
        if (b && b.is_expired) {
          setError('FEFO Violation: The selected batch has already EXPIRED and cannot be issued or sold!');
          return;
        }
        if (b && b.remaining_quantity < numQty) {
          setError(`Insufficient stock in selected batch. Available: ${b.remaining_quantity}, Requested: ${numQty}.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await api.recordMovement({
        product_id: productId,
        batch_id: useFefo ? undefined : selectedBatchId,
        movement_type: movementType,
        quantity: numQty,
        unit_price: parseFloat(unitPrice) || 0,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        use_fefo: useFefo
      });

      if (res.dispatched && res.dispatched.length > 0) {
        setDispatchResult(res.dispatched);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record stock movement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Stock Movement & FEFO Allocation"
      subtitle="First Expired, First Out inventory management and audit logging"
      maxWidth="lg"
    >
      {dispatchResult ? (
        <div className="space-y-4 py-2">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              FEFO Stock Dispatch Complete
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Stock successfully drawn using First Expired, First Out prioritization.
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-2 font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              Allocated Batches Breakdown
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
              {dispatchResult.map((d, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-mono py-1 px-1">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Batch {d.batch_number}</span>
                    <span className="text-slate-400 text-[11px] block">Expiry: {d.expiry_date}</span>
                  </div>
                  <span className="font-bold text-teal-600">
                    -{d.quantity} {activeProduct?.unit || 'units'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              onSuccess();
              onClose();
            }}
            className="w-full py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg"
          >
            Confirm & Return to Ledger
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
              {error}
            </div>
          )}

          {/* Movement Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Movement Operation
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'SALE' as const, label: 'Sale / POS' },
                { type: 'USAGE' as const, label: 'Internal Use' },
                { type: 'DAMAGE' as const, label: 'Damaged' },
                { type: 'ADJUSTMENT' as const, label: 'Audit Adj.' }
              ].map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setMovementType(opt.type)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    movementType === opt.type
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Picker */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Product *
              </label>
              {activeProduct && (
                <span className="text-[11px] font-mono text-slate-400">
                  Usable: <strong className="text-teal-600">{activeProduct.usable_stock} {activeProduct.unit}</strong>
                  {activeProduct.expired_stock > 0 && (
                    <span className="text-rose-500 ml-1.5">({activeProduct.expired_stock} expired quarantined)</span>
                  )}
                </span>
              )}
            </div>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {p.usable_stock} {p.unit} in stock
                </option>
              ))}
            </select>
          </div>

          {/* FEFO vs Manual Batch Selection (Only for Outgoing Sale/Usage) */}
          {['SALE', 'USAGE'].includes(movementType) && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    First Expired, First Out (FEFO) Protocol
                  </span>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFefo}
                    onChange={e => setUseFefo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              {useFefo ? (
                <div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    FEFO automatically dispatches from earliest-expiring unexpired batches to prevent statutory waste.
                  </p>
                  {/* FEFO Live Allocation Preview */}
                  {fefoPreview && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Batches to be depleted:
                      </span>
                      {fefoPreview.allocated.length === 0 ? (
                        <p className="text-xs text-rose-500 font-medium">No valid unexpired stock available!</p>
                      ) : (
                        fefoPreview.allocated.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-700 dark:text-slate-300">
                              Batch {item.batch.batch_number} (Exp: {item.batch.expiry_date})
                            </span>
                            <span className="font-bold text-teal-600">
                              -{item.qtyToTake} {activeProduct?.unit}
                            </span>
                          </div>
                        ))
                      )}
                      {!fefoPreview.isSufficient && (
                        <div className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Shortage: Need {fefoPreview.unfulfilled} more units. Expired stock cannot be used.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Specific Batch *
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={e => setSelectedBatchId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {productBatches.map(b => (
                      <option key={b.id} value={b.id} disabled={b.is_expired}>
                        Batch {b.batch_number} — {b.remaining_quantity} left — Exp: {b.expiry_date} {b.is_expired ? '(EXPIRED - BLOCKED)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Damage or Adjustment Batch Selector */}
          {['DAMAGE', 'ADJUSTMENT'].includes(movementType) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch to Adjust *
              </label>
              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {productBatches.map(b => (
                  <option key={b.id} value={b.id}>
                    Batch {b.batch_number} — {b.remaining_quantity} {activeProduct?.unit} left (Exp: {b.expiry_date})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity ({activeProduct?.unit || 'units'}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reference / Receipt No.
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. REC-9081"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Value
              </label>
              <div className="px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 tabular-nums">
                ${((parseInt(quantity, 10) || 0) * (parseFloat(unitPrice) || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audit Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Outpatient clinic dispense or emergency ward restocking"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{submitting ? 'Verifying & Executing...' : `Execute ${movementType}`}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
