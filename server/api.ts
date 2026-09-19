import { Router } from 'express';
import { pg, initializeDatabase } from './db.ts';
import {
  createSaleTransaction,
  cancelSaleTransaction,
  receiveGoodsTransaction,
  adjustStockTransaction,
  runAcceptanceTestTransaction,
} from './transactions.ts';

export const apiRouter = Router();

// GET /api/v1/bootstrap - Initial data loading from PostgreSQL
apiRouter.get('/bootstrap', async (req, res) => {
  try {
    // 1. Branches
    const branchesRes = await pg.query('SELECT * FROM branches ORDER BY id ASC');

    // 2. Settings
    const settingsRes = await pg.query('SELECT * FROM system_settings LIMIT 1');

    // 3. Categories & Suppliers & Customers
    const categoriesRes = await pg.query('SELECT * FROM categories ORDER BY name ASC');
    const suppliersRes = await pg.query('SELECT * FROM suppliers ORDER BY name ASC');
    const customersRes = await pg.query('SELECT * FROM customers ORDER BY name ASC');

    // 4. Products with compositions and units
    const productsRes = await pg.query('SELECT * FROM products ORDER BY name ASC');
    const compositionsRes = await pg.query('SELECT * FROM product_compositions ORDER BY is_primary DESC');
    const unitsRes = await pg.query('SELECT * FROM product_unit_conversions ORDER BY level ASC');

    const products = productsRes.rows.map((p) => {
      const pComps = compositionsRes.rows
        .filter((c) => c.product_id === p.id)
        .map((c) => ({
          id: c.id,
          activeIngredient: c.active_ingredient,
          strength: c.strength,
          isPrimary: c.is_primary,
          ingredient: c.active_ingredient, // type compatibility
        }));

      const pUnits = unitsRes.rows
        .filter((u) => u.product_id === p.id)
        .map((u) => ({
          id: u.id,
          level: Number(u.level),
          unitName: u.unit_name,
          name: u.unit_name, // type compatibility
          shortCode: u.unit_name.slice(0, 4).toUpperCase(),
          conversionFactor: Number(u.conversion_factor),
          multiplierToBase: Number(u.conversion_factor), // type compatibility
          isBaseUnit: Boolean(u.is_base_unit),
          isDefaultSellingUnit: Boolean(u.is_default_selling_unit),
        }));

      const baseUnitName = pUnits.find((u) => u.isBaseUnit)?.name || pUnits[0]?.name || 'Tablet';
      const categoryObj = categoriesRes.rows.find((cat) => cat.id === p.category_id);

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        manufacturer: p.brand,
        genericName: p.generic_name,
        categoryId: p.category_id,
        category: categoryObj ? categoryObj.name : 'Medicines',
        dosageForm: p.dosage_form,
        schedule: p.schedule,
        prescriptionRequired: Boolean(p.prescription_required),
        requiresPrescription: Boolean(p.prescription_required),
        storageCondition: p.storage_condition,
        minStockLevel: Number(p.min_stock_level),
        minStockBaseUnits: Number(p.min_stock_level),
        maxStockLevel: Number(p.max_stock_level),
        maxStockBaseUnits: Number(p.max_stock_level),
        reorderPoint: Number(p.reorder_point),
        reorderLevelBaseUnits: Number(p.reorder_point),
        imageUrl: p.image_url,
        image: p.image_url,
        barcode: p.barcode,
        sku: p.id,
        productCode: p.barcode || p.id,
        baseUnit: baseUnitName,
        units: pUnits,
        packagingUnits: pUnits,
        compositions: pComps,
        composition: pComps.map((c) => `${c.activeIngredient} ${c.strength}`).join(' + '),
        isActive: true,
        gstPercent: 12,
      };
    });

    // 5. Batches
    const batchesRes = await pg.query(`
      SELECT b.*, p.name as product_name, s.name as supplier_name
      FROM product_batches b
      LEFT JOIN products p ON b.product_id = p.id
      LEFT JOIN suppliers s ON b.supplier_id = s.id
      ORDER BY b.expiry_date ASC
    `);

    const batches = batchesRes.rows.map((b) => ({
      id: b.id,
      productId: b.product_id,
      productName: b.product_name,
      batchNumber: b.batch_number,
      expiryDate: b.expiry_date,
      manufactureDate: b.manufacture_date || '',
      mfgDate: b.manufacture_date || '',
      purchaseDate: b.created_at ? new Date(b.created_at).toISOString().slice(0, 10) : '2026-09-01',
      mrp: Number(b.mrp),
      mrpPerBaseUnit: Number(b.mrp),
      purchasePrice: Number(b.purchase_price_per_base_unit),
      purchasePricePerBaseUnit: Number(b.purchase_price_per_base_unit),
      sellingPrice: Number(b.selling_price_per_base_unit),
      sellingPricePerBaseUnit: Number(b.selling_price_per_base_unit),
      openingQuantity: Number(b.opening_base_quantity),
      initialBaseQuantity: Number(b.opening_base_quantity),
      availableQuantity: Number(b.available_base_quantity),
      availableBaseQuantity: Number(b.available_base_quantity),
      allocatedQuantity: Number(b.allocated_base_quantity),
      damagedQuantity: Number(b.damaged_base_quantity),
      damagedBaseQuantity: Number(b.damaged_base_quantity),
      supplierId: b.supplier_id || '',
      supplierName: b.supplier_name || 'Direct Wholesale',
      branchId: b.branch_id,
      notes: b.notes || '',
      createdAt: b.created_at,
    }));

    // 6. Purchase Orders with Items
    const poRes = await pg.query(`
      SELECT po.*, s.name as supplier_name 
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.created_at DESC
    `);
    const poiRes = await pg.query('SELECT poi.*, p.name as product_name FROM purchase_order_items poi LEFT JOIN products p ON poi.product_id = p.id');

    const purchaseOrders = poRes.rows.map((po) => {
      const items = poiRes.rows
        .filter((i) => i.purchase_order_id === po.id)
        .map((i) => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          unitId: i.packaging_unit,
          unitName: i.packaging_unit,
          orderedQuantity: Number(i.ordered_quantity),
          orderedUnitQuantity: Number(i.ordered_quantity),
          orderedBaseQuantity: Number(i.ordered_quantity) * Number(i.conversion_factor || 1),
          receivedQuantity: Number(i.received_quantity),
          receivedUnitQuantity: Number(i.received_quantity),
          receivedBaseQuantity: Number(i.received_quantity) * Number(i.conversion_factor || 1),
          packagingUnit: i.packaging_unit,
          conversionFactor: Number(i.conversion_factor),
          unitPurchaseCost: Number(i.unit_purchase_cost),
          unitPurchasePrice: Number(i.unit_purchase_cost),
          totalCost: Number(i.total_cost),
          totalAmount: Number(i.total_cost),
          taxPercent: 12,
        }));

      const subtotal = Number(po.total_amount) - Number(po.tax_amount);
      return {
        id: po.id,
        orderNumber: po.order_number,
        supplierId: po.supplier_id,
        supplierName: po.supplier_name || 'Wholesale Supplier',
        branchId: po.branch_id,
        orderDate: po.order_date,
        expectedDeliveryDate: po.expected_delivery_date,
        status: po.status === 'RECEIVED' ? 'Received' : po.status === 'PARTIALLY_RECEIVED' ? 'PartiallyReceived' : po.status === 'CANCELLED' ? 'Cancelled' : 'Ordered',
        subtotal,
        taxTotal: Number(po.tax_amount),
        discountTotal: 0,
        grandTotal: Number(po.total_amount),
        totalAmount: Number(po.total_amount),
        notes: po.notes || '',
        createdBy: po.created_by,
        createdAt: po.created_at,
        receivedAt: po.received_at,
        receivedDate: po.received_at ? new Date(po.received_at).toISOString().slice(0, 10) : undefined,
        items,
      };
    });

    // 7. Sales with Items
    const salesRes = await pg.query('SELECT * FROM sales ORDER BY created_at DESC LIMIT 100');
    const saleItemsRes = await pg.query('SELECT si.*, p.name as product_name, b.batch_number FROM sale_items si LEFT JOIN products p ON si.product_id = p.id LEFT JOIN product_batches b ON si.batch_id = b.id');

    const sales = salesRes.rows.map((s) => {
      const items = saleItemsRes.rows
        .filter((i) => i.sale_id === s.id)
        .map((i) => {
          const conversionFactor = Number(i.conversion_factor) || 1;
          const qty = Number(i.quantity) || 0;
          const baseQty = Number(i.base_quantity) || (qty * conversionFactor);
          const unitSellingPrice = Number(i.unit_selling_price) || 0;
          const unitPurchaseCost = Number(i.unit_purchase_cost) || 0;
          const grossAmount = Number(i.gross_amount) || (unitSellingPrice * qty);
          const netAmount = Number(i.net_amount) || grossAmount;
          const totalCost = unitPurchaseCost * qty;
          const profit = Number(i.item_profit) ?? (netAmount - totalCost);
          const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;
          return {
            id: i.id,
            productId: i.product_id,
            productName: i.product_name || '',
            brand: '',
            batchId: i.batch_id,
            batchNumber: i.batch_number || '',
            expiryDate: '',
            unitId: i.packaging_unit,
            unitName: i.packaging_unit,
            packagingUnit: i.packaging_unit,
            conversionFactor,
            multiplierToBase: conversionFactor,
            quantity: qty,
            quantityInUnit: qty,
            baseQuantity: baseQty,
            totalBaseQuantity: baseQty,
            unitMrp: Number(i.unit_mrp) || 0,
            mrp: Number(i.unit_mrp) || 0,
            costPerBaseUnit: unitPurchaseCost / conversionFactor,
            unitSellingPrice,
            sellingPricePerUnit: unitSellingPrice,
            sellingPricePerBaseUnit: unitSellingPrice / conversionFactor,
            unitPurchaseCost,
            discountPercent: 0,
            taxPercent: 0,
            grossAmount,
            discountAmount: Number(i.discount_amount) || 0,
            netAmount,
            totalAmount: netAmount,
            totalCost,
            profit,
            itemProfit: profit,
            profitAmount: profit,
            profitPercent,
          };
        });

      const grandTotal = Number(s.total_amount) || 0;
      const totalCost = Number(s.total_cost) || 0;
      const totalProfit = Number(s.net_profit) ?? (grandTotal - totalCost);
      const profitMarginPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : (grandTotal > 0 ? 100 : 0);
      const subtotal = Number(s.subtotal) || grandTotal;
      const discountAmount = Number(s.discount_amount) || 0;
      const taxAmount = Number(s.tax_amount) || 0;
      const amountPaid = Number(s.amount_paid) || grandTotal;
      const changeGiven = Number(s.change_returned) || 0;

      return {
        id: s.id,
        invoiceNumber: s.invoice_number,
        branchId: s.branch_id,
        dateTime: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
        customerId: s.customer_id,
        customerName: s.customer_name || 'Walk-in Customer',
        customerPhone: s.customer_phone || '',
        doctorName: s.doctor_name || '',
        doctorRegNo: s.doctor_reg_no,
        patientAge: s.patient_age,
        patientGender: s.patient_gender,
        prescriptionUrl: s.prescription_url,
        subtotal,
        discountTotal: discountAmount,
        discountAmount,
        taxTotal: taxAmount,
        taxAmount,
        grandTotal,
        totalAmount: grandTotal,
        totalCost,
        totalProfit,
        netProfit: totalProfit,
        profitMarginPercent,
        paymentMethod: s.payment_method || 'Cash',
        amountPaid,
        changeGiven,
        changeReturned: changeGiven,
        cashierName: s.created_by || 'Pharmacist',
        status: s.status,
        notes: s.notes || '',
        createdBy: s.created_by,
        createdAt: s.created_at,
        cancelledAt: s.cancelled_at,
        items,
      };
    });

    // 8. Immutable Stock Ledger (inventory_movements)
    const ledgerRes = await pg.query(`
      SELECT im.*, p.name as product_name, b.batch_number, b.purchase_price_per_base_unit, b.selling_price_per_base_unit
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      LEFT JOIN product_batches b ON im.batch_id = b.id
      ORDER BY im.created_at DESC LIMIT 200
    `);

    const stockLedger = ledgerRes.rows.map((im) => {
      const pCost = Number(im.purchase_price_per_base_unit) || 10;
      const sPrice = Number(im.selling_price_per_base_unit) || 12;
      const absQty = Math.abs(Number(im.quantity_delta));
      const totalCost = absQty * pCost;
      const totalRev = absQty * sPrice;

      let transType = 'ManualCorrection';
      if (im.movement_type === 'OPENING') transType = 'OpeningStock';
      else if (im.movement_type === 'SALE') transType = 'Sale';
      else if (im.movement_type === 'SALE_CANCELLATION') transType = 'SaleReturn';
      else if (im.movement_type === 'PURCHASE_RECEIPT') transType = 'Purchase';
      else if (im.movement_type === 'DAMAGE_WRITE_OFF') transType = 'Damage';
      else if (im.movement_type === 'ADJUSTMENT') transType = 'StockAdjustment';

      return {
        id: im.id,
        date: im.created_at ? new Date(im.created_at).toISOString() : new Date().toISOString(),
        branchId: im.branch_id,
        productId: im.product_id,
        productName: im.product_name || 'Pharmaceutical Item',
        batchId: im.batch_id,
        batchNumber: im.batch_number || 'N/A',
        movementType: im.movement_type,
        transactionType: transType,
        quantityInUnit: absQty,
        quantityDelta: Number(im.quantity_delta),
        baseQuantity: Number(im.quantity_delta),
        quantityBefore: Number(im.quantity_before),
        quantityAfter: Number(im.quantity_after),
        balanceBaseQuantity: Number(im.quantity_after),
        unitName: im.unit,
        unit: im.unit,
        referenceType: im.reference_type,
        referenceId: im.reference_id,
        purchaseCostPerBaseUnit: pCost,
        sellingPricePerBaseUnit: sPrice,
        totalCost,
        totalRevenue: im.movement_type === 'SALE' ? totalRev : undefined,
        profit: im.movement_type === 'SALE' ? (totalRev - totalCost) : undefined,
        notes: im.notes,
        performedBy: im.performed_by,
        createdAt: im.created_at,
      };
    });

    // 9. Audit Logs
    const auditRes = await pg.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    const auditLogs = auditRes.rows.map((a) => ({
      id: a.id,
      branchId: a.branch_id,
      action: a.action,
      module: a.module,
      details: a.details,
      userName: a.user_name,
      userRole: a.user_role,
      createdAt: a.created_at,
    }));

    // Settings formatting
    const rawSettings = settingsRes.rows[0] || {};
    const settings = {
      id: rawSettings.id || 'SETT-01',
      branchId: rawSettings.branch_id || 'BRANCH-01',
      pharmacyName: rawSettings.pharmacy_name || 'AushadhiX Pharmacy & Clinical Dispense',
      dlNumber: rawSettings.dl_number || 'DL-20B-129482/21B-129483',
      gstin: rawSettings.gstin || '07AAAAA0000A1Z5',
      address: rawSettings.address || 'Shop 14-16, Metro Medicare Plaza, Sector 18',
      phone: rawSettings.phone || '+91 98765 43210',
      nearExpiryDays: Number(rawSettings.near_expiry_days) || 90,
      lowStockThresholdDays: Number(rawSettings.low_stock_threshold_days) || 30,
      allowExpiredBilling: Boolean(rawSettings.allow_expired_billing),
      requireDoctorInfoScheduleH: Boolean(rawSettings.require_doctor_info_schedule_h),
      defaultTaxRate: Number(rawSettings.default_tax_rate) || 12,
      currencySymbol: '',
    };

    res.json({
      success: true,
      branches: branchesRes.rows,
      categories: categoriesRes.rows,
      suppliers: suppliersRes.rows,
      customers: customersRes.rows,
      products,
      batches,
      purchaseOrders,
      sales,
      stockLedger,
      auditLogs,
      settings,
      databaseType: 'PostgreSQL 18.3 Relational Database Engine',
    });
  } catch (error: any) {
    console.error('[API /bootstrap] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to bootstrap database' });
  }
});

