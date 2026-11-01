import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase, seedDatabase, refreshNotifications } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize database schema and initial data
initDatabase();

// Expiry utility helpers
function getDaysUntil(dateStr: string): number {
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);
  const target = new Date(dateStr);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExpiryCategory(days: number): 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'SAFE' {
  if (days < 0) return 'EXPIRED';
  if (days <= 7) return 'CRITICAL';
  if (days <= 30) return 'WARNING';
  if (days <= 60) return 'UPCOMING';
  return 'SAFE';
}

// Authentication middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'INVENTORY_MANAGER' | 'STAFF';
  };
}

function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers['x-user-id'] as string;

  let userId: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.substring(7);
  } else if (userIdHeader) {
    userId = userIdHeader;
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const user = db.prepare('SELECT id, email, name, role, phone, is_active FROM users WHERE id = ?').get(userId) as any;
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or inactive user' });
  }

  req.user = user;
  next();
}

function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges for this action' });
    }
    next();
  };
}

// Helper to log audit actions
function logAudit(userId: string | null, userName: string | null, action: string, entity: string, entityId: string | null, details: string) {
  try {
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, userName, action, entity, entityId, details, now);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
  }

  logAudit(user.id, user.name, 'USER_LOGIN', 'USER', user.id, `User logged in from ${req.ip}`);

  res.json({
    token: user.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role = 'STAFF', phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const validRole = ['ADMIN', 'INVENTORY_MANAGER', 'STAFF'].includes(role) ? role : 'STAFF';
  const hashedPassword = bcrypt.hashSync(password, 10);
  const id = `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, phone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, email.toLowerCase(), hashedPassword, name, validRole, phone || null, now, now);

  logAudit(id, name, 'USER_REGISTER', 'USER', id, `Registered as role: ${validRole}`);

  res.status(201).json({
    token: id,
    user: { id, email: email.toLowerCase(), name, role: validRole, phone }
  });
});

app.get('/api/auth/me', authenticate, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT id, name FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
  if (!user) {
    // Return friendly generic message
    return res.json({ message: 'If an account exists with this email, a reset password token has been generated.' });
  }

  // Set demo temporary password
  const tempPass = 'ResetPass123!';
  const newHash = bcrypt.hashSync(tempPass, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, new Date().toISOString(), user.id);

  logAudit(user.id, user.name, 'PASSWORD_RESET', 'USER', user.id, 'Temporary password reset issued');

  res.json({
    message: `Password reset successfully. Your temporary password is: ${tempPass}`,
    temporaryPassword: tempPass
  });
});

app.put('/api/auth/profile', authenticate, (req: AuthRequest, res) => {
  const { name, phone, currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;

  if (newPassword) {
    if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
  }

  const updatedName = name || user.name;
  const updatedPhone = phone !== undefined ? phone : user.phone;
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ?').run(updatedName, updatedPhone, now, user.id);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: updatedName,
      role: user.role,
      phone: updatedPhone
    }
  });
});

// ==========================================
// DASHBOARD & SUMMARY METRICS
// ==========================================

app.get('/api/dashboard', authenticate, (req: AuthRequest, res) => {
  refreshNotifications();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Products count
  const totalProducts = (db.prepare('SELECT count(*) as count FROM products').get() as any).count;

  // 2. Batches analysis
  const batches = db.prepare(`
    SELECT b.*, p.name as product_name, p.sku, p.category_id, p.min_stock
    FROM batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.remaining_quantity > 0
  `).all() as any[];

  let totalStockQuantity = 0;
  let usableStockQuantity = 0;
  let expiredStockQuantity = 0;
  let totalInventoryValue = 0;
  let stockAtRiskValue = 0;
  let expiredStockValue = 0;

  const expiryDistribution = {
    expired: 0,
    critical: 0,
    warning: 0,
    upcoming: 0,
    safe: 0
  };

  const productUsableStockMap: { [productId: string]: number } = {};

  for (const b of batches) {
    const days = getDaysUntil(b.expiry_date);
    const category = getExpiryCategory(days);
    const batchValue = b.remaining_quantity * b.purchase_price;

    totalStockQuantity += b.remaining_quantity;

    if (category === 'EXPIRED') {
      expiredStockQuantity += b.remaining_quantity;
      expiredStockValue += batchValue;
      expiryDistribution.expired += b.remaining_quantity;
    } else {
      usableStockQuantity += b.remaining_quantity;
      totalInventoryValue += batchValue;
      productUsableStockMap[b.product_id] = (productUsableStockMap[b.product_id] || 0) + b.remaining_quantity;

      if (category === 'CRITICAL') {
        stockAtRiskValue += batchValue;
        expiryDistribution.critical += b.remaining_quantity;
      } else if (category === 'WARNING') {
        stockAtRiskValue += batchValue;
        expiryDistribution.warning += b.remaining_quantity;
      } else if (category === 'UPCOMING') {
        expiryDistribution.upcoming += b.remaining_quantity;
      } else {
        expiryDistribution.safe += b.remaining_quantity;
      }
    }
  }

  // Disposed stock historical losses
  const historicalDisposalLoss = (db.prepare('SELECT COALESCE(SUM(total_loss), 0) as total FROM expiry_disposals').get() as any).total;
  const totalEstimatedExpiryLoss = expiredStockValue + historicalDisposalLoss;

  // Low stock products count
  const allProducts = db.prepare('SELECT id, min_stock FROM products').all() as any[];
  let lowStockProductsCount = 0;
  for (const p of allProducts) {
    const usable = productUsableStockMap[p.id] || 0;
    if (usable <= p.min_stock) {
      lowStockProductsCount++;
    }
  }

  // Monthly stock movement (last 6 months)
  const monthlyMovements = db.prepare(`
    SELECT
      strftime('%Y-%m', timestamp) as month,
      SUM(CASE WHEN movement_type = 'PURCHASE' THEN quantity ELSE 0 END) as inward,
      SUM(CASE WHEN movement_type IN ('SALE', 'USAGE') THEN quantity ELSE 0 END) as outward,
      SUM(CASE WHEN movement_type IN ('DAMAGE', 'DISPOSAL') THEN quantity ELSE 0 END) as disposed
    FROM stock_movements
    WHERE timestamp >= date('now', '-6 month')
    GROUP BY strftime('%Y-%m', timestamp)
    ORDER BY month ASC
  `).all();

  // Fast-moving vs slow-moving products
  const productMovementStats = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.sku,
      COALESCE(SUM(CASE WHEN sm.movement_type IN ('SALE', 'USAGE') THEN sm.quantity ELSE 0 END), 0) as units_moved,
      COALESCE(SUM(CASE WHEN sm.movement_type IN ('SALE', 'USAGE') THEN sm.total_value ELSE 0 END), 0) as revenue_generated
    FROM products p
    LEFT JOIN stock_movements sm ON p.id = sm.product_id AND sm.timestamp >= date('now', '-30 day')
    GROUP BY p.id
    ORDER BY units_moved DESC
  `).all() as any[];

  const fastMoving = productMovementStats.slice(0, 5);
  const slowMoving = [...productMovementStats].reverse().slice(0, 5);

  // Recent transactions
  const recentMovements = db.prepare(`
    SELECT sm.*, p.name as product_name, p.sku, p.unit
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    ORDER BY sm.timestamp DESC
    LIMIT 6
  `).all();

  // Urgent alerts
  const urgentAlerts = db.prepare(`
    SELECT * FROM notifications
    WHERE is_read = 0 AND severity = 'CRITICAL'
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  // Stock valuation by category
  const valuationByCategory = db.prepare(`
    SELECT
      c.name as category_name,
      c.color,
      COUNT(DISTINCT p.id) as product_count,
      COALESCE(SUM(b.remaining_quantity * b.purchase_price), 0) as total_value,
      COALESCE(SUM(b.remaining_quantity), 0) as total_units
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    LEFT JOIN batches b ON p.id = b.product_id AND b.remaining_quantity > 0 AND b.expiry_date >= ?
    GROUP BY c.id
    ORDER BY total_value DESC
  `).all(todayStr);

  res.json({
    summary: {
      totalProducts,
      totalStockQuantity,
      usableStockQuantity,
      expiredStockQuantity,
      lowStockProductsCount,
      expiringSoonProductsCount: expiryDistribution.critical + expiryDistribution.warning,
      criticalExpiringCount: expiryDistribution.critical,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      stockAtRiskValue: Math.round(stockAtRiskValue * 100) / 100,
      expiredStockValue: Math.round(expiredStockValue * 100) / 100,
      historicalDisposalLoss: Math.round(historicalDisposalLoss * 100) / 100,
      totalEstimatedExpiryLoss: Math.round(totalEstimatedExpiryLoss * 100) / 100,
    },
    expiryDistribution,
    monthlyMovements,
    fastMoving,
    slowMoving,
    recentMovements,
    urgentAlerts,
    valuationByCategory
  });
});

// ==========================================
// PRODUCTS API
// ==========================================

app.get('/api/products', authenticate, (req: AuthRequest, res) => {
  const { categoryId, supplierId, search, status, sortBy = 'name', sortOrder = 'asc' } = req.query;
  const todayStr = new Date().toISOString().split('T')[0];

  let query = `
    SELECT
      p.*,
      c.name as category_name,
      c.color as category_color,
      s.name as supplier_name,
      COALESCE((SELECT SUM(remaining_quantity) FROM batches WHERE product_id = p.id AND remaining_quantity > 0 AND expiry_date >= ?), 0) as usable_stock,
      COALESCE((SELECT SUM(remaining_quantity) FROM batches WHERE product_id = p.id AND remaining_quantity > 0 AND expiry_date < ?), 0) as expired_stock,
      COALESCE((SELECT SUM(remaining_quantity) FROM batches WHERE product_id = p.id AND remaining_quantity > 0), 0) as total_stock,
      COALESCE((SELECT MIN(expiry_date) FROM batches WHERE product_id = p.id AND remaining_quantity > 0 AND expiry_date >= ?), NULL) as earliest_usable_expiry,
      COALESCE((SELECT COUNT(*) FROM batches WHERE product_id = p.id AND remaining_quantity > 0), 0) as batch_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [todayStr, todayStr, todayStr];

  if (categoryId) {
    query += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (supplierId) {
    query += ' AND p.supplier_id = ?';
    params.push(supplierId);
  }

  if (search) {
    query += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.barcode) LIKE ?)';
    const s = `%${(search as string).toLowerCase()}%`;
    params.push(s, s, s);
  }

  const products = db.prepare(query).all(...params) as any[];

  // Enhance each product with computed stock status and expiry status
  const enhanced = products.map(p => {
    let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
    if (p.usable_stock === 0) {
      stockStatus = 'OUT_OF_STOCK';
    } else if (p.usable_stock <= p.min_stock) {
      stockStatus = 'LOW_STOCK';
    }

    let expiryAlert: 'NONE' | 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'EXPIRED' = 'NONE';
    if (p.earliest_usable_expiry) {
      const days = getDaysUntil(p.earliest_usable_expiry);
      if (days <= 7) {
        expiryAlert = 'CRITICAL';
      } else if (days <= 30) {
        expiryAlert = 'WARNING';
      } else if (days <= 60) {
        expiryAlert = 'UPCOMING';
      }
    }
    if (p.expired_stock > 0 && expiryAlert === 'NONE') {
      expiryAlert = 'EXPIRED';
    }

    return {
      ...p,
      stockStatus,
      expiryAlert,
      inventory_value: Math.round(p.usable_stock * p.purchase_price * 100) / 100
    };
  });

  // Client-side filtering if status filter is applied
  let filtered = enhanced;
  if (status === 'low_stock') {
    filtered = filtered.filter(p => p.stockStatus === 'LOW_STOCK');
  } else if (status === 'out_of_stock') {
    filtered = filtered.filter(p => p.stockStatus === 'OUT_OF_STOCK');
  } else if (status === 'expiring_soon') {
    filtered = filtered.filter(p => ['CRITICAL', 'WARNING'].includes(p.expiryAlert));
  } else if (status === 'has_expired') {
    filtered = filtered.filter(p => p.expired_stock > 0);
  }

  // Sorting
  filtered.sort((a, b) => {
    let valA = a[sortBy as string];
    let valB = b[sortBy as string];
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = (valB || '').toLowerCase();
    }
    if (sortOrder === 'desc') {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
    return valA > valB ? 1 : valA < valB ? -1 : 0;
  });

  res.json({ products: filtered });
});

