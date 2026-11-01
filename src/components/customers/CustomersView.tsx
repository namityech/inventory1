import React, { useState, useEffect, useMemo } from 'react';
import { Customer, CustomerType } from '../../types/inventory';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  UserCheck, Plus, Search, Building, User, Phone, Mail,
  CreditCard, DollarSign, RefreshCw, Edit2, Eye, Power,
  ShoppingCart, FileSpreadsheet, Download, AlertTriangle
} from 'lucide-react';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerProfileModal } from './CustomerProfileModal';

interface CustomersViewProps {
  onStartSaleForCustomer?: (customerId: string) => void;
  onOpenInvoice?: (orderId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onStartSaleForCustomer,
  onOpenInvoice
}) => {
  const { isManagerOrAbove } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers();
      setCustomers(res.customers);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (typeFilter !== 'all' && c.customer_type !== typeFilter) return false;
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'inactive' && c.is_active) return false;

      if (search) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q);
        const matchCode = c.customer_code.toLowerCase().includes(q);
        const matchEmail = c.email ? c.email.toLowerCase().includes(q) : false;
        if (!matchName && !matchPhone && !matchCode && !matchEmail) return false;
      }

      return true;
    });
  }, [customers, typeFilter, statusFilter, search]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);
  }, [customers]);

  const totalLifetimeSpent = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  }, [customers]);

  const handleToggleStatus = async (id: string) => {
    try {
      await api.toggleCustomerStatus(id);
      loadCustomers();
    } catch (err) {
      console.error('Failed to toggle customer status:', err);
    }
  };

  const exportCSV = () => {
    const headers = ['Customer Code', 'Name', 'Type', 'Phone', 'Email', 'Address', 'Status', 'Total Orders', 'Lifetime Spend ($)', 'Outstanding Balance ($)', 'Registered Date'];
    const rows = filteredCustomers.map(c => [
      `"${c.customer_code}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.customer_type}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${c.is_active ? 'Active' : 'Inactive'}"`,
      c.total_orders || 0,
      (c.total_spent || 0).toFixed(2),
      (c.outstanding_balance || 0).toFixed(2),
      `"${c.registration_date}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Customer_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            <span>Customer Relationship Management (CRM)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Accounts, purchase histories, credit limits, and payment balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadCustomers}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Reload customers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Directory</span>
          </button>
          <button
            onClick={() => {
              setEditingCustomer(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Total Customers</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
            {customers.length} Accounts
          </span>
          <span className="text-[10px] text-teal-600 font-medium mt-0.5 block">
            {customers.filter(c => c.is_active).length} active · {customers.filter(c => !c.is_active).length} inactive
          </span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Corporate / Clinics</span>
          <span className="text-xl font-bold font-mono text-teal-600 tabular-nums block mt-1">
            {customers.filter(c => c.customer_type === 'BUSINESS').length} Institutions
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Hospitals, clinics, pharmacy chains</span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Total Outstanding Receivables</span>
          <span className={`text-xl font-bold font-mono tabular-nums block mt-1 ${totalOutstanding > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
            ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-rose-500 mt-0.5 block font-medium">Unsettled customer credit balances</span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Total Customer Spend</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
            ${totalLifetimeSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-teal-600 mt-0.5 block">Aggregated sales revenue</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer name, code (CUST-...), phone number, or email..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Classifications</option>
              <option value="INDIVIDUAL">Individual Patients</option>
              <option value="BUSINESS">Institutional / Businesses</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts Only</option>
              <option value="inactive">Deactivated Accounts</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span>Displaying <strong>{filteredCustomers.length}</strong> matching customer accounts</span>
          <span className="font-mono text-slate-400">FEFO-Compliant Customer Ledger</span>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Customer ID</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Phone & Email</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Total Purchases</th>
                <th className="px-4 py-3 text-right">Outstanding Balance</th>
                <th className="px-4 py-3 font-mono">Registered</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No customers found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Register a new customer or adjust your filter query.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => {
                  const hasDebt = (c.outstanding_balance || 0) > 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Customer ID */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {c.customer_code}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewingProfileId(c.id)}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-teal-600 dark:hover:text-teal-400 text-left block"
                        >
                          {c.name}
                        </button>
                        {c.address && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-xs mt-0.5">
                            {c.address}
                          </span>
                        )}
                      </td>

                      {/* Classification */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.customer_type === 'BUSINESS'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                        }`}>
                          {c.customer_type === 'BUSINESS' ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          <span>{c.customer_type === 'BUSINESS' ? 'Business' : 'Individual'}</span>
                        </span>
                      </td>

                      {/* Phone & Email */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-slate-700 dark:text-slate-300 block font-medium">
                          {c.phone}
                        </span>
                        {c.email && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                            {c.email}
                          </span>
                        )}
                      </td>

                      {/* Orders */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
                        {c.total_orders || 0}
                      </td>

                      {/* Total Purchases */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                        ${(c.total_spent || 0).toFixed(2)}
                      </td>

                      {/* Outstanding Debt */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                        {hasDebt ? (
                          <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                            ${(c.outstanding_balance || 0).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="px-4 py-3 font-mono text-slate-500 tabular-nums">
                        {c.registration_date}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          c.is_active ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{c.is_active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* POS Sale Button */}
                          {c.is_active && onStartSaleForCustomer && (
                            <button
                              onClick={() => onStartSaleForCustomer(c.id)}
                              className="p-1.5 text-teal-600 hover:text-white hover:bg-teal-600 rounded transition-colors"
                              title="New POS sale for this customer"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Profile Dossier Button */}
                          <button
                            onClick={() => setViewingProfileId(c.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                            title="View purchase history & payment ledger"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          {isManagerOrAbove && (
                            <button
                              onClick={() => {
                                setEditingCustomer(c);
                                setIsFormOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                              title="Edit customer details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle Active Status */}
                          {isManagerOrAbove && (
                            <button
                              onClick={() => handleToggleStatus(c.id)}
                              className={`p-1.5 rounded transition-colors ${
                                c.is_active
                                  ? 'text-slate-400 hover:text-rose-600'
                                  : 'text-slate-400 hover:text-emerald-600'
                              }`}
                              title={c.is_active ? 'Deactivate customer account' : 'Reactivate customer account'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => loadCustomers()}
        customer={editingCustomer}
      />

      {/* Customer Profile & Purchase History Modal */}
      <CustomerProfileModal
        isOpen={Boolean(viewingProfileId)}
        customerId={viewingProfileId}
        onClose={() => setViewingProfileId(null)}
        onOpenInvoice={onOpenInvoice}
        onOpenNewOrder={onStartSaleForCustomer}
      />
    </div>
  );
};