// POST /api/v1/sales - Atomic POS Sale Transaction
apiRouter.post('/sales', async (req, res) => {
  try {
    const result = await createSaleTransaction(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[API POST /sales] Transaction Failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/sales/:id/cancel - Atomic Sale Cancellation
apiRouter.post('/sales/:id/cancel', async (req, res) => {
  try {
    const result = await cancelSaleTransaction(req.params.id, req.body.cancelledBy);
    res.json(result);
  } catch (error: any) {
    console.error('[API POST /sales/:id/cancel] Transaction Failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/purchase-orders/:id/receive - Atomic Goods Receiving Transaction
apiRouter.post('/purchase-orders/:id/receive', async (req, res) => {
  try {
    const result = await receiveGoodsTransaction({
      poId: req.params.id,
      receivedItems: req.body.receivedItems || [],
      receivedBy: req.body.receivedBy,
    });
    res.json(result);
  } catch (error: any) {
    console.error('[API POST /purchase-orders/:id/receive] Transaction Failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/batches/:id/adjust - Atomic Stock Adjustment Transaction
apiRouter.post('/batches/:id/adjust', async (req, res) => {
  try {
    const result = await adjustStockTransaction({
      batchId: req.params.id,
      adjustmentDelta: Number(req.body.adjustmentDelta),
      reason: req.body.reason,
      isDamage: Boolean(req.body.isDamage),
      performedBy: req.body.performedBy,
    });
    res.json(result);
  } catch (error: any) {
    console.error('[API POST /batches/:id/adjust] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/test/run - Verified Acceptance Test Transaction
apiRouter.post('/test/run', async (req, res) => {
  try {
    const result = await runAcceptanceTestTransaction();
    res.json(result);
  } catch (error: any) {
    console.error('[API POST /test/run] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/purchase-orders - Create Purchase Order
apiRouter.post('/purchase-orders', async (req, res) => {
  try {
    const { supplierId, branchId, orderDate, expectedDeliveryDate, items, notes, createdBy } = req.body;
    const poId = 'PO-' + Date.now();
    const orderNumber = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

    let totalAmount = 0;
    const poItems = [];

    for (const item of items) {
      const itemTotal = Number(item.orderedQuantity) * Number(item.unitPurchaseCost);
      totalAmount += itemTotal;
      poItems.push({
        id: 'POI-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        productId: item.productId,
        orderedQuantity: Number(item.orderedQuantity),
        packagingUnit: item.packagingUnit,
        conversionFactor: Number(item.conversionFactor) || 1,
        unitPurchaseCost: Number(item.unitPurchaseCost),
        totalCost: itemTotal,
      });
    }

    const taxAmount = (totalAmount * 12) / 100;

    await pg.transaction(async (tx) => {
      await tx.query(`
        INSERT INTO purchase_orders (
          id, order_number, supplier_id, branch_id, order_date, expected_delivery_date,
          status, total_amount, tax_amount, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'ORDERED', $7, $8, $9, $10)
      `, [poId, orderNumber, supplierId, branchId || 'BRANCH-01', orderDate || new Date().toISOString().slice(0, 10), expectedDeliveryDate, totalAmount + taxAmount, taxAmount, notes || '', createdBy || 'Store Manager']);

      for (const poi of poItems) {
        await tx.query(`
          INSERT INTO purchase_order_items (
            id, purchase_order_id, product_id, ordered_quantity, received_quantity,
            packaging_unit, conversion_factor, unit_purchase_cost, total_cost
          ) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8)
        `, [poi.id, poId, poi.productId, poi.orderedQuantity, poi.packagingUnit, poi.conversionFactor, poi.unitPurchaseCost, poi.totalCost]);
      }

      await tx.query(`
        INSERT INTO audit_logs (id, branch_id, action, module, details, user_name, user_role)
        VALUES ($1, $2, 'PO_CREATED', 'Purchases', $3, $4, 'manager')
      `, [
        'AUDIT-' + Date.now(),
        branchId || 'BRANCH-01',
        `Created Purchase Order ${orderNumber} for supplier ${supplierId}. Total: ${(totalAmount + taxAmount).toFixed(2)}`,
        createdBy || 'Store Manager',
      ]);
    });

    res.status(201).json({
      success: true,
      purchaseOrder: {
        id: poId,
        orderNumber,
        supplierId,
        branchId: branchId || 'BRANCH-01',
        status: 'ORDERED',
        totalAmount: totalAmount + taxAmount,
        taxAmount,
        items: poItems,
      },
    });
  } catch (error: any) {
    console.error('[API POST /purchase-orders] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/products - Create Product with composition and conversions
apiRouter.post('/products', async (req, res) => {
  try {
    const p = req.body;
    const productId = 'PROD-' + Date.now();

    await pg.transaction(async (tx) => {
      await tx.query(`
        INSERT INTO products (
          id, name, brand, generic_name, category_id, dosage_form,
          schedule, prescription_required, storage_condition,
          min_stock_level, max_stock_level, reorder_point, image_url, barcode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        productId,
        p.name,
        p.brand || 'Generic',
        p.genericName,
        p.categoryId || 'CAT-01',
        p.dosageForm || 'Tablet',
        p.schedule || 'OTC',
        Boolean(p.prescriptionRequired),
        p.storageCondition || 'Room Temperature',
        Number(p.minStockLevel) || 20,
        Number(p.maxStockLevel) || 500,
        Number(p.reorderPoint) || 50,
        p.imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60',
        p.barcode || '',
      ]);

      if (p.compositions && Array.isArray(p.compositions)) {
        for (const comp of p.compositions) {
          await tx.query(`
            INSERT INTO product_compositions (id, product_id, active_ingredient, strength, is_primary)
            VALUES ($1, $2, $3, $4, $5)
          `, ['COMP-' + Date.now() + '-' + Math.floor(Math.random() * 1000), productId, comp.activeIngredient, comp.strength, comp.isPrimary ?? true]);
        }
      }

      if (p.packagingUnits && Array.isArray(p.packagingUnits)) {
        for (const u of p.packagingUnits) {
          await tx.query(`
            INSERT INTO product_unit_conversions (id, product_id, level, unit_name, conversion_factor, is_base_unit, is_default_selling_unit)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, ['UNIT-' + Date.now() + '-' + Math.floor(Math.random() * 1000), productId, u.level || 1, u.unitName, u.conversionFactor || 1, Boolean(u.isBaseUnit), Boolean(u.isDefaultSellingUnit)]);
        }
      }

      await tx.query(`
        INSERT INTO audit_logs (id, branch_id, action, module, details, user_name, user_role)
        VALUES ($1, 'BRANCH-01', 'PRODUCT_CREATED', 'Catalog', $2, 'Pharmacist', 'admin')
      `, ['AUDIT-' + Date.now(), `Created new product catalog entry: ${p.name} (${p.genericName})`]);
    });

    res.status(201).json({ success: true, productId });
  } catch (error: any) {
    console.error('[API POST /products] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/batches - Create new Batch
apiRouter.post('/batches', async (req, res) => {
  try {
    const b = req.body;
    const batchId = 'BATCH-' + Date.now();

    await pg.transaction(async (tx) => {
      await tx.query(`
        INSERT INTO product_batches (
          id, product_id, batch_number, expiry_date, manufacture_date,
          mrp, purchase_price_per_base_unit, selling_price_per_base_unit,
          opening_base_quantity, available_base_quantity, allocated_base_quantity,
          damaged_base_quantity, supplier_id, branch_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, $11, $12, $13)
      `, [
        batchId,
        b.productId,
        b.batchNumber,
        b.expiryDate,
        b.manufactureDate || null,
        Number(b.mrp),
        Number(b.purchasePrice),
        Number(b.sellingPrice),
        Number(b.openingQuantity || b.availableQuantity || 0),
        Number(b.availableQuantity || 0),
        b.supplierId || null,
        b.branchId || 'BRANCH-01',
        b.notes || '',
      ]);

      if (Number(b.availableQuantity) > 0) {
        await tx.query(`
          INSERT INTO inventory_movements (
            id, branch_id, product_id, batch_id, movement_type,
            quantity_delta, quantity_before, quantity_after, unit,
            reference_type, reference_id, notes, performed_by
          ) VALUES ($1, $2, $3, $4, 'OPENING', $5, 0, $5, 'Base Unit', 'BATCH_CREATION', $6, 'Batch manually initialized', 'Admin')
        `, [
          'MOV-' + Date.now(),
          b.branchId || 'BRANCH-01',
          b.productId,
          batchId,
          Number(b.availableQuantity),
          b.batchNumber,
        ]);
      }
    });

    res.status(201).json({ success: true, batchId });
  } catch (error: any) {
    console.error('[API POST /batches] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/demo/reset - Re-seed database
apiRouter.post('/demo/reset', async (req, res) => {
  try {
    await pg.transaction(async (tx) => {
      await tx.query('TRUNCATE TABLE sale_items, sales, inventory_movements, purchase_order_items, purchase_orders, product_batches, product_unit_conversions, product_compositions, products, suppliers, customers, categories, branches, system_settings, audit_logs CASCADE;');
    });
    await initializeDatabase();
    res.json({ success: true, message: 'Database reset and re-seeded with relational demo records.' });
  } catch (error: any) {
    console.error('[API POST /demo/reset] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
