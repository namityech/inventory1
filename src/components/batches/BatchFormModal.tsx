import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Product, Supplier } from '../../types/inventory';
import { api } from '../../services/api';

interface BatchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
  suppliers: Supplier[];
  initialProduct?: Product | null;
}

export const BatchFormModal: React.FC<BatchFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
  suppliers,
  initialProduct
}) => {
  const [productId, setProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [dateReceived, setDateReceived] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProduct) {
      setProductId(initialProduct.id);
      setPurchasePrice(String(initialProduct.purchase_price || 0));
      setSupplierId(initialProduct.supplier_id || suppliers[0]?.id || '');
    } else if (products.length > 0) {
      setProductId(products[0].id);
      setPurchasePrice(String(products[0].purchase_price || 0));
      setSupplierId(products[0].supplier_id || suppliers[0]?.id || '');
    }
    setBatchNumber(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setQuantity('50');
    // Default expiry 6 months from now
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setExpiryDate(d.toISOString().split('T')[0]);
    setError(null);
  }, [initialProduct, products, suppliers, isOpen]);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setPurchasePrice(String(prod.purchase_price || 0));
      if (prod.supplier_id) setSupplierId(prod.supplier_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !batchNumber.trim() || !quantity || !expiryDate) {
      setError('Product, Batch Number, Quantity, and Expiry Date are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createBatch({
        product_id: productId,
        batch_number: batchNumber.trim(),
        quantity: parseInt(quantity, 10),
        purchase_price: parseFloat(purchasePrice) || 0,
        manufacturing_date: manufacturingDate || undefined,
        expiry_date: expiryDate,
        supplier_id: supplierId || undefined,
        date_received: dateReceived,
        notes: notes.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Incoming Inventory Batch"
      subtitle="Register manufactured lot numbers, expiry milestones, and unit purchase costs"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Product *
            </label>
            <select
              value={productId}
              onChange={e => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Batch / Lot Number *
            </label>
            <input
              type="text"
              required
              value={batchNumber}
              onChange={e => setBatchNumber(e.target.value)}
              placeholder="e.g. LOT-2026-904"
              className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity Received *
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
              Expiry Date *
            </label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Manufacturing Date (Optional)
            </label>
            <input
              type="date"
              value={manufacturingDate}
              onChange={e => setManufacturingDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Unit Purchase Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supplier
            </label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Select supplier...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Date Received
            </label>
            <input
              type="date"
              value={dateReceived}
              onChange={e => setDateReceived(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receipt Notes / Storage Location
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Fridge Unit 2 Shelf B, inspected seal, COA verified"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            {loading ? 'Recording Batch...' : 'Record Batch & Add to Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
