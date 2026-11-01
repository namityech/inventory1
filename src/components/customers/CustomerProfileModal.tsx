import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CustomerProfile, Order, Payment } from '../../types/inventory';
import { api } from '../../services/api';
import {
  User, Building, Phone, Mail, MapPin, Calendar, CreditCard,
  Receipt, ShoppingCart, CheckCircle2, Clock, AlertCircle, ArrowUpRight,
  Printer, DollarSign, Package
} from 'lucide-react';

interface CustomerProfileModalProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInvoice?: (orderId: string) => void;
  onOpenNewOrder?: (customerId: string) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customerId,
  isOpen,
  onClose,
  onOpenInvoice,
  onOpenNewOrder
}) => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments' | 'products'>('orders');

  useEffect(() => {
    if (isOpen && customerId) {
      loadProfile(customerId);
    } else {
      setProfile(null);
    }
  }, [isOpen, customerId]);

  const loadProfile = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.getCustomer(id);
      setProfile(res.customer);
    } catch (err) {
      console.error('Failed to load customer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={profile?.name || 'Customer Account Dossier'}
      subtitle={profile ? `${profile.customer_code} · ${profile.customer_type} Account` : 'Loading profile...'}
      maxWidth="3xl"
    >
      {loading || !profile ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Loading customer purchase history and credit balance...
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Profile Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Orders Placed
              </span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
                {profile.total_orders || 0}
              </span>
              <span className="text-[10px] text-teal-600 block mt-0.5">Verified sales ledger</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Lifetime Spend
              </span>
              <span className="text-xl font-bold font-mono text-teal-600 tabular-nums block mt-1">
                ${(profile.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Gross order revenue</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <span className={`text-xl font-bold font-mono tabular-nums block mt-1 ${
                (profile.outstanding_balance || 0) > 0 ? 'text-rose-600' : 'text-slate-500'
              }`}>
                ${(profile.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {(profile.outstanding_balance || 0) > 0 ? 'Unsettled credit debt' : 'Fully settled'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Account Status
                </span>
                <span className={`text-xs font-bold inline-flex items-center gap-1.5 mt-1 ${
                  profile.is_active ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${profile.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {profile.is_active ? 'Active Customer' : 'Deactivated'}
                </span>
              </div>
              {onOpenNewOrder && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenNewOrder(profile.id);
                  }}
                  className="mt-2 w-full py-1.5 text-[11px] font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>Start New POS Sale</span>
                </button>
              )}
            </div>
          </div>

          {/* Contact Details Bar */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="font-mono">{profile.phone}</span>
            </div>
            <div className="flex items-center gap-2 truncate">
              <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate">{profile.email || 'No email provided'}</span>
            </div>
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate">{profile.address || 'Standard on-site counter pickup'}</span>
            </div>
            {profile.notes && (
              <div className="sm:col-span-3 text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 dark:border-slate-700">
                <strong>Account Memo:</strong> {profile.notes}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Purchase History ({profile.orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payment Ledger ({profile.payments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Frequently Ordered ({profile.frequently_purchased.length})</span>
            </button>
          </div>

          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Order Number</th>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5 text-right">Items</th>
                      <th className="px-3.5 py-2.5 text-right">Total</th>
                      <th className="px-3.5 py-2.5 text-right">Paid</th>
                      <th className="px-3.5 py-2.5 text-right">Balance</th>
                      <th className="px-3.5 py-2.5">Payment</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {profile.orders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No previous orders found for this customer.
                        </td>
                      </tr>
                    ) : (
                      profile.orders.map(o => (
                        <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {o.order_number}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-500">
                            {o.order_date}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {o.items_count} items
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                            ${o.total_amount.toFixed(2)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-teal-600">
                            ${o.paid_amount.toFixed(2)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono tabular-nums font-semibold">
                            {o.outstanding_balance > 0 ? (
                              <span className="text-rose-600">${o.outstanding_balance.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">$0.00</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              o.payment_status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : o.payment_status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}>
                              {o.payment_status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className={`text-[11px] font-medium ${
                              o.order_status === 'COMPLETED'
                                ? 'text-slate-700 dark:text-slate-300'
                                : o.order_status === 'CANCELLED'
                                ? 'text-rose-500'
                                : 'text-amber-500'
                            }`}>
                              {o.order_status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            {onOpenInvoice && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onOpenInvoice(o.id);
                                }}
                                className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 ml-auto"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Invoice</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Receipt / Ref</th>
                      <th className="px-3.5 py-2.5">Order</th>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Method</th>
                      <th className="px-3.5 py-2.5 text-right">Amount Paid</th>
                      <th className="px-3.5 py-2.5">Reference No</th>
                      <th className="px-3.5 py-2.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {profile.payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No payments recorded for this customer yet.
                        </td>
                      </tr>
                    ) : (
                      profile.payments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-teal-600">
                            {p.payment_number}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-900 dark:text-slate-100">
                            {p.order_number}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-500">
                            {p.payment_date}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium">
                            {p.payment_method.replace('_', ' ')}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            ${p.amount.toFixed(2)}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-500">
                            {p.payment_reference || '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-500 truncate max-w-xs">
                            {p.notes || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FREQUENTLY PURCHASED */}
          {activeTab === 'products' && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3.5 py-2.5">Product Name</th>
                      <th className="px-3.5 py-2.5">SKU</th>
                      <th className="px-3.5 py-2.5 text-right">Lifetime Units Bought</th>
                      <th className="px-3.5 py-2.5 text-right">Total Expenditure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {profile.frequently_purchased.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          No product purchase statistics available.
                        </td>
                      </tr>
                    ) : (
                      profile.frequently_purchased.map(item => (
                        <tr key={item.product_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                            {item.product_name}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-slate-400">
                            {item.sku}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-teal-600 tabular-nums">
                            {item.total_quantity} units
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            ${item.total_spend.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
