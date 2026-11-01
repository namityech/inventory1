import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'inventory.db');
export const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'INVENTORY_MANAGER', 'STAFF')),
      phone TEXT,
      avatar_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#0d9488',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT,
      description TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      unit TEXT NOT NULL DEFAULT 'units',
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 10,
      image_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      batch_number TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      quantity_received INTEGER NOT NULL,
      remaining_quantity INTEGER NOT NULL,
      manufacturing_date TEXT,
      expiry_date TEXT NOT NULL,
      purchase_price REAL NOT NULL,
      date_received TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      transaction_code TEXT NOT NULL UNIQUE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('PURCHASE', 'SALE', 'USAGE', 'DAMAGE', 'DISPOSAL', 'ADJUSTMENT')),
      quantity INTEGER NOT NULL,
      unit_price REAL,
      total_value REAL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT,
      reference_number TEXT,
      notes TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expiry_disposals (
      id TEXT PRIMARY KEY,
      batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total_loss REAL NOT NULL,
      disposal_method TEXT NOT NULL,
      reason TEXT NOT NULL,
      disposed_by_id TEXT REFERENCES users(id),
      disposed_by_name TEXT,
      reference_no TEXT,
      certificate_no TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT NOT NULL UNIQUE,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      status TEXT NOT NULL CHECK(status IN ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED')),
      order_date TEXT NOT NULL,
      expected_date TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('EXPIRED', 'CRITICAL_EXPIRY', 'WARNING_EXPIRY', 'UPCOMING_EXPIRY', 'LOW_STOCK', 'STOCK_ADJUSTMENT', 'SYSTEM')),
      severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'WARNING', 'INFO')),
      product_id TEXT,
      batch_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      dedupe_key TEXT UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      customer_type TEXT NOT NULL CHECK(customer_type IN ('INDIVIDUAL', 'BUSINESS')),
      registration_date TEXT NOT NULL,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      order_date TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      outstanding_balance REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PARTIAL', 'UNPAID')),
      order_status TEXT NOT NULL CHECK(order_status IN ('COMPLETED', 'PENDING', 'CANCELLED', 'RETURNED')),
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      batch_id TEXT REFERENCES batches(id) ON DELETE SET NULL,
      batch_number TEXT,
      expiry_date TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      payment_number TEXT NOT NULL UNIQUE,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CREDIT')),
      payment_reference TEXT,
      notes TEXT,
      received_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      received_by_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_returns (
      id TEXT PRIMARY KEY,
      return_number TEXT NOT NULL UNIQUE,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      refund_amount REAL NOT NULL DEFAULT 0,
      refund_method TEXT,
      processed_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      processed_by_name TEXT,
      return_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default data if users table is empty or sync updated users
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    seedDatabase();
  } else {
    syncUsers();
    refreshNotifications();
  }

  const custCount = db.prepare('SELECT count(*) as count FROM customers').get() as { count: number };
  if (custCount.count === 0) {
    seedCustomersAndOrders();
  }
}