app.get('/api/products/:id', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const todayStr = new Date().toISOString().split('T')[0];

  const product = db.prepare(`
    SELECT
      p.*,
      c.name as category_name,
      c.color as category_color,
      s.name as supplier_name,
      s.contact_person as supplier_contact,
      s.phone as supplier_phone,
      s.email as supplier_email
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.id = ?
  `).get(id) as any;

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const batches = db.prepare(`
    SELECT b.*, s.name as supplier_name
    FROM batches b
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    WHERE b.product_id = ?
    ORDER BY b.expiry_date ASC
  `).all(id) as any[];

  const enhancedBatches = batches.map(b => {
    const days = getDaysUntil(b.expiry_date);
    return {
      ...b,
      days_to_expiry: days,
      expiry_category: getExpiryCategory(days),
      is_expired: days < 0,
      batch_value: Math.round(b.remaining_quantity * b.purchase_price * 100) / 100
    };
  });

  const movements = db.prepare(`
    SELECT * FROM stock_movements
    WHERE product_id = ?
    ORDER BY timestamp DESC
    LIMIT 20
  `).all(id);

  const disposals = db.prepare(`
    SELECT * FROM expiry_disposals
    WHERE product_id = ?
    ORDER BY created_at DESC
  `).all(id);

  const usableStock = enhancedBatches
    .filter(b => !b.is_expired)
    .reduce((acc, b) => acc + b.remaining_quantity, 0);

  const expiredStock = enhancedBatches
    .filter(b => b.is_expired)
    .reduce((acc, b) => acc + b.remaining_quantity, 0);

  res.json({
    product: {
      ...product,
      usable_stock: usableStock,
      expired_stock: expiredStock,
      total_stock: usableStock + expiredStock,
      inventory_value: Math.round(usableStock * product.purchase_price * 100) / 100,
      batches: enhancedBatches,
      movements,
      disposals
    }
  });
});

