import React, { useState, useEffect, useMemo } from 'react';
import { Product, Batch, Customer, PaymentMethod } from '../../types/inventory';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, UserPlus,
  CheckCircle2, AlertTriangle, ShieldCheck, DollarSign,
  CreditCard, Sparkles, Receipt, RefreshCw, X
} from 'lucide-react';
import { CustomerFormModal } from '../customers/CustomerFormModal';
import { InvoiceModal } from '../orders/InvoiceModal';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  selectedBatchId?: string; // null means auto FEFO
  selectedBatchNumber?: string;
  earliestExpiry?: string;
}

interface PosViewProps {
  products: Product[];
  onOrderCompleted?: () => void;
  preselectedCustomerId?: string | null;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  onOrderCompleted,
  preselectedCustomerId
}) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<string>('8.0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Load active customers
  const loadCustomers = async () => {
    try {
      const res = await api.getCustomers({ status: 'active' });
      setCustomers(res.customers);
      if (preselectedCustomerId) {
        setSelectedCustomerId(preselectedCustomerId);
      }
    } catch (err) {
      console.error('Failed to load customers for POS:', err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [preselectedCustomerId]);

  // Categories list derived from products
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.category_id && p.category_name) {
        map.set(p.category_id, p.category_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // Filtered products for catalog list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
      if (productSearch) {
        const q = productSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
        if (!matchName && !matchSku && !matchBarcode) return false;
      }
      return true;
    });
  }, [products, selectedCategory, productSearch]);

  // Add product to cart
  const addToCart = (product: Product) => {
    setErrorMessage(null);
    if (product.usable_stock <= 0) {
      setErrorMessage(`Cannot add "${product.name}". All batches are either depleted or expired!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.usable_stock) {
          setErrorMessage(`Maximum usable unexpired stock for ${product.name} is ${product.usable_stock} ${product.unit}`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.selling_price,
            discount: 0,
            selectedBatchId: undefined, // auto FEFO
            earliestExpiry: product.earliest_usable_expiry || undefined
          }
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMessage(null);
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.usable_stock) {
              setErrorMessage(`Stock ceiling reached: only ${item.product.usable_stock} ${item.product.unit} usable.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateItemDiscount = (productId: string, discountVal: number) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, discount: Math.max(0, discountVal) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setOrderDiscount('0');
    setAmountPaid('');
    setPaymentReference('');
    setOrderNotes('');
    setErrorMessage(null);
  };

  // Financial calculations
  const itemsSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice - item.discount), 0);
  }, [cart]);

  const numOrderDiscount = useMemo(() => {
    return Math.min(itemsSubtotal, Math.max(0, parseFloat(orderDiscount) || 0));
  }, [itemsSubtotal, orderDiscount]);

  const taxableSubtotal = useMemo(() => {
    return Math.max(0, itemsSubtotal - numOrderDiscount);
  }, [itemsSubtotal, numOrderDiscount]);

  const numTaxRate = useMemo(() => {
    return Math.max(0, parseFloat(taxRate) || 0);
  }, [taxRate]);

  const taxAmount = useMemo(() => {
    return Math.round(taxableSubtotal * (numTaxRate / 100) * 100) / 100;
  }, [taxableSubtotal, numTaxRate]);

  const grandTotal = useMemo(() => {
    return Math.round((taxableSubtotal + taxAmount) * 100) / 100;
  }, [taxableSubtotal, taxAmount]);

  // Auto-sync amount paid if not manually edited or on full payment
  useEffect(() => {
    if (amountPaid === '' || paymentMethod !== 'CREDIT') {
      setAmountPaid(grandTotal > 0 ? grandTotal.toFixed(2) : '');
    }
  }, [grandTotal]);

  const numAmountPaid = useMemo(() => {
    return Math.max(0, parseFloat(amountPaid) || 0);
  }, [amountPaid]);

  const outstandingBalance = useMemo(() => {
    return Math.round(Math.max(0, grandTotal - numAmountPaid) * 100) / 100;
  }, [grandTotal, numAmountPaid]);

  const calculatedPaymentStatus = useMemo(() => {
    if (grandTotal === 0) return 'PAID';
    if (outstandingBalance <= 0.001) return 'PAID';
    if (numAmountPaid > 0) return 'PARTIAL';
    return 'UNPAID';
  }, [grandTotal, outstandingBalance, numAmountPaid]);

  // Handle Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('Shopping cart is empty. Please select products to dispense.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const orderPayload = {
        customer_id: selectedCustomerId || null,
        items: cart.map(item => ({
          product_id: item.product.id,
          batch_id: item.selectedBatchId || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount
        })),
        discount: numOrderDiscount,
        tax_rate: numTaxRate,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'CREDIT' ? 0 : numAmountPaid,
        payment_reference: paymentReference.trim() || undefined,
        notes: orderNotes.trim() || undefined
      };

      const res = await api.createOrder(orderPayload);
      setCreatedOrderId(res.orderId);
      setIsInvoiceOpen(true);
      clearCart();
      if (onOrderCompleted) onOrderCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-teal-600" />
            <span>Point of Sale (POS) & Counter Dispensing</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enforced First-Expired First-Out (FEFO) batch issuing with instant receipt generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>FEFO Protocol Enforced</span>
          </span>
        </div>
      </div>

      {/* POS Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PRODUCT CATALOG SELECTOR (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter Toolbar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Search products by brand, chemical name, SKU, or barcode..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                All Categories ({products.length})
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
                    selectedCategory === c.id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 py-16 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-semibold">No available products found</p>
                <p className="text-[11px] text-slate-400 mt-1">Adjust search query or check inventory restock levels.</p>
              </div>
            ) : (
              filteredProducts.map(p => {
                const isOutOfStock = p.usable_stock <= 0;
                const inCart = cart.find(item => item.product.id === p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border transition-all flex flex-col justify-between ${
                      inCart
                        ? 'border-teal-500 shadow-xs ring-1 ring-teal-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    } ${isOutOfStock ? 'opacity-60 bg-slate-100/40' : ''}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2">
                          {p.name}
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 shrink-0 tabular-nums">
                          ${p.selling_price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">{p.sku}</span>
                        {p.category_name && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {p.category_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Usable Stock:</span>
                        <span className={`text-xs font-bold font-mono tabular-nums ${
                          isOutOfStock ? 'text-rose-600' : p.usable_stock <= p.min_stock ? 'text-amber-600' : 'text-teal-600'
                        }`}>
                          {p.usable_stock} {p.unit}
                        </span>
                        {p.earliest_usable_expiry && (
                          <span className="text-[9px] text-slate-400 block font-mono">
                            FEFO: {p.earliest_usable_expiry}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        disabled={isOutOfStock}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shadow-xs ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                            : inCart
                            ? 'bg-teal-700 text-white hover:bg-teal-800'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{inCart ? `Add (${inCart.quantity})` : 'Add to Cart'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE SHOPPING CART & CHECKOUT (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cart & Order Breakdown
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] text-rose-600 hover:underline font-semibold"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Customer Selection with Quick Register Button */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Customer Account
              </label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1 hover:underline"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ New Customer</span>
              </button>
            </div>

            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100/60 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Walk-in Customer (General Counter Sale)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.customer_code}) {c.outstanding_balance && c.outstanding_balance > 0 ? `· Debt: $${c.outstanding_balance.toFixed(2)}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Error notice if any */}
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cart Items List */}
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-xs font-semibold">Cart is currently empty</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "Add to Cart" on any product from the catalog.</p>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.product.id}
                  className="p-3 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        {item.product.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        {item.product.sku} · ${item.unitPrice.toFixed(2)} / {item.product.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity Stepper & Subtotal */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                        ${(item.quantity * item.unitPrice - item.discount).toFixed(2)}
                      </span>
                      {item.earliestExpiry && (
                        <span className="text-[9px] text-teal-600 block font-mono">
                          FEFO Lot: {item.earliestExpiry}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Adjustments: Discount & Tax */}
          <div className="p-3 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">
                  Order Discount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={orderDiscount}
                  onChange={e => setOrderDiscount(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-0.5">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Items Subtotal:</span>
                <span className="font-mono tabular-nums">${itemsSubtotal.toFixed(2)}</span>
              </div>
              {numOrderDiscount > 0 && (
                <div className="flex justify-between text-teal-600 font-semibold">
                  <span>Order Discount:</span>
                  <span className="font-mono tabular-nums">-${numOrderDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>Tax ({numTaxRate}%):</span>
                <span className="font-mono tabular-nums">${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Grand Total:</span>
                <span className="font-mono tabular-nums text-base">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method & Amount Paid */}
          <div className="space-y-3 pt-1 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'CASH', label: 'Cash' },
                  { id: 'BANK_TRANSFER', label: 'Bank' },
                  { id: 'MOBILE_MONEY', label: 'Mobile' },
                  { id: 'CREDIT', label: 'Credit Sale' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id as PaymentMethod);
                      if (m.id === 'CREDIT') {
                        setAmountPaid('0.00');
                      } else if (amountPaid === '0.00' || amountPaid === '') {
                        setAmountPaid(grandTotal.toFixed(2));
                      }
                    }}
                    className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                      paymentMethod === m.id
                        ? 'bg-teal-50 border-teal-600 text-teal-800 dark:bg-teal-950/40 dark:border-teal-500 dark:text-teal-200 font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Paid input with quick options */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Amount Tendered ($)
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAmountPaid(grandTotal.toFixed(2))}
                    className="text-teal-600 hover:underline font-semibold"
                  >
                    Full (${grandTotal.toFixed(2)})
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => setAmountPaid((grandTotal / 2).toFixed(2))}
                    className="text-slate-500 hover:underline"
                  >
                    50%
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => setAmountPaid('0.00')}
                    className="text-rose-500 hover:underline"
                  >
                    $0 (Credit)
                  </button>
                </div>
              </div>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={grandTotal}
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Status and Debt Indicator */}
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className={`font-semibold ${outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {outstandingBalance > 0 ? `Unpaid Debt: $${outstandingBalance.toFixed(2)}` : 'Fully Paid at Checkout'}
                </span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  calculatedPaymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : calculatedPaymentStatus === 'PARTIAL'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}>
                  {calculatedPaymentStatus}
                </span>
              </div>
            </div>

            {/* Reference Number */}
            <div>
              <input
                type="text"
                value={paymentReference}
                onChange={e => setPaymentReference(e.target.value)}
                placeholder="Payment Reference / Receipt / Mobile Money Code..."
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              className="w-full py-3 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Verifying FEFO & Completing Order...' : `Complete Sale ($${grandTotal.toFixed(2)})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Customer Registration Modal */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={newCustomer => {
          loadCustomers();
          if (newCustomer) {
            setSelectedCustomerId(newCustomer.id);
          }
        }}
      />

      {/* Instant Printable Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        orderId={createdOrderId}
        onClose={() => {
          setIsInvoiceOpen(false);
          setCreatedOrderId(null);
        }}
      />
    </div>
  );
};
