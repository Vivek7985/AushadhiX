import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';

// Database storage directory for real PostgreSQL persistence
const dbDir = path.resolve(process.cwd(), 'data/postgres-db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const pg: any = new PGlite(dbDir);

export async function initializeDatabase() {
  console.log('[PostgreSQL] Initializing relational schema and tables...');

  await pg.exec(`
    -- Enable UUID extension if available
    CREATE TABLE IF NOT EXISTS branches (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      address TEXT,
      phone VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      contact_person VARCHAR(255),
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      address TEXT NOT NULL,
      gstin VARCHAR(50),
      dl_number VARCHAR(50),
      credit_period_days INTEGER DEFAULT 30,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255),
      address TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255) NOT NULL,
      generic_name VARCHAR(255) NOT NULL,
      category_id VARCHAR(50) REFERENCES categories(id),
      dosage_form VARCHAR(50) NOT NULL,
      schedule VARCHAR(50) NOT NULL,
      prescription_required BOOLEAN DEFAULT FALSE,
      storage_condition VARCHAR(100) DEFAULT 'Room Temperature',
      min_stock_level INTEGER DEFAULT 20,
      max_stock_level INTEGER DEFAULT 500,
      reorder_point INTEGER DEFAULT 50,
      image_url TEXT,
      barcode VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_compositions (
      id VARCHAR(50) PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      active_ingredient VARCHAR(255) NOT NULL,
      strength VARCHAR(100) NOT NULL,
      is_primary BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS product_unit_conversions (
      id VARCHAR(50) PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      level INTEGER NOT NULL,
      unit_name VARCHAR(50) NOT NULL,
      conversion_factor INTEGER NOT NULL,
      is_base_unit BOOLEAN DEFAULT FALSE,
      is_default_selling_unit BOOLEAN DEFAULT FALSE,
      CONSTRAINT unq_product_unit UNIQUE (product_id, unit_name)
    );

    CREATE TABLE IF NOT EXISTS product_batches (
      id VARCHAR(50) PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      batch_number VARCHAR(100) NOT NULL,
      expiry_date VARCHAR(20) NOT NULL,
      manufacture_date VARCHAR(20),
      mrp NUMERIC(12, 2) NOT NULL,
      purchase_price_per_base_unit NUMERIC(12, 2) NOT NULL,
      selling_price_per_base_unit NUMERIC(12, 2) NOT NULL,
      opening_base_quantity INTEGER NOT NULL DEFAULT 0,
      available_base_quantity INTEGER NOT NULL DEFAULT 0,
      allocated_base_quantity INTEGER NOT NULL DEFAULT 0,
      damaged_base_quantity INTEGER NOT NULL DEFAULT 0,
      supplier_id VARCHAR(50) REFERENCES suppliers(id),
      branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unq_product_batch_branch UNIQUE (product_id, batch_number, branch_id)
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id VARCHAR(50) PRIMARY KEY,
      order_number VARCHAR(100) UNIQUE NOT NULL,
      supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id),
      branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
      order_date VARCHAR(20) NOT NULL,
      expected_delivery_date VARCHAR(20),
      status VARCHAR(50) NOT NULL DEFAULT 'ORDERED',
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      received_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id VARCHAR(50) PRIMARY KEY,
      purchase_order_id VARCHAR(50) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id VARCHAR(50) NOT NULL REFERENCES products(id),
      ordered_quantity INTEGER NOT NULL,
      received_quantity INTEGER NOT NULL DEFAULT 0,
      packaging_unit VARCHAR(50) NOT NULL,
      conversion_factor INTEGER NOT NULL DEFAULT 1,
      unit_purchase_cost NUMERIC(12, 2) NOT NULL,
      total_cost NUMERIC(12, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id VARCHAR(50) PRIMARY KEY,
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
      customer_id VARCHAR(50) REFERENCES customers(id),
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50),
      doctor_name VARCHAR(255),
      doctor_reg_no VARCHAR(100),
      patient_age INTEGER,
      patient_gender VARCHAR(20),
      prescription_url TEXT,
      subtotal NUMERIC(12, 2) NOT NULL,
      discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(12, 2) NOT NULL,
      total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
      net_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
      amount_paid NUMERIC(12, 2) NOT NULL,
      change_returned NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'Completed',
      notes TEXT,
      created_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      cancelled_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id VARCHAR(50) PRIMARY KEY,
      sale_id VARCHAR(50) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id VARCHAR(50) NOT NULL REFERENCES products(id),
      batch_id VARCHAR(50) NOT NULL REFERENCES product_batches(id),
      packaging_unit VARCHAR(50) NOT NULL,
      conversion_factor INTEGER NOT NULL DEFAULT 1,
      quantity INTEGER NOT NULL,
      base_quantity INTEGER NOT NULL,
      unit_mrp NUMERIC(12, 2) NOT NULL,
      unit_selling_price NUMERIC(12, 2) NOT NULL,
      unit_purchase_cost NUMERIC(12, 2) NOT NULL,
      gross_amount NUMERIC(12, 2) NOT NULL,
      discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      net_amount NUMERIC(12, 2) NOT NULL,
      item_profit NUMERIC(12, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id VARCHAR(50) PRIMARY KEY,
      branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
      product_id VARCHAR(50) NOT NULL REFERENCES products(id),
      batch_id VARCHAR(50) NOT NULL REFERENCES product_batches(id),
      movement_type VARCHAR(50) NOT NULL,
      quantity_delta INTEGER NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after INTEGER NOT NULL,
      unit VARCHAR(50) NOT NULL DEFAULT 'Base Unit',
      reference_type VARCHAR(50) NOT NULL,
      reference_id VARCHAR(100) NOT NULL,
      notes TEXT,
      performed_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(50) PRIMARY KEY,
      branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
      action VARCHAR(100) NOT NULL,
      module VARCHAR(100) NOT NULL,
      details TEXT NOT NULL,
      user_name VARCHAR(100) NOT NULL,
      user_role VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id VARCHAR(50) PRIMARY KEY,
      branch_id VARCHAR(50) NOT NULL REFERENCES branches(id),
      pharmacy_name VARCHAR(255) NOT NULL,
      dl_number VARCHAR(100) NOT NULL,
      gstin VARCHAR(100) NOT NULL,
      address TEXT NOT NULL,
      phone VARCHAR(50) NOT NULL,
      near_expiry_days INTEGER DEFAULT 90,
      low_stock_threshold_days INTEGER DEFAULT 30,
      allow_expired_billing BOOLEAN DEFAULT FALSE,
      require_doctor_info_schedule_h BOOLEAN DEFAULT TRUE,
      default_tax_rate NUMERIC(5, 2) DEFAULT 12.00,
      currency_symbol VARCHAR(10) DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance and strict query constraints
    CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_batches_fefo ON product_batches(product_id, expiry_date, available_base_quantity);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_batch ON sale_items(batch_id);
    CREATE INDEX IF NOT EXISTS idx_inv_movements_batch ON inventory_movements(batch_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_inv_movements_prod ON inventory_movements(product_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
  `);

  console.log('[PostgreSQL] Relational schema and indexes initialized.');
  await seedDatabaseIfEmpty();
}

async function seedDatabaseIfEmpty() {
  const branchCount = await pg.query('SELECT COUNT(*) as count FROM branches');
  if (parseInt((branchCount.rows[0] as any)?.count || '0', 10) > 0) {
    console.log('[PostgreSQL] Database already contains records. Skipping seed.');
    return;
  }

  console.log('[PostgreSQL] Seeding initial pharmacy data into PostgreSQL...');

  await (pg as any).transaction(async (tx: any) => {
    // 1. Primary Store / Branch
    await tx.query(`
      INSERT INTO branches (id, name, code, address, phone, is_active)
      VALUES ('BRANCH-01', 'AushadhiX Central Pharmacy - Store #1', 'CENTRAL-01', '124 Healthcare Hub, Medicity, New Delhi', '+91 11 4567 8900', TRUE);
    `);

    // 2. System Settings
    await tx.query(`
      INSERT INTO system_settings (id, branch_id, pharmacy_name, dl_number, gstin, address, phone, near_expiry_days, low_stock_threshold_days, allow_expired_billing, require_doctor_info_schedule_h, default_tax_rate, currency_symbol)
      VALUES ('SETT-01', 'BRANCH-01', 'AushadhiX Pharmacy & Clinical Dispense', 'DL-20B-129482/21B-129483', '07AAAAA0000A1Z5', 'Shop 14-16, Metro Medicare Plaza, Sector 18', '+91 98765 43210', 90, 30, FALSE, TRUE, 12.00, '');
    `);

    // 3. Categories
    const categories = [
      ['CAT-01', 'Analgesic & Antipyretic', 'Pain relief, fever reduction and inflammatory management'],
      ['CAT-02', 'Antibiotics & Antimicrobial', 'Bacterial infection treatment, broad spectrum therapies'],
      ['CAT-03', 'Antacid & Gastrointestinal', 'Proton pump inhibitors, acid reflux, and digestion'],
      ['CAT-04', 'Cardiovascular & Antihypertensive', 'Blood pressure, cardiac rhythm, and vascular health'],
      ['CAT-05', 'Antidiabetic', 'Blood glucose regulation and metabolic therapy'],
      ['CAT-06', 'Respiratory & Antiallergic', 'Bronchodilators, antihistamines, and cough formulas'],
    ];

    for (const [id, name, desc] of categories) {
      await tx.query('INSERT INTO categories (id, name, description) VALUES ($1, $2, $3)', [id, name, desc]);
    }

    // 4. Suppliers
    const suppliers = [
      ['SUPP-01', 'Apex Pharma Distributors', 'APEX-01', 'Rajesh Sharma', '+91 98111 22334', 'orders@apexpharma.com', 'Plot 45, Okhla Phase III, Industrial Area, New Delhi', '07AABCA1234F1Z1', 'DL-OKH-19283'],
      ['SUPP-02', 'Cipla Care Logistics', 'CIPLA-LOG', 'Anita Deshmukh', '+91 98222 33445', 'supply@ciplacare.in', 'Godown 12, Transport Nagar, Outer Ring Road, New Delhi', '07BBBCD5678G2Z2', 'DL-CIP-99281'],
      ['SUPP-03', 'Sun Med Wholesale Syndicate', 'SUN-MED', 'Vikram Malhotra', '+91 98333 44556', 'sales@sunmedwholesale.com', 'Building 8, Medicine Market, Chandni Chowk, Delhi', '07CCCDE9012H3Z3', 'DL-SUN-88371'],
      ['SUPP-04', 'Zydus Healthline Depot', 'ZYDUS-DEP', 'Kunal Verma', '+91 98444 55667', 'depot@zydushealth.org', 'Sector 58, Industrial Estate, Faridabad', '06DDDEF3456J4Z4', 'DL-ZYD-77261'],
    ];

    for (const s of suppliers) {
      await tx.query(`
        INSERT INTO suppliers (id, name, code, contact_person, phone, email, address, gstin, dl_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, s);
    }

    // 5. Customers
    const customers = [
      ['CUST-01', 'Rahul Verma', '+91 98765 11111', 'rahul.verma@example.com', 'A-42, Defence Colony, New Delhi'],
      ['CUST-02', 'Sunita Rao', '+91 98765 22222', 'sunita.rao@example.com', 'Flat 302, Palm Heights, Gurgaon'],
      ['CUST-03', 'Amitabh Sen', '+91 98765 33333', 'amitabh.sen@example.com', 'C-12, Greater Kailash I, New Delhi'],
      ['CUST-04', 'Pooja Bhatt', '+91 98765 44444', 'pooja.bhatt@example.com', 'H-89, Preet Vihar, Delhi'],
    ];

    for (const c of customers) {
      await tx.query('INSERT INTO customers (id, name, phone, email, address) VALUES ($1, $2, $3, $4, $5)', c);
    }

    // 6. Products
    const products = [
      {
        id: 'PROD-01',
        name: 'Paracetamol 500 mg (Dolo / Calpol generic)',
        brand: 'Micro Labs / GSK Generic',
        genericName: 'Paracetamol',
        categoryId: 'CAT-01',
        dosageForm: 'Tablet',
        schedule: 'OTC',
        prescriptionRequired: false,
        storageCondition: 'Store below 25°C in a dry place',
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderPoint: 80,
        imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60',
        barcode: '8901234567890',
        compositions: [
          { id: 'COMP-01', activeIngredient: 'Paracetamol (Acetaminophen)', strength: '500 mg', isPrimary: true }
        ],
        units: [
          { id: 'UNIT-01', level: 1, unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false },
          { id: 'UNIT-02', level: 2, unitName: 'Strip', conversionFactor: 10, isBaseUnit: false, isDefaultSellingUnit: true },
          { id: 'UNIT-03', level: 3, unitName: 'Box', conversionFactor: 100, isBaseUnit: false, isDefaultSellingUnit: false }
        ]
      },
      {
        id: 'PROD-02',
        name: 'Amoxicillin & Potassium Clavulanate 625 mg (Augmentin)',
        brand: 'GSK Pharmaceuticals',
        genericName: 'Amoxicillin + Clavulanic Acid',
        categoryId: 'CAT-02',
        dosageForm: 'Tablet',
        schedule: 'Schedule H1',
        prescriptionRequired: true,
        storageCondition: 'Store in airtight container below 25°C',
        minStockLevel: 30,
        maxStockLevel: 300,
        reorderPoint: 50,
        imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&auto=format&fit=crop&q=60',
        barcode: '8902345678901',
        compositions: [
          { id: 'COMP-02-1', activeIngredient: 'Amoxicillin Trihydrate', strength: '500 mg', isPrimary: true },
          { id: 'COMP-02-2', activeIngredient: 'Potassium Clavulanate', strength: '125 mg', isPrimary: false }
        ],
        units: [
          { id: 'UNIT-04', level: 1, unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false },
          { id: 'UNIT-05', level: 2, unitName: 'Strip', conversionFactor: 6, isBaseUnit: false, isDefaultSellingUnit: true },
          { id: 'UNIT-06', level: 3, unitName: 'Box', conversionFactor: 60, isBaseUnit: false, isDefaultSellingUnit: false }
        ]
      },
      {
        id: 'PROD-03',
        name: 'Pan 40 (Pantoprazole Gastro-Resistant Tablets 40 mg)',
        brand: 'Alkem Laboratories',
        genericName: 'Pantoprazole Sodium',
        categoryId: 'CAT-03',
        dosageForm: 'Tablet',
        schedule: 'Schedule H',
        prescriptionRequired: true,
        storageCondition: 'Protect from light and moisture',
        minStockLevel: 40,
        maxStockLevel: 400,
        reorderPoint: 60,
        imageUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&auto=format&fit=crop&q=60',
        barcode: '8903456789012',
        compositions: [
          { id: 'COMP-03', activeIngredient: 'Pantoprazole Sodium Gastro-Resistant', strength: '40 mg', isPrimary: true }
        ],
        units: [
          { id: 'UNIT-07', level: 1, unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false },
          { id: 'UNIT-08', level: 2, unitName: 'Strip', conversionFactor: 15, isBaseUnit: false, isDefaultSellingUnit: true },
          { id: 'UNIT-09', level: 3, unitName: 'Box', conversionFactor: 150, isBaseUnit: false, isDefaultSellingUnit: false }
        ]
      },
      {
        id: 'PROD-04',
        name: 'Telma 40 (Telmisartan Tablets IP 40 mg)',
        brand: 'Glenmark Pharmaceuticals',
        genericName: 'Telmisartan',
        categoryId: 'CAT-04',
        dosageForm: 'Tablet',
        schedule: 'Schedule H',
        prescriptionRequired: true,
        storageCondition: 'Store below 30°C',
        minStockLevel: 30,
        maxStockLevel: 300,
        reorderPoint: 50,
        imageUrl: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=60',
        barcode: '8904567890123',
        compositions: [
          { id: 'COMP-04', activeIngredient: 'Telmisartan', strength: '40 mg', isPrimary: true }
        ],
        units: [
          { id: 'UNIT-10', level: 1, unitName: 'Tablet', conversionFactor: 1, isBaseUnit: true, isDefaultSellingUnit: false },
          { id: 'UNIT-11', level: 2, unitName: 'Strip', conversionFactor: 15, isBaseUnit: false, isDefaultSellingUnit: true }
        ]
      }
    ];

    for (const p of products) {
      await tx.query(`
        INSERT INTO products (id, name, brand, generic_name, category_id, dosage_form, schedule, prescription_required, storage_condition, min_stock_level, max_stock_level, reorder_point, image_url, barcode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [p.id, p.name, p.brand, p.genericName, p.categoryId, p.dosageForm, p.schedule, p.prescriptionRequired, p.storageCondition, p.minStockLevel, p.maxStockLevel, p.reorderPoint, p.imageUrl, p.barcode]);

      for (const comp of p.compositions) {
        await tx.query(`
          INSERT INTO product_compositions (id, product_id, active_ingredient, strength, is_primary)
          VALUES ($1, $2, $3, $4, $5)
        `, [comp.id, p.id, comp.activeIngredient, comp.strength, comp.isPrimary]);
      }

      for (const u of p.units) {
        await tx.query(`
          INSERT INTO product_unit_conversions (id, product_id, level, unit_name, conversion_factor, is_base_unit, is_default_selling_unit)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [u.id, p.id, u.level, u.unitName, u.conversionFactor, u.isBaseUnit, u.isDefaultSellingUnit]);
      }
    }

    // 7. Batches (including Paracetamol Batch PARA001: Cost 10/tab, Sell 12/tab, MRP 14/tab, 100 Tablets Opening)
    const batches = [
      {
        id: 'BATCH-01',
        productId: 'PROD-01',
        batchNumber: 'PARA001',
        expiryDate: '2027-08-31',
        manufactureDate: '2024-09-01',
        mrp: 14.00,
        purchasePrice: 10.00,
        sellingPrice: 12.00,
        openingBaseQuantity: 100,
        availableBaseQuantity: 100,
        allocatedBaseQuantity: 0,
        damagedBaseQuantity: 0,
        supplierId: 'SUPP-01',
        branchId: 'BRANCH-01',
        notes: 'Primary opening stock batch - Verified baseline'
      },
      {
        id: 'BATCH-02',
        productId: 'PROD-01',
        batchNumber: 'PARA002',
        expiryDate: '2027-11-30',
        manufactureDate: '2024-11-15',
        mrp: 15.00,
        purchasePrice: 10.50,
        sellingPrice: 13.00,
        openingBaseQuantity: 50,
        availableBaseQuantity: 50,
        allocatedBaseQuantity: 0,
        damagedBaseQuantity: 0,
        supplierId: 'SUPP-01',
        branchId: 'BRANCH-01',
        notes: 'Secondary batch with updated purchase cost'
      },
      {
        id: 'BATCH-03',
        productId: 'PROD-02',
        batchNumber: 'AUG625-A',
        expiryDate: '2026-12-31',
        manufactureDate: '2024-06-10',
        mrp: 38.00,
        purchasePrice: 24.50,
        sellingPrice: 33.50,
        openingBaseQuantity: 120,
        availableBaseQuantity: 120,
        allocatedBaseQuantity: 0,
        damagedBaseQuantity: 0,
        supplierId: 'SUPP-02',
        branchId: 'BRANCH-01',
        notes: 'Augmentin 625mg batch'
      },
      {
        id: 'BATCH-04',
        productId: 'PROD-03',
        batchNumber: 'PAN40-X1',
        expiryDate: '2027-04-30',
        manufactureDate: '2024-08-01',
        mrp: 12.50,
        purchasePrice: 7.20,
        sellingPrice: 10.50,
        openingBaseQuantity: 150,
        availableBaseQuantity: 150,
        allocatedBaseQuantity: 0,
        damagedBaseQuantity: 0,
        supplierId: 'SUPP-03',
        branchId: 'BRANCH-01',
        notes: 'Pan 40 batch'
      },
      {
        id: 'BATCH-05',
        productId: 'PROD-04',
        batchNumber: 'TEL40-B',
        expiryDate: '2027-02-28',
        manufactureDate: '2024-07-20',
        mrp: 16.00,
        purchasePrice: 9.80,
        sellingPrice: 14.00,
        openingBaseQuantity: 90,
        availableBaseQuantity: 90,
        allocatedBaseQuantity: 0,
        damagedBaseQuantity: 0,
        supplierId: 'SUPP-04',
        branchId: 'BRANCH-01',
        notes: 'Telma 40 batch'
      }
    ];

    for (const b of batches) {
      await tx.query(`
        INSERT INTO product_batches (id, product_id, batch_number, expiry_date, manufacture_date, mrp, purchase_price_per_base_unit, selling_price_per_base_unit, opening_base_quantity, available_base_quantity, allocated_base_quantity, damaged_base_quantity, supplier_id, branch_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [b.id, b.productId, b.batchNumber, b.expiryDate, b.manufactureDate, b.mrp, b.purchasePrice, b.sellingPrice, b.openingBaseQuantity, b.availableBaseQuantity, b.allocatedBaseQuantity, b.damagedBaseQuantity, b.supplierId, b.branchId, b.notes]);

      // Insert Initial Stock Movement into immutable ledger
      await tx.query(`
        INSERT INTO inventory_movements (id, branch_id, product_id, batch_id, movement_type, quantity_delta, quantity_before, quantity_after, unit, reference_type, reference_id, notes, performed_by)
        VALUES ($1, $2, $3, $4, 'OPENING', $5, 0, $5, 'Tablets', 'OPENING_BALANCE', 'INIT-LEDGER', 'Initial stock verified in database', 'System Admin')
      `, ['MOV-' + b.id, b.branchId, b.productId, b.id, b.availableBaseQuantity]);
    }

    // 8. Sample Purchase Order
    await tx.query(`
      INSERT INTO purchase_orders (id, order_number, supplier_id, branch_id, order_date, expected_delivery_date, status, total_amount, tax_amount, notes, created_by)
      VALUES ('PO-01', 'PO-2026-001', 'SUPP-01', 'BRANCH-01', '2026-09-10', '2026-09-18', 'ORDERED', 1000.00, 120.00, 'Regular replenishment of Paracetamol 500mg (10 strips = 100 tabs)', 'Dr. Sharma')
    `);

    await tx.query(`
      INSERT INTO purchase_order_items (id, purchase_order_id, product_id, ordered_quantity, received_quantity, packaging_unit, conversion_factor, unit_purchase_cost, total_cost)
      VALUES ('POI-01', 'PO-01', 'PROD-01', 10, 0, 'Strip', 10, 100.00, 1000.00)
    `);

    // 9. Initial Audit Log
    await tx.query(`
      INSERT INTO audit_logs (id, branch_id, action, module, details, user_name, user_role)
      VALUES ('AUDIT-01', 'BRANCH-01', 'DATABASE_INITIALIZATION', 'System', 'Relational PostgreSQL database schemas, constraints, and initial opening batches seeded successfully', 'System Administrator', 'admin')
    `);
  });

  console.log('[PostgreSQL] Database seeded successfully with 100% relational integrity.');
}
