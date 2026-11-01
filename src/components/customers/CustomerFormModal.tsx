import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Customer, CustomerType } from '../../types/inventory';
import { api } from '../../services/api';
import { User, Phone, Mail, MapPin, Building, FileText, CheckCircle2 } from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer?: Customer) => void;
  customer?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customer
}) => {
  const isEditing = Boolean(customer);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_type: 'INDIVIDUAL' as CustomerType,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        customer_type: customer.customer_type,
        notes: customer.notes || ''
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        customer_type: 'INDIVIDUAL',
        notes: ''
      });
    }
    setError(null);
  }, [customer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setError('Full name and phone number are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && customer) {
        await api.updateCustomer(customer.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          customer_type: formData.customer_type,
          notes: formData.notes.trim() || undefined
        });
        onSuccess();
      } else {
        const res = await api.createCustomer({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          customer_type: formData.customer_type,
          notes: formData.notes.trim() || undefined
        });

        // Provide newly created customer object
        const createdCustomer: Customer = {
          id: res.id,
          customer_code: res.customer_code,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          customer_type: formData.customer_type,
          registration_date: new Date().toISOString().split('T')[0],
          notes: formData.notes.trim() || undefined,
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_orders: 0,
          total_spent: 0,
          outstanding_balance: 0
        };

        onSuccess(createdCustomer);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Customer: ${customer?.name}` : 'Register New Customer'}
      subtitle="Customer profile, credit eligibility, and contact details"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
            {error}
          </div>
        )}

        {/* Customer Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Customer Classification *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, customer_type: 'INDIVIDUAL' })}
              className={`p-2.5 text-xs font-medium rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                formData.customer_type === 'INDIVIDUAL'
                  ? 'bg-teal-50 border-teal-600 text-teal-800 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-200 font-semibold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <User className="w-4 h-4 text-teal-600" />
              <span>Individual Patient / Walk-In</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, customer_type: 'BUSINESS' })}
              className={`p-2.5 text-xs font-medium rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                formData.customer_type === 'BUSINESS'
                  ? 'bg-teal-50 border-teal-600 text-teal-800 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-200 font-semibold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Building className="w-4 h-4 text-teal-600" />
              <span>Clinic / Hospital / Corporate</span>
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {formData.customer_type === 'BUSINESS' ? 'Institution / Business Name *' : 'Full Customer Name *'}
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.customer_type === 'BUSINESS' ? 'e.g. St. Jude Regional Hospital' : 'e.g. Dr. Arthur Vance'}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 019-2831"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address (Optional)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="procurement@facility.org"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Physical / Delivery Address
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Suite, Street, City, State"
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Internal Account Notes / Credit Terms
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Net-30 credit terms approved, requires certificate of batch analysis on antibiotics."
            className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Submit */}
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
            <span>{loading ? 'Saving...' : isEditing ? 'Update Customer Profile' : 'Register Customer'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
