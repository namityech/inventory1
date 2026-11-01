import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Filter, Eye, Edit2, Trash2, ArrowUpDown,
  Boxes, AlertTriangle, ClockAlert, Check, ShieldAlert
} from 'lucide-react';
import { Product, Category, Supplier } from '../../types/inventory';
import { ExpiryStatusBadge, StockStatusBadge } from '../common/StatusBadge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => Promise<void>;
  onSelectProduct: (productId: string) => void;
  onAddBatch: (product: Product) => void;
  onRecordMovement: (product?: Product) => void;
  loading: boolean;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  suppliers,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onSelectProduct,
  onAddBatch,
  onRecordMovement,
  loading
}) => {
  const { isManagerOrAbove, isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<keyof Product>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Deletion modal state
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesSku && !matchesBarcode) return false;
      }

      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
        return false;
      }

      if (selectedSupplier !== 'all' && p.supplier_id !== selectedSupplier) {
        return false;
      }

      if (selectedStatus === 'in_stock' && p.stockStatus !== 'IN_STOCK') return false;
      if (selectedStatus === 'low_stock' && p.stockStatus !== 'LOW_STOCK') return false;
      if (selectedStatus === 'out_of_stock' && p.stockStatus !== 'OUT_OF_STOCK') return false;
      if (selectedStatus === 'expiring_soon' && !['CRITICAL', 'WARNING'].includes(p.expiryAlert)) return false;
      if (selectedStatus === 'has_expired' && p.expired_stock <= 0) return false;

      return true;
    }).sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        valA = (valA as string).toLowerCase();
        valB = ((valB as string) || '').toLowerCase();
      }
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (sortOrder === 'desc') {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    });
  }, [products, search, selectedCategory, selectedSupplier, selectedStatus, sortBy, sortOrder]);

  const handleSort = (field: keyof Product) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteProduct(deleteCandidate);
      setDeleteCandidate(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Products Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage multi-batch inventory catalog, minimum safety thresholds, and unit costs
          </p>
        </div>

        {isManagerOrAbove && (
          <button
            onClick={onAddProduct}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, or barcode..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
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

        {/* Status Filter Segmented Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Catalog' },
            { id: 'in_stock', label: 'In Stock' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'out_of_stock', label: 'Out of Stock' },
            { id: 'expiring_soon', label: 'Expiring ≤30d' },
            { id: 'has_expired', label: 'Has Expired Units' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-50 dark:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-mono text-slate-400 tabular-nums shrink-0">
            {filteredProducts.length} of {products.length} products
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <div className="flex items-center gap-1">
                    <span>Product & SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3">Category</th>
                <th
                  onClick={() => handleSort('usable_stock')}
                  className="px-4 py-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Usable Stock</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Expired Units</th>
                <th className="px-4 py-3">Earliest Expiry</th>
                <th
                  onClick={() => handleSort('purchase_price')}
                  className="px-4 py-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Unit Cost / Sell</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('inventory_value')}
                  className="px-4 py-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valuation</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-xs font-semibold">No products found matching filters</p>
                    <p className="text-[11px] text-slate-500 mt-1">Try resetting the search terms or status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Product & SKU */}
                    <td className="px-4 py-3">
                      <div className="min-w-[180px]">
                        <button
                          onClick={() => onSelectProduct(p.id)}
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors text-left block"
                        >
                          {p.name}
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{p.sku}</span>
                          {p.barcode && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>GTIN: {p.barcode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="block truncate max-w-[140px]">{p.category_name || 'General'}</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">{p.supplier_name || 'Standard'}</span>
                    </td>

                    {/* Usable Stock */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span className={`text-sm font-bold ${
                        p.usable_stock === 0
                          ? 'text-rose-600'
                          : p.usable_stock <= p.min_stock
                          ? 'text-amber-600'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        {p.usable_stock}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-1">{p.unit}</span>
                      <div className="mt-0.5 text-[10px] text-slate-400 font-sans">
                        Min: {p.min_stock}
                      </div>
                    </td>

                    {/* Expired Units */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {p.expired_stock > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{p.expired_stock} {p.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">0</span>
                      )}
                    </td>

                    {/* Earliest Expiry */}
                    <td className="px-4 py-3 font-mono">
                      {p.earliest_usable_expiry ? (
                        <div>
                          <span className="text-slate-900 dark:text-slate-100 block tabular-nums">
                            {p.earliest_usable_expiry}
                          </span>
                          <div className="mt-0.5">
                            <ExpiryStatusBadge category={p.expiryAlert === 'NONE' ? 'SAFE' : p.expiryAlert} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No active batches</span>
                      )}
                    </td>

                    {/* Unit Cost / Sell */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <span className="text-slate-900 dark:text-slate-100 block">
                        ${p.purchase_price.toFixed(2)}
                      </span>
                      <span className="text-slate-400 text-[11px] block">
                        Sell: ${p.selling_price.toFixed(2)}
                      </span>
                    </td>

                    {/* Total Valuation */}
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      ${p.inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectProduct(p.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          title="View Batch Breakdown & History"
                          aria-label={`View ${p.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isManagerOrAbove && (
                          <>
                            <button
                              onClick={() => onAddBatch(p)}
                              className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-md transition-colors"
                              title="Receive New Batch Stock"
                              aria-label={`Add batch to ${p.name}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onEditProduct(p)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              title="Edit Product"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteCandidate(p);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                            title="Delete Product"
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Product Deletion */}
      <ConfirmDialog
        isOpen={Boolean(deleteCandidate)}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={confirmDelete}
        title="Confirm Product Deletion"
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to permanently delete "${deleteCandidate?.name}" (${deleteCandidate?.sku}) from the catalog? Products with active stock or remaining batches cannot be deleted.`
        }
        confirmLabel="Delete Product"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};