app.post('/api/products', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { name, sku, barcode, description, category_id, supplier_id, unit = 'units', purchase_price = 0, selling_price = 0, min_stock = 10, image_url } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ error: 'Product name and SKU are required' });
  }

  const existingSku = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?)').get(sku);
  if (existingSku) {
    return res.status(400).json({ error: 'A product with this SKU already exists' });
  }

  const id = `prod-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO products (id, name, sku, barcode, description, category_id, supplier_id, unit, purchase_price, selling_price, min_stock, image_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, sku.toUpperCase(), barcode || null, description || null, category_id || null, supplier_id || null, unit, Number(purchase_price), Number(selling_price), Number(min_stock), image_url || null, now, now);

  logAudit(req.user!.id, req.user!.name, 'CREATE_PRODUCT', 'PRODUCT', id, `Created product "${name}" (SKU: ${sku})`);

  res.status(201).json({ id, message: 'Product created successfully' });
});

app.put('/api/products/:id', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, sku, barcode, description, category_id, supplier_id, unit, purchase_price, selling_price, min_stock, image_url } = req.body;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (sku && sku.toLowerCase() !== existing.sku.toLowerCase()) {
    const dupSku = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND id != ?').get(sku, id);
    if (dupSku) {
      return res.status(400).json({ error: 'SKU is already in use by another product' });
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE products
    SET name = ?, sku = ?, barcode = ?, description = ?, category_id = ?, supplier_id = ?, unit = ?, purchase_price = ?, selling_price = ?, min_stock = ?, image_url = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    sku ? sku.toUpperCase() : existing.sku,
    barcode !== undefined ? barcode : existing.barcode,
    description !== undefined ? description : existing.description,
    category_id !== undefined ? category_id : existing.category_id,
    supplier_id !== undefined ? supplier_id : existing.supplier_id,
    unit || existing.unit,
    purchase_price !== undefined ? Number(purchase_price) : existing.purchase_price,
    selling_price !== undefined ? Number(selling_price) : existing.selling_price,
    min_stock !== undefined ? Number(min_stock) : existing.min_stock,
    image_url !== undefined ? image_url : existing.image_url,
    now,
    id
  );

  logAudit(req.user!.id, req.user!.name, 'UPDATE_PRODUCT', 'PRODUCT', id, `Updated product "${name || existing.name}"`);

  res.json({ message: 'Product updated successfully' });
});

app.delete('/api/products/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const activeBatchCount = (db.prepare('SELECT count(*) as count FROM batches WHERE product_id = ? AND remaining_quantity > 0').get(id) as any).count;
  if (activeBatchCount > 0) {
    return res.status(400).json({ error: `Cannot delete product with active inventory. There are ${activeBatchCount} batches with remaining stock. Dispose or zero stock first.` });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(id);

  logAudit(req.user!.id, req.user!.name, 'DELETE_PRODUCT', 'PRODUCT', id, `Deleted product "${product.name}" (${product.sku})`);

  res.json({ message: 'Product deleted successfully' });
});

// ==========================================
// BATCHES & EXPIRY MANAGEMENT API
// ==========================================

app.get('/api/batches', authenticate, (req: AuthRequest, res) => {
  const { status, productId, supplierId, search } = req.query;

  let query = `
    SELECT b.*, p.name as product_name, p.sku, p.unit, p.selling_price as product_selling_price, s.name as supplier_name, c.name as category_name
    FROM batches b
    JOIN products p ON b.product_id = p.id
    LEFT JOIN suppliers s ON b.supplier_id = s.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (productId) {
    query += ' AND b.product_id = ?';
    params.push(productId);
  }

  if (supplierId) {
    query += ' AND b.supplier_id = ?';
    params.push(supplierId);
  }

  if (search) {
    query += ' AND (LOWER(b.batch_number) LIKE ? OR LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ?)';
    const s = `%${(search as string).toLowerCase()}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY b.expiry_date ASC';

  const batches = db.prepare(query).all(...params) as any[];

  const enhanced = batches.map(b => {
    const days = getDaysUntil(b.expiry_date);
    const category = getExpiryCategory(days);
    return {
      ...b,
      days_to_expiry: days,
      expiry_category: category,
      is_expired: days < 0,
      total_cost_value: Math.round(b.remaining_quantity * b.purchase_price * 100) / 100,
      total_sales_value: Math.round(b.remaining_quantity * b.product_selling_price * 100) / 100
    };
  });

  let filtered = enhanced;
  if (status && status !== 'all') {
    if (status === 'expired') filtered = filtered.filter(b => b.is_expired && b.remaining_quantity > 0);
    else if (status === 'critical') filtered = filtered.filter(b => b.expiry_category === 'CRITICAL' && b.remaining_quantity > 0);
    else if (status === 'warning') filtered = filtered.filter(b => b.expiry_category === 'WARNING' && b.remaining_quantity > 0);
    else if (status === 'upcoming') filtered = filtered.filter(b => b.expiry_category === 'UPCOMING' && b.remaining_quantity > 0);
    else if (status === 'safe') filtered = filtered.filter(b => b.expiry_category === 'SAFE' && b.remaining_quantity > 0);
    else if (status === 'active') filtered = filtered.filter(b => b.remaining_quantity > 0);
    else if (status === 'depleted') filtered = filtered.filter(b => b.remaining_quantity === 0);
  }

  res.json({ batches: filtered });
});

app.post('/api/batches', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { product_id, batch_number, quantity, purchase_price, expiry_date, manufacturing_date, supplier_id, date_received, notes } = req.body;

  if (!product_id || !batch_number || !quantity || !expiry_date) {
    return res.status(400).json({ error: 'Product, Batch Number, Quantity, and Expiry Date are required' });
  }

  const numQty = parseInt(quantity, 10);
  if (numQty <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any;
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const batchId = `bat-${Date.now()}`;
  const now = new Date().toISOString();
  const effectivePrice = purchase_price ? Number(purchase_price) : product.purchase_price;
  const receivedDate = date_received || now.split('T')[0];

  // Transaction for batch and incoming stock movement
  const insertBatchTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO batches (id, batch_number, product_id, supplier_id, quantity_received, remaining_quantity, manufacturing_date, expiry_date, purchase_price, date_received, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      batchId,
      batch_number.trim(),
      product_id,
      supplier_id || product.supplier_id || null,
      numQty,
      numQty,
      manufacturing_date || null,
      expiry_date,
      effectivePrice,
      receivedDate,
      notes || null,
      now,
      now
    );

    const movId = `mov-${Date.now()}`;
    const txCode = `TX-IN-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO stock_movements (id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value, user_id, user_name, reference_number, notes, timestamp)
      VALUES (?, ?, ?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      movId,
      txCode,
      product_id,
      batchId,
      numQty,
      effectivePrice,
      numQty * effectivePrice,
      req.user!.id,
      req.user!.name,
      `BATCH-${batch_number}`,
      `Incoming delivery batch for ${product.name}`,
      now
    );
  });

  insertBatchTx();

  refreshNotifications();
  logAudit(req.user!.id, req.user!.name, 'ADD_BATCH', 'BATCH', batchId, `Added batch ${batch_number} (+${numQty} units) for ${product.name}`);

  res.status(201).json({ id: batchId, message: 'Batch recorded successfully and added to stock' });
});

// DISPOSE EXPIRED OR DAMAGED BATCH STOCK
app.post('/api/batches/:id/dispose', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { quantity, reason = 'Expired statutory shelf life', disposal_method = 'Incineration', notes } = req.body;

  const batch = db.prepare(`
    SELECT b.*, p.name as product_name, p.sku
    FROM batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.id = ?
  `).get(id) as any;

  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  const disposeQty = quantity ? parseInt(quantity, 10) : batch.remaining_quantity;
  if (disposeQty <= 0 || disposeQty > batch.remaining_quantity) {
    return res.status(400).json({ error: `Invalid disposal quantity. Maximum available in batch is ${batch.remaining_quantity}.` });
  }

  const totalLoss = disposeQty * batch.purchase_price;
  const now = new Date().toISOString();
  const disposalId = `disp-${Date.now()}`;
  const refNo = `DISP-${Date.now().toString().slice(-6)}`;
  const certNo = `CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const disposeTx = db.transaction(() => {
    // 1. Reduce remaining quantity in batch
    db.prepare('UPDATE batches SET remaining_quantity = remaining_quantity - ?, updated_at = ? WHERE id = ?')
      .run(disposeQty, now, id);

    // 2. Record disposal record
    db.prepare(`
      INSERT INTO expiry_disposals (id, batch_id, product_id, quantity, unit_cost, total_loss, disposal_method, reason, disposed_by_id, disposed_by_name, reference_no, certificate_no, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      disposalId,
      id,
      batch.product_id,
      disposeQty,
      batch.purchase_price,
      totalLoss,
      disposal_method,
      reason + (notes ? ` (${notes})` : ''),
      req.user!.id,
      req.user!.name,
      refNo,
      certNo,
      now
    );

    // 3. Record stock movement
    const movId = `mov-${Date.now()}`;
    const txCode = `TX-WST-${Date.now().toString().slice(-6)}`;
    db.prepare(`
      INSERT INTO stock_movements (id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value, user_id, user_name, reference_number, notes, timestamp)
      VALUES (?, ?, ?, ?, 'DISPOSAL', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      movId,
      txCode,
      batch.product_id,
      id,
      disposeQty,
      batch.purchase_price,
      totalLoss,
      req.user!.id,
      req.user!.name,
      refNo,
      `Expired/waste stock disposal via ${disposal_method}. Cert: ${certNo}`,
      now
    );
  });

  disposeTx();

  refreshNotifications();
  logAudit(req.user!.id, req.user!.name, 'DISPOSE_BATCH', 'BATCH', id, `Disposed ${disposeQty} expired units of ${batch.product_name} (Batch: ${batch.batch_number}). Loss: $${totalLoss.toFixed(2)}`);

  res.json({
    message: 'Expired stock successfully written off and recorded in disposal audit ledger',
    disposal: {
      id: disposalId,
      reference_no: refNo,
      certificate_no: certNo,
      total_loss: totalLoss,
      quantity: disposeQty
    }
  });
});

// ==========================================
// STOCK MOVEMENTS & FEFO DISPATCH
// ==========================================

app.get('/api/stock-movements', authenticate, (req: AuthRequest, res) => {
  const { type, productId, limit = 50 } = req.query;

  let query = `
    SELECT sm.*, p.name as product_name, p.sku, p.unit, b.batch_number, b.expiry_date
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN batches b ON sm.batch_id = b.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (type) {
    query += ' AND sm.movement_type = ?';
    params.push(type);
  }

  if (productId) {
    query += ' AND sm.product_id = ?';
    params.push(productId);
  }

  query += ' ORDER BY sm.timestamp DESC LIMIT ?';
  params.push(parseInt(limit as string, 10));

  const movements = db.prepare(query).all(...params);
  res.json({ movements });
});

/**
 * Record stock movement.
 * CRITICAL FEFO IMPLEMENTATION:
 * When movement_type is 'SALE' or 'USAGE', it enforces:
 * - Expired batches cannot be dispatched.
 * - If FEFO is requested (or batch not specified), greedily picks the earliest expiring unexpired batch.
 */
