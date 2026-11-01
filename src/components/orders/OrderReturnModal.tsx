import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Order } from '../../types/inventory';
import { api } from '../../services/api';
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface OrderReturnModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OrderReturnModal: React.FC<OrderReturnModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('Customer return - unopened manufacturer seal intact');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (order) {
      setReason('Customer return - unopened packaging intact');
      setRefundAmount(String(order.paid_amount.toFixed(2)));
      setRefundMethod('CASH');
      setNotes('');
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A statutory return reason is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.returnOrder(order.id, {
        reason: reason.trim(),
        refund_amount: parseFloat(refundAmount) || 0,
        refund_method: refundMethod,
        notes: notes.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Process Order Return & Batch Stock Restoration"
      subtitle={`Order ${order.order_number} · ${order.customer_name || 'Walk-In Customer'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Automatic Inventory Restoration</span>
          </div>
          <p className="text-amber-700 dark:text-amber-300">
            Processing this return will restore all items ({order.items?.length || 0} batches) back into active usable stock and log a verified adjustment ledger record.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Statutory Return Reason *
          </label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="Customer return - unopened packaging intact">Customer return - unopened packaging intact</option>
            <option value="Clinical prescription adjustment or cancellation">Clinical prescription adjustment or cancellation</option>
            <option value="Defective or damaged delivery unit">Defective or damaged delivery unit</option>
            <option value="Order dispensed in error - immediate restock">Order dispensed in error - immediate restock</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Refund Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={order.paid_amount}
              value={refundAmount}
              onChange={e => setRefundAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Max: ${order.paid_amount.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Refund Method
            </label>
            <select
              value={refundMethod}
              onChange={e => setRefundMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="CASH">Cash Refund</option>
              <option value="BANK_TRANSFER">Bank Reversal</option>
              <option value="MOBILE_MONEY">Mobile Money Reversal</option>
              <option value="STORE_CREDIT">Store Account Credit</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Audit Documentation Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Inspected by Lead Pharmacist. Tamper seals verified intact."
            className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{loading ? 'Processing...' : 'Confirm Return & Restore Stock'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
