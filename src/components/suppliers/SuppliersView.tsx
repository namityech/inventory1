import React, { useState } from 'react';
import {
  Building2, Plus, Edit2, Trash2, Phone, Mail, MapPin,
  FolderPlus, Check, RefreshCw
} from 'lucide-react';
import { Supplier, Category } from '../../types/inventory';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

interface SuppliersViewProps {
  suppliers: Supplier[];
  categories: Category[];
  onRefresh: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  categories,
  onRefresh
}) => {
  const { isManagerOrAbove, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'categories'>('suppliers');

  // Supplier modal state
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#0d9488'
  });

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'supplier' | 'category'; item: any } | null>(null);
  const [loading, setLoading] = useState(false);

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || ''
    });
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;

    setLoading(true);
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, supplierForm);
      } else {
        await api.createSupplier(supplierForm);
      }
      setSupplierModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', color: '#0d9488' });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCategoryForm({
      name: c.name,
      description: c.description || '',
      color: c.color || '#0d9488'
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    setLoading(true);
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, categoryForm);
      } else {
        await api.createCategory(categoryForm);
      }
      setCategoryModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    setLoading(true);
    try {
      if (deleteConfirm.type === 'supplier') {
        await api.deleteSupplier(deleteConfirm.item.id);
      } else {
        await api.deleteCategory(deleteConfirm.item.id);
      }
      setDeleteConfirm(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <span>Vendors & Catalog Taxonomy</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Certified pharmaceutical suppliers, food distributors, and inventory classifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'suppliers' && isManagerOrAbove && (
            <button
              onClick={openNewSupplier}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Supplier</span>
            </button>
          )}
          {activeTab === 'categories' && isManagerOrAbove && (
            <button
              onClick={openNewCategory}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'suppliers'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Suppliers & Distributors ({suppliers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'categories'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Product Categories ({categories.length})</span>
        </button>
      </div>

      {/* TAB 1: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map(s => (
            <div
              key={s.id}
              className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Contact: {s.contact_person || 'Representative'}</p>
                </div>
                {isManagerOrAbove && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditSupplier(s)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteConfirm({ type: 'supplier', item: s })}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.address}</span>
                  </div>
                )}
              </div>

              {s.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {s.notes}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                <span>Associated Products: <strong className="text-slate-700 dark:text-slate-300 font-mono tabular-nums">{s.product_count || 0}</strong></span>
                <span>Active Batches: <strong className="text-teal-600 font-mono tabular-nums">{s.active_batches_count || 0}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map(c => (
            <div
              key={c.id}
              className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: c.color || '#0d9488' }}
                  />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{c.name}</h3>
                </div>
                {isManagerOrAbove && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditCategory(c)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteConfirm({ type: 'category', item: c })}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                {c.description || 'General product inventory category'}
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-400">
                <span>Total Catalog Items:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                  {c.product_count || 0} SKUs
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUPPLIER MODAL */}
      <Modal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier Information' : 'Add New Supplier / Distributor'}
        subtitle="Manage supplier profile, cold-chain certifications, and contact details"
        maxWidth="md"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Company / Vendor Name *
            </label>
            <input
              type="text"
              required
              value={supplierForm.name}
              onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={supplierForm.contact_person}
                onChange={e => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={supplierForm.phone}
                onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Orders Email Address
            </label>
            <input
              type="email"
              value={supplierForm.email}
              onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Business Address
            </label>
            <input
              type="text"
              value={supplierForm.address}
              onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Compliance Notes / Delivery Schedule
            </label>
            <textarea
              rows={2}
              value={supplierForm.notes}
              onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSupplierModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Product Category' : 'Create Product Category'}
        subtitle="Catalog classification and color tagging"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={categoryForm.name}
              onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={categoryForm.color}
                onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                className="w-8 h-8 rounded border-none cursor-pointer"
              />
              <span className="text-xs font-mono">{categoryForm.color}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={categoryForm.description}
              onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${deleteConfirm?.type === 'supplier' ? 'Supplier' : 'Category'}`}
        message={`Are you sure you want to delete "${deleteConfirm?.item?.name}"?`}
        confirmLabel="Confirm Delete"
        isDestructive
        isLoading={loading}
      />
    </div>
  );
};
