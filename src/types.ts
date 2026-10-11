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

export type DiscountType = 'percentage' | 'fixed';

export interface GSTRate {
  id: string;
  name: string; // e.g. "GST 12% (Standard Pharma / Tablets)"
  rate: number; // e.g. 12
  cgst: number; // e.g. 6
  sgst: number; // e.g. 6
  igst: number; // e.g. 12
  cgstPercent?: number;
  sgstPercent?: number;
  igstPercent?: number;
  hsnCode?: string; // e.g. "3004"
  description?: string;
  isDefault?: boolean;
  isActive: boolean;
}

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

export interface ProductCategory {
  id: string;
  name: string; // e.g. "Ear, Nose & Eye Care", "Gastrointestinal & Antacids"
  description?: string;
  icon?: string; // Emoji e.g. '👂', '🫄', '🌡️', '🫁', '🫀', '🧴', '🦴', '💊'
  defaultBodyPart?: string; // e.g. 'Ear', 'Eye', 'Stomach & Digestion'
  color?: string; // Theme color badge
  isDefault?: boolean;
  isActive?: boolean;
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
  category: string; // "Medicines", "Ear, Nose & Eye Care", etc.
  categoryId?: string; // Associated category ID
  subcategory?: string; // "Tablets", "Syrups", etc.
  bodyPart?: string; // Target body part e.g. 'Ear', 'Eye', 'Stomach & Digestion', 'Heart & BP'
  bodyPartIcon?: string; // Emoji representing body part e.g. '👂', '👁️', '🫄', '🫀'
  barcode: string;
  sku: string;
  productCode: string;
  description?: string;
  image: string; // Primary/first product image
  images?: string[]; // Up to 4 product images
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
  gstRateId?: string; // Reference to configured GSTRate
  basePurchasePrice?: number; // Pre-tax cost
  baseSellingPrice?: number; // Pre-tax selling price
  purchasePrice?: number; // Cost / Purchase Price (inclusive or final)
  sellingPrice?: number; // Selling / Retail Price (inclusive or final)
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

export interface SupplierOrderItem {
  id: string;
  productId?: string;
  productName: string;
  brand?: string;
  category?: string;
  unitName: string; // e.g. "Strip", "Bottle", "Box", "Tablet", "Piece", "Vial", "Tube"
  quantity: number;
  currentStock?: number;
  minStockThreshold?: number;
  purchasePriceEstimate?: number;
  notes?: string;
  addedAt: string;
  isFromLowStock?: boolean;
}

export type SupplierOrderStatus = 'Draft' | 'Ready' | 'Sent' | 'Received' | 'Cancelled';

export interface SupplierOrderList {
  id: string;
  title: string; // e.g. "September 2026 Monthly Order - Mahaveer Medico"
  monthYear: string; // e.g. "2026-09"
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  assignedUser?: string; // User/staff member responsible or creating this draft
  createdBy?: string;
  status: SupplierOrderStatus;
  items: SupplierOrderItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastSharedAt?: string;
  targetOrderDate?: string;
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
  discountType?: DiscountType; // 'percentage' | 'fixed'
  discountValue?: number; // % value (e.g. 10) or ₹ value (e.g. 25)
  discountPercent?: number;
  discountAmount?: number;
  taxPercent: number;
  taxAmount?: number;
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
  discountType?: DiscountType;
  discountValue?: number;
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
  isEdited?: boolean;
  editedAt?: string;
  editReason?: string;
  originalGrandTotal?: number;
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
  dlNumber: string; // Drug License number (optional, printed on invoice if added)
  dlNumber2?: string; // Additional Drug License number (optional)
  gstin: string;
  storeLogo?: string; // Medical store logo (Base64 data or image URL)
  stampLogo?: string; // Official medical store seal / pharmacist stamp (Base64 data or image URL)
  invoiceTerms?: string; // Custom footer note or return policy printed on invoices
  fssaiNumber?: string; // FSSAI registration number (optional)
  expiryWarningDays: number; // 30, 60, or 90
  valuationMethod: 'FEFO' | 'FIFO';
  allowExpiredSale: boolean; // Always false by pharmacy law
  invoicePrefix: string;
  defaultGstPercent: number;
  defaultLowStockThreshold?: number;
}

export type PharmacySettings = StoreSettings;
export type UserRole = Role;