app.post('/api/stock-movements', authenticate, (req: AuthRequest, res) => {
  const { product_id, batch_id, movement_type, quantity, unit_price, reference_number, notes, use_fefo = true } = req.body;

  if (!product_id || !movement_type || !quantity) {
    return res.status(400).json({ error: 'Product, movement type, and quantity are required' });
  }

  const numQty = parseInt(quantity, 10);
  if (numQty <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than zero' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any;
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Handle Outgoing: SALE or USAGE
  if (['SALE', 'USAGE'].includes(movement_type)) {
    const effectiveUnitPrice = unit_price !== undefined ? Number(unit_price) : product.selling_price;

    // Check if user selected a specific batch
    if (batch_id && !use_fefo) {
      const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batch_id) as any;
      if (!batch) {
        return res.status(404).json({ error: 'Selected batch not found' });
      }

      // Check expiry: EXPIRED BATCHES MUST NEVER BE SOLD OR ISSUED!
      if (batch.expiry_date < todayStr) {
        return res.status(400).json({
          error: `FEFO Violation: Batch ${batch.batch_number} expired on ${batch.expiry_date}. Expired inventory is quarantined and cannot be issued or sold!`
        });
      }

      if (batch.remaining_quantity < numQty) {
        return res.status(400).json({
          error: `Insufficient stock in Batch ${batch.batch_number}. Available: ${batch.remaining_quantity}, requested: ${numQty}.`
        });
      }

      const txCode = `TX-${movement_type.slice(0, 3)}-${Date.now().toString().slice(-6)}`;
      const movId = `mov-${Date.now()}`;

      const singleTx = db.transaction(() => {
        db.prepare('UPDATE batches SET remaining_quantity = remaining_quantity - ?, updated_at = ? WHERE id = ?')
          .run(numQty, now, batch_id);

        db.prepare(`
          INSERT INTO stock_movements (id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value, user_id, user_name, reference_number, notes, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          movId,
          txCode,
          product_id,
          batch_id,
          movement_type,
          numQty,
          effectiveUnitPrice,
          numQty * effectiveUnitPrice,
          req.user!.id,
          req.user!.name,
          reference_number || null,
          notes || `Dispatched from batch ${batch.batch_number}`,
          now
        );
      });

      singleTx();

      refreshNotifications();
      logAudit(req.user!.id, req.user!.name, `RECORD_${movement_type}`, 'STOCK_MOVEMENT', movId, `${movement_type} of ${numQty} units of ${product.name} from Batch ${batch.batch_number}`);

      return res.status(201).json({
        message: `${movement_type} recorded successfully`,
        dispatched: [{ batch_number: batch.batch_number, quantity: numQty, expiry_date: batch.expiry_date }]
      });
    }

    // AUTOMATIC FEFO ALLOCATION:
    // Query active unexpired batches sorted strictly by earliest expiry date first
    const candidateBatches = db.prepare(`
      SELECT * FROM batches
      WHERE product_id = ? AND remaining_quantity > 0 AND expiry_date >= ?
      ORDER BY expiry_date ASC, date_received ASC
    `).all(product_id, todayStr) as any[];

    const totalAvailableUsable = candidateBatches.reduce((acc, b) => acc + b.remaining_quantity, 0);
    if (totalAvailableUsable < numQty) {
      return res.status(400).json({
        error: `Insufficient usable stock for ${product.name}. Usable unexpired stock: ${totalAvailableUsable} ${product.unit}, Requested: ${numQty} ${product.unit}. Note: Expired stock is excluded from dispatch.`
      });
    }

    let remainingToFulfill = numQty;
    const allocations: Array<{ batch: any; qty: number }> = [];

    for (const b of candidateBatches) {
      if (remainingToFulfill <= 0) break;
      const take = Math.min(b.remaining_quantity, remainingToFulfill);
      allocations.push({ batch: b, qty: take });
      remainingToFulfill -= take;
    }

    const fefoTx = db.transaction(() => {
      for (const item of allocations) {
        const movId = `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const txCode = `TX-${movement_type.slice(0, 3)}-${Date.now().toString().slice(-5)}-${item.batch.batch_number.slice(-3)}`;

        db.prepare('UPDATE batches SET remaining_quantity = remaining_quantity - ?, updated_at = ? WHERE id = ?')
          .run(item.qty, now, item.batch.id);

        db.prepare(`
          INSERT INTO stock_movements (id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value, user_id, user_name, reference_number, notes, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          movId,
          txCode,
          product_id,
          item.batch.id,
          movement_type,
          item.qty,
          effectiveUnitPrice,
          item.qty * effectiveUnitPrice,
          req.user!.id,
          req.user!.name,
          reference_number || null,
          `FEFO automatic allocation (Batch ${item.batch.batch_number}, exp: ${item.batch.expiry_date}). ${notes || ''}`.trim(),
          now
        );
      }
    });

    fefoTx();

    refreshNotifications();
    logAudit(req.user!.id, req.user!.name, `FEFO_${movement_type}`, 'STOCK_MOVEMENT', product_id, `FEFO ${movement_type}: ${numQty} units across ${allocations.length} batches`);

    return res.status(201).json({
      message: `${movement_type} fulfilled using First Expired, First Out (FEFO) principle`,
      dispatched: allocations.map(a => ({
        batch_number: a.batch.batch_number,
        quantity: a.qty,
        expiry_date: a.batch.expiry_date
      }))
    });
  }

  // Handle DAMAGE or ADJUSTMENT
  if (['DAMAGE', 'ADJUSTMENT'].includes(movement_type)) {
    if (!batch_id) {
      return res.status(400).json({ error: 'Batch selection is required for damage or stock adjustment' });
    }
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batch_id) as any;
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (numQty > batch.remaining_quantity) {
      return res.status(400).json({ error: `Adjustment quantity (${numQty}) exceeds batch balance (${batch.remaining_quantity})` });
    }

    const movId = `mov-${Date.now()}`;
    const txCode = `TX-ADJ-${Date.now().toString().slice(-6)}`;
    const totalVal = numQty * batch.purchase_price;

    const adjustTx = db.transaction(() => {
      db.prepare('UPDATE batches SET remaining_quantity = remaining_quantity - ?, updated_at = ? WHERE id = ?')
        .run(numQty, now, batch_id);

      db.prepare(`
        INSERT INTO stock_movements (id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value, user_id, user_name, reference_number, notes, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        movId,
        txCode,
        product_id,
        batch_id,
        movement_type,
        numQty,
        batch.purchase_price,
        totalVal,
        req.user!.id,
        req.user!.name,
        reference_number || null,
        notes || `${movement_type} on batch ${batch.batch_number}`,
        now
      );
    });

    adjustTx();

    refreshNotifications();
    logAudit(req.user!.id, req.user!.name, movement_type, 'BATCH', batch_id, `${movement_type}: -${numQty} units on Batch ${batch.batch_number}`);

    return res.status(201).json({ message: `${movement_type} recorded successfully` });
  }

  return res.status(400).json({ error: 'Unsupported movement type' });
});

// ==========================================
// RESTOCKING & PURCHASE ORDERS
// ==========================================

app.get('/api/restock/recommendations', authenticate, (req: AuthRequest, res) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const products = db.prepare(`
    SELECT
      p.*,
      c.name as category_name,
      s.name as supplier_name,
      s.email as supplier_email,
      COALESCE((SELECT SUM(remaining_quantity) FROM batches WHERE product_id = p.id AND remaining_quantity > 0 AND expiry_date >= ?), 0) as usable_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
  `).all(todayStr) as any[];

  // Filter low stock and calculate replenishment recommendations
  const recommendations = products
    .filter(p => p.usable_stock <= p.min_stock)
    .map(p => {
      const deficit = p.min_stock - p.usable_stock;
      const suggestedReorder = Math.max(p.min_stock * 2 - p.usable_stock, p.min_stock);
      const estimatedCost = Math.round(suggestedReorder * p.purchase_price * 100) / 100;

      return {
        ...p,
        deficit,
        suggested_quantity: suggestedReorder,
        estimated_cost: estimatedCost,
        urgency: p.usable_stock === 0 ? 'CRITICAL_OUT_OF_STOCK' : 'LOW_STOCK'
      };
    })
    .sort((a, b) => (a.usable_stock === 0 ? -1 : 1));

  res.json({ recommendations });
});

app.get('/api/purchase-orders', authenticate, (req: AuthRequest, res) => {
  const pos = db.prepare(`
    SELECT po.*, s.name as supplier_name, s.email as supplier_email,
      (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) as item_count
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.created_at DESC
  `).all() as any[];

  const detailed = pos.map(po => {
    const items = db.prepare(`
      SELECT poi.*, p.name as product_name, p.sku, p.unit
      FROM purchase_order_items poi
      JOIN products p ON poi.product_id = p.id
      WHERE poi.po_id = ?
    `).all(po.id);

    return { ...po, items };
  });

  res.json({ purchaseOrders: detailed });
});

app.post('/api/purchase-orders', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { supplier_id, expected_date, notes, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Purchase order must contain at least one item' });
  }

  const poId = `po-${Date.now()}`;
  const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();
  const orderDate = now.split('T')[0];

  let totalAmount = 0;
  for (const it of items) {
    totalAmount += Number(it.quantity) * Number(it.unit_price);
  }

  const createPoTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO purchase_orders (id, po_number, supplier_id, status, order_date, expected_date, total_amount, notes, created_by, created_at)
      VALUES (?, ?, ?, 'ORDERED', ?, ?, ?, ?, ?, ?)
    `).run(poId, poNumber, supplier_id || null, orderDate, expected_date || null, totalAmount, notes || null, req.user!.name, now);

    for (const it of items) {
      const poiId = `poi-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO purchase_order_items (id, po_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(poiId, poId, it.product_id, it.quantity, it.unit_price, Number(it.quantity) * Number(it.unit_price));
    }
  });

  createPoTx();

  logAudit(req.user!.id, req.user!.name, 'CREATE_PURCHASE_ORDER', 'PURCHASE_ORDER', poId, `Created ${poNumber} with ${items.length} items. Total: $${totalAmount.toFixed(2)}`);

  res.status(201).json({ id: poId, po_number: poNumber, message: 'Purchase Order created successfully' });
});

