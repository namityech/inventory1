import {
  User, Product, Batch, StockMovement, Category, Supplier,
  InventoryNotification, PurchaseOrder, RestockRecommendation,
  DashboardSummary, AuditLog, AppSettings,
  Customer, CustomerProfile, Order, Payment, OrderReturn, SalesAnalytics
} from '../types/inventory';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('inv_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-user-id'] = token;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    let errMsg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data.error) errMsg = data.error;
      else if (data.message) errMsg = data.message;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { email: string; password?: string; token?: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  register: (data: { name: string; email: string; password?: string; role?: string; phone?: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  forgotPassword: (email: string) =>
    request<{ message: string; temporaryPassword?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  updateProfile: (data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) =>
    request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Dashboard
  getDashboard: () =>
    request<{
      summary: DashboardSummary;
      expiryDistribution: { expired: number; critical: number; warning: number; upcoming: number; safe: number };
      monthlyMovements: Array<{ month: string; inward: number; outward: number; disposed: number }>;
      fastMoving: Array<{ id: string; name: string; sku: string; units_moved: number; revenue_generated: number }>;
      slowMoving: Array<{ id: string; name: string; sku: string; units_moved: number; revenue_generated: number }>;
      recentMovements: StockMovement[];
      urgentAlerts: InventoryNotification[];
      valuationByCategory: Array<{ category_name: string; color: string; product_count: number; total_value: number; total_units: number }>;
    }>('/dashboard'),

  // Products
  getProducts: (params?: { categoryId?: string; supplierId?: string; search?: string; status?: string; sortBy?: string; sortOrder?: string }) => {
    const q = new URLSearchParams();
    if (params?.categoryId) q.set('categoryId', params.categoryId);
    if (params?.supplierId) q.set('supplierId', params.supplierId);
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.sortBy) q.set('sortBy', params.sortBy);
    if (params?.sortOrder) q.set('sortOrder', params.sortOrder);
    return request<{ products: Product[] }>(`/products?${q.toString()}`);
  },

  getProduct: (id: string) =>
    request<{
      product: Product & {
        batches: Batch[];
        movements: StockMovement[];
        disposals: any[];
      };
    }>(`/products/${id}`),

  createProduct: (data: Partial<Product>) =>
    request<{ id: string; message: string }>('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateProduct: (id: string, data: Partial<Product>) =>
    request<{ message: string }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteProduct: (id: string) =>
    request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE'
    }),

  // Batches & Expiry
  getBatches: (params?: { status?: string; productId?: string; supplierId?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.productId) q.set('productId', params.productId);
    if (params?.supplierId) q.set('supplierId', params.supplierId);
    if (params?.search) q.set('search', params.search);
    return request<{ batches: Batch[] }>(`/batches?${q.toString()}`);
  },

  createBatch: (data: {
    product_id: string;
    batch_number: string;
    quantity: number;
    purchase_price?: number;
    expiry_date: string;
    manufacturing_date?: string;
    supplier_id?: string;
    date_received?: string;
    notes?: string;
  }) =>
    request<{ id: string; message: string }>('/batches', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  disposeBatch: (batchId: string, data: { quantity?: number; reason?: string; disposal_method?: string; notes?: string }) =>
    request<{ message: string; disposal: any }>(`/batches/${batchId}/dispose`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Stock movements & FEFO
  getStockMovements: (params?: { type?: string; productId?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.productId) q.set('productId', params.productId);
    if (params?.limit) q.set('limit', String(params.limit));
    return request<{ movements: StockMovement[] }>(`/stock-movements?${q.toString()}`);
  },

  recordMovement: (data: {
    product_id: string;
    batch_id?: string;
    movement_type: 'SALE' | 'USAGE' | 'DAMAGE' | 'ADJUSTMENT';
    quantity: number;
    unit_price?: number;
    reference_number?: string;
    notes?: string;
    use_fefo?: boolean;
  }) =>
    request<{ message: string; dispatched?: any[] }>('/stock-movements', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Restock & Purchase orders
  getRestockRecommendations: () =>
    request<{ recommendations: RestockRecommendation[] }>('/restock/recommendations'),

  getPurchaseOrders: () =>
    request<{ purchaseOrders: PurchaseOrder[] }>('/purchase-orders'),

  createPurchaseOrder: (data: {
    supplier_id?: string;
    expected_date?: string;
    notes?: string;
    items: Array<{ product_id: string; quantity: number; unit_price: number }>;
  }) =>
    request<{ id: string; po_number: string; message: string }>('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  receivePurchaseOrder: (id: string, data?: { batch_numbers?: Record<string, string>; expiry_dates?: Record<string, string> }) =>
    request<{ message: string }>(`/purchase-orders/${id}/receive`, {
      method: 'PUT',
      body: JSON.stringify(data || {})
    }),

  // Categories & Suppliers
  getCategories: () => request<{ categories: Category[] }>('/categories'),
  createCategory: (data: { name: string; description?: string; color?: string }) =>
    request<{ id: string; message: string }>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: { name: string; description?: string; color?: string }) =>
    request<{ message: string }>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),

  getSuppliers: () => request<{ suppliers: Supplier[] }>('/suppliers'),
  createSupplier: (data: Partial<Supplier>) =>
    request<{ id: string; message: string }>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Partial<Supplier>) =>
    request<{ message: string }>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id: string) => request<{ message: string }>(`/suppliers/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: (params?: { unreadOnly?: boolean; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.unreadOnly) q.set('unreadOnly', 'true');
    if (params?.type) q.set('type', params.type);
    return request<{ notifications: InventoryNotification[]; unreadCount: number }>(`/notifications?${q.toString()}`);
  },
  markNotificationRead: (id: string) =>
    request<{ message: string }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request<{ message: string }>('/notifications/mark-all-read', { method: 'POST' }),

  // Reports
  getAnalyticsReport: () =>
    request<{
      dailySummary: any;
      weeklyTrends: any[];
      detailedRisk: any[];
      frequentlyRestocked: any[];
      disposalAudit: any[];
    }>('/reports/analytics'),

  // Users & Admin
  getUsers: () => request<{ users: User[] }>('/users'),
  createUser: (data: any) => request<{ id: string; message: string }>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request<{ message: string }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getAuditLogs: () => request<{ logs: AuditLog[] }>('/audit-logs'),

  // Settings
  getSettings: () => request<{ settings: AppSettings }>('/settings'),
  updateSettings: (settings: Partial<AppSettings>) =>
    request<{ message: string }>('/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  resetDemoData: () => request<{ message: string }>('/system/reset-demo', { method: 'POST' }),

  // CRM Customers
  getCustomers: (params?: { search?: string; type?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    return request<{ customers: Customer[] }>(`/customers?${q.toString()}`);
  },
  getCustomer: (id: string) => request<{ customer: CustomerProfile }>(`/customers/${id}`),
  createCustomer: (data: Partial<Customer>) =>
    request<{ id: string; customer_code: string; message: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCustomer: (id: string, data: Partial<Customer>) =>
    request<{ message: string }>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleCustomerStatus: (id: string) =>
    request<{ message: string; is_active: number }>(`/customers/${id}/toggle-status`, { method: 'PATCH' }),

  // Sales & Orders (POS)
  getOrders: (params?: { search?: string; customer_id?: string; status?: string; payment_status?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.customer_id) q.set('customer_id', params.customer_id);
    if (params?.status) q.set('status', params.status);
    if (params?.payment_status) q.set('payment_status', params.payment_status);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    return request<{ orders: Order[] }>(`/orders?${q.toString()}`);
  },
  getOrder: (id: string) => request<{ order: Order }>(`/orders/${id}`),
  createOrder: (data: {
    customer_id?: string | null;
    items: Array<{ product_id: string; batch_id?: string | null; quantity: number; unit_price?: number; discount?: number }>;
    discount?: number;
    tax_rate?: number;
    payment_method: string;
    amount_paid: number;
    payment_reference?: string;
    notes?: string;
  }) => request<{
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    paidAmount: number;
    outstandingBalance: number;
    paymentStatus: string;
    itemsCount: number;
    message: string;
  }>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  recordPayment: (orderId: string, data: { amount: number; payment_method: string; payment_reference?: string; notes?: string }) =>
    request<{
      message: string;
      paymentNumber: string;
      newPaid: number;
      newBalance: number;
      paymentStatus: string;
    }>(`/orders/${orderId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  cancelOrder: (orderId: string, reason?: string) =>
    request<{ message: string }>(`/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  returnOrder: (orderId: string, data: { reason: string; refund_amount?: number; refund_method?: string; notes?: string }) =>
    request<{ message: string; returnNumber: string }>(`/orders/${orderId}/return`, { method: 'POST', body: JSON.stringify(data) }),
  getSalesAnalytics: () => request<{ analytics: SalesAnalytics }>('/sales/analytics')
};
