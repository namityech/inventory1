export type UserRole = 'ADMIN' | 'INVENTORY_MANAGER' | 'STAFF';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
}

export type ExpiryCategory = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'SAFE';

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  product_count?: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active: number;
  product_count?: number;
  active_batches_count?: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  min_stock: number;
  image_url?: string | null;
  usable_stock: number;
  expired_stock: number;
  total_stock: number;
  earliest_usable_expiry?: string | null;
  batch_count?: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  expiryAlert: 'NONE' | 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'EXPIRED';
  inventory_value: number;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  batch_number: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  unit?: string;
  product_selling_price?: number;
  supplier_id?: string | null;
  supplier_name?: string | null;
  category_name?: string | null;
  quantity_received: number;
  remaining_quantity: number;
  manufacturing_date?: string | null;
  expiry_date: string;
  purchase_price: number;
  date_received: string;
  notes?: string | null;
  days_to_expiry: number;
  expiry_category: ExpiryCategory;
  is_expired: boolean;
  total_cost_value?: number;
  total_sales_value?: number;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'PURCHASE' | 'SALE' | 'USAGE' | 'DAMAGE' | 'DISPOSAL' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  transaction_code: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  batch_id?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  movement_type: MovementType;
  quantity: number;
  unit_price: number;
  total_value: number;
  user_id?: string | null;
  user_name?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  timestamp: string;
}

export interface ExpiryDisposal {
  id: string;
  batch_id?: string | null;
  batch_number?: string | null;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  total_loss: number;
  disposal_method: string;
  reason: string;
  disposed_by_id?: string | null;
  disposed_by_name?: string | null;
  reference_no: string;
  certificate_no: string;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_email?: string | null;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  order_date: string;
  expected_date?: string | null;
  total_amount: number;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  item_count?: number;
  items?: PurchaseOrderItem[];
}

export interface RestockRecommendation extends Product {
  deficit: number;
  suggested_quantity: number;
  estimated_cost: number;
  urgency: 'CRITICAL_OUT_OF_STOCK' | 'LOW_STOCK';
}

export interface InventoryNotification {
  id: string;
  title: string;
  message: string;
  type: 'EXPIRED' | 'CRITICAL_EXPIRY' | 'WARNING_EXPIRY' | 'UPCOMING_EXPIRY' | 'LOW_STOCK' | 'STOCK_ADJUSTMENT' | 'SYSTEM';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  product_id?: string | null;
  batch_id?: string | null;
  is_read: number;
  created_at: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalStockQuantity: number;
  usableStockQuantity: number;
  expiredStockQuantity: number;
  lowStockProductsCount: number;
  expiringSoonProductsCount: number;
  criticalExpiringCount: number;
  totalInventoryValue: number;
  stockAtRiskValue: number;
  expiredStockValue: number;
  historicalDisposalLoss: number;
  totalEstimatedExpiryLoss: number;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  details?: string | null;
  created_at: string;
}

export interface AppSettings {
  company_name: string;
  currency_symbol: string;
  fefo_enforced: string;
  critical_expiry_days: string;
  warning_expiry_days: string;
  upcoming_expiry_days: string;
}

export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type OrderStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'RETURNED';

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  customer_type: CustomerType;
  registration_date: string;
  notes?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  total_orders?: number;
  total_spent?: number;
  outstanding_balance?: number;
}

export interface CustomerProfile extends Customer {
  orders: Order[];
  payments: Payment[];
  frequently_purchased: {
    product_id: string;
    product_name: string;
    sku: string;
    total_quantity: number;
    total_spend: number;
  }[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  batch_id?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_code?: string | null;
  customer_type?: CustomerType | null;
  order_date: string;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_balance: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  user_id?: string | null;
  user_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
  items?: OrderItem[];
  payments?: Payment[];
  returns?: OrderReturn[];
}

export interface Payment {
  id: string;
  payment_number: string;
  order_id: string;
  order_number?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  payment_reference?: string | null;
  notes?: string | null;
  received_by_id?: string | null;
  received_by_name?: string | null;
  created_at: string;
}

export interface OrderReturn {
  id: string;
  return_number: string;
  order_id: string;
  order_number?: string;
  customer_id?: string | null;
  reason: string;
  refund_amount: number;
  refund_method?: string | null;
  processed_by_id?: string | null;
  processed_by_name?: string | null;
  return_date: string;
  notes?: string | null;
  created_at: string;
}

export interface SalesAnalytics {
  dailySales: number;
  dailyOrdersCount: number;
  weeklySales: number;
  monthlySales: number;
  totalOrders: number;
  totalRevenue: number;
  totalReceivables: number;
  bestSellingProducts: {
    product_id: string;
    product_name: string;
    sku: string;
    total_quantity: number;
    total_revenue: number;
  }[];
  topCustomers: {
    customer_id: string;
    customer_name: string;
    customer_code: string;
    customer_type: CustomerType;
    total_orders: number;
    total_spent: number;
    outstanding_balance: number;
  }[];
  salesTrends: {
    date: string;
    label: string;
    sales: number;
    orders: number;
  }[];
}