// RECEIVE PURCHASE ORDER (Generates incoming batch automatically)
app.put('/api/purchase-orders/:id/receive', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { batch_numbers, expiry_dates } = req.body;

  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
  if (!po) {
    return res.status(404).json({ error: 'Purchase order not found' });
  }

  if (po.status === 'RECEIVED') {
    return res.status(400).json({ error: 'Purchase order has already been received' });
  }

  const items = db.prepare('SELECT * FROM purchase_order_items WHERE po_id = ?').all(id) as any[];
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  const receiveTx = db.transaction(() => {
    db.prepare("UPDATE purchase_orders SET status = 'RECEIVED' WHERE id = ?").run(id);

    items.forEach((item, idx) => {
      const batchNum = (batch_numbers && batch_numbers[item.product_id]) || `PO-${po.po_number.slice(-4)}-B${idx + 1}`;
      // Default expiry date 1 year from now if not specified
      const expDate = (expiry_dates && expiry_dates[item.product_id]) ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const batchId = `bat-po-${Date.now()}-${idx}`;
      db.prepare(`
        INSERT INTO batches (id, batch_number, product_id, supplier_id, quantity_received, remaining_quantity, expiry_date, purchase_price, date_received, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        batchId,
        batchNum,
        item.product_id,
        po.supplier_id,
        item.quantity,
        item.quantity,
        expDate,
        item.unit_price,
        todayStr,
        `Received against ${po.po_number}`,
        now,
        now
      );

      // Record incoming movement
      const movId = `mov-po-${Date.now()}-${idx}`;
      const txCode = `TX-REC-${Date.now().toString().slice(-5)}-${idx}`;
      db.prepare(`
        INSERT INTO stock_movements (id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value, user_id, user_name, reference_number, notes, timestamp)
        VALUES (?, ?, ?, ?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        movId,
        txCode,
        item.product_id,
        batchId,
        item.quantity,
        item.unit_price,
        item.total_price,
        req.user!.id,
        req.user!.name,
        po.po_number,
        `Received delivery for Purchase Order ${po.po_number}`,
        now
      );
    });
  });

  receiveTx();

  refreshNotifications();
  logAudit(req.user!.id, req.user!.name, 'RECEIVE_PURCHASE_ORDER', 'PURCHASE_ORDER', id, `Received PO ${po.po_number} and created batches`);

  res.json({ message: `Purchase order ${po.po_number} received and stocked into inventory!` });
});

// ==========================================
// CATEGORIES & SUPPLIERS
// ==========================================

app.get('/api/categories', authenticate, (req: AuthRequest, res) => {
  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products WHERE category_id = c.id) as product_count
    FROM categories c
    ORDER BY c.name ASC
  `).all();
  res.json({ categories });
});

app.post('/api/categories', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { name, description, color = '#0d9488' } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const id = `cat-${Date.now()}`;
  db.prepare('INSERT INTO categories (id, name, description, color, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name.trim(), description || null, color, new Date().toISOString());

  logAudit(req.user!.id, req.user!.name, 'CREATE_CATEGORY', 'CATEGORY', id, `Created category "${name}"`);
  res.status(201).json({ id, message: 'Category created' });
});

app.put('/api/categories/:id', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, description, color } = req.body;
  db.prepare('UPDATE categories SET name = ?, description = ?, color = ? WHERE id = ?')
    .run(name, description, color, id);
  res.json({ message: 'Category updated' });
});

app.delete('/api/categories/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ message: 'Category deleted' });
});

app.get('/api/suppliers', authenticate, (req: AuthRequest, res) => {
  const suppliers = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM products WHERE supplier_id = s.id) as product_count,
      (SELECT COUNT(*) FROM batches WHERE supplier_id = s.id AND remaining_quantity > 0) as active_batches_count
    FROM suppliers s
    ORDER BY s.name ASC
  `).all();
  res.json({ suppliers });
});

app.post('/api/suppliers', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { name, contact_person, phone, email, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });

  const id = `sup-${Date.now()}`;
  db.prepare(`
    INSERT INTO suppliers (id, name, contact_person, phone, email, address, notes, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, name.trim(), contact_person || null, phone || null, email || null, address || null, notes || null, new Date().toISOString());

  logAudit(req.user!.id, req.user!.name, 'CREATE_SUPPLIER', 'SUPPLIER', id, `Created supplier "${name}"`);
  res.status(201).json({ id, message: 'Supplier created' });
});

app.put('/api/suppliers/:id', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, contact_person, phone, email, address, notes, is_active } = req.body;
  db.prepare(`
    UPDATE suppliers
    SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, notes = ?, is_active = ?
    WHERE id = ?
  `).run(name, contact_person, phone, email, address, notes, is_active !== undefined ? is_active : 1, id);
  res.json({ message: 'Supplier updated' });
});

app.delete('/api/suppliers/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  res.json({ message: 'Supplier deleted' });
});

// ==========================================
// NOTIFICATIONS API
// ==========================================

app.get('/api/notifications', authenticate, (req: AuthRequest, res) => {
  const { unreadOnly, type } = req.query;
  refreshNotifications();

  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params: any[] = [];

  if (unreadOnly === 'true') {
    query += ' AND is_read = 0';
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  const notifications = db.prepare(query).all(...params);
  const unreadCount = (db.prepare('SELECT count(*) as count FROM notifications WHERE is_read = 0').get() as any).count;

  res.json({ notifications, unreadCount });
});

app.put('/api/notifications/:id/read', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ message: 'Notification marked as read' });
});

app.post('/api/notifications/mark-all-read', authenticate, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1').run();
  res.json({ message: 'All notifications marked as read' });
});

// ==========================================
// REPORTS & ANALYTICS
// ==========================================

app.get('/api/reports/analytics', authenticate, (req: AuthRequest, res) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Daily summary (today)
  const dailySummary = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN movement_type = 'PURCHASE' THEN quantity ELSE 0 END), 0) as incoming_units,
      COALESCE(SUM(CASE WHEN movement_type IN ('SALE', 'USAGE') THEN quantity ELSE 0 END), 0) as outgoing_units,
      COALESCE(SUM(CASE WHEN movement_type IN ('SALE', 'USAGE') THEN total_value ELSE 0 END), 0) as sales_value,
      COALESCE(SUM(CASE WHEN movement_type = 'DISPOSAL' THEN quantity ELSE 0 END), 0) as disposal_units,
      COALESCE(SUM(CASE WHEN movement_type = 'DISPOSAL' THEN total_value ELSE 0 END), 0) as disposal_loss
    FROM stock_movements
    WHERE date(timestamp) = ?
  `).get(todayStr);

  // Weekly movements (last 7 days grouped by day)
  const weeklyTrends = db.prepare(`
    SELECT
      date(timestamp) as day,
      COALESCE(SUM(CASE WHEN movement_type = 'PURCHASE' THEN quantity ELSE 0 END), 0) as purchased,
      COALESCE(SUM(CASE WHEN movement_type IN ('SALE', 'USAGE') THEN quantity ELSE 0 END), 0) as consumed
    FROM stock_movements
    WHERE timestamp >= date('now', '-7 day')
    GROUP BY date(timestamp)
    ORDER BY day ASC
  `).all();

  // Expiry risk breakdown
  const expiryBreakdown = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.sku,
      b.batch_number,
      b.expiry_date,
      b.remaining_quantity,
      b.purchase_price,
      (b.remaining_quantity * b.purchase_price) as loss_risk
    FROM batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.remaining_quantity > 0 AND b.expiry_date <= date('now', '+30 day')
    ORDER BY b.expiry_date ASC
  `).all() as any[];

  const detailedRisk = expiryBreakdown.map(item => {
    const days = getDaysUntil(item.expiry_date);
    return {
      ...item,
      days_to_expiry: days,
      status: getExpiryCategory(days)
    };
  });

  // Top restocked products
  const frequentlyRestocked = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.sku,
      COUNT(sm.id) as restock_orders_count,
      SUM(sm.quantity) as total_units_received
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE sm.movement_type = 'PURCHASE'
    GROUP BY p.id
    ORDER BY restock_orders_count DESC
    LIMIT 6
  `).all();

  // All historical disposal waste audit
  const disposalAudit = db.prepare(`
    SELECT ed.*, p.name as product_name, p.sku, b.batch_number
    FROM expiry_disposals ed
    JOIN products p ON ed.product_id = p.id
    LEFT JOIN batches b ON ed.batch_id = b.id
    ORDER BY ed.created_at DESC
  `).all();

  res.json({
    dailySummary,
    weeklyTrends,
    detailedRisk,
    frequentlyRestocked,
    disposalAudit
  });
});

