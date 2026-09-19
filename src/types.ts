export type Role = 'Admin' | 'Manager' | 'Pharmacist' | 'Cashier' | 'InventoryUser';

export type StockStatus = 'InStock' | 'LowStock' | 'OutOfStock' | 'ExpiringSoon' | 'Expired';

export type TransactionType =
  | 'OpeningStock'
  | 'Purchase'
  | 'Sale'
  | 'SaleReturn'
  | 'StockAdjustment'
  | 'Damage'
  | 'Expiry'
  | 'ManualCorrection';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Credit' | 'Mixed';

export type PurchaseOrderStatus = 'Draft' | 'Ordered' | 'PartiallyReceived' | 'Received' | 'Cancelled';

export interface PackagingUnit {
  id: string;
  name: string; // e.g. "Box", "Strip", "Tablet", "Bottle", "Sachet"
  shortCode: string; // e.g. "BOX", "STRIP", "TAB"
  multiplierToBase: number; // e.g., 1 Box = 100 Tablets (multiplier = 100), 1 Strip = 10 Tablets (multiplier = 10)
  isBaseUnit?: boolean;
  defaultSellingPrice?: number; // e.g. 120 for strip, 12 for tablet
  defaultPurchasePrice?: number; // e.g. 100 for strip
  profitPercentage?: number;
}

export interface ProductComposition {
  ingredient: string; // e.g. "Paracetamol"
  strength: string; // e.g. "500 mg"
}

export interface Product {
  id: string;
  name: string; // e.g. "Calpol 500mg Tablet"
  brand: string; // e.g. "GSK"
  manufacturer: string; // e.g. "GlaxoSmithKline Pharmaceuticals"
  category: string; // "Medicines", "Personal Care", "General Items", etc.
  subcategory?: string; // "Tablets", "Syrups", etc.
  barcode: string;
  sku: string;
  productCode: string;
  description?: string;
  image: string;
  compositions: ProductComposition[]; // for alternative matching
  baseUnit: string; // e.g. "Tablet", "Piece", "ml"
  units: PackagingUnit[]; // Configured packaging hierarchy
  minStockBaseUnits: number; // Low stock threshold in base units
  maxStockBaseUnits?: number;
  reorderLevelBaseUnits?: number;
  isActive: boolean;
  requiresPrescription?: boolean;
  hsnCode?: string;
  gstPercent: number; // e.g. 12%
  purchasePrice?: number; // Cost / Purchase Price
  sellingPrice?: number; // Selling / Retail Price
  profitPercentage?: number; // Calculated profit margin %
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string; // e.g. "PARA001"
  mfgDate: string; // YYYY-MM
  expiryDate: string; // YYYY-MM-DD
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  purchasePricePerBaseUnit: number; // Cost in base unit, e.g. 10 per tablet
  mrpPerBaseUnit: number; // MRP per base unit
  sellingPricePerBaseUnit: number; // Selling price per base unit, e.g. 12 per tablet
  initialBaseQuantity: number; // Opening/Purchased base quantity
  availableBaseQuantity: number; // Current available in base unit
  damagedBaseQuantity?: number;
  notes?: string;
}

export interface StockLedgerEntry {
  id: string;
  date: string;
  productId: string;
  productName: string;
  batchId?: string;
  batchNumber?: string;
  unitName: string;
  quantityInUnit: number;
  baseQuantity: number; // positive for addition, negative for deduction
  balanceBaseQuantity: number;
  transactionType: TransactionType;
  referenceId?: string; // PO# or Invoice#
  partyName?: string; // Supplier or Customer
  purchaseCostPerBaseUnit: number;
  sellingPricePerBaseUnit?: number;
  totalCost: number;
  totalRevenue?: number;
  profit?: number;
  performedBy: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  unitId: string;
  unitName: string;
  multiplierToBase: number;
  orderedUnitQuantity: number;
  orderedBaseQuantity: number;
  receivedBaseQuantity: number;
  quantityInUnit?: number;
  totalBaseQuantity?: number;
  purchasePricePerUnit: number;
  purchasePricePerBaseUnit: number;
  mrpPerUnit: number;
  sellingPricePerUnit: number;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  taxPercent: number;
  totalAmount: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string; // e.g. "PO-2026-001"
  poNumber?: string;
  invoiceNumber?: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  purchaseDate?: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  totalAmount?: number;
  notes?: string;
  receivedDate?: string;
  paymentTerms?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  paymentTerms: string;
  totalPurchases: number;
  pendingBalance: number;
  lastPurchaseDate?: string;
  notes?: string;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  doctorName?: string;
  totalSpent: number;
  totalOrders: number;
  pendingBalance?: number;
  creditLimit?: number;
  lastOrderDate?: string;
  notes?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  unitId: string;
  unitName: string;
  multiplierToBase: number;
  quantityInUnit: number;
  totalBaseQuantity: number; // quantityInUnit * multiplierToBase
  costPerBaseUnit: number;
  sellingPricePerUnit: number;
  sellingPricePerBaseUnit: number;
  discountPercent?: number;
  taxPercent: number;
  grossAmount: number;
  netAmount: number;
  totalCost: number; // totalBaseQuantity * costPerBaseUnit
  profitAmount: number; // netAmount - totalCost
  profitPercent: number; // (profitAmount / totalCost) * 100
}

export interface Sale {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-1042"
  dateTime: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  doctorName?: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  totalCost: number;
  totalProfit: number;
  profitMarginPercent: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeGiven: number;
  dueAmount?: number;
  cashierName: string;
  notes?: string;
}

export interface PriceHistoryEntry {
  id: string;
  productId: string;
  batchNumber: string;
  purchasePricePerBaseUnit: number;
  sellingPricePerBaseUnit: number;
  supplierName: string;
  effectiveDate: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: Role;
  action: string;
  module: string;
  oldValue?: string;
  newValue?: string;
  details: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  category: 'low_stock' | 'out_of_stock' | 'expiring' | 'expired' | 'purchase_order' | 'duplicate_warning';
  timestamp: string;
  isRead: boolean;
  linkTab?: string;
  productId?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  dlNumber: string; // Drug License number
  gstin: string;
  expiryWarningDays: number; // 30, 60, or 90
  valuationMethod: 'FEFO' | 'FIFO';
  allowExpiredSale: boolean; // Always false by pharmacy law
  invoicePrefix: string;
  defaultGstPercent: number;
  defaultLowStockThreshold?: number;
}

export type PharmacySettings = StoreSettings;
export type UserRole = Role;
