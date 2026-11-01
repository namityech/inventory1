import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Batch } from '../../types/inventory';
import { api } from '../../services/api';
import { AlertTriangle, Trash2, FileText, CheckCircle2 } from 'lucide-react';

interface DisposeModalProps {
  batch: Batch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DisposeModal: React.FC<DisposeModalProps> = ({
  batch,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState('Expired statutory shelf life');
  const [disposalMethod, setDisposalMethod] = useState('Incineration');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  React.useEffect(() => {
    if (batch) {
      setQuantity(String(batch.remaining_quantity));
      setReason(batch.is_expired ? 'Expired statutory shelf life' : 'Damaged / Compromised packaging');
      setDisposalMethod('Incineration');
      setNotes('');
      setError(null);
      setResult(null);
    }
  }, [batch, isOpen]);

  if (!isOpen || !batch) return null;

  const maxQty = batch.remaining_quantity;
  const numQty = parseInt(quantity, 10) || 0;
  const estimatedLoss = numQty * batch.purchase_price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numQty <= 0 || numQty > maxQty) {
      setError(`Quantity must be between 1 and ${maxQty}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.disposeBatch(batch.id, {
        quantity: numQty,
        reason,
        disposal_method: disposalMethod,
        notes
      });
      setResult(res.disposal);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record disposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Statutory Stock Disposal & Waste Write-Off"
      subtitle={`Batch ${batch.batch_number} · ${batch.product_name || 'Product'}`}
      maxWidth="md"
    >
      {result ? (
        <div className="space-y-4 py-2">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Stock Disposal Verified & Quarantined</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {result.quantity} units successfully removed from inventory. Confirmed financial loss: ${result.total_loss.toFixed(2)}.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Reference No:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{result.reference_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Destruction Certificate:</span>
              <span className="font-semibold text-teal-600">{result.certificate_no}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg"
          >
            Close & Refresh Table
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
              {error}
            </div>
          )}

          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Permanent Inventory De-Registration Warning</span>
            </div>
            <p className="text-rose-600 dark:text-rose-300">
              Writing off stock will permanently decrement the batch balance, log a formal disposal entry into the audit ledger, and post a confirmed financial loss.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quantity to Dispose (Max: {maxQty})
              </label>
              <button
                type="button"
                onClick={() => setQuantity(String(maxQty))}
                className="text-[11px] text-teal-600 dark:text-teal-400 font-medium hover:underline"
              >
                Dispose All ({maxQty})
              </button>
            </div>
            <input
              type="number"
              min="1"
              max={maxQty}
              required
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Disposal / Destruction Method
            </label>
            <select
              value={disposalMethod}
              onChange={e => setDisposalMethod(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="Incineration">High-Temperature Incineration (Hazardous)</option>
              <option value="Chemical Neutralization">Chemical Neutralization & Autoclave</option>
              <option value="Return to Manufacturer">Return to Manufacturer / Supplier</option>
              <option value="Secure Landfill">Approved Secure Environmental Landfill</option>
              <option value="Controlled Drainage">Neutralized Controlled Liquid Drainage</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Disposal Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Expired statutory shelf life"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Audit Notes & Witness Verification
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Witnessed by Quality Assurance, seal number, certificate details"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-500">Confirmed Financial Write-Off:</span>
            <span className="font-mono font-bold text-rose-600 text-sm tabular-nums">
              ${estimatedLoss.toFixed(2)}
            </span>
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
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Processing Disposal...' : 'Execute Waste Write-Off'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