// ==========================================
// CRM & CUSTOMER MANAGEMENT
// ==========================================

app.get('/api/customers', authenticate, (req: AuthRequest, res) => {
  const { search, type, status } = req.query;
  let query = `
    SELECT c.*,
      COALESCE((SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND order_status != 'CANCELLED'), 0) as total_orders,
      COALESCE((SELECT SUM(total_amount) FROM orders WHERE customer_id = c.id AND order_status != 'CANCELLED'), 0) as total_spent,
      COALESCE((SELECT SUM(outstanding_balance) FROM orders WHERE customer_id = c.id AND order_status != 'CANCELLED'), 0) as outstanding_balance
    FROM customers c
    WHERE 1=1
  `;
  const params: any[] = [];
  if (type && type !== 'all') {
    query += ' AND c.customer_type = ?';
    params.push(type);
  }
  if (status && status !== 'all') {
    query += ' AND c.is_active = ?';
    params.push(status === 'active' ? 1 : 0);
  }
  if (search) {
    query += ' AND (LOWER(c.name) LIKE ? OR LOWER(c.phone) LIKE ? OR LOWER(c.customer_code) LIKE ? OR LOWER(COALESCE(c.email, "")) LIKE ?)';
    const q = `%${(search as string).toLowerCase()}%`;
    params.push(q, q, q, q);
  }
  query += ' ORDER BY c.created_at DESC';
  const customers = db.prepare(query).all(...params);
  res.json({ customers });
});

app.get('/api/customers/:id', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const customer = db.prepare(`
    SELECT c.*,
      COALESCE((SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND order_status != 'CANCELLED'), 0) as total_orders,
      COALESCE((SELECT SUM(total_amount) FROM orders WHERE customer_id = c.id AND order_status != 'CANCELLED'), 0) as total_spent,
      COALESCE((SELECT SUM(outstanding_balance) FROM orders WHERE customer_id = c.id AND order_status != 'CANCELLED'), 0) as outstanding_balance
    FROM customers c
    WHERE c.id = ?
  `).get(id) as any;

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
    FROM orders o
    WHERE o.customer_id = ?
    ORDER BY o.order_date DESC, o.created_at DESC
  `).all(id);

  const payments = db.prepare(`
    SELECT p.*, o.order_number
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.customer_id = ?
    ORDER BY p.payment_date DESC, p.created_at DESC
  `).all(id);

  const frequentlyPurchased = db.prepare(`
    SELECT oi.product_id, oi.product_name, oi.sku,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.total_price) as total_spend
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.customer_id = ? AND o.order_status != 'CANCELLED'
    GROUP BY oi.product_id, oi.product_name, oi.sku
    ORDER BY total_quantity DESC
    LIMIT 10
  `).all(id);

  res.json({
    customer: {
      ...customer,
      orders,
      payments,
      frequently_purchased: frequentlyPurchased
    }
  });
});

app.post('/api/customers', authenticate, (req: AuthRequest, res) => {
  const { name, phone, email, address, customer_type = 'INDIVIDUAL', notes } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Full name and phone number are required' });
  }

  const id = `cust-${Date.now()}`;
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const totalCount = (db.prepare('SELECT count(*) as count FROM customers').get() as any).count + 1;
  const customerCode = `CUST-${year}-${String(totalCount).padStart(3, '0')}`;

  db.prepare(`
    INSERT INTO customers (id, customer_code, name, phone, email, address, customer_type, registration_date, notes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, customerCode, name.trim(), phone.trim(), email ? email.trim() : null, address ? address.trim() : null, customer_type, now.split('T')[0], notes ? notes.trim() : null, now, now);

  logAudit(req.user!.id, req.user!.name, 'REGISTER_CUSTOMER', 'CUSTOMER', id, `Registered customer ${name} (${customerCode})`);
  res.status(201).json({ id, customer_code: customerCode, message: 'Customer registered successfully' });
});

app.put('/api/customers/:id', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, phone, email, address, customer_type, notes, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE customers
    SET name = ?, phone = ?, email = ?, address = ?, customer_type = ?, notes = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    phone || existing.phone,
    email !== undefined ? email : existing.email,
    address !== undefined ? address : existing.address,
    customer_type || existing.customer_type,
    notes !== undefined ? notes : existing.notes,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    now,
    id
  );

  logAudit(req.user!.id, req.user!.name, 'UPDATE_CUSTOMER', 'CUSTOMER', id, `Updated customer ${name || existing.name}`);
  res.json({ message: 'Customer profile updated successfully' });
});

app.patch('/api/customers/:id/toggle-status', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const newStatus = customer.is_active ? 0 : 1;
  db.prepare('UPDATE customers SET is_active = ?, updated_at = ? WHERE id = ?')
    .run(newStatus, new Date().toISOString(), id);

  logAudit(req.user!.id, req.user!.name, 'TOGGLE_CUSTOMER_STATUS', 'CUSTOMER', id, `${newStatus ? 'Activated' : 'Deactivated'} customer ${customer.name}`);
  res.json({ message: `Customer ${newStatus ? 'activated' : 'deactivated'} successfully`, is_active: newStatus });
});

// ==========================================
// SALES, ORDERS & POS (WITH FEFO ENFORCEMENT)
// ==========================================

app.get('/api/orders', authenticate, (req: AuthRequest, res) => {
  const { search, customer_id, status, payment_status, startDate, endDate } = req.query;
  let query = `
    SELECT o.*,
      c.name as customer_name,
      c.customer_code,
      c.phone as customer_phone,
      c.customer_type,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (customer_id) {
    query += ' AND o.customer_id = ?';
    params.push(customer_id);
  }
  if (status && status !== 'all') {
    query += ' AND o.order_status = ?';
    params.push(status);
  }
  if (payment_status && payment_status !== 'all') {
    query += ' AND o.payment_status = ?';
    params.push(payment_status);
  }
  if (startDate) {
    query += ' AND o.order_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND o.order_date <= ?';
    params.push(endDate);
  }
  if (search) {
    query += ' AND (LOWER(o.order_number) LIKE ? OR LOWER(COALESCE(c.name, "")) LIKE ? OR LOWER(COALESCE(c.phone, "")) LIKE ? OR LOWER(COALESCE(o.user_name, "")) LIKE ?)';
    const q = `%${(search as string).toLowerCase()}%`;
    params.push(q, q, q, q);
  }

  query += ' ORDER BY o.order_date DESC, o.created_at DESC LIMIT 100';
  const orders = db.prepare(query).all(...params);
  res.json({ orders });
});

app.get('/api/orders/:id', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const order = db.prepare(`
    SELECT o.*,
      c.name as customer_name,
      c.customer_code,
      c.phone as customer_phone,
      c.email as customer_email,
      c.address as customer_address,
      c.customer_type
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `).get(id) as any;

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare(`
    SELECT oi.*, p.unit
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(id);

  const payments = db.prepare(`
    SELECT * FROM payments WHERE order_id = ? ORDER BY payment_date ASC, created_at ASC
  `).all(id);

  const returns = db.prepare(`
    SELECT * FROM order_returns WHERE order_id = ? ORDER BY return_date DESC
  `).all(id);

  res.json({
    order: {
      ...order,
      items,
      payments,
      returns
    }
  });
});

