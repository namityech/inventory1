import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Order } from '../../types/inventory';
import { api } from '../../services/api';
import {
  Printer, Download, CheckCircle2, AlertTriangle, Building,
  Phone, Mail, MapPin, Calendar, Clock, DollarSign, ShieldCheck
} from 'lucide-react';

interface InvoiceModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  orderId,
  isOpen,
  onClose,
  onPaymentRecorded
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder(orderId);
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId]);

  const loadOrder = async (id: string) => {
    setLoading(true);
    try {
      const res = await api.getOrder(id);
      setOrder(res.order);
    } catch (err) {
      console.error('Failed to load order for invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order ? `Commercial Invoice & Batch Dispatch: ${order.order_number}` : 'Loading Invoice...'}
      subtitle={order ? `Issued on ${order.order_date} · Statutory Batch Traceability Cert.` : ''}
      maxWidth="3xl"
    >
      {loading || !order ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Generating printable commercial invoice and batch verification...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Printable Invoice Container */}
          <div
            ref={printableRef}
            id="printable-invoice"
            className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-6 print:border-none print:p-0 print:shadow-none"
          >
            {/* Header: Brand & Document Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-9 h-9 rounded-lg bg-teal-600 text-white font-black flex items-center justify-center text-base shadow-sm">
                    SI
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      Apex Medical & Retail Supply
                    </h1>
                    <span className="text-[11px] text-teal-600 font-semibold block">
                      Licensed Pharmaceutical & Regulated Consumables Distributor
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5 mt-2">
                  <p>104 Innovation Way, Healthcare Logistics Bay 3</p>
                  <p>Phone: +1 (800) 555-0199 · Email: billing@apexinventory.com</p>
                  <p>Tax / VAT ID: <strong className="font-mono text-slate-700 dark:text-slate-300">US-882-01948-MED</strong></p>
                </div>
              </div>

              <div className="text-right sm:min-w-[220px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 block">
                  Official Commercial Invoice
                </span>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-100 block mt-0.5">
                  {order.order_number}
                </span>

                <div className="mt-2 text-xs space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Order Date:</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{order.order_date}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Payment Status:</span>
                    <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${
                      order.payment_status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : order.payment_status === 'PARTIAL'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {order.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Dispensed By:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{order.user_name || 'Staff Member'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To & Dispatch Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Billed To Customer
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {order.customer_name || 'Walk-In Customer'}
                </p>
                {order.customer_code && (
                  <p className="font-mono text-slate-500 mt-0.5">Customer ID: {order.customer_code}</p>
                )}
                {order.customer_phone && (
                  <p className="font-mono text-slate-600 dark:text-slate-300 mt-0.5">Phone: {order.customer_phone}</p>
                )}
                {order.customer_email && (
                  <p className="text-slate-500 mt-0.5">Email: {order.customer_email}</p>
                )}
                {order.customer_address && (
                  <p className="text-slate-500 mt-0.5">Address: {order.customer_address}</p>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>FEFO Batch Compliance Guarantee</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This order was dispatched strictly adhering to First-Expired, First-Out (FEFO) protocols. All issued lots have been certified active and unexpired at point of handover.
                  </p>
                </div>
                {order.notes && (
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                    <strong>Memo:</strong> {order.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table with Batch & Expiry Traceability */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">Item Description & SKU</th>
                    <th className="px-3.5 py-2.5">Dispatched Lot / Batch</th>
                    <th className="px-3.5 py-2.5 font-mono">Lot Expiry</th>
                    <th className="px-3.5 py-2.5 text-right">Qty</th>
                    <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                    <th className="px-3.5 py-2.5 text-right">Discount</th>
                    <th className="px-3.5 py-2.5 text-right">Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2.5">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {item.product_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.batch_number || 'Direct FEFO'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono tabular-nums text-teal-700 dark:text-teal-400 font-medium">
                        {item.expiry_date || 'Certified Safe'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold tabular-nums">
                        {item.quantity} {item.unit || 'units'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-slate-500">
                        {item.discount > 0 ? `-$${item.discount.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        ${item.total_price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Payments Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Payment History Log */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Payment History & Receipts
                </span>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-2.5 py-1.5">Date</th>
                        <th className="px-2.5 py-1.5">Method</th>
                        <th className="px-2.5 py-1.5">Ref No.</th>
                        <th className="px-2.5 py-1.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {order.payments && order.payments.length > 0 ? (
                        order.payments.map(p => (
                          <tr key={p.id}>
                            <td className="px-2.5 py-1.5 font-mono text-slate-500">{p.payment_date}</td>
                            <td className="px-2.5 py-1.5 font-medium">{p.payment_method.replace('_', ' ')}</td>
                            <td className="px-2.5 py-1.5 font-mono text-slate-400">{p.payment_reference || 'Counter'}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold text-teal-600">${p.amount.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-2.5 py-3 text-center text-slate-400 italic">
                            No payment recorded (Credit Sale)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation Strip */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Gross Items Subtotal:</span>
                  <span className="font-mono tabular-nums">${order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-teal-600 font-medium">
                    <span>Order Discount:</span>
                    <span className="font-mono tabular-nums">-${order.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Applicable Tax ({order.tax_rate}%):</span>
                  <span className="font-mono tabular-nums">${order.tax_amount.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100">
                  <span>Grand Total:</span>
                  <span className="font-mono tabular-nums text-base">${order.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-teal-700 dark:text-teal-400">
                  <span>Amount Paid:</span>
                  <span className="font-mono tabular-nums">${order.paid_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-200/60 dark:border-slate-700">
                  <span className={order.outstanding_balance > 0 ? 'text-rose-600' : 'text-slate-500'}>
                    Outstanding Balance:
                  </span>
                  <span className={`font-mono tabular-nums ${order.outstanding_balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    ${order.outstanding_balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Statutory Sign-off */}
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end text-[11px] text-slate-400">
              <div>
                <p className="font-semibold text-slate-600 dark:text-slate-300">Terms & Regulatory Policy:</p>
                <p>Prescription medications and clinical consumables must be stored according to packaging labels.</p>
                <p>Returns accepted only within 7 days in pristine, unopened condition with tamper seals intact.</p>
              </div>
              <div className="text-right">
                <div className="w-48 border-b border-slate-400 pb-1 mb-1 font-mono text-center text-slate-700 dark:text-slate-200">
                  {order.user_name || 'Authorized Officer'}
                </div>
                <span className="text-[10px] block text-center">Authorized Signature & Handover</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Press Print to print clean receipt or save as PDF.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice / Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
