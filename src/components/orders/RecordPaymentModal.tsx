import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Order, PaymentMethod } from '../../types/inventory';
import { api } from '../../services/api';
import { CreditCard, DollarSign, CheckCircle2 } from 'lucide-react';

interface RecordPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (order) {
      setAmount(String(order.outstanding_balance.toFixed(2)));
      setPaymentMethod('CASH');
      setPaymentReference('');
      setNotes('');
      setError(null);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero');
      return;
    }

    if (numAmount > order.outstanding_balance + 0.01) {
      setError(`Payment cannot exceed the outstanding balance of $${order.outstanding_balance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.recordPayment(order.id, {
        amount: numAmount,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment & Settle Balance"
      subtitle={`Order ${order.order_number} · ${order.customer_name || 'Walk-In Customer'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
            {error}
          </div>
        )}

        {/* Balance Breakdown Strip */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Total Order</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block mt-0.5">
              ${order.total_amount.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Already Paid</span>
            <span className="font-mono font-bold text-teal-600 block mt-0.5">
              ${order.paid_amount.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-rose-500 font-semibold block">Outstanding Due</span>
            <span className="font-mono font-bold text-rose-600 block mt-0.5">
              ${order.outstanding_balance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Amount Received ($) *
          </label>
          <div className="relative">
            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={order.outstanding_balance}
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="flex gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => setAmount(order.outstanding_balance.toFixed(2))}
              className="text-[11px] text-teal-600 hover:underline font-semibold"
            >
              Pay Full Remaining Balance (${order.outstanding_balance.toFixed(2)})
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setAmount((order.outstanding_balance / 2).toFixed(2))}
              className="text-[11px] text-slate-500 hover:underline"
            >
              Pay 50%
            </button>
          </div>
        </div>

        {/* Method */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Method *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'CASH', label: 'Cash' },
              { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { id: 'MOBILE_MONEY', label: 'Mobile Money' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                className={`py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                  paymentMethod === m.id
                    ? 'bg-teal-50 border-teal-600 text-teal-800 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-200 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Reference / Transaction ID
          </label>
          <input
            type="text"
            value={paymentReference}
            onChange={e => setPaymentReference(e.target.value)}
            placeholder="e.g. Check #, Wire Ref, Mobile M-Pesa ID"
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Cleared second installment for hospital invoice"
            className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Actions */}
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
            className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{loading ? 'Recording...' : 'Confirm Payment'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
