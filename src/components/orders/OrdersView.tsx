import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderStatus, PaymentStatus } from '../../types/inventory';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Receipt, Search, Filter, Download, Printer, CreditCard,
  RotateCcw, Ban, RefreshCw, Eye, CheckCircle2, Clock, AlertTriangle,
  Building, User, Calendar
} from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { OrderReturnModal } from './OrderReturnModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface OrdersViewProps {
  onStartNewSale?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onStartNewSale }) => {
  const { isManagerOrAbove } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        payment_status: paymentFilter !== 'all' ? paymentFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, paymentFilter, startDate, endDate]);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(o => {
      const matchNum = o.order_number.toLowerCase().includes(q);
      const matchCust = o.customer_name ? o.customer_name.toLowerCase().includes(q) : false;
      const matchUser = o.user_name ? o.user_name.toLowerCase().includes(q) : false;
      const matchPhone = o.customer_phone ? o.customer_phone.toLowerCase().includes(q) : false;
      return matchNum || matchCust || matchUser || matchPhone;
    });
  }, [orders, search]);

  const summary = useMemo(() => {
    const validOrders = orders.filter(o => o.order_status !== 'CANCELLED');
    const totalRev = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalReceivables = validOrders.reduce((sum, o) => sum + o.outstanding_balance, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = validOrders
      .filter(o => o.order_date === todayStr)
      .reduce((sum, o) => sum + o.total_amount, 0);

    return {
      totalCount: orders.length,
      totalRevenue: totalRev,
      totalReceivables,
      todaySales
    };
  }, [orders]);

  const handleCancelConfirm = async () => {
    if (!cancelOrder) return;
    setCancelling(true);
    try {
      await api.cancelOrder(cancelOrder.id, 'Cancelled via Order Management');
      setCancelOrder(null);
      loadOrders();
    } catch (err) {
      console.error('Failed to cancel order:', err);
    } finally {
      setCancelling(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Order Number', 'Date', 'Customer Name', 'Customer ID', 'Items Count', 'Subtotal ($)', 'Discount ($)', 'Tax ($)', 'Total Amount ($)', 'Paid Amount ($)', 'Outstanding Balance ($)', 'Payment Status', 'Order Status', 'Dispensed By'];
    const rows = filteredOrders.map(o => [
      `"${o.order_number}"`,
      `"${o.order_date}"`,
      `"${(o.customer_name || 'Walk-In').replace(/"/g, '""')}"`,
      `"${o.customer_code || 'N/A'}"`,
      o.items_count || 0,
      o.subtotal.toFixed(2),
      o.discount.toFixed(2),
      o.tax_amount.toFixed(2),
      o.total_amount.toFixed(2),
      o.paid_amount.toFixed(2),
      o.outstanding_balance.toFixed(2),
      `"${o.payment_status}"`,
      `"${o.order_status}"`,
      `"${o.user_name || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Orders_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-teal-600" />
            <span>Sales Orders & Commercial Invoices</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete transaction ledger with FEFO batch auditing, payments, returns, and printable receipts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadOrders}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          {onStartNewSale && (
            <button
              onClick={onStartNewSale}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <span>+ New POS Sale</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Total Orders</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
            {summary.totalCount} Orders
          </span>
          <span className="text-[10px] text-teal-600 mt-0.5 block font-medium">All historical transactions</span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Gross Sales Revenue</span>
          <span className="text-xl font-bold font-mono text-teal-600 tabular-nums block mt-1">
            ${summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Net of discounts and tax</span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Outstanding Receivables</span>
          <span className={`text-xl font-bold font-mono tabular-nums block mt-1 ${
            summary.totalReceivables > 0 ? 'text-rose-600' : 'text-slate-500'
          }`}>
            ${summary.totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-rose-500 mt-0.5 block font-medium">Credit sale balances pending</span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 block">Today's Sales</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
            ${summary.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-teal-600 mt-0.5 block font-medium">Completed today</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order #, customer, staff..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Payment Statuses</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIAL">Partial Payment (Balance Due)</option>
              <option value="UNPAID">Unpaid (Credit Sales)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Order Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              title="Start Date"
              className="w-full px-2 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              title="End Date"
              className="w-full px-2 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer Account</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Dispensed By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No sales orders found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Dispense products from the POS to create orders.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const hasDebt = o.outstanding_balance > 0;
                  const isCancelled = o.order_status === 'CANCELLED';
                  const isReturned = o.order_status === 'RETURNED';

                  return (
                    <tr key={o.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Order Number */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {o.order_number}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 font-mono text-slate-500 tabular-nums">
                        {o.order_date}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {o.customer_name || 'Walk-In Customer'}
                        </span>
                        {o.customer_code && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            {o.customer_code}
                          </span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
                        {o.items_count || 1} items
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        ${o.total_amount.toFixed(2)}
                      </td>

                      {/* Paid Amount */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-teal-600 font-semibold">
                        ${o.paid_amount.toFixed(2)}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                        {hasDebt && !isCancelled ? (
                          <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                            ${o.outstanding_balance.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3">
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

                      {/* Order Status */}
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold ${
                          isCancelled
                            ? 'text-rose-600'
                            : isReturned
                            ? 'text-amber-600'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {o.order_status}
                        </span>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {o.user_name || 'Staff'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Invoice Modal Trigger */}
                          <button
                            onClick={() => setSelectedInvoiceOrderId(o.id)}
                            className="p-1.5 text-teal-600 hover:text-white hover:bg-teal-600 rounded transition-colors"
                            title="Print commercial invoice & receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Record Subsequent Payment Trigger */}
                          {hasDebt && !isCancelled && !isReturned && (
                            <button
                              onClick={() => setPaymentOrder(o)}
                              className="p-1.5 text-amber-600 hover:text-white hover:bg-amber-600 rounded transition-colors"
                              title="Record balance payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Process Return Trigger */}
                          {!isCancelled && !isReturned && isManagerOrAbove && (
                            <button
                              onClick={() => setReturnOrder(o)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded transition-colors"
                              title="Process return & restore batch stock"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel Order Trigger */}
                          {!isCancelled && !isReturned && isManagerOrAbove && (
                            <button
                              onClick={() => setCancelOrder(o)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Cancel order and revert stock"
                            >
                              <Ban className="w-3.5 h-3.5" />
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

      {/* Invoice Modal */}
      <InvoiceModal
        orderId={selectedInvoiceOrderId}
        isOpen={Boolean(selectedInvoiceOrderId)}
        onClose={() => setSelectedInvoiceOrderId(null)}
        onPaymentRecorded={() => loadOrders()}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        order={paymentOrder}
        isOpen={Boolean(paymentOrder)}
        onClose={() => setPaymentOrder(null)}
        onSuccess={() => loadOrders()}
      />

      {/* Order Return Modal */}
      <OrderReturnModal
        order={returnOrder}
        isOpen={Boolean(returnOrder)}
        onClose={() => setReturnOrder(null)}
        onSuccess={() => loadOrders()}
      />

      {/* Cancel Order Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelOrder)}
        onClose={() => setCancelOrder(null)}
        onConfirm={handleCancelConfirm}
        title={`Cancel Order ${cancelOrder?.order_number}?`}
        message="Cancelling this order will restore all deducted items back into their respective inventory batches and post an audit record. Are you sure?"
        confirmLabel="Cancel Order & Restore Stock"
        isDestructive
        isLoading={cancelling}
      />
    </div>
  );
};