app.post('/api/orders', authenticate, (req: AuthRequest, res) => {
  const {
    customer_id,
    items,
    discount = 0,
    tax_rate = 8.0,
    payment_method = 'CASH',
    amount_paid = 0,
    payment_reference,
    notes
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  let customer: any = null;
  if (customer_id) {
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }
  }

  interface AllocatedItem {
    product_id: string;
    product_name: string;
    sku: string;
    batch_id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total_price: number;
  }

  const allocatedItems: AllocatedItem[] = [];

  for (const item of items) {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as any;
    if (!prod) {
      return res.status(400).json({ error: `Product not found: ${item.product_id}` });
    }

    const reqQty = parseInt(item.quantity, 10);
    if (!reqQty || reqQty <= 0) {
      return res.status(400).json({ error: `Invalid quantity for ${prod.name}` });
    }

    const unitPrice = item.unit_price !== undefined ? parseFloat(item.unit_price) : prod.selling_price;
    const itemDiscount = parseFloat(item.discount) || 0;

    if (item.batch_id) {
      const batch = db.prepare('SELECT * FROM batches WHERE id = ? AND product_id = ?').get(item.batch_id, prod.id) as any;
      if (!batch) {
        return res.status(400).json({ error: `Selected batch not found for ${prod.name}` });
      }
      if (batch.expiry_date < todayStr) {
        return res.status(400).json({ error: `FEFO Violation: Batch ${batch.batch_number} has EXPIRED (${batch.expiry_date}) and cannot be sold!` });
      }
      if (batch.remaining_quantity < reqQty) {
        return res.status(400).json({ error: `Insufficient stock in batch ${batch.batch_number}. Available: ${batch.remaining_quantity}, requested: ${reqQty}` });
      }

      allocatedItems.push({
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        batch_id: batch.id,
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
        quantity: reqQty,
        unit_price: unitPrice,
        discount: itemDiscount,
        total_price: Math.max(0, reqQty * unitPrice - itemDiscount)
      });
    } else {
      // Automatic FEFO priority
      const batches = db.prepare(`
        SELECT * FROM batches
        WHERE product_id = ? AND remaining_quantity > 0 AND expiry_date >= ?
        ORDER BY expiry_date ASC, date_received ASC
      `).all(prod.id, todayStr) as any[];

      const totalUsable = batches.reduce((sum, b) => sum + b.remaining_quantity, 0);
      if (totalUsable < reqQty) {
        return res.status(400).json({
          error: `Insufficient unexpired stock for "${prod.name}". Available usable: ${totalUsable} ${prod.unit}, requested: ${reqQty} ${prod.unit}. Expired batches are excluded.`
        });
      }

      let remainingToAllocate = reqQty;
      for (const batch of batches) {
        if (remainingToAllocate <= 0) break;
        const take = Math.min(batch.remaining_quantity, remainingToAllocate);
        const itemPortionDiscount = (take / reqQty) * itemDiscount;

        allocatedItems.push({
          product_id: prod.id,
          product_name: prod.name,
          sku: prod.sku,
          batch_id: batch.id,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          quantity: take,
          unit_price: unitPrice,
          discount: itemPortionDiscount,
          total_price: Math.max(0, take * unitPrice - itemPortionDiscount)
        });

        remainingToAllocate -= take;
      }
    }
  }

  const subtotal = allocatedItems.reduce((acc, it) => acc + it.total_price, 0);
  const orderDiscount = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const taxableAmount = Math.max(0, subtotal - orderDiscount);
  const taxRateNum = Math.max(0, parseFloat(tax_rate) || 0);
  const taxAmount = Math.round(taxableAmount * (taxRateNum / 100) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const numPaid = Math.max(0, parseFloat(amount_paid) || 0);
  const paidAmount = Math.min(totalAmount, numPaid);
  const outstandingBalance = Math.round(Math.max(0, totalAmount - paidAmount) * 100) / 100;
  const paymentStatus = outstandingBalance <= 0.001 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID');

  const orderId = `ord-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const orderNumSeed = (db.prepare('SELECT count(*) as count FROM orders').get() as any).count + 1001;
  const orderNumber = `ORD-${year}-${orderNumSeed}`;

  const executeOrderTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_id, order_date, subtotal, discount, tax_rate, tax_amount,
        total_amount, paid_amount, outstanding_balance, payment_status, order_status,
        user_id, user_name, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?)
    `).run(
      orderId, orderNumber, customer_id || null, todayStr, subtotal, orderDiscount, taxRateNum, taxAmount,
      totalAmount, paidAmount, outstandingBalance, paymentStatus,
      req.user!.id, req.user!.name, notes || null, now, now
    );

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (
        id, order_id, product_id, product_name, sku, batch_id, batch_number, expiry_date,
        quantity, unit_price, discount, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deductBatch = db.prepare(`
      UPDATE batches
      SET remaining_quantity = remaining_quantity - ?, updated_at = ?
      WHERE id = ?
    `);

    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (
        id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value,
        user_id, user_name, reference_number, notes, timestamp
      ) VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    allocatedItems.forEach((alloc, idx) => {
      const oiId = `oi-${orderId}-${idx + 1}`;
      insertOrderItem.run(
        oiId, orderId, alloc.product_id, alloc.product_name, alloc.sku,
        alloc.batch_id, alloc.batch_number, alloc.expiry_date,
        alloc.quantity, alloc.unit_price, alloc.discount, alloc.total_price
      );

      deductBatch.run(alloc.quantity, now, alloc.batch_id);

      const txCode = `TX-SALE-${Date.now().toString().slice(-6)}-${idx + 1}`;
      insertMovement.run(
        `mov-${Date.now()}-${idx + 1}`,
        txCode,
        alloc.product_id,
        alloc.batch_id,
        alloc.quantity,
        alloc.unit_price,
        alloc.total_price,
        req.user!.id,
        req.user!.name,
        orderNumber,
        `POS dispatch to ${customer?.name || 'Walk-in Customer'} (Batch ${alloc.batch_number}, Exp: ${alloc.expiry_date})`,
        now
      );
    });

    if (paidAmount > 0) {
      const paymentId = `pay-${Date.now()}`;
      const paySeed = (db.prepare('SELECT count(*) as count FROM payments').get() as any).count + 1;
      const paymentNumber = `PAY-${year}-${String(paySeed).padStart(3, '0')}`;

      db.prepare(`
        INSERT INTO payments (
          id, payment_number, order_id, customer_id, amount, payment_date,
          payment_method, payment_reference, notes, received_by_id, received_by_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId, paymentNumber, orderId, customer_id || null, paidAmount, todayStr,
        payment_method, payment_reference || null,
        `Initial payment at checkout (${payment_method})`,
        req.user!.id, req.user!.name, now
      );
    }

    logAudit(
      req.user!.id,
      req.user!.name,
      'CREATE_SALE_ORDER',
      'ORDER',
      orderId,
      `Completed order ${orderNumber} for ${customer?.name || 'Walk-in'} - Total: $${totalAmount.toFixed(2)}, Paid: $${paidAmount.toFixed(2)} (${paymentStatus})`
    );
  });

  try {
    executeOrderTx();
    refreshNotifications();

    res.status(201).json({
      orderId,
      orderNumber,
      totalAmount,
      paidAmount,
      outstandingBalance,
      paymentStatus,
      itemsCount: allocatedItems.length,
      message: 'Order created successfully and inventory deducted according to FEFO.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete order transaction' });
  }
});

app.post('/api/orders/:id/payments', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { amount, payment_method = 'CASH', payment_reference, notes } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.order_status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cannot record payment for a cancelled order' });
  }

  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero' });
  }

  if (numAmount > order.outstanding_balance + 0.01) {
    return res.status(400).json({ error: `Payment exceeds outstanding balance of $${order.outstanding_balance.toFixed(2)}` });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const paySeed = (db.prepare('SELECT count(*) as count FROM payments').get() as any).count + 1;
  const paymentNumber = `PAY-${year}-${String(paySeed).padStart(3, '0')}`;
  const paymentId = `pay-${Date.now()}`;

  const newPaid = Math.round((order.paid_amount + numAmount) * 100) / 100;
  const newBalance = Math.round(Math.max(0, order.total_amount - newPaid) * 100) / 100;
  const newStatus = newBalance <= 0.001 ? 'PAID' : 'PARTIAL';

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO payments (
        id, payment_number, order_id, customer_id, amount, payment_date,
        payment_method, payment_reference, notes, received_by_id, received_by_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId, paymentNumber, order.id, order.customer_id, numAmount, todayStr,
      payment_method, payment_reference || null, notes || 'Subsequent payment / balance clearance',
      req.user!.id, req.user!.name, now
    );

    db.prepare(`
      UPDATE orders
      SET paid_amount = ?, outstanding_balance = ?, payment_status = ?, updated_at = ?
      WHERE id = ?
    `).run(newPaid, newBalance, newStatus, now, order.id);

    logAudit(
      req.user!.id,
      req.user!.name,
      'RECORD_PAYMENT',
      'PAYMENT',
      paymentId,
      `Recorded payment ${paymentNumber} of $${numAmount.toFixed(2)} against order ${order.order_number}`
    );
  });

  tx();
  res.status(201).json({
    message: 'Payment recorded successfully',
    paymentNumber,
    newPaid,
    newBalance,
    paymentStatus: newStatus
  });
});

app.post('/api/orders/:id/cancel', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason = 'Customer requested cancellation' } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.order_status === 'CANCELLED') return res.status(400).json({ error: 'Order is already cancelled' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id) as any[];
  const now = new Date().toISOString();

  const cancelTx = db.transaction(() => {
    for (const item of items) {
      if (item.batch_id) {
        db.prepare('UPDATE batches SET remaining_quantity = remaining_quantity + ?, updated_at = ? WHERE id = ?')
          .run(item.quantity, now, item.batch_id);

        const txCode = `TX-ADJ-RET-${Date.now().toString().slice(-6)}`;
        db.prepare(`
          INSERT INTO stock_movements (
            id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value,
            user_id, user_name, reference_number, notes, timestamp
          ) VALUES (?, ?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `mov-ret-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          txCode,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_price,
          item.total_price,
          req.user!.id,
          req.user!.name,
          order.order_number,
          `Restored stock from cancelled order ${order.order_number}: ${reason}`,
          now
        );
      }
    }

    db.prepare('UPDATE orders SET order_status = "CANCELLED", notes = COALESCE(notes, "") || " [CANCELLED: " || ? || "]", updated_at = ? WHERE id = ?')
      .run(reason, now, id);

    logAudit(req.user!.id, req.user!.name, 'CANCEL_ORDER', 'ORDER', id, `Cancelled order ${order.order_number}. Stock restored to batches.`);
  });

  cancelTx();
  refreshNotifications();
  res.json({ message: 'Order cancelled successfully and stock restored to batches' });
});

app.post('/api/orders/:id/return', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { reason = 'Defective or customer return', refund_amount = 0, refund_method = 'CASH', notes } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.order_status === 'CANCELLED' || order.order_status === 'RETURNED') {
    return res.status(400).json({ error: `Cannot process return for an order that is already ${order.order_status}` });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id) as any[];
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const returnSeed = (db.prepare('SELECT count(*) as count FROM order_returns').get() as any).count + 1;
  const returnNumber = `RET-${year}-${String(returnSeed).padStart(3, '0')}`;
  const returnId = `ret-${Date.now()}`;
  const numRefund = parseFloat(refund_amount) || 0;

  const returnTx = db.transaction(() => {
    for (const item of items) {
      if (item.batch_id) {
        db.prepare('UPDATE batches SET remaining_quantity = remaining_quantity + ?, updated_at = ? WHERE id = ?')
          .run(item.quantity, now, item.batch_id);

        const txCode = `TX-RETURN-${Date.now().toString().slice(-6)}`;
        db.prepare(`
          INSERT INTO stock_movements (
            id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value,
            user_id, user_name, reference_number, notes, timestamp
          ) VALUES (?, ?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `mov-ret-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          txCode,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_price,
          item.total_price,
          req.user!.id,
          req.user!.name,
          returnNumber,
          `Return processed for order ${order.order_number}: ${reason}`,
          now
        );
      }
    }

    db.prepare(`
      INSERT INTO order_returns (
        id, return_number, order_id, customer_id, reason, refund_amount, refund_method,
        processed_by_id, processed_by_name, return_date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      returnId, returnNumber, order.id, order.customer_id, reason, numRefund, refund_method,
      req.user!.id, req.user!.name, now.split('T')[0], notes || null, now
    );

    db.prepare('UPDATE orders SET order_status = "RETURNED", updated_at = ? WHERE id = ?').run(now, id);

    logAudit(req.user!.id, req.user!.name, 'PROCESS_RETURN', 'RETURN', returnId, `Processed return ${returnNumber} for order ${order.order_number} (Refund: $${numRefund.toFixed(2)})`);
  });

  returnTx();
  refreshNotifications();
  res.status(201).json({ message: 'Return processed successfully and stock restored', returnNumber });
});

app.get('/api/sales/analytics', authenticate, (req: AuthRequest, res) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const daily = db.prepare(`
    SELECT
      COALESCE(SUM(total_amount), 0) as total_sales,
      COUNT(*) as orders_count
    FROM orders
    WHERE order_date = ? AND order_status != 'CANCELLED'
  `).get(todayStr) as any;

  const weekly = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total_sales
    FROM orders
    WHERE order_date >= date('now', '-7 days') AND order_status != 'CANCELLED'
  `).get() as any;

  const monthly = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total_sales
    FROM orders
    WHERE order_date >= date('now', '-30 days') AND order_status != 'CANCELLED'
  `).get() as any;

  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(outstanding_balance), 0) as total_receivables
    FROM orders
    WHERE order_status != 'CANCELLED'
  `).get() as any;

  const bestSelling = db.prepare(`
    SELECT
      oi.product_id,
      oi.product_name,
      oi.sku,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.total_price) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_status != 'CANCELLED'
    GROUP BY oi.product_id, oi.product_name, oi.sku
    ORDER BY total_quantity DESC
    LIMIT 6
  `).all();

  const topCustomers = db.prepare(`
    SELECT
      c.id as customer_id,
      c.name as customer_name,
      c.customer_code,
      c.customer_type,
      COUNT(o.id) as total_orders,
      COALESCE(SUM(o.total_amount), 0) as total_spent,
      COALESCE(SUM(o.outstanding_balance), 0) as outstanding_balance
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    WHERE o.order_status != 'CANCELLED'
    GROUP BY c.id
    ORDER BY total_spent DESC
    LIMIT 6
  `).all();

  const salesTrends = db.prepare(`
    SELECT
      order_date as date,
      order_date as label,
      COALESCE(SUM(total_amount), 0) as sales,
      COUNT(*) as orders
    FROM orders
    WHERE order_date >= date('now', '-14 days') AND order_status != 'CANCELLED'
    GROUP BY order_date
    ORDER BY order_date ASC
  `).all();

  res.json({
    analytics: {
      dailySales: daily.total_sales,
      dailyOrdersCount: daily.orders_count,
      weeklySales: weekly.total_sales,
      monthlySales: monthly.total_sales,
      totalOrders: totals.total_orders,
      totalRevenue: totals.total_revenue,
      totalReceivables: totals.total_receivables,
      bestSellingProducts: bestSelling,
      topCustomers,
      salesTrends
    }
  });
});

// ==========================================
// USER MANAGEMENT & AUDIT (ADMIN ONLY)
// ==========================================

app.get('/api/users', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const users = db.prepare('SELECT id, email, name, role, phone, is_active, created_at, updated_at FROM users ORDER BY created_at ASC').all();
  res.json({ users });
});

app.post('/api/users', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const id = `u-${Date.now()}`;
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, phone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, email.toLowerCase(), hash, name, role, phone || null, now, now);

  logAudit(req.user!.id, req.user!.name, 'CREATE_USER', 'USER', id, `Created user ${email} with role ${role}`);
  res.status(201).json({ id, message: 'User created' });
});

app.put('/api/users/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, role, phone, is_active, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  const now = new Date().toISOString();
  let query = 'UPDATE users SET name = ?, role = ?, phone = ?, is_active = ?, updated_at = ?';
  const params: any[] = [
    name || user.name,
    role || user.role,
    phone !== undefined ? phone : user.phone,
    is_active !== undefined ? is_active : user.is_active,
    now
  ];

  if (password) {
    query += ', password_hash = ?';
    params.push(bcrypt.hashSync(password, 10));
  }

  query += ' WHERE id = ?';
  params.push(id);

  db.prepare(query).run(...params);
  logAudit(req.user!.id, req.user!.name, 'UPDATE_USER', 'USER', id, `Updated user ${user.email}`);

  res.json({ message: 'User updated successfully' });
});

app.get('/api/audit-logs', authenticate, requireRole(['ADMIN', 'INVENTORY_MANAGER']), (req: AuthRequest, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json({ logs });
});

// SETTINGS & SYSTEM CONTROLS
app.get('/api/settings', authenticate, (req: AuthRequest, res) => {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as any[];
  const settings: { [key: string]: string } = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  res.json({ settings });
});

app.put('/api/settings', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Settings object required' });
  }

  const updateSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(settings)) {
    updateSetting.run(k, String(v));
  }

  logAudit(req.user!.id, req.user!.name, 'UPDATE_SETTINGS', 'SETTINGS', 'global', 'Updated application configuration');
  res.json({ message: 'Settings saved' });
});

// DEMO RE-SEED
app.post('/api/system/reset-demo', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res) => {
  db.exec(`
    DELETE FROM order_returns;
    DELETE FROM payments;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM customers;
    DELETE FROM audit_logs;
    DELETE FROM notifications;
    DELETE FROM purchase_order_items;
    DELETE FROM purchase_orders;
    DELETE FROM expiry_disposals;
    DELETE FROM stock_movements;
    DELETE FROM batches;
    DELETE FROM products;
    DELETE FROM suppliers;
    DELETE FROM categories;
    DELETE FROM users;
  `);

  seedDatabase();
  logAudit(req.user!.id, req.user!.name, 'RESET_DEMO_DATA', 'SYSTEM', 'all', 'Reset database to realistic seed demonstration data');

  res.json({ message: 'Database reset to clean demonstration data state with live batches and alerts' });
});

// ==========================================
// SERVER BOOTSTRAP (WITH VITE DEV MIDDLEWARE)
// ==========================================

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Smart Inventory and Expiry Manager running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
