import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Product, Category, Supplier } from '../../types/inventory';
import { api } from '../../services/api';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: Product | null;
  categories: Category[];
  suppliers: Supplier[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  product,
  categories,
  suppliers
}) => {
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    category_id: '',
    supplier_id: '',
    unit: 'boxes',
    purchase_price: '',
    selling_price: '',
    min_stock: '10'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || '',
        description: product.description || '',
        category_id: product.category_id || '',
        supplier_id: product.supplier_id || '',
        unit: product.unit || 'boxes',
        purchase_price: String(product.purchase_price || 0),
        selling_price: String(product.selling_price || 0),
        min_stock: String(product.min_stock || 10)
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        category_id: categories[0]?.id || '',
        supplier_id: suppliers[0]?.id || '',
        unit: 'boxes',
        purchase_price: '',
        selling_price: '',
        min_stock: '10'
      });
    }
    setError(null);
  }, [product, categories, suppliers, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.sku.trim()) {
      setError('SKU is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode.trim() || undefined,
        description: formData.description.trim() || undefined,
        category_id: formData.category_id || undefined,
        supplier_id: formData.supplier_id || undefined,
        unit: formData.unit.trim() || 'units',
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        min_stock: parseInt(formData.min_stock, 10) || 10
      };

      if (isEditing && product) {
        await api.updateProduct(product.id, payload);
      } else {
        await api.createProduct(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Product Details' : 'Add New Inventory Product'}
      subtitle="Catalog product metadata, pricing, and threshold controls"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Amoxicillin Trihydrate 500mg"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              SKU / Product Code *
            </label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={e => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g. MED-AMX-500"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 uppercase focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Barcode / GTIN (Optional)
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={e => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="e.g. 8901234567891"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Select category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Primary Supplier
            </label>
            <select
              value={formData.supplier_id}
              onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
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
              Unit of Measure
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={e => setFormData({ ...formData, unit: e.target.value })}
              placeholder="boxes, bottles, vials, packs"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Minimum Stock Threshold
            </label>
            <input
              type="number"
              min="0"
              value={formData.min_stock}
              onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Purchase Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.purchase_price}
              onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Selling Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.selling_price}
              onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Clinical / Storage Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Usage instructions, storage temperature conditions (e.g. Keep at 2-8°C), or clinical indications"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            {loading ? 'Saving Product...' : isEditing ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
