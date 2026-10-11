import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  AlertTriangle,
  ClockAlert,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Pill,
  User,
  Users,
  Layers,
  ArrowRight,
  ShieldAlert,
  Percent,
  Check,
  ArrowLeft,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
  SlidersHorizontal,
  Tag,
  Settings2,
  Calendar,
  Clock,
  Bookmark,
  RotateCcw,
  FilePlus,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePharmacy } from '../context/PharmacyContext';
import { Product, ProductBatch, Sale, Customer } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { HorizontalSlidingChips } from './HorizontalSlidingChips';
import { POSQuickAddProductModal } from './POSQuickAddProductModal';
import { getProductSingleTabletPricing } from '../utils/unitPricing';

export interface POSDraftBill {
  id: string;
  draftNumber: number;
  status: 'Draft';
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone?: string;
  selectedCustomerId?: string;
  doctorName?: string;
  notes?: string;
  paymentMethod: Sale['paymentMethod'];
  saleDate: string;
  billDiscountType: 'percentage' | 'fixed';
  billDiscountValue: string;
  cart: CartItem[];
  itemsCount: number;
  grandTotal: number;
}

interface CartItem {
  product: Product;
  selectedUnitId: string;
  quantityInUnit: number;
  selectedBatchId: string;
  customSellingPricePerUnit?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountPercent?: number;
  discountAmount?: number;
  // Support for mixed quantity selling (e.g., 2 strips + 3 tablets)
  secondaryUnitId?: string;
  secondaryQuantity?: number;
}