export function syncUsers() {
  const now = new Date().toISOString();
  const hashedPassword = bcrypt.hashSync('password123', 10);
  const hashedPasswordAdmin = bcrypt.hashSync('admin123', 10);
  const hashedPasswordManager = bcrypt.hashSync('manager123', 10);
  const hashedPasswordStaff = bcrypt.hashSync('staff123', 10);

  const upsertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, phone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      updated_at = excluded.updated_at
  `);

  upsertUser.run('u-eyob-1', 'eyob@inventory.com', hashedPasswordAdmin, 'Eyob T', 'ADMIN', '+1 (555) 234-5678', now, now);
  upsertUser.run('u-nahom-1', 'nahom@inventory.com', hashedPasswordManager, 'Nahom M', 'INVENTORY_MANAGER', '+1 (555) 345-6789', now, now);
  upsertUser.run('u-eyosias-1', 'eyosias@inventory.com', hashedPasswordStaff, 'Eyosias T', 'STAFF', '+1 (555) 456-7890', now, now);
  upsertUser.run('u-bekalu-1', 'bekalu@inventory.com', hashedPasswordStaff, 'Bekalu G', 'STAFF', '+1 (555) 567-8901', now, now);
  upsertUser.run('u-natnael-1', 'natnael@inventory.com', hashedPasswordStaff, 'Natnael A', 'STAFF', '+1 (555) 678-9012', now, now);

  // Update original demo logins to also reflect the primary names
  db.prepare(`UPDATE users SET name = 'Eyob T' WHERE email = 'admin@inventory.com'`).run();
  db.prepare(`UPDATE users SET name = 'Nahom M' WHERE email = 'manager@inventory.com'`).run();
  db.prepare(`UPDATE users SET name = 'Eyosias T' WHERE email = 'staff@inventory.com'`).run();
}

export function seedDatabase() {
  const now = new Date().toISOString();
  const hashedPasswordAdmin = bcrypt.hashSync('admin123', 10);
  const hashedPasswordManager = bcrypt.hashSync('manager123', 10);
  const hashedPasswordStaff = bcrypt.hashSync('staff123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, phone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertUser.run('u-admin-1', 'admin@inventory.com', hashedPasswordAdmin, 'Eyob T', 'ADMIN', '+1 (555) 234-5678', now, now);
  insertUser.run('u-eyob-1', 'eyob@inventory.com', hashedPasswordAdmin, 'Eyob T', 'ADMIN', '+1 (555) 234-5678', now, now);
  insertUser.run('u-mgr-1', 'manager@inventory.com', hashedPasswordManager, 'Nahom M', 'INVENTORY_MANAGER', '+1 (555) 345-6789', now, now);
  insertUser.run('u-nahom-1', 'nahom@inventory.com', hashedPasswordManager, 'Nahom M', 'INVENTORY_MANAGER', '+1 (555) 345-6789', now, now);
  insertUser.run('u-staff-1', 'staff@inventory.com', hashedPasswordStaff, 'Eyosias T', 'STAFF', '+1 (555) 456-7890', now, now);
  insertUser.run('u-eyosias-1', 'eyosias@inventory.com', hashedPasswordStaff, 'Eyosias T', 'STAFF', '+1 (555) 456-7890', now, now);
  insertUser.run('u-bekalu-1', 'bekalu@inventory.com', hashedPasswordStaff, 'Bekalu G', 'STAFF', '+1 (555) 567-8901', now, now);
  insertUser.run('u-natnael-1', 'natnael@inventory.com', hashedPasswordStaff, 'Natnael A', 'STAFF', '+1 (555) 678-9012', now, now);

  // Settings
  const insertSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
  insertSetting.run('company_name', 'Apex Medical & Retail Supply');
  insertSetting.run('currency_symbol', '$');
  insertSetting.run('fefo_enforced', 'true');
  insertSetting.run('critical_expiry_days', '7');
  insertSetting.run('warning_expiry_days', '30');
  insertSetting.run('upcoming_expiry_days', '60');

  // Categories
  const insertCat = db.prepare('INSERT INTO categories (id, name, description, color, created_at) VALUES (?, ?, ?, ?, ?)');
  insertCat.run('cat-1', 'Pharmaceuticals & Antibiotics', 'Prescription antibiotics, injectables, and tablets', '#0d9488', now);
  insertCat.run('cat-2', 'Vaccines & Cold-Chain Biologics', 'Refrigerated vaccines and temperature-sensitive biologicals', '#0284c7', now);
  insertCat.run('cat-3', 'Medical Consumables & PPE', 'Sterile syringes, gauze, gloves, surgical masks', '#6366f1', now);
  insertCat.run('cat-4', 'Dairy & Fresh Produce', 'Ultra-pasteurized milk, yogurts, and organic dairy', '#ea580c', now);
  insertCat.run('cat-5', 'Packaged & Canned Goods', 'High-stability pantry foods, soups, and beverages', '#16a34a', now);
  insertCat.run('cat-6', 'Vitamins & Dietary Supplements', 'Multivitamins, omega oils, and electrolytes', '#d97706', now);

  // Suppliers
  const insertSup = db.prepare('INSERT INTO suppliers (id, name, contact_person, phone, email, address, notes, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)');
  insertSup.run('sup-1', 'MediCore Pharma Global', 'Arthur Sterling', '+1 (800) 555-0199', 'orders@medicorepharma.com', '104 Innovation Way, Boston, MA', 'Primary GMP certified distributor for prescription medicine', now);
  insertSup.run('sup-2', 'BioShield Biologics Co.', 'Dr. Claire Laurent', '+1 (800) 555-0245', 'supply@bioshield-bio.com', '45 Science Park Rd, San Diego, CA', 'Cold-chain certified refrigerated distributor with GPS temperature loggers', now);
  insertSup.run('sup-3', 'Apex Surgical & Sterile Supplies', 'David Kim', '+1 (800) 555-0812', 'sales@apexsurgical.com', '78 Industrial Pkwy, Chicago, IL', 'Hospital-grade disposables and surgical tools', now);
  insertSup.run('sup-4', 'FreshHarbor Organic Distributing', 'Maria Gonzales', '+1 (800) 555-0677', 'logistics@freshharbor.com', '320 Central Wholesale Blvd, Atlanta, GA', 'Weekly fresh dairy and organic packaged grocery supplier', now);

  // Products
  const insertProd = db.prepare(`
    INSERT INTO products (id, name, sku, barcode, description, category_id, supplier_id, unit, purchase_price, selling_price, min_stock, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Today's date calculations
  const today = new Date();
  const formatOffset = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  insertProd.run('prod-1', 'Amoxicillin Trihydrate 500mg (100 Caps)', 'MED-AMX-500', '8901234567891', 'Broad-spectrum bactericidal penicillin antibiotic for systemic infections', 'cat-1', 'sup-1', 'bottles', 18.50, 32.00, 30, now, now);
  insertProd.run('prod-2', 'Ceftriaxone Sodium Injection 1g Vial', 'MED-CEF-001', '8901234567892', 'Third-generation cephalosporin for IV/IM administration', 'cat-1', 'sup-1', 'vials', 12.00, 24.50, 40, now, now);
  insertProd.run('prod-3', 'Influenza Quadrivalent Vaccine 0.5mL Pre-filled Syringe', 'VAC-FLU-QUAD', '8901234567893', 'Annual seasonal influenza active immunization vaccine (Keep at 2-8°C)', 'cat-2', 'sup-2', 'syringes', 22.00, 45.00, 50, now, now);
  insertProd.run('prod-4', 'Human Normal Immunoglobulin 5g IVIG', 'VAC-IVIG-005', '8901234567894', 'Immunomodulatory agent for primary immunodeficiency diseases', 'cat-2', 'sup-2', 'vials', 210.00, 360.00, 10, now, now);
  insertProd.run('prod-5', 'Sterile Nitrile Exam Gloves Powder-Free (Box of 100)', 'SUR-GLV-NIT-M', '8901234567895', 'Medium medical grade chemo-tested nitrile protective gloves', 'cat-3', 'sup-3', 'boxes', 7.50, 14.99, 60, now, now);
  insertProd.run('prod-6', 'Normal Saline IV 0.9% 500mL Infusion Bag', 'SUR-SAL-500', '8901234567896', 'Isotonic sterile fluid replacement crystalloid solution for infusion', 'cat-3', 'sup-3', 'bags', 2.20, 6.50, 100, now, now);
  insertProd.run('prod-7', 'Organic Ultra-Pasteurized Whole Milk 1L', 'GRO-MLK-ORG-1L', '8901234567897', 'Farm fresh Grade A homogenized organic whole milk', 'cat-4', 'sup-4', 'cartons', 2.10, 4.29, 40, now, now);
  insertProd.run('prod-8', 'Probiotic Greek Yogurt 500g Tub', 'GRO-YOG-GRK-500', '8901234567898', 'Plain cultured strained whole milk Greek yogurt with live active cultures', 'cat-4', 'sup-4', 'tubs', 2.80, 5.49, 25, now, now);
  insertProd.run('prod-9', 'Vitamin D3 5000 IU High Potency Softgels (120s)', 'VIT-D3-5000', '8901234567899', 'Essential bone density and immune modulation softgels', 'cat-6', 'sup-1', 'bottles', 6.20, 15.99, 20, now, now);
  insertProd.run('prod-10', 'Hydrocortisone 1% Topical Anti-Itch Cream 60g', 'MED-HYD-060', '8901234567800', 'Topical corticosteroid for relief of inflammation and pruritics', 'cat-1', 'sup-1', 'tubes', 4.10, 9.80, 35, now, now);

  // Batches - Carefully created with varying expiry dates to showcase:
  // 1. Expired (< today)
  // 2. Critical (1 to 7 days)
  // 3. Warning (8 to 30 days)
  // 4. Upcoming (31 to 60 days)
  // 5. Safe (> 60 days)
  const insertBatch = db.prepare(`
    INSERT INTO batches (id, batch_number, product_id, supplier_id, quantity_received, remaining_quantity, manufacturing_date, expiry_date, purchase_price, date_received, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Product 1: Amoxicillin
  // Batch 1: Expired 12 days ago
  insertBatch.run('bat-amx-01', 'AMX-2024-B1', 'prod-1', 'sup-1', 50, 18, formatOffset(-380), formatOffset(-12), 18.00, formatOffset(-365), 'Stored in cabinet A2. Expired stock pending authorized disposal protocol.', now, now);
  // Batch 2: Critical! Expires in 4 days
  insertBatch.run('bat-amx-02', 'AMX-2025-C2', 'prod-1', 'sup-1', 60, 24, formatOffset(-200), formatOffset(4), 18.50, formatOffset(-180), 'High priority FEFO dispatch alert. Dispense first.', now, now);
  // Batch 3: Warning! Expires in 22 days
  insertBatch.run('bat-amx-03', 'AMX-2025-W3', 'prod-1', 'sup-1', 80, 55, formatOffset(-100), formatOffset(22), 18.50, formatOffset(-90), 'Standard shelf rotation.', now, now);
  // Batch 4: Safe! Expires in 240 days
  insertBatch.run('bat-amx-04', 'AMX-2026-S4', 'prod-1', 'sup-1', 100, 100, formatOffset(-30), formatOffset(240), 19.00, formatOffset(-20), 'New delivery received last month.', now, now);

  // Product 2: Ceftriaxone
  // Batch 1: Warning! Expires in 16 days
  insertBatch.run('bat-cef-01', 'CEF-LOT-882', 'prod-2', 'sup-1', 75, 12, formatOffset(-300), formatOffset(16), 12.00, formatOffset(-280), 'Keep in dry medication room.', now, now);
  // Batch 2: Safe! Expires in 180 days
  insertBatch.run('bat-cef-02', 'CEF-LOT-940', 'prod-2', 'sup-1', 120, 115, formatOffset(-40), formatOffset(180), 12.00, formatOffset(-30), 'Current active stock.', now, now);

  // Product 3: Flu Vaccine (Refrigerated)
  // Batch 1: Expired 5 days ago
  insertBatch.run('bat-flu-01', 'FLU-2024-EXP', 'prod-3', 'sup-2', 40, 15, formatOffset(-240), formatOffset(-5), 22.00, formatOffset(-220), 'Isolated in cold-chain quarantine zone. Logged for hazardous waste.', now, now);
  // Batch 2: Critical! Expires in 6 days
  insertBatch.run('bat-flu-02', 'FLU-2025-CRT', 'prod-3', 'sup-2', 60, 28, formatOffset(-120), formatOffset(6), 22.00, formatOffset(-110), 'Must prioritize for walk-in vaccination clinic.', now, now);
  // Batch 3: Upcoming! Expires in 48 days
  insertBatch.run('bat-flu-03', 'FLU-2025-UPC', 'prod-3', 'sup-2', 80, 70, formatOffset(-60), formatOffset(48), 22.50, formatOffset(-50), 'Fridge Unit 2 shelf B.', now, now);

  // Product 4: IVIG (High Value)
  // Batch 1: Warning! Expires in 26 days ($210 each!)
  insertBatch.run('bat-ivig-01', 'IVIG-SPEC-90', 'prod-4', 'sup-2', 12, 4, formatOffset(-300), formatOffset(26), 210.00, formatOffset(-290), 'High value biologic stock. Monitor daily.', now, now);
  // Batch 2: Safe! Expires in 365 days
  insertBatch.run('bat-ivig-02', 'IVIG-SPEC-99', 'prod-4', 'sup-2', 20, 18, formatOffset(-30), formatOffset(365), 215.00, formatOffset(-20), 'Secure storage lockbox.', now, now);

  // Product 5: Nitrile Gloves (Low stock demo)
  // Batch 1: Safe! Expires in 400 days, but only 14 boxes left (min stock is 60!)
  insertBatch.run('bat-glv-01', 'GLV-M-2025', 'prod-5', 'sup-3', 100, 14, formatOffset(-90), formatOffset(400), 7.50, formatOffset(-80), 'Stock critically low, automatic restock order recommended.', now, now);

  // Product 6: Normal Saline (High volume)
  // Batch 1: Expired 20 days ago
  insertBatch.run('bat-sal-01', 'SAL-EXP-09', 'prod-6', 'sup-3', 150, 25, formatOffset(-400), formatOffset(-20), 2.20, formatOffset(-380), 'Batch expired during storage shift.', now, now);
  // Batch 2: Safe! Expires in 300 days
  insertBatch.run('bat-sal-02', 'SAL-2026-A', 'prod-6', 'sup-3', 200, 160, formatOffset(-30), formatOffset(300), 2.20, formatOffset(-25), 'Warehouse Bay 4.', now, now);

  // Product 7: Fresh Milk (Rapid expiry)
  // Batch 1: Critical! Expires in 2 days
  insertBatch.run('bat-mlk-01', 'MLK-W44-A', 'prod-7', 'sup-4', 50, 15, formatOffset(-10), formatOffset(2), 2.10, formatOffset(-8), 'Cooler display rack 1. Tag for promotion or clearance.', now, now);
  // Batch 2: Warning! Expires in 12 days
  insertBatch.run('bat-mlk-02', 'MLK-W44-B', 'prod-7', 'sup-4', 60, 48, formatOffset(-3), formatOffset(12), 2.10, formatOffset(-2), 'Backstock cooler.', now, now);

  // Product 8: Greek Yogurt
  // Batch 1: Expired 2 days ago
  insertBatch.run('bat-yog-01', 'YOG-EXP-02', 'prod-8', 'sup-4', 30, 8, formatOffset(-25), formatOffset(-2), 2.80, formatOffset(-20), 'Pulled from display case.', now, now);
  // Batch 2: Critical! Expires in 5 days
  insertBatch.run('bat-yog-02', 'YOG-CRT-05', 'prod-8', 'sup-4', 40, 18, formatOffset(-14), formatOffset(5), 2.80, formatOffset(-10), 'Front of refrigerator row.', now, now);

  // Product 9: Vitamin D3 (Slow moving / high stability)
  // Batch 1: Safe! Expires in 450 days
  insertBatch.run('bat-vit-01', 'VIT-D-2026', 'prod-9', 'sup-1', 50, 42, formatOffset(-60), formatOffset(450), 6.20, formatOffset(-50), 'Shelf G3.', now, now);

  // Product 10: Hydrocortisone
  // Batch 1: Upcoming! Expires in 40 days
  insertBatch.run('bat-hyd-01', 'HYD-LOT-12', 'prod-10', 'sup-1', 40, 22, formatOffset(-150), formatOffset(40), 4.10, formatOffset(-140), 'Dermatology counter.', now, now);

  // Stock movements
  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (id, transaction_code, product_id, batch_id, movement_type, quantity, unit_price, total_value, user_id, user_name, reference_number, notes, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMovement.run('mov-1', 'TX-2026-001', 'prod-1', 'bat-amx-02', 'SALE', 10, 32.00, 320.00, 'u-staff-1', 'Elena Rostova', 'REC-9081', 'Prescription filled for outpatient department', formatOffset(-2) + 'T09:14:00Z');
  insertMovement.run('mov-2', 'TX-2026-002', 'prod-3', 'bat-flu-02', 'USAGE', 8, 45.00, 360.00, 'u-mgr-1', 'Marcus Vance', 'CLIN-FL-08', 'Staff annual occupational health immunization drive', formatOffset(-3) + 'T11:30:00Z');
  insertMovement.run('mov-3', 'TX-2026-003', 'prod-5', 'bat-glv-01', 'USAGE', 15, 14.99, 224.85, 'u-staff-1', 'Elena Rostova', 'DEPT-ICU-04', 'Emergency ward restock allocation', formatOffset(-1) + 'T14:22:00Z');
  insertMovement.run('mov-4', 'TX-2026-004', 'prod-7', 'bat-mlk-01', 'SALE', 12, 4.29, 51.48, 'u-staff-1', 'Elena Rostova', 'POS-8831', 'Point of sale counter dispatch', formatOffset(-1) + 'T16:05:00Z');
  insertMovement.run('mov-5', 'TX-2026-005', 'prod-2', 'bat-cef-01', 'SALE', 6, 24.50, 147.00, 'u-staff-1', 'Elena Rostova', 'REC-9102', 'Inpatient pharmacy prescription order', formatOffset(0) + 'T08:45:00Z');

  // Past Expiry Disposal Records (Audit history)
  const insertDisposal = db.prepare(`
    INSERT INTO expiry_disposals (id, batch_id, product_id, quantity, unit_cost, total_loss, disposal_method, reason, disposed_by_id, disposed_by_name, reference_no, certificate_no, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDisposal.run('disp-1', 'bat-amx-01', 'prod-1', 12, 18.00, 216.00, 'Incineration', 'Batch past statutory expiry limit. Verified by Quality Assurance.', 'u-mgr-1', 'Marcus Vance', 'DISP-2026-001', 'CERT-EPA-8821', formatOffset(-10) + 'T10:00:00Z');

  // Purchase orders
  const insertPO = db.prepare(`
    INSERT INTO purchase_orders (id, po_number, supplier_id, status, order_date, expected_date, total_amount, notes, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPO.run('po-1', 'PO-2026-1049', 'sup-3', 'ORDERED', formatOffset(-2), formatOffset(4), 450.00, 'Urgent replenishment for low stock sterile nitrile exam gloves', 'Marcus Vance', now);

  const insertPOItem = db.prepare(`
    INSERT INTO purchase_order_items (id, po_id, product_id, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertPOItem.run('poi-1', 'po-1', 'prod-5', 60, 7.50, 450.00);

  // Audit Logs
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run('aud-1', 'u-admin-1', 'Dr. Sarah Mitchell', 'SYSTEM_INITIALIZATION', 'SYSTEM', 'app', 'System initialized with FEFO inventory rules and regulatory batch controls', now);
  // Seed initial CRM customers & sales orders
  seedCustomersAndOrders();

  // Generate automated notifications
  refreshNotifications();
}

/**
 * Scans all product batches and stock balances to generate live, accurate notifications
 * without duplicate spamming.
 */
export function refreshNotifications() {
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  // 1. Scan Batches for Expiry Statuses
  const batches = db.prepare(`
    SELECT b.*, p.name as product_name, p.sku
    FROM batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.remaining_quantity > 0
  `).all() as any[];

  const insertNotif = db.prepare(`
    INSERT OR IGNORE INTO notifications (id, title, message, type, severity, product_id, batch_id, is_read, dedupe_key, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

  const now = new Date().toISOString();

  for (const b of batches) {
    const exp = new Date(b.expiry_date);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Expired!
      const dedupe = `EXPIRED_${b.id}_${todayStr}`;
      insertNotif.run(
        `notif-exp-${b.id}`,
        `Expired Stock Alert: ${b.product_name}`,
        `Batch ${b.batch_number} (${b.remaining_quantity} units) expired on ${b.expiry_date} (${Math.abs(diffDays)} days ago). Excluded from usable inventory. Financial loss risk: $${(b.remaining_quantity * b.purchase_price).toFixed(2)}.`,
        'EXPIRED',
        'CRITICAL',
        b.product_id,
        b.id,
        dedupe,
        now
      );
    } else if (diffDays <= 7) {
      // Critical Expiry (within 7 days)
      const dedupe = `CRITICAL_${b.id}_${todayStr}`;
      insertNotif.run(
        `notif-crt-${b.id}`,
        `Critical Expiry Warning: ${b.product_name}`,
        `Batch ${b.batch_number} (${b.remaining_quantity} units) will expire in ${diffDays} day${diffDays === 1 ? '' : 's'} (${b.expiry_date}). Prioritize FEFO distribution immediately.`,
        'CRITICAL_EXPIRY',
        'CRITICAL',
        b.product_id,
        b.id,
        dedupe,
        now
      );
    } else if (diffDays <= 30) {
      // Warning Expiry (8-30 days)
      const dedupe = `WARN_${b.id}_${todayStr}`;
      insertNotif.run(
        `notif-wrn-${b.id}`,
        `Upcoming Expiry: ${b.product_name}`,
        `Batch ${b.batch_number} (${b.remaining_quantity} units) expires in ${diffDays} days (${b.expiry_date}). Review stock rotation.`,
        'WARNING_EXPIRY',
        'WARNING',
        b.product_id,
        b.id,
        dedupe,
        now
      );
    }
  }

  // 2. Scan Products for Low Stock
  // Usable stock is batches with expiry >= todayStr and remaining_quantity > 0
  const products = db.prepare(`
    SELECT p.*,
      COALESCE(
        (SELECT SUM(remaining_quantity) FROM batches WHERE product_id = p.id AND expiry_date >= ?),
        0
      ) as usable_stock
    FROM products p
  `).all(todayStr) as any[];

  for (const p of products) {
    if (p.usable_stock <= p.min_stock) {
      const dedupe = `LOWSTOCK_${p.id}_${todayStr}`;
      const suggested = Math.max(p.min_stock * 2 - p.usable_stock, p.min_stock);
      insertNotif.run(
        `notif-low-${p.id}`,
        `Low Usable Stock Alert: ${p.name}`,
        `Usable stock (${p.usable_stock} ${p.unit}) has fallen below minimum threshold (${p.min_stock} ${p.unit}). Suggested replenishment: +${suggested} ${p.unit}.`,
        'LOW_STOCK',
        'WARNING',
        p.id,
        null,
        dedupe,
        now
      );
    }
  }
}

export function seedCustomersAndOrders() {
  const now = new Date().toISOString();
  const today = new Date();
  const formatOffset = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const insertCust = db.prepare(`
    INSERT OR IGNORE INTO customers (id, customer_code, name, phone, email, address, customer_type, registration_date, notes, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertCust.run(
    'cust-1', 'CUST-2026-001', 'St. Jude Community Hospital', '+1 (555) 019-2831',
    'procurement@stjude-hospital.org', '742 Evergreen Medical Pkwy, Suite 400',
    'BUSINESS', formatOffset(-45), 'Tier-1 Institutional account. Net-30 wholesale terms.', now, now
  );
  insertCust.run(
    'cust-2', 'CUST-2026-002', 'Metro Care Pharmacy Group', '+1 (555) 024-8842',
    'orders@metrocarepharmacy.com', '104 Central Boulevard, District 3',
    'BUSINESS', formatOffset(-30), 'Retail pharmacy branch. Authorized for prescription and OTC.', now, now
  );
  insertCust.run(
    'cust-3', 'CUST-2026-003', 'Dr. Sarah Jenkins Clinic', '+1 (555) 038-7719',
    'sjenkins@jenkinsmedical.com', '88 Healthcare Plaza, West Wing',
    'BUSINESS', formatOffset(-20), 'Private pediatric clinic. Weekly supplies.', now, now
  );
  insertCust.run(
    'cust-4', 'CUST-2026-004', 'Marcus Vance', '+1 (555) 049-3320',
    'marcus.vance@gmail.com', '12 Elm Street, Apt 4B',
    'INDIVIDUAL', formatOffset(-15), 'Regular patient customer. Prescriptions filled bi-weekly.', now, now
  );
  insertCust.run(
    'cust-5', 'CUST-2026-005', 'Elena Rostova', '+1 (555) 055-6677',
    'elena.rostova@outlook.com', '45 Park Boulevard',
    'INDIVIDUAL', formatOffset(-10), 'Family health care customer. Vitamins and seasonal wellness.', now, now
  );

  const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders (
      id, order_number, customer_id, order_date, subtotal, discount, tax_rate, tax_amount,
      total_amount, paid_amount, outstanding_balance, payment_status, order_status,
      user_id, user_name, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT OR IGNORE INTO order_items (
      id, order_id, product_id, product_name, sku, batch_id, batch_number, expiry_date,
      quantity, unit_price, discount, total_price
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPay = db.prepare(`
    INSERT OR IGNORE INTO payments (
      id, payment_number, order_id, customer_id, amount, payment_date,
      payment_method, payment_reference, notes, received_by_id, received_by_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Order 1: St. Jude Hospital - Fully Paid via Bank Transfer
  insertOrder.run(
    'ord-1', 'ORD-2026-1001', 'cust-1', formatOffset(-3),
    437.00, 20.00, 8.0, 33.36, 450.36, 450.36, 0.00,
    'PAID', 'COMPLETED', 'u-nahom-1', 'Nahom M', 'Routine hospital replenishment order. Authorized batch delivery.', now, now
  );
  insertItem.run('oi-1', 'ord-1', 'prod-2', 'Ceftriaxone Sodium Injection 1g Vial', 'MED-CEF-001', 'bat-cef-02', 'CEF-LOT-940', formatOffset(180), 10, 24.50, 0, 245.00);
  insertItem.run('oi-2', 'ord-1', 'prod-1', 'Amoxicillin Trihydrate 500mg (100 Caps)', 'MED-AMX-500', 'bat-amx-03', 'AMX-2025-W3', formatOffset(22), 6, 32.00, 0, 192.00);
  insertPay.run('pay-1', 'PAY-2026-001', 'ord-1', 'cust-1', 450.36, formatOffset(-3), 'BANK_TRANSFER', 'WT-BOA-99214', 'Direct corporate wire transfer confirmed', 'u-nahom-1', 'Nahom M', now);

  // Order 2: Metro Care Pharmacy - Partial payment with outstanding credit balance
  insertOrder.run(
    'ord-2', 'ORD-2026-1002', 'cust-2', formatOffset(-2),
    270.00, 0.00, 8.0, 21.60, 291.60, 150.00, 141.60,
    'PARTIAL', 'COMPLETED', 'u-eyob-1', 'Eyob T', 'Urgent quadrivalent influenza vaccines. Remainder on net-15 terms.', now, now
  );
  insertItem.run('oi-3', 'ord-2', 'prod-3', 'Influenza Quadrivalent Vaccine 0.5mL Pre-filled Syringe', 'VAC-FLU-QUAD', 'bat-flu-03', 'FLU-2025-UPC', formatOffset(48), 6, 45.00, 0, 270.00);
  insertPay.run('pay-2', 'PAY-2026-002', 'ord-2', 'cust-2', 150.00, formatOffset(-2), 'CASH', 'CASH-REC-1092', 'Deposit received at counter', 'u-eyob-1', 'Eyob T', now);

  // Order 3: Dr. Sarah Jenkins Clinic - Paid via Mobile Money
  insertOrder.run(
    'ord-3', 'ORD-2026-1003', 'cust-3', formatOffset(-1),
    98.00, 5.00, 8.0, 7.44, 100.44, 100.44, 0.00,
    'PAID', 'COMPLETED', 'u-eyosias-1', 'Eyosias T', 'Clinical stock of hydrocortisone topical tubes.', now, now
  );
  insertItem.run('oi-4', 'ord-3', 'prod-10', 'Hydrocortisone 1% Topical Anti-Itch Cream 60g', 'MED-HYD-060', 'bat-hyd-01', 'HYD-LOT-12', formatOffset(40), 10, 9.80, 5.00, 93.00);
  insertPay.run('pay-3', 'PAY-2026-003', 'ord-3', 'cust-3', 100.44, formatOffset(-1), 'MOBILE_MONEY', 'MM-TX-88301', 'Mobile wallet clearance verified', 'u-eyosias-1', 'Eyosias T', now);

  // Order 4: Marcus Vance - Unpaid Credit Sale
  insertOrder.run(
    'ord-4', 'ORD-2026-1004', 'cust-4', formatOffset(0),
    31.98, 0.00, 8.0, 2.56, 34.54, 0.00, 34.54,
    'UNPAID', 'COMPLETED', 'u-bekalu-1', 'Bekalu G', 'Credit sale account for regular customer.', now, now
  );
  insertItem.run('oi-5', 'ord-4', 'prod-9', 'Vitamin D3 5000 IU High Potency Softgels (120s)', 'VIT-D3-5000', 'bat-vit-01', 'VIT-D-2026', formatOffset(450), 2, 15.99, 0, 31.98);
}
