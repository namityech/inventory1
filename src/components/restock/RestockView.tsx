import React, { useState, useEffect } from 'react';
import {
  Boxes, AlertTriangle, Plus, CheckCircle2, Truck, FileText,
  DollarSign, Clock, Check, ArrowRight, RefreshCw, X
} from 'lucide-react';
import { RestockRecommendation, PurchaseOrder, Supplier, Product } from '../../types/inventory';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

interface RestockViewProps {
  products: Product[];
  suppliers: Supplier[];
  onRefreshAll: () => void;
}

export const RestockView: React.FC<RestockViewProps> = ({
  products,
  suppliers,
  onRefreshAll
}) => {
  const { isManagerOrAbove } = useAuth();
  const [activeTab, setActiveTab] = useState<'recommendations' | 'orders'>('recommendations');

  const [recommendations, setRecommendations] = useState<RestockRecommendation[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // New PO Modal state
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<Array<{ product_id: string; quantity: number; unit_price: number }>>([]);
  const [submittingPo, setSubmittingPo] = useState(false);
  const [poError, setPoError] = useState<string | null>(null);

  // Receive PO Modal state
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [receivingInputs, setReceivingInputs] = useState<{ [productId: string]: { batchNumber: string; expiryDate: string } }>({});
  const [submittingReceive, setSubmittingReceive] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, poRes] = await Promise.all([
        api.getRestockRecommendations(),
        api.getPurchaseOrders()
      ]);
      setRecommendations(recRes.recommendations);
      setOrders(poRes.purchaseOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewPoForProduct = (rec: RestockRecommendation) => {
    setSelectedSupplierId(rec.supplier_id || suppliers[0]?.id || '');
    const d = new Date();
    d.setDate(d.getDate() + 5);
    setExpectedDate(d.toISOString().split('T')[0]);
    setPoNotes(`Automated replenishment reorder for low stock ${rec.name}`);
    setPoItems([{
      product_id: rec.id,
      quantity: rec.suggested_quantity,
      unit_price: rec.purchase_price
    }]);
    setIsPoModalOpen(true);
  };

  const handleAddPoItem = () => {
    if (products.length === 0) return;
    setPoItems([...poItems, {
      product_id: products[0].id,
      quantity: 50,
      unit_price: products[0].purchase_price
    }]);
  };

  const handleRemovePoItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handlePoItemChange = (index: number, field: string, value: any) => {
    const updated = [...poItems];
    if (field === 'product_id') {
      const p = products.find(prod => prod.id === value);
      updated[index].product_id = value;
      if (p) updated[index].unit_price = p.purchase_price;
    } else if (field === 'quantity') {
      updated[index].quantity = parseInt(value, 10) || 1;
    } else if (field === 'unit_price') {
      updated[index].unit_price = parseFloat(value) || 0;
    }
    setPoItems(updated);
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      setPoError('Please add at least one item to order');
      return;
    }

    setSubmittingPo(true);
    setPoError(null);
    try {
      await api.createPurchaseOrder({
        supplier_id: selectedSupplierId || undefined,
        expected_date: expectedDate || undefined,
        notes: poNotes.trim() || undefined,
        items: poItems
      });
      setIsPoModalOpen(false);
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      setPoError(err.message || 'Failed to create purchase order');
    } finally {
      setSubmittingPo(false);
    }
  };

  const handleOpenReceive = (po: PurchaseOrder) => {
    setReceivingPo(po);
    const initial: any = {};
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    const defaultExp = d.toISOString().split('T')[0];

    po.items?.forEach((it, idx) => {
      initial[it.product_id] = {
        batchNumber: `REC-${po.po_number.slice(-4)}-LOT${idx + 1}`,
        expiryDate: defaultExp
      };
    });
    setReceivingInputs(initial);
  };

  const handleConfirmReceive = async () => {
    if (!receivingPo) return;
    setSubmittingReceive(true);
    try {
      const batchNumbers: any = {};
      const expiryDates: any = {};
      for (const [pid, val] of Object.entries(receivingInputs)) {
        batchNumbers[pid] = val.batchNumber;
        expiryDates[pid] = val.expiryDate;
      }
      await api.receivePurchaseOrder(receivingPo.id, { batch_numbers: batchNumbers, expiry_dates: expiryDates });
      setReceivingPo(null);
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Failed to receive purchase order');
    } finally {
      setSubmittingReceive(false);
    }
  };

  const totalReplenishmentCost = recommendations.reduce((acc, r) => acc + r.estimated_cost, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-teal-600" />
            <span>Low Stock Alerts & Restocking Center</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated shortage detection, safety buffer analysis, and replenishment procurement
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isManagerOrAbove && (
            <button
              onClick={() => {
                setSelectedSupplierId(suppliers[0]?.id || '');
                setExpectedDate('');
                setPoNotes('');
                setPoItems(products.length > 0 ? [{ product_id: products[0].id, quantity: 50, unit_price: products[0].purchase_price }] : []);
                setIsPoModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'recommendations'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Low Stock Recommendations ({recommendations.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Purchase Orders ({orders.length})</span>
        </button>
      </div>

      {/* TAB 1: RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[11px] font-medium text-slate-500 block">Shortage Alerts</span>
              <span className="text-xl font-bold font-mono text-amber-600 tabular-nums block mt-1">
                {recommendations.length} SKUs
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Usable stock &le; safety threshold</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[11px] font-medium text-slate-500 block">Critical Stockouts</span>
              <span className="text-xl font-bold font-mono text-rose-600 tabular-nums block mt-1">
                {recommendations.filter(r => r.usable_stock === 0).length} SKUs
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Zero usable unexpired units</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[11px] font-medium text-slate-500 block">Total Est. Replenishment Cost</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums block mt-1">
                ${totalReplenishmentCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Recommended reorder batches</span>
            </div>
          </div>

          {/* Recommendations Table */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Product Name & SKU</th>
                    <th className="px-4 py-3 text-right">Usable Stock</th>
                    <th className="px-4 py-3 text-right">Min Threshold</th>
                    <th className="px-4 py-3 text-right">Deficit</th>
                    <th className="px-4 py-3 text-right">Suggested Order</th>
                    <th className="px-4 py-3 text-right">Est. Unit Cost</th>
                    <th className="px-4 py-3 text-right">Total Est. Cost</th>
                    <th className="px-4 py-3">Preferred Supplier</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recommendations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">All inventory levels healthy</p>
                        <p className="text-[11px] text-slate-400 mt-1">No products are currently beneath their minimum safety threshold.</p>
                      </td>
                    </tr>
                  ) : (
                    recommendations.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                            {r.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                            {r.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">
                          <span className={`font-bold ${r.usable_stock === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                            {r.usable_stock} {r.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {r.min_stock} {r.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-rose-600 font-semibold">
                          -{r.deficit} {r.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-teal-600 font-bold">
                          +{r.suggested_quantity} {r.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          ${r.purchase_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          ${r.estimated_cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <span className="block truncate max-w-[140px] font-medium">{r.supplier_name || 'Standard'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isManagerOrAbove && (
                            <button
                              onClick={() => openNewPoForProduct(r)}
                              className="px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                            >
                              Order Restock &rarr;
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
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Order Status</th>
                    <th className="px-4 py-3">Order Date</th>
                    <th className="px-4 py-3">Expected Delivery</th>
                    <th className="px-4 py-3 text-right">Items Count</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No purchase orders placed yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map(po => {
                      const isReceived = po.status === 'RECEIVED';
                      const isOrdered = po.status === 'ORDERED';

                      return (
                        <tr key={po.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {po.po_number}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                            {po.supplier_name || 'Standard Supplier'}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            <span
                              className={`inline-flex items-center gap-1.5 ${
                                isReceived
                                  ? 'text-emerald-600'
                                  : isOrdered
                                  ? 'text-sky-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isReceived ? 'bg-emerald-500' : 'bg-sky-500'}`} />
                              <span>{po.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                            {po.order_date}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                            {po.expected_date || 'Standard Lead'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                            {po.item_count || po.items?.length || 0} items
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                            ${po.total_amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {po.created_by || 'Inventory Officer'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isOrdered && isManagerOrAbove && (
                              <button
                                onClick={() => handleOpenReceive(po)}
                                className="px-3 py-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-xs"
                              >
                                Receive Delivery
                              </button>
                            )}
                            {isReceived && (
                              <span className="text-[11px] text-emerald-600 font-medium">
                                Stocked & Logged
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      <Modal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        title="Draft Replenishment Purchase Order"
        subtitle="Specify procurement items, agreed supplier rates, and expected shipment arrival"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreatePo} className="space-y-4">
          {poError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg">
              {poError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier
              </label>
              <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Order Line Items ({poItems.length})</span>
              <button
                type="button"
                onClick={handleAddPoItem}
                className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {poItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs py-1">
                <div className="col-span-5">
                  <select
                    value={item.product_id}
                    onChange={e => handlePoItemChange(idx, 'product_id', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={e => handlePoItemChange(idx, 'quantity', e.target.value)}
                    className="w-full px-2 py-1.5 font-mono border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="col-span-3 font-mono font-semibold tabular-nums text-right">
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemovePoItem(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Procurement Notes
            </label>
            <input
              type="text"
              value={poNotes}
              onChange={e => setPoNotes(e.target.value)}
              placeholder="e.g. Rush shipment for emergency stockout protection"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsPoModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPo}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {submittingPo ? 'Placing Order...' : 'Submit Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RECEIVE PURCHASE ORDER MODAL */}
      <Modal
        isOpen={Boolean(receivingPo)}
        onClose={() => setReceivingPo(null)}
        title={`Receive Shipment: ${receivingPo?.po_number}`}
        subtitle="Verify delivery items and assign lot numbers and expiry dates to stock batches"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Assign the physical batch/lot numbers and statutory expiry dates printed on the received product containers. These will be logged directly into active inventory under FEFO controls.
          </p>

          <div className="space-y-3">
            {receivingPo?.items?.map(it => (
              <div key={it.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{it.product_name}</span>
                  <span className="font-mono font-bold text-teal-600">+{it.quantity} {it.unit || 'units'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Lot / Batch Number</label>
                    <input
                      type="text"
                      value={receivingInputs[it.product_id]?.batchNumber || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setReceivingInputs({
                          ...receivingInputs,
                          [it.product_id]: { ...receivingInputs[it.product_id], batchNumber: val }
                        });
                      }}
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Statutory Expiry Date</label>
                    <input
                      type="date"
                      value={receivingInputs[it.product_id]?.expiryDate || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setReceivingInputs({
                          ...receivingInputs,
                          [it.product_id]: { ...receivingInputs[it.product_id], expiryDate: val }
                        });
                      }}
                      className="w-full px-2.5 py-1.5 font-mono border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setReceivingPo(null)}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReceive}
              disabled={submittingReceive}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {submittingReceive ? 'Stocking Inventory...' : 'Confirm Delivery & Stock Batches'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