export const POSView: React.FC = () => {
  const {
    products,
    batches,
    customers,
    settings,
    suppliers,
    getProductTotalStock,
    getProductBatches,
    getFefoBatch,
    getAlternativeProducts,
    processSale,
    addBatch,
    adjustStock,
  } = usePharmacy();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Active alternative product inspection modal / drawer
  const [viewingAlternativesFor, setViewingAlternativesFor] = useState<Product | null>(null);

  // Barcode scanner modal
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('Cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [notes, setNotes] = useState('');
  // Custom sale date for recording backdated or historical records
  const [saleDate, setSaleDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Sales Order / Bill-level discount (percentage or fixed price)
  const [billDiscountType, setBillDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [billDiscountValue, setBillDiscountValue] = useState<string>('0');
  const [showOrderDiscount, setShowOrderDiscount] = useState(false);

  // Simplified UI toggles
  const [expandedItemIndex, setExpandedItemIndex] = useState<number | null>(null);
  const [showDoctorInput, setShowDoctorInput] = useState(false);
  const [showProfitDetails, setShowProfitDetails] = useState(false);

  // Mobile & layout view mode: 'catalog' shows medicines list, 'bill' shows current cart & payment
  const [mobileTab, setMobileTab] = useState<'catalog' | 'bill'>('catalog');

  // Error / Feedback
  const [posError, setPosError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Draft Bills State (Persistence across transactions & page refreshes)
  const [draftBills, setDraftBills] = useState<POSDraftBill[]>(() => {
    try {
      const saved = localStorage.getItem('aushadhix_pos_drafts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftNotification, setDraftNotification] = useState<string | null>(null);

  // Sync draft bills to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aushadhix_pos_drafts', JSON.stringify(draftBills));
    } catch (e) {
      console.warn('[POSView] Error persisting drafts:', e);
    }
  }, [draftBills]);

  // Check for pre-selected customer from CustomersView
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('aushadhix_selected_customer');
      if (stored) {
        sessionStorage.removeItem('aushadhix_selected_customer');
        const cust = JSON.parse(stored);
        if (cust && cust.id) {
          setSelectedCustomerId(cust.id);
          setCustomerName(cust.name || 'Walk-in Customer');
          setCustomerPhone(cust.phone || '');
          if (cust.doctorName) {
            setDoctorName(cust.doctorName);
            setShowDoctorInput(true);
          }
        }
      }
    } catch (e) {
      console.warn('[POSView] Error restoring pre-selected customer:', e);
    }
  }, []);

  // Quick Add Product Modal state
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);
  const [quickAddInitialQuery, setQuickAddInitialQuery] = useState<string>('');

  // Currently active draft bill (if loaded into current bill)
  const activeDraft = useMemo(() => {
    if (!activeDraftId) return null;
    return draftBills.find((d) => d.id === activeDraftId) || null;
  }, [draftBills, activeDraftId]);

  // Product Image Lightbox Preview in POS
  const [previewImagesProduct, setPreviewImagesProduct] = useState<Product | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Categories list extracted dynamically from active products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    products.forEach((p) => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    ['Medicines', 'Personal Care', 'General Items', 'Vitamins & Supplements'].forEach((c) => cats.add(c));
    return Array.from(cats);
  }, [products]);

  // Filtered products - ensures all active medicines appear immediately in POS
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Treat undefined isActive as true to avoid disappearing products
      if (p.isActive === false) return false;

      const prodCategory = (p.category || 'Medicines').trim().toLowerCase();
      const selCategory = selectedCategory.trim().toLowerCase();
      const matchesCategory = selCategory === 'all' || prodCategory === selCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchesName = p.name?.toLowerCase().includes(q);
      const matchesBrand = p.brand?.toLowerCase().includes(q);
      const matchesBarcode = p.barcode?.toLowerCase().includes(q);
      const matchesSku = p.sku?.toLowerCase().includes(q);
      const matchesProductCode = p.productCode?.toLowerCase().includes(q);
      const matchesComposition = p.compositions?.some((c) =>
        `${c.ingredient} ${c.strength}`.toLowerCase().includes(q)
      );

      return matchesName || matchesBrand || matchesBarcode || matchesSku || matchesProductCode || matchesComposition;
    });
  }, [products, selectedCategory, searchQuery]);

  // Quick helper to check quantity of a product in the cart
  const getProductCartCount = (productId: string) => {
    return cart
      .filter((it) => it.product.id === productId)
      .reduce((sum, it) => sum + it.quantityInUnit, 0);
  };

  // Quick helper to decrease quantity or remove product directly from medicine catalog card
  const handleDecreaseFromCart = (productId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.product.id === productId);
      if (idx === -1) return prev;
      if (prev[idx].quantityInUnit > 1) {
        return prev.map((it, i) =>
          i === idx ? { ...it, quantityInUnit: it.quantityInUnit - 1 } : it
        );
      } else {
        return prev.filter((_, i) => i !== idx);
      }
    });
  };

  // Handle adding product to cart with automatic FEFO batch selection
  const handleAddToCart = (
    product: Product,
    overrideUnitId?: string,
    overrideBatchId?: string,
    overrideBatch?: ProductBatch
  ) => {
    setPosError(null);
    const fefo = getFefoBatch(product.id);
    let chosenBatch = overrideBatch || (overrideBatchId
      ? batches.find((b) => b.id === overrideBatchId)
      : fefo);

    // If FEFO returned undefined, check if any batch exists for this product with available stock
    if (!chosenBatch) {
      chosenBatch = batches.find(
        (b) => b.productId === product.id && (b.availableBaseQuantity > 0 || (b.availableQuantity ?? 0) > 0)
      );
    }

    // If still no batch found, find ANY batch for this product
    if (!chosenBatch) {
      chosenBatch = batches.find((b) => b.productId === product.id);
    }

    // If product has no batch at all in system, automatically initialize an opening stock batch so user is NEVER blocked from selling
    if (!chosenBatch) {
      const primaryUnit = product.units.find((u) => u.isBaseUnit) || product.units[0];
      const mult = primaryUnit?.multiplierToBase || 1;
      const purchaseCost = product.purchasePrice || 80;
      const selling = product.sellingPrice || primaryUnit?.defaultSellingPrice || 100;

      chosenBatch = addBatch({
        productId: product.id,
        batchNumber: `BAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        mfgDate: '2025-01-01',
        expiryDate: '2028-12-31',
        purchaseDate: new Date().toISOString().slice(0, 10),
        supplierId: suppliers[0]?.id || 'SUP-01',
        supplierName: suppliers[0]?.name || 'Direct Wholesale',
        initialBaseQuantity: 100 * mult,
        purchasePricePerBaseUnit: purchaseCost / mult,
        sellingPricePerBaseUnit: selling / mult,
        mrpPerBaseUnit: (selling * 1.2) / mult,
        notes: `Opening batch for ${product.name}`,
      });
    }

    // Ensure batch has available stock; if zero or negative, automatically replenish 100 units
    if (chosenBatch && (chosenBatch.availableBaseQuantity <= 0 || (chosenBatch.availableQuantity ?? 0) <= 0)) {
      adjustStock(product.id, chosenBatch.id, 100, 'StockAdjustment', `Opening stock replenishment for POS billing (${product.name})`);
      chosenBatch.availableBaseQuantity = (chosenBatch.availableBaseQuantity || 0) + 100;
      if (chosenBatch.availableQuantity !== undefined) chosenBatch.availableQuantity += 100;
    }

    // Default unit: if override provided, use it; otherwise prefer packaging unit (Strip/Pack/Bottle) or first unit
    const defaultUnit = overrideUnitId
      ? product.units.find((u) => u.id === overrideUnitId) || product.units[0]
      : product.units.find((u) => u.name === 'Strip') || product.units.find((u) => (u.multiplierToBase || 1) > 1) || product.units[0];

    // Check if item with this product & batch already in cart
    const existingIndex = cart.findIndex(
      (it) => it.product.id === product.id && it.selectedBatchId === chosenBatch!.id && it.selectedUnitId === defaultUnit.id
    );

    const resultingQty = existingIndex >= 0 ? cart[existingIndex].quantityInUnit + 1 : 1;

    if (existingIndex >= 0) {
      setCart((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex ? { ...it, quantityInUnit: it.quantityInUnit + 1 } : it
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          product,
          selectedUnitId: defaultUnit.id,
          quantityInUnit: 1,
          selectedBatchId: chosenBatch!.id,
          customSellingPricePerUnit: defaultUnit.defaultSellingPrice,
        },
      ]);
    }
  };

  // Quick inward stock helper for products with zero initial stock
  const handleQuickInward = (product: Product) => {
    const primaryUnit = product.units[0];
    const mult = primaryUnit?.multiplierToBase || 1;
    const purchaseCost = product.purchasePrice || 80;
    const selling = product.sellingPrice || primaryUnit?.defaultSellingPrice || 100;

    const newBatch = addBatch({
      productId: product.id,
      batchNumber: `B-${Date.now().toString().slice(-4)}`,
      mfgDate: '2026-01-01',
      expiryDate: '2028-12-31',
      supplierId: suppliers[0]?.id || 'SUP-01',
      supplierName: suppliers[0]?.name || 'Direct Wholesale',
      receivedDate: new Date().toISOString().slice(0, 10),
      purchaseDate: new Date().toISOString().slice(0, 10),
      initialBaseQuantity: 50 * mult,
      purchasePricePerBaseUnit: purchaseCost / mult,
      sellingPricePerBaseUnit: selling / mult,
      mrpPerBaseUnit: selling / mult,
      storageRackLocation: 'Shelf A1',
      barcode: product.barcode,
    });

    handleAddToCart(product, primaryUnit.id, newBatch.id, newBatch);
  };

  // Barcode scanned callback
  const handleBarcodeScanned = (code: string) => {
    const found = products.find((p) => p.barcode === code);
    if (found) {
      handleAddToCart(found);
    } else {
      setPosError(`No product found with barcode ${code}`);
    }
  };

  // Customer selection
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId) {
      const c = customers.find((cust) => cust.id === custId);
      if (c) {
        setCustomerName(c.name);
        setCustomerPhone(c.phone);
        if (c.doctorName) setDoctorName(c.doctorName);
      }
    } else {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setDoctorName('');
    }
  };

  // Cart calculations with item discounts and bill-level discount
  const cartSummary = useMemo(() => {
    let itemsGross = 0;
    let itemsSubtotal = 0;
    let totalCost = 0;
    let totalTax = 0;
    let totalItemDiscount = 0;

    const itemsCalculated = cart.map((item) => {
      const unit = item.product.units.find((u) => u.id === item.selectedUnitId) || item.product.units[0];
      const multiplier = unit.multiplierToBase || 1;
      let totalBaseQuantity = item.quantityInUnit * multiplier;

      const batch = batches.find((b) => b.id === item.selectedBatchId);
      const unitPrice = item.customSellingPricePerUnit !== undefined
        ? item.customSellingPricePerUnit
        : unit.defaultSellingPrice !== undefined
        ? unit.defaultSellingPrice
        : (batch?.sellingPricePerBaseUnit || 1) * multiplier;

      // Add secondary unit if mixed quantity (e.g. + loose tablets)
      let secondaryBaseQty = 0;
      let secondaryRevenue = 0;
      if (item.secondaryUnitId && item.secondaryQuantity && item.secondaryQuantity > 0) {
        const secUnit = item.product.units.find((u) => u.id === item.secondaryUnitId) || item.product.units.find((u) => u.isBaseUnit) || item.product.units[0];
        const secMultiplier = secUnit.multiplierToBase || 1;
        secondaryBaseQty = item.secondaryQuantity * secMultiplier;
        totalBaseQuantity += secondaryBaseQty;

        const secPrice = secUnit.defaultSellingPrice !== undefined && secUnit.defaultSellingPrice > 0
          ? secUnit.defaultSellingPrice
          : Number(((unitPrice / multiplier) * secMultiplier).toFixed(2));
        secondaryRevenue = item.secondaryQuantity * secPrice;
      }

      const primaryRevenue = item.quantityInUnit * unitPrice;
      const gross = primaryRevenue + secondaryRevenue;

      // Item discount: supports percentage (%) and fixed (₹)
      const itemDiscType = item.discountType || 'percentage';
      const itemDiscVal = item.discountValue !== undefined ? item.discountValue : (item.discountPercent || 0);
      let itemDiscountAmount = 0;
      if (itemDiscType === 'percentage') {
        itemDiscountAmount = (gross * Math.min(100, Math.max(0, itemDiscVal))) / 100;
      } else {
        itemDiscountAmount = Math.min(gross, Math.max(0, itemDiscVal));
      }
      const net = Math.max(0, gross - itemDiscountAmount);

      // Single tablet / base unit cost calculation (divides strip price by multiplier)
      const singleTablet = getProductSingleTabletPricing(item.product, batch);
      const effectiveBaseCost = singleTablet.isStripOrPack
        ? singleTablet.singleCostPrice
        : Number(batch?.purchasePricePerBaseUnit || 0);

      const itemTotalCost = Number((totalBaseQuantity * effectiveBaseCost).toFixed(2));
      const itemProfit = Number((net - itemTotalCost).toFixed(2));
      const itemProfitPercent = itemTotalCost > 0 ? (itemProfit / itemTotalCost) * 100 : 100;
      const itemTax = (net * (item.product.gstPercent || 0)) / 100;

      itemsGross += gross;
      totalItemDiscount += itemDiscountAmount;
      itemsSubtotal += net;
      totalCost += itemTotalCost;
      totalTax += itemTax;

      return {
        ...item,
        unit,
        multiplier,
        totalBaseQuantity,
        unitPrice,
        gross,
        discountType: itemDiscType,
        discountValue: itemDiscVal,
        discountAmount: itemDiscountAmount,
        discountPercent: itemDiscType === 'percentage' ? itemDiscVal : (gross > 0 ? (itemDiscountAmount / gross) * 100 : 0),
        net,
        itemTotalCost,
        itemProfit,
        itemProfitPercent,
        batch,
      };
    });

    // Bill-level / Sales Order discount: supports percentage (%) and fixed (₹)
    const numBillDisc = Number(billDiscountValue) || 0;
    let billDiscountAmount = 0;
    if (billDiscountType === 'percentage') {
      billDiscountAmount = (itemsSubtotal * Math.min(100, Math.max(0, numBillDisc))) / 100;
    } else {
      billDiscountAmount = Math.min(itemsSubtotal, Math.max(0, numBillDisc));
    }

    const grandTotal = Math.max(0, itemsSubtotal - billDiscountAmount);
    const totalProfit = grandTotal - totalCost;
    const profitMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 100;

    return {
      items: itemsCalculated,
      itemsGross,
      totalItemDiscount,
      subtotal: itemsSubtotal,
      billDiscountAmount,
      grandTotal,
      totalCost,
      totalProfit,
      profitMargin,
      totalTax,
    };
  }, [cart, batches, billDiscountType, billDiscountValue]);

  // Quick Add Product to POS Callback: immediately injects into active bill
  const handleProductCreatedAndAdded = (
    newProduct: Product,
    newBatch: ProductBatch,
    quantityToBill: number,
    unitId: string
  ) => {
    setPosError(null);
    const chosenUnit = newProduct.units.find((u) => u.id === unitId) || newProduct.units[0];
    const unitPrice = chosenUnit.defaultSellingPrice !== undefined
      ? chosenUnit.defaultSellingPrice
      : (newProduct.sellingPrice || 100);

    setCart((prev) => [
      ...prev,
      {
        product: newProduct,
        selectedUnitId: chosenUnit.id,
        quantityInUnit: quantityToBill,
        selectedBatchId: newBatch.id,
        customSellingPricePerUnit: unitPrice,
      },
    ]);

    setMobileTab('bill');
    setDraftNotification(`Added ${newProduct.name} (${quantityToBill} ${chosenUnit.name}) to current bill.`);
  };

  // Save active bill as a draft
  const handleSaveAsDraft = () => {
    setPosError(null);
    if (cart.length === 0) {
      setPosError('Cannot save an empty bill as draft. Please add at least 1 item.');
      return;
    }

    if (activeDraftId) {
      handleUpdateActiveDraft();
      return;
    }

    const nextDraftNum = draftBills.reduce((max, d) => Math.max(max, d.draftNumber || 0), 0) + 1;
    const nowIso = new Date().toISOString();
    const newDraft: POSDraftBill = {
      id: `DRAFT-${Date.now()}`,
      draftNumber: nextDraftNum,
      status: 'Draft',
      createdAt: nowIso,
      updatedAt: nowIso,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || undefined,
      selectedCustomerId: selectedCustomerId || undefined,
      doctorName: doctorName.trim() || undefined,
      notes: notes.trim() || undefined,
      paymentMethod,
      saleDate,
      billDiscountType,
      billDiscountValue,
      cart: [...cart],
      itemsCount: cart.length,
      grandTotal: cartSummary.grandTotal || 0,
    };

    setDraftBills((prev) => [newDraft, ...prev]);

    // Clear active cart to enable starting another transaction immediately
    setCart([]);
    setSelectedCustomerId('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setDoctorName('');
    setNotes('');
    setAmountReceived('');
    setBillDiscountValue('0');
    setActiveDraftId(null);
    setDraftNotification(
      `Bill saved as Draft #${nextDraftNum} (${newDraft.customerName} • ₹${newDraft.grandTotal.toFixed(2)}). Active bill cleared for your next transaction.`
    );
  };

  // Update the currently loaded draft with cart changes
  const handleUpdateActiveDraft = () => {
    if (!activeDraftId) return;
    setDraftBills((prev) =>
      prev.map((d) =>
        d.id === activeDraftId
          ? {
              ...d,
              cart: [...cart],
              itemsCount: cart.length,
              grandTotal: cartSummary.grandTotal || 0,
              customerName: customerName.trim() || 'Walk-in Customer',
              customerPhone: customerPhone.trim() || undefined,
              selectedCustomerId: selectedCustomerId || undefined,
              doctorName: doctorName.trim() || undefined,
              notes: notes.trim() || undefined,
              paymentMethod,
              saleDate,
              billDiscountType,
              billDiscountValue,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );
    setDraftNotification(`Draft #${activeDraft?.draftNumber || ''} updated successfully.`);
  };

  // Resume / load a saved draft into the active cart
  const handleResumeDraft = (draftToLoad: POSDraftBill) => {
    // If active cart has items, preserve them first so nothing is lost!
    if (cart.length > 0) {
      if (activeDraftId && activeDraftId !== draftToLoad.id) {
        setDraftBills((prev) =>
          prev.map((d) =>
            d.id === activeDraftId
              ? {
                  ...d,
                  cart: [...cart],
                  itemsCount: cart.length,
                  grandTotal: cartSummary.grandTotal || 0,
                  customerName: customerName.trim() || 'Walk-in Customer',
                  customerPhone: customerPhone.trim() || undefined,
                  selectedCustomerId: selectedCustomerId || undefined,
                  doctorName: doctorName.trim() || undefined,
                  notes: notes.trim() || undefined,
                  paymentMethod,
                  saleDate,
                  billDiscountType,
                  billDiscountValue,
                  updatedAt: new Date().toISOString(),
                }
              : d
          )
        );
      } else if (!activeDraftId) {
        const autoNum = draftBills.reduce((max, d) => Math.max(max, d.draftNumber || 0), 0) + 1;
        const autoDraft: POSDraftBill = {
          id: `DRAFT-${Date.now()}`,
          draftNumber: autoNum,
          status: 'Draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          customerName: customerName.trim() || 'Walk-in Customer',
          customerPhone: customerPhone.trim() || undefined,
          selectedCustomerId: selectedCustomerId || undefined,
          doctorName: doctorName.trim() || undefined,
          notes: notes.trim() || undefined,
          paymentMethod,
          saleDate,
          billDiscountType,
          billDiscountValue,
          cart: [...cart],
          itemsCount: cart.length,
          grandTotal: cartSummary.grandTotal || 0,
        };
        setDraftBills((prev) => [autoDraft, ...prev]);
      }
    }

    // Restore selected draft fields into current bill
    setCart(draftToLoad.cart || []);
    setCustomerName(draftToLoad.customerName || 'Walk-in Customer');
    setSelectedCustomerId(draftToLoad.selectedCustomerId || '');
    setCustomerPhone(draftToLoad.customerPhone || '');
    setDoctorName(draftToLoad.doctorName || '');
    setNotes(draftToLoad.notes || '');
    setPaymentMethod(draftToLoad.paymentMethod || 'Cash');
    setSaleDate(draftToLoad.saleDate || todayStr);
    setBillDiscountType(draftToLoad.billDiscountType || 'percentage');
    setBillDiscountValue(draftToLoad.billDiscountValue || '0');
    setAmountReceived('');
    setActiveDraftId(draftToLoad.id);
    setMobileTab('bill');
    setDraftNotification(
      `Loaded Draft #${draftToLoad.draftNumber} (${draftToLoad.customerName}). Status: Draft (On Hold).`
    );
  };

  // Start a new clean bill (parks active draft if present)
  const handleStartNewBill = () => {
    if (cart.length > 0 && activeDraftId) {
      handleUpdateActiveDraft();
    } else if (cart.length > 0 && !activeDraftId) {
      handleSaveAsDraft();
      return;
    }
    setCart([]);
    setSelectedCustomerId('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setDoctorName('');
    setNotes('');
    setAmountReceived('');
    setBillDiscountValue('0');
    setActiveDraftId(null);
    setDraftNotification('Started new bill. Saved drafts remain available to resume.');
  };

  // Delete a draft
  const handleDeleteDraft = (draftId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDraftBills((prev) => prev.filter((d) => d.id !== draftId));
    if (activeDraftId === draftId) {
      setActiveDraftId(null);
      setCart([]);
      setSelectedCustomerId('');
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setDoctorName('');
      setNotes('');
    }
    setDraftNotification('Draft removed.');
  };

  // Checkout submission
  const handleCheckout = () => {
    setPosError(null);
    if (cart.length === 0) {
      setPosError('Cart is empty. Please select products to bill.');
      return;
    }

    // Validate each cart item
    for (const item of cartSummary.items) {
      if (!item.batch) {
        setPosError(`Missing batch assignment for ${item.product.name}`);
        return;
      }

      if (item.batch.expiryDate < todayStr && !settings.allowExpiredSale) {
        setPosError(`Batch ${item.batch.batchNumber} of ${item.product.name} is EXPIRED. Remove or select alternative batch.`);
        return;
      }

      if (item.batch.availableBaseQuantity < item.totalBaseQuantity) {
        const needed = item.totalBaseQuantity - item.batch.availableBaseQuantity + 50;
        adjustStock(item.product.id, item.batch.id, needed, 'StockAdjustment', `Auto replenishment for POS bill (${item.product.name})`);
        item.batch.availableBaseQuantity += needed;
      }
    }

    const itemsToProcess: {
      productId: string;
      batchId: string;
      unitId: string;
      quantityInUnit: number;
      customSellingPricePerUnit?: number;
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      discountPercent?: number;
    }[] = [];

    cartSummary.items.forEach((it) => {
      // 1. Primary quantity (e.g. strips)
      if (it.quantityInUnit > 0) {
        itemsToProcess.push({
          productId: it.product.id,
          batchId: it.selectedBatchId,
          unitId: it.selectedUnitId,
          quantityInUnit: it.quantityInUnit,
          customSellingPricePerUnit: it.unitPrice,
          discountType: it.discountType || 'percentage',
          discountValue: it.discountValue !== undefined ? it.discountValue : (it.discountPercent || 0),
          discountPercent: it.discountPercent,
        });
      }

      // 2. Loose tablets/capsules sold separately from the strip
      if (it.secondaryUnitId && it.secondaryQuantity && it.secondaryQuantity > 0) {
        const secUnit = it.product.units.find((u) => u.id === it.secondaryUnitId) || it.product.units.find((u) => u.isBaseUnit) || it.product.units[0];
        const secMultiplier = secUnit.multiplierToBase || 1;
        const single = getProductSingleTabletPricing(it.product, batches.find((b) => b.id === it.selectedBatchId));
        const secPrice = single.isStripOrPack && single.singleSellingPrice > 0
          ? single.singleSellingPrice
          : secUnit.defaultSellingPrice !== undefined && secUnit.defaultSellingPrice > 0
          ? secUnit.defaultSellingPrice
          : Number(((it.unitPrice / it.multiplier) * secMultiplier).toFixed(2));

        itemsToProcess.push({
          productId: it.product.id,
          batchId: it.selectedBatchId,
          unitId: it.secondaryUnitId,
          quantityInUnit: it.secondaryQuantity,
          customSellingPricePerUnit: secPrice,
          discountType: it.discountType || 'percentage',
          discountValue: it.discountValue !== undefined ? it.discountValue : (it.discountPercent || 0),
          discountPercent: it.discountPercent,
        });
      }
    });

    if (itemsToProcess.length === 0) {
      setPosError('No items or quantities to bill. Please enter valid strip or loose tablet quantities.');
      return;
    }

    const numericAmountReceived = amountReceived === ''
      ? (paymentMethod === 'Credit' ? 0 : cartSummary.grandTotal)
      : Number(amountReceived);

    if (Math.round((numericAmountReceived || 0) * 100) < Math.round((cartSummary.grandTotal || 0) * 100) && paymentMethod !== 'Credit') {
      setPosError(`Amount received (₹${Number(numericAmountReceived || 0).toFixed(2)}) is less than grand total (₹${Number(cartSummary.grandTotal || 0).toFixed(2)})! For partial or credit bills, choose payment method 'Credit'.`);
      return;
    }

    try {
      const buildSaleDateTime = () => {
        if (!saleDate || saleDate === todayStr) {
          return new Date().toISOString();
        }
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        return new Date(`${saleDate}T${timeStr}`).toISOString();
      };

      const sale = processSale({
        customerId: selectedCustomerId || undefined,
        customerName: customerName || 'Walk-in Customer',
        customerPhone,
        doctorName,
        dateTime: buildSaleDateTime(),
        items: itemsToProcess,
        discountType: billDiscountType,
        discountValue: Number(billDiscountValue) || 0,
        discountAmount: cartSummary.billDiscountAmount,
        paymentMethod,
        amountPaid: numericAmountReceived,
        notes,
      });

      // Confetti burst on checkout
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });

      if (activeDraftId) {
        setDraftBills((prev) => prev.filter((d) => d.id !== activeDraftId));
        setActiveDraftId(null);
      }

      setCompletedSale(sale);
      setCart([]);
      setBillDiscountValue('0');
      setAmountReceived('');
      setNotes('');
    } catch (err: any) {
      setPosError(err.message || 'Error processing sale');
    }
  };

  return (
    <div className="w-full space-y-3 sm:space-y-4 pb-20 lg:pb-8">
      {/* Mobile-Native App Bar Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md -mx-3 -mt-3 sm:-mx-5 sm:-mt-5 lg:mx-0 lg:mt-0 p-3 sm:p-4 rounded-b-2xl lg:rounded-2xl border-b lg:border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between gap-2.5">
          {/* Brand & Live Counter Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  POS Register
                </h1>
                {activeDraftId ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-2xs shrink-0 animate-pulse">
                    <Bookmark className="w-2.5 h-2.5" />
                    Draft #{activeDraft?.draftNumber || ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                {cart.length === 0
                  ? 'Tap medicines to add to current bill'
                  : `${cart.length} item${cart.length > 1 ? 's' : ''} in bill · ₹${Number(cartSummary.grandTotal || 0).toFixed(2)}`}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Drafts count trigger */}
            {draftBills.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMobileTab('bill');
                  document.getElementById('pos-current-bill-card')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition cursor-pointer"
                title={`${draftBills.length} drafts on hold`}
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                <span className="tabular-nums font-bold">{draftBills.length}</span>
              </button>
            )}

            {/* Quick Add Product button */}
            <button
              type="button"
              onClick={() => {
                setQuickAddInitialQuery(searchQuery || '');
                setShowQuickAddModal(true);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
              title="Add unlisted medicine to inventory & bill"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Add Product</span>
              <span className="sm:hidden font-semibold">New</span>
            </button>

            {/* Barcode scanner */}
            <button
              type="button"
              onClick={() => setShowBarcodeModal(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Barcode Scanner"
            >
              <Barcode className="w-4 h-4 text-emerald-700" />
            </button>

            {/* Date Pill Toggle */}
            <div className="relative">
              <input
                type="date"
                id="pos-top-sale-date-input"
                value={saleDate}
                max={todayStr}
                onChange={(e) => setSaleDate(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title="Change billing date"
              />
              <div
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  saleDate === todayStr
                    ? 'bg-slate-50 text-slate-700 border-slate-200'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-medium hidden md:inline">
                  {saleDate === todayStr ? 'Today' : saleDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Native Segmented View Switcher */}
        <div className="mt-2.5 lg:hidden flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              mobileTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-emerald-600" />
            <span>Medicines</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('bill')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              mobileTab === 'bill'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
            <span>Current Bill</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white tabular-nums">
                {cart.length}
              </span>
            )}
            {cart.length > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 tabular-nums hidden sm:inline">
                · ₹{Number(cartSummary.grandTotal || 0).toFixed(0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Draft Notification Banner */}
      {draftNotification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{draftNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setDraftNotification(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-sm cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* POS Error Display */}
      {posError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{posError}</span>
          </div>
          <button onClick={() => setPosError(null)} className="text-rose-400 hover:text-rose-700 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {/* TWO COLUMN POS LAYOUT: Left Catalog & Right Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* LEFT 7 COLUMNS: Product Search, Category Tabs & Medicine Grid */}
        <div className={`space-y-3 sm:space-y-4 ${mobileTab === 'bill' ? 'hidden lg:block lg:col-span-7' : 'block lg:col-span-7'}`}>
          {/* Search bar & Category filters - Streamlined & Mobile-Native */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
            {/* Integrated Search Input with barcode trigger */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="pos-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicine, salt, brand, barcode..."
                className="w-full bg-slate-50/90 border border-slate-200 rounded-xl pl-9.5 pr-20 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowBarcodeModal(true)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
                  title="Scan barcode"
                >
                  <Barcode className="w-3.5 h-3.5 text-emerald-700" />
                </button>
              </div>
            </div>

            {/* Horizontal sliding categories with touch-friendly pills */}
            <HorizontalSlidingChips id="pos-category-chips" ariaLabel="POS Categories">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    data-selected={isSelected ? 'true' : 'false'}
                    aria-selected={isSelected}
                    onClick={() => setSelectedCategory(cat)}
                    className={`h-[32px] flex items-center px-3.5 rounded-xl font-semibold whitespace-nowrap text-xs transition active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-2xs font-bold'
                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </HorizontalSlidingChips>
          </div>

          {/* Simple Clean Product List (Unboxed, Flat) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {searchQuery ? `No medicine found for "${searchQuery}"` : 'No medicines found in this category'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Product not available in the system? You can add it instantly to inventory and put it into your current bill to sell right now.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddInitialQuery(searchQuery || '');
                    setShowQuickAddModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    + Quick Add {searchQuery ? `"${searchQuery}"` : 'Product'} to Inventory & Bill
                  </span>
                </button>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const stock = getProductTotalStock(prod.id);
                const fefoBatch = getFefoBatch(prod.id);
                const hasAlternatives = getAlternativeProducts(prod.id).length > 0;
                const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
                const isOutOfStock = stock <= 0;
                const cartCount = getProductCartCount(prod.id);
                const isInCart = cartCount > 0;

                const defaultUnit = prod.units.find((u) => u.name === 'Strip') || prod.units[0];

                return (
                  <div
                    key={prod.id}
                    className={`p-3 hover:bg-slate-50/70 transition flex items-center justify-between gap-3 ${
                      isInCart ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="relative cursor-pointer group/posimg shrink-0"
                        onClick={() => {
                          setPreviewImagesProduct(prod);
                          setActivePreviewIndex(0);
                        }}
                        title="Click to view all photos"
                      >
                        <img
                          src={(prod.images && prod.images[0]) || prod.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 group-hover/posimg:ring-2 group-hover/posimg:ring-emerald-500 transition shadow-2xs"
                          referrerPolicy="no-referrer"
                        />
                        {prod.images && prod.images.length > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-slate-900/85 text-white text-[8px] font-bold px-1 rounded-sm shadow-xs flex items-center gap-0.5">
                            📷 {prod.images.length}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {prod.name}
                          </h4>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">0 Stock</span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">Low: {stock}</span>
                          ) : null}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                          <span>{prod.brand}</span>
                          <span>•</span>
                          <span className="text-slate-800 font-semibold">₹{defaultUnit?.defaultSellingPrice || '—'}/{defaultUnit?.name}</span>
                          {(() => {
                            const singlePricing = getProductSingleTabletPricing(prod);
                            if (!singlePricing.isStripOrPack) return null;
                            return (
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                ({singlePricing.singleSellingFormatted})
                              </span>
                            );
                          })()}
                          {prod.compositions?.[0] && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400 truncate max-w-[150px]">{prod.compositions[0].ingredient}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasAlternatives && (
                        <button
                          onClick={() => setViewingAlternativesFor(prod)}
                          title="View alternative brands with same composition"
                          className="py-1 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-semibold transition cursor-pointer"
                        >
                          Alt
                        </button>
                      )}

                      {isInCart ? (
                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl p-0.5 shadow-2xs">
                          <button
                            type="button"
                            title="Decrease quantity in bill"
                            onClick={() => handleDecreaseFromCart(prod.id)}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-semibold tabular-nums text-emerald-900 px-1.5 min-w-[20px] text-center">
                            {cartCount}
                          </span>
                          <button
                            type="button"
                            title="Add another to bill"
                            onClick={() => isOutOfStock ? handleQuickInward(prod) : handleAddToCart(prod)}
                            className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : isOutOfStock ? (
                        <button
                          id={`quick-inward-${prod.id}`}
                          onClick={() => handleQuickInward(prod)}
                          title="Medicine has 0 stock. Click to quickly inward 50 units and add to current bill"
                          className="py-1 px-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3 h-3 text-amber-600" />
                          <span>+ Stock</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const baseUnitObj = prod.units?.find((u) => u.isBaseUnit || u.multiplierToBase === 1);
                            const packUnitObj = prod.units?.find((u) => u.multiplierToBase > 1);
                            if (baseUnitObj && packUnitObj && baseUnitObj.id !== packUnitObj.id) {
                              const singlePricing = getProductSingleTabletPricing(prod);
                              const singlePrice = singlePricing.singleSellingPrice || baseUnitObj.defaultSellingPrice || Math.round((prod.sellingPrice || 100) / (packUnitObj.multiplierToBase || 10));
                              return (
                                <button
                                  type="button"
                                  id={`add-single-${prod.id}`}
                                  onClick={() => handleAddToCart(prod, baseUnitObj.id)}
                                  className="py-1 px-2 rounded-xl text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition cursor-pointer active:scale-95 shadow-2xs"
                                  title={`Sell 1 Single ${baseUnitObj.name} for ₹${singlePrice}`}
                                >
                                  + 1 {baseUnitObj.name} (₹{singlePrice})
                                </button>
                              );
                            }
                            return null;
                          })()}
                          <button
                            id={`add-to-cart-${prod.id}`}
                            onClick={() => handleAddToCart(prod)}
                            className="py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT 5 COLUMNS: Billing Cart, Unit Converter, Batch Override, Customer & Payment */}
        <div
          id="pos-current-bill-card"
          className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto ${
            mobileTab === 'catalog' ? 'hidden lg:block lg:col-span-5' : 'block lg:col-span-5'
          }`}
        >
          {/* Mobile Back Button to Catalog */}
          <div className="lg:hidden pb-1">
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>← Back to Add More Medicines</span>
            </button>
          </div>

          {/* Active Draft Status Banner */}
          {activeDraftId && (
            <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-2xs animate-pulse shrink-0">
                  <Bookmark className="w-3 h-3" />
                  DRAFT #{activeDraft?.draftNumber || ''}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-amber-950 truncate flex items-center gap-1.5">
                    <span>Status: Saved as Draft</span>
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-200/70 px-1.5 py-0.2 rounded-md">
                      On Hold
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-800 truncate">
                    {activeDraft?.customerName || 'Walk-in Customer'} • Saved {activeDraft?.createdAt ? new Date(activeDraft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleUpdateActiveDraft}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                  title="Save current cart updates back to this draft"
                >
                  Save Updates
                </button>
                <button
                  type="button"
                  onClick={handleStartNewBill}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  title="Start another transaction while leaving this draft saved"
                >
                  + New Bill
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-slate-900">Current Bill</h3>
                {activeDraftId ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-full">
                    Draft #{activeDraft?.draftNumber} (On Hold)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                    Active Bill
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {cart.length > 0 && !activeDraftId && (
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                  title="Save this bill as a draft to perform another transaction"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                  <span>Save as Draft</span>
                </button>
              )}

              {cart.length > 0 && activeDraftId && (
                <button
                  type="button"
                  onClick={handleStartNewBill}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Start another transaction while leaving this draft saved"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Transaction</span>
                </button>
              )}

              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold px-1.5 py-1 rounded-lg hover:bg-rose-50 cursor-pointer transition"
                  title="Clear current cart items"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Draft Bills Switcher / Tabs if drafts are saved */}
          {draftBills.length > 0 && (
            <div className="p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="font-bold text-amber-950 flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                  <span>Draft Bills On Hold ({draftBills.length}):</span>
                </div>
                <span className="text-[10px] text-amber-700 font-medium">Click to resume</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {draftBills.map((draft) => {
                  const isActive = activeDraftId === draft.id;
                  return (
                    <div
                      key={draft.id}
                      className={`group flex items-center rounded-xl border text-xs transition ${
                        isActive
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs font-bold'
                          : 'bg-white hover:bg-amber-100/70 text-slate-800 border-amber-200/90 hover:border-amber-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleResumeDraft(draft)}
                        className="px-2.5 py-1 text-left flex items-center gap-1.5 cursor-pointer"
                        title={`Resume Draft #${draft.draftNumber} (${draft.customerName} - ₹${draft.grandTotal.toFixed(2)})`}
                      >
                        <span>Draft #{draft.draftNumber}</span>
                        <span className={`text-[10px] ${isActive ? 'text-amber-100' : 'text-slate-500'}`}>
                          • {draft.customerName} (₹{draft.grandTotal.toFixed(0)})
                        </span>
                        {isActive && (
                          <span className="text-[9px] bg-white text-amber-900 px-1 rounded-sm font-bold">
                            Active
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        className={`px-1.5 py-1 rounded-r-xl hover:text-rose-500 transition cursor-pointer text-[11px] ${
                          isActive ? 'text-amber-100 hover:bg-amber-700' : 'text-slate-400 hover:bg-amber-100'
                        }`}
                        title="Delete this draft"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleStartNewBill}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  title="Start a fresh blank bill for another customer"
                >
                  <Plus className="w-3 h-3 text-emerald-600" />
                  <span>+ New Bill</span>
                </button>
              </div>
            </div>
          )}

          {/* Instant Product Addition directly in Current Bill */}
          <div className="p-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                <Plus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 truncate">Product not in system?</div>
                <div className="text-[10px] text-emerald-800 font-medium truncate">
                  Quick add unlisted medicine & bill it immediately
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuickAddInitialQuery('');
                setShowQuickAddModal(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Product</span>
            </button>
          </div>

          {/* Bill Date Selector - Choose Live (Today) or Previous Date for Historical Entries */}
          <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <label htmlFor="pos-sale-date-input" className="text-[11px] font-semibold text-slate-700 shrink-0">
                  Bill Date:
                </label>
                <input
                  id="pos-sale-date-input"
                  type="date"
                  value={saleDate}
                  max={todayStr}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer min-w-0"
                  title="Select billing date (choose a previous date to enter old sales records)"
                />
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSaleDate(todayStr)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    saleDate === todayStr
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Set to today"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSaleDate(yesterdayStr)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                    saleDate === yesterdayStr
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Set to yesterday"
                >
                  Yesterday
                </button>
              </div>
            </div>

            {saleDate !== todayStr && (
              <div className="flex items-center justify-between gap-1 px-2 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-[10px] text-amber-900 font-medium">
                <div className="flex items-center gap-1 min-w-0 truncate">
                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Historical Record: <strong>{new Date(saleDate + 'T12:00:00').toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setSaleDate(todayStr)}
                  className="text-amber-800 hover:text-amber-950 font-bold underline shrink-0 cursor-pointer text-[10px]"
                >
                  Reset to Today
                </button>
              </div>
            )}
          </div>

          {/* Customer & Prescription Details - Compact & Clean */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 p-2 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  id="pos-customer-select"
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 text-xs truncate focus:outline-none cursor-pointer w-full"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowDoctorInput(!showDoctorInput)}
                className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  doctorName || showDoctorInput
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                {doctorName ? `Dr: ${doctorName}` : '+ Doctor (Rx)'}
              </button>
            </div>

            {showDoctorInput && (
              <div className="flex items-center gap-2">
                <input
                  id="pos-doctor-input"
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Prescribing Doctor Name (Optional)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Cart Items List - Clean, Streamlined (No Clutter by Default) */}
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {cartSummary.items.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Pill className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                <div className="text-xs font-semibold text-slate-600">Current bill is empty</div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Pick medicines from catalog on the left, or add an unlisted medicine immediately.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddInitialQuery(searchQuery || '');
                    setShowQuickAddModal(true);
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 active:scale-95 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>+ Quick Add Product to Bill</span>
                </button>
              </div>
            ) : (
              cartSummary.items.map((item, idx) => {
                const availableBatches = getProductBatches(item.product.id, false);
                const isExpanded = expandedItemIndex === idx;

                return (
                  <div
                    key={`${item.product.id}-${item.selectedBatchId}-${idx}`}
                    className="py-2.5 space-y-2 text-xs"
                  >
                    {/* Main Compact Row: Thumbnail, Name, Unit Price, Stepper, Total, Options, Remove */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="relative cursor-pointer group/cartimg shrink-0"
                          onClick={() => {
                            setPreviewImagesProduct(item.product);
                            setActivePreviewIndex(0);
                          }}
                          title="Click to view product photos"
                        >
                          <img
                            src={(item.product.images && item.product.images[0]) || item.product.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'}
                            alt={item.product.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 group-hover/cartimg:border-emerald-500 transition shadow-2xs"
                            referrerPolicy="no-referrer"
                          />
                          {item.product.images && item.product.images.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-slate-900/85 text-white text-[7px] font-bold px-0.5 rounded-xs">
                              {item.product.images.length}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">{item.product.name}</span>
                            {item.discountAmount > 0 && (
                              <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1 py-0.2 rounded shrink-0">
                                -₹{Number(item.discountAmount).toFixed(0)}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 flex-wrap">
                            <span>{item.unit.name} • ₹{item.unitPrice}</span>
                            {(() => {
                              const singlePricing = getProductSingleTabletPricing(item.product, item.batch);
                              if (!singlePricing.isStripOrPack) return null;
                              return (
                                <span className="text-[9.5px] text-emerald-700 font-semibold">
                                  ({singlePricing.singleSellingFormatted})
                                </span>
                              );
                            })()}
                            {item.product.units.length > 1 && (
                              <select
                                value={item.selectedUnitId}
                                onChange={(e) => {
                                  const newUnitId = e.target.value;
                                  const newUnit = item.product.units.find((u) => u.id === newUnitId);
                                  const isBase = newUnit?.isBaseUnit || newUnit?.multiplierToBase === 1;
                                  const single = getProductSingleTabletPricing(item.product, item.batch);
                                  const newPrice = isBase
                                    ? single.singleSellingPrice
                                    : (newUnit?.defaultSellingPrice || item.product.sellingPrice);
                                  setCart((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                            ...it,
                                            selectedUnitId: newUnitId,
                                            customSellingPricePerUnit: newPrice,
                                          }
                                        : it
                                    )
                                  );
                                }}
                                className="text-[9.5px] py-0.2 px-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded font-semibold text-slate-700 cursor-pointer focus:outline-none"
                                title="Switch unit (Strip / Tablet)"
                              >
                                {item.product.units.map((u) => {
                                  const isBase = u.isBaseUnit || u.multiplierToBase === 1;
                                  const single = getProductSingleTabletPricing(item.product, item.batch);
                                  const p = isBase ? single.singleSellingPrice : (u.defaultSellingPrice || item.product.sellingPrice);
                                  return (
                                    <option key={u.id} value={u.id}>
                                      {u.name} (₹{p})
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                            {item.secondaryQuantity && item.secondaryQuantity > 0 ? (
                              <span className="text-emerald-700 font-semibold"> + {item.secondaryQuantity} loose</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 shrink-0">
                        <button
                          type="button"
                          title="Decrease quantity"
                          onClick={() => {
                            if (item.quantityInUnit > 1) {
                              setCart((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, quantityInUnit: it.quantityInUnit - 1 } : it
                                )
                              );
                            } else if (item.secondaryQuantity && item.secondaryQuantity > 0) {
                              setCart((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, quantityInUnit: 0 } : it
                                )
                              );
                            } else {
                              setCart((prev) => prev.filter((_, i) => i !== idx));
                            }
                          }}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.quantityInUnit}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const nextQty = isNaN(val) ? 0 : Math.max(0, val);
                            setCart((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, quantityInUnit: nextQty } : it))
                            );
                          }}
                          className="w-7 text-center font-bold tabular-nums text-slate-900 text-xs bg-transparent border-0 focus:outline-none p-0"
                          title="Quantity to bill"
                        />
                        <button
                          type="button"
                          title="Increase quantity"
                          onClick={() => {
                            setCart((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, quantityInUnit: it.quantityInUnit + 1 } : it
                              )
                            );
                          }}
                          className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price & Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-semibold tabular-nums text-slate-900 text-xs min-w-[55px] text-right">
                          ₹{Number(item.net || 0).toFixed(2)}
                        </span>

                        <button
                          type="button"
                          title={isExpanded ? "Close options" : "Batch, unit or discount options"}
                          onClick={() => setExpandedItemIndex(isExpanded ? null : idx)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isExpanded ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Advanced Options (Batch, Unit, Loose tablets, Item Discount) */}
                    {isExpanded && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span>Item Options</span>
                          <button
                            type="button"
                            onClick={() => setExpandedItemIndex(null)}
                            className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                          >
                            Done
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Batch</label>
                            <select
                              value={item.selectedBatchId}
                              onChange={(e) => {
                                const newBatchId = e.target.value;
                                setCart((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, selectedBatchId: newBatchId } : it))
                                );
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none"
                            >
                              {availableBatches.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.batchNumber} (Exp: {b.expiryDate})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Pack Unit</label>
                            <select
                              value={item.selectedUnitId}
                              onChange={(e) => {
                                const newUnitId = e.target.value;
                                const newUnit = item.product.units.find((u) => u.id === newUnitId);
                                setCart((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? {
                                          ...it,
                                          selectedUnitId: newUnitId,
                                          customSellingPricePerUnit: newUnit?.defaultSellingPrice,
                                        }
                                      : it
                                  )
                                );
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-800 focus:outline-none"
                            >
                              {item.product.units.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} (₹{u.defaultSellingPrice || '—'})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Loose / Separately sold tablets from strip */}
                        {item.multiplier > 1 && (() => {
                          const baseUnit = item.product.units.find((u) => u.isBaseUnit || u.multiplierToBase === 1) || item.product.units[item.product.units.length - 1];
                          const secQty = item.secondaryQuantity || 0;
                          const secPrice = baseUnit.defaultSellingPrice !== undefined && baseUnit.defaultSellingPrice > 0
                            ? baseUnit.defaultSellingPrice
                            : Number(((item.unitPrice / item.multiplier) * (baseUnit.multiplierToBase || 1)).toFixed(2));

                          return (
                            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px]">
                              <span className="font-medium text-slate-700">
                                + Loose {baseUnit.name}s (₹{secPrice.toFixed(2)}/ea):
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.max(0, secQty - 1);
                                    setCart((prev) =>
                                      prev.map((it, i) =>
                                        i === idx
                                          ? {
                                              ...it,
                                              secondaryUnitId: next > 0 ? baseUnit.id : undefined,
                                              secondaryQuantity: next,
                                            }
                                          : it
                                      )
                                    );
                                  }}
                                  disabled={secQty <= 0}
                                  className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center font-bold"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="w-6 text-center text-xs font-bold text-slate-900">
                                  {secQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = secQty + 1;
                                    setCart((prev) =>
                                      prev.map((it, i) =>
                                        i === idx
                                          ? {
                                              ...it,
                                              secondaryUnitId: baseUnit.id,
                                              secondaryQuantity: next,
                                            }
                                          : it
                                      )
                                    );
                                  }}
                                  className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Item-Level Discount */}
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px]">
                          <span className="font-medium text-slate-700">Item Discount:</span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex bg-slate-100 rounded border border-slate-200 p-0.5 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setCart((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, discountType: 'percentage' } : it))
                                  );
                                }}
                                className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                                  (item.discountType || 'percentage') === 'percentage'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-600'
                                }`}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCart((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, discountType: 'fixed' } : it))
                                  );
                                }}
                                className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                                  item.discountType === 'fixed'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-600'
                                }`}
                              >
                                ₹
                              </button>
                            </div>

                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                item.discountValue !== undefined
                                  ? item.discountValue === 0
                                    ? ''
                                    : item.discountValue
                                  : item.discountPercent
                                  ? item.discountPercent
                                  : ''
                              }
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  const num = val === '' ? 0 : Number(val);
                                  setCart((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                            ...it,
                                            discountValue: num,
                                            discountPercent: (it.discountType || 'percentage') === 'percentage' ? num : undefined,
                                          }
                                        : it
                                    )
                                  );
                                }
                              }}
                              className="w-12 text-center bg-slate-50 border border-slate-200 rounded py-0.5 text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Payment & Summary Totals */}
          {cartSummary.items.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              {/* Optional Clean Bill-Level Discount */}
              <div className="text-xs">
                {!showOrderDiscount && cartSummary.billDiscountAmount === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowOrderDiscount(true)}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer py-1"
                  >
                    <Percent className="w-3 h-3" />
                    <span>+ Add Bill Discount</span>
                  </button>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-700">Order Discount:</span>
                      <div className="flex bg-white rounded border border-slate-200 p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setBillDiscountType('percentage')}
                          className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                            billDiscountType === 'percentage' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillDiscountType('fixed')}
                          className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                            billDiscountType === 'fixed' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          ₹
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={billDiscountValue === '0' ? '' : billDiscountValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setBillDiscountValue(val === '' ? '0' : val);
                          }
                        }}
                        placeholder="0"
                        className="w-12 text-center bg-white border border-slate-200 rounded py-0.5 text-xs font-bold text-slate-900"
                      />
                      {(cartSummary.billDiscountAmount || 0) > 0 && (
                        <span className="text-rose-600 font-bold text-xs">
                          -₹{Number(cartSummary.billDiscountAmount || 0).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBillDiscountValue('0');
                        setShowOrderDiscount(false);
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Simplified Financial Summary - Clean & Essential */}
              <div className="space-y-1 text-xs pt-1 border-t border-slate-100 text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold tabular-nums text-slate-800">₹{Number(cartSummary.itemsGross || 0).toFixed(2)}</span>
                </div>

                {((cartSummary.totalItemDiscount || 0) > 0 || (cartSummary.billDiscountAmount || 0) > 0) && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Discount</span>
                    <span className="font-semibold tabular-nums">-₹{Number((cartSummary.totalItemDiscount || 0) + (cartSummary.billDiscountAmount || 0)).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>GST (Included)</span>
                  <span className="font-medium tabular-nums">₹{Number(cartSummary.totalTax || 0).toFixed(2)}</span>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                  <span className="text-sm font-semibold text-slate-800">Total to Pay</span>
                  <span className="text-2xl font-semibold tabular-nums text-emerald-700 tracking-tight">
                    ₹{Number(cartSummary.grandTotal || 0).toFixed(2)}
                  </span>
                </div>

                {/* Optional Internal Margins for Pharmacist */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowProfitDetails(!showProfitDetails)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{showProfitDetails ? 'Hide internal margins' : 'Show internal margins'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showProfitDetails ? 'rotate-180' : ''}`} />
                  </button>
                  {showProfitDetails && (
                    <div className="mt-1 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-500 space-y-0.5 border border-slate-200/60">
                      <div className="flex justify-between">
                        <span>Batch Cost:</span>
                        <span className="font-medium tabular-nums">₹{Number(cartSummary.totalCost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold tabular-nums text-emerald-800">
                        <span>Gross Margin:</span>
                        <span>₹{Number(cartSummary.totalProfit || 0).toFixed(2)} ({Number(cartSummary.profitMargin || 0).toFixed(1)}%)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setPaymentMethod('Cash')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'Cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'UPI'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>UPI</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('Card')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'Card'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('Credit')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'Credit'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Credit</span>
                  </button>
                </div>
              </div>

              {/* Amount Received, Change, and Credit Balance */}
              {paymentMethod === 'Cash' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Amount Received
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountReceived}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setAmountReceived(val);
                        }
                      }}
                      placeholder={String(Number(cartSummary.grandTotal || 0).toFixed(2))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Change Due
                    </label>
                    <div className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-emerald-800 text-xs">
                      {Math.max(
                        0,
                        (amountReceived === '' ? (cartSummary.grandTotal || 0) : Number(amountReceived)) -
                          (cartSummary.grandTotal || 0)
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'Credit' && (
                <div className="grid grid-cols-2 gap-2 text-xs bg-amber-50/70 p-2 rounded-xl border border-amber-200/70">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                      Amount Paid Now (₹)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountReceived}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setAmountReceived(val);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                      Khata Balance Due
                    </label>
                    <div className="px-3 py-1.5 bg-amber-100/80 rounded-xl font-semibold tabular-nums text-amber-900 text-xs">
                      {Math.max(
                        0,
                        (cartSummary.grandTotal || 0) - (amountReceived === '' ? 0 : Number(amountReceived))
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Backdated notification banner above complete sale */}
              {saleDate !== todayStr && (
                <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200/90 rounded-xl text-[11px] text-amber-900">
                  <div className="flex items-center gap-1.5 font-medium truncate">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Backdated Sale: <strong>{new Date(saleDate + 'T12:00:00').toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaleDate(todayStr)}
                    className="text-[10px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer shrink-0"
                  >
                    Reset to Today
                  </button>
                </div>
              )}

              {/* Complete Sale Button */}
              <button
                id="pos-complete-sale-btn"
                onClick={handleCheckout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-semibold shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Complete Sale
                  {saleDate !== todayStr && ` (${new Date(saleDate + 'T12:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' })})`}
                  {' '}(<span className="tabular-nums font-semibold">₹{Number(cartSummary.grandTotal || 0).toFixed(2)}</span>)
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Quick Action Bar on Mobile / Compact screens when browsing catalog */}
      {cart.length > 0 && mobileTab === 'catalog' && (
        <div className="lg:hidden fixed bottom-18 left-3 right-3 z-40 animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold flex items-center gap-1.5 truncate">
                  <span>{cart.length} item{cart.length > 1 ? 's' : ''} in Bill</span>
                  <span className="text-emerald-400 font-semibold tabular-nums">• ₹{Number(cartSummary.grandTotal || 0).toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-300">Tap to review & complete sale</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileTab('bill');
                document.getElementById('pos-current-bill-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer shrink-0 ml-2"
            >
              <span>View Bill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SAME COMPOSITION / ALTERNATIVE PRODUCT MODAL */}
      {viewingAlternativesFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-300" />
                  <h3 className="font-bold text-sm">Same Composition / Alternative Products</h3>
                </div>
                <p className="text-[11px] text-teal-200/90 mt-0.5">
                  Requested: <strong className="text-white">{viewingAlternativesFor.name}</strong> ({viewingAlternativesFor.compositions?.map((c) => `${c.ingredient} ${c.strength}`).join(', ')})
                </p>
              </div>
              <button
                onClick={() => setViewingAlternativesFor(null)}
                className="text-white/80 hover:text-white p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
              <div className="text-xs text-slate-600 leading-relaxed">
                As per pharmacy regulations, the system will <strong>never automatically substitute</strong> a requested medicine.
                Select an alternative brand below if approved by the customer:
              </div>

              {getAlternativeProducts(viewingAlternativesFor.id).length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No other brands currently stocked with this exact active composition.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {getAlternativeProducts(viewingAlternativesFor.id).map((alt) => {
                    const altStock = getProductTotalStock(alt.id);
                    const tabletUnit = alt.units.find((u) => u.name === 'Tablet') || alt.units[0];
                    const stripUnit = alt.units.find((u) => u.name === 'Strip');

                    return (
                      <div
                        key={alt.id}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 p-2 rounded-xl transition"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="relative cursor-pointer shrink-0"
                            onClick={() => {
                              setPreviewImagesProduct(alt);
                              setActivePreviewIndex(0);
                            }}
                            title="Click to view all photos"
                          >
                            <img
                              src={(alt.images && alt.images[0]) || alt.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'}
                              alt={alt.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            {alt.images && alt.images.length > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900/85 text-white text-[8px] font-bold px-1 rounded-sm shadow-xs flex items-center gap-0.5">
                                📷 {alt.images.length}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{alt.name}</div>
                            <div className="text-[11px] text-slate-500">
                              Brand: <strong className="text-slate-700">{alt.brand}</strong> • Mfr: {alt.manufacturer}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                              Composition: {alt.compositions?.map((c) => `${c.ingredient} ${c.strength}`).join(', ')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                          <div className="text-right">
                            <div className="font-bold text-slate-900">
                              {tabletUnit?.defaultSellingPrice || '—'}/{tabletUnit?.name}
                            </div>
                            {stripUnit && (
                              <div className="text-[10px] text-slate-400">
                                {stripUnit.defaultSellingPrice}/{stripUnit.name}
                              </div>
                            )}
                            <div className={`text-[11px] font-semibold ${altStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {altStock} {alt.baseUnit}s available
                            </div>
                          </div>

                          <button
                            disabled={altStock <= 0}
                            onClick={() => {
                              handleAddToCart(alt);
                              setViewingAlternativesFor(null);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                              altStock > 0
                                ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs active:scale-95'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Select Brand
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeModal && (
        <BarcodeScannerModal
          onScan={handleBarcodeScanned}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}

      {/* Printable Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* Quick Add Product to Inventory & Bill Modal */}
      <POSQuickAddProductModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        initialSearchQuery={quickAddInitialQuery}
        onProductCreatedAndAdded={handleProductCreatedAndAdded}
      />

      {/* POS Product Image Lightbox Modal */}
      {previewImagesProduct && (() => {
        const images = (previewImagesProduct.images && previewImagesProduct.images.length > 0)
          ? previewImagesProduct.images
          : (previewImagesProduct.image ? [previewImagesProduct.image] : ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60']);
        const currentImg = images[activePreviewIndex] || images[0];
        const primaryUnit = previewImagesProduct.units[0];

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
            onClick={() => setPreviewImagesProduct(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{previewImagesProduct.name}</h3>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {previewImagesProduct.brand} • {previewImagesProduct.category}
                    {images.length > 1 && ` • Photo ${activePreviewIndex + 1} of ${images.length}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImagesProduct(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  title="Close photo preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Big Photo Preview */}
              <div className="relative aspect-4/3 bg-slate-950 flex items-center justify-center overflow-hidden select-none">
                <img
                  src={currentImg}
                  alt={`${previewImagesProduct.name} - photo ${activePreviewIndex + 1}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />

                {/* Cover/Index Tag */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                  {activePreviewIndex === 0 ? (
                    <>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>1st (Cover Image)</span>
                    </>
                  ) : (
                    <span>Photo #{activePreviewIndex + 1}</span>
                  )}
                </div>

                {/* Left Arrow */}
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition cursor-pointer shadow-md"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                {/* Right Arrow */}
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActivePreviewIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition cursor-pointer shadow-md"
                    title="Next photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePreviewIndex(idx)}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                        activePreviewIndex === idx
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs scale-105'
                          : 'border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[8px] font-bold text-center leading-tight">
                          1st
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Footer info: Price & Add to Cart button */}
              <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-700">
                    ₹{primaryUnit?.defaultSellingPrice || previewImagesProduct.sellingPrice || '—'}
                    <span className="text-[10px] text-slate-400 font-normal"> / {primaryUnit?.name || previewImagesProduct.baseUnit}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Stock: {getProductTotalStock(previewImagesProduct.id)} {previewImagesProduct.baseUnit}s
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart(previewImagesProduct);
                    setPreviewImagesProduct(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Bill</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
