import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePharmacy } from '../context/PharmacyContext';
import { Product, ProductBatch, Sale, Customer } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface CartItem {
  product: Product;
  selectedUnitId: string;
  quantityInUnit: number;
  selectedBatchId: string;
  customSellingPricePerUnit?: number;
  discountPercent?: number;
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
    getProductTotalStock,
    getProductBatches,
    getFefoBatch,
    getAlternativeProducts,
    processSale,
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

  // Error / Feedback
  const [posError, setPosError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Categories list
  const categories = ['All', 'Medicines', 'Personal Care', 'General Items'];

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesBrand = p.brand.toLowerCase().includes(q);
      const matchesBarcode = p.barcode.includes(q);
      const matchesComposition = p.compositions?.some((c) =>
        `${c.ingredient} ${c.strength}`.toLowerCase().includes(q)
      );

      return matchesName || matchesBrand || matchesBarcode || matchesComposition;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle adding product to cart with automatic FEFO batch selection
  const handleAddToCart = (product: Product, overrideUnitId?: string, overrideBatchId?: string) => {
    setPosError(null);
    const fefo = getFefoBatch(product.id);
    const chosenBatch = overrideBatchId
      ? batches.find((b) => b.id === overrideBatchId)
      : fefo;

    if (!chosenBatch) {
      setPosError(`No active, non-expired stock available for ${product.name}! Check alternatives.`);
      const alts = getAlternativeProducts(product.id);
      if (alts.length > 0) {
        setViewingAlternativesFor(product);
      }
      return;
    }

    if (chosenBatch.expiryDate < todayStr && !settings.allowExpiredSale) {
      setPosError(`Selected batch ${chosenBatch.batchNumber} has EXPIRED (${chosenBatch.expiryDate})! Sale prevented.`);
      return;
    }

    // Default unit is either smallest (Tablet) or first packaging unit
    const defaultUnit = overrideUnitId
      ? product.units.find((u) => u.id === overrideUnitId) || product.units[0]
      : product.units.find((u) => u.name === 'Tablet') || product.units[0];

    // Check if item with this product & batch already in cart
    const existingIndex = cart.findIndex(
      (it) => it.product.id === product.id && it.selectedBatchId === chosenBatch.id && it.selectedUnitId === defaultUnit.id
    );

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
          selectedBatchId: chosenBatch.id,
          customSellingPricePerUnit: defaultUnit.defaultSellingPrice,
        },
      ]);
    }
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

  // Cart calculations
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalCost = 0;
    let totalTax = 0;

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
      const discount = item.discountPercent ? (gross * item.discountPercent) / 100 : 0;
      const net = gross - discount;

      const baseCost = batch?.purchasePricePerBaseUnit || 0;
      const itemTotalCost = totalBaseQuantity * baseCost;
      const itemProfit = net - itemTotalCost;
      const itemProfitPercent = itemTotalCost > 0 ? (itemProfit / itemTotalCost) * 100 : 100;
      const itemTax = (net * (item.product.gstPercent || 0)) / 100;

      subtotal += net;
      totalCost += itemTotalCost;
      totalTax += itemTax;

      return {
        ...item,
        unit,
        multiplier,
        totalBaseQuantity,
        unitPrice,
        gross,
        net,
        itemTotalCost,
        itemProfit,
        itemProfitPercent,
        batch,
      };
    });

    const grandTotal = subtotal;
    const totalProfit = subtotal - totalCost;
    const profitMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 100;

    return {
      items: itemsCalculated,
      subtotal,
      grandTotal,
      totalCost,
      totalProfit,
      profitMargin,
      totalTax,
    };
  }, [cart, batches]);

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
        setPosError(
          `Insufficient stock for ${item.product.name} (Batch ${item.batch.batchNumber}). Available: ${item.batch.availableBaseQuantity} ${item.product.baseUnit}s, requested: ${item.totalBaseQuantity} ${item.product.baseUnit}s.`
        );
        return;
      }
    }

    const itemsToProcess: {
      productId: string;
      batchId: string;
      unitId: string;
      quantityInUnit: number;
      customSellingPricePerUnit?: number;
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
          discountPercent: it.discountPercent,
        });
      }

      // 2. Loose tablets/capsules sold separately from the strip
      if (it.secondaryUnitId && it.secondaryQuantity && it.secondaryQuantity > 0) {
        const secUnit = it.product.units.find((u) => u.id === it.secondaryUnitId) || it.product.units.find((u) => u.isBaseUnit) || it.product.units[0];
        const secMultiplier = secUnit.multiplierToBase || 1;
        const secPrice = secUnit.defaultSellingPrice !== undefined && secUnit.defaultSellingPrice > 0
          ? secUnit.defaultSellingPrice
          : Number(((it.unitPrice / it.multiplier) * secMultiplier).toFixed(2));

        itemsToProcess.push({
          productId: it.product.id,
          batchId: it.selectedBatchId,
          unitId: it.secondaryUnitId,
          quantityInUnit: it.secondaryQuantity,
          customSellingPricePerUnit: secPrice,
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

    if (numericAmountReceived < cartSummary.grandTotal && paymentMethod !== 'Credit') {
      setPosError(`Amount received (${numericAmountReceived.toFixed(2)}) is less than grand total (${cartSummary.grandTotal.toFixed(2)})! For partial or credit bills, choose payment method 'Credit'.`);
      return;
    }

    try {
      const sale = processSale({
        customerId: selectedCustomerId || undefined,
        customerName: customerName || 'Walk-in Customer',
        customerPhone,
        doctorName,
        items: itemsToProcess,
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

      setCompletedSale(sale);
      setCart([]);
      setAmountReceived('');
      setNotes('');
    } catch (err: any) {
      setPosError(err.message || 'Error processing sale');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">POS Billing</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="pos-barcode-scanner-btn"
            onClick={() => setShowBarcodeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Barcode className="w-4 h-4 text-emerald-600" />
            <span>Barcode Scanner</span>
          </button>
        </div>
      </div>

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT 7 COLUMNS: Product Search, Category Tabs & Medicine Grid */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search bar & Category filters */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="pos-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, brand, salt composition, or barcode..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Simple Clean Product List (Unboxed, Flat) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No medicines found.
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const stock = getProductTotalStock(prod.id);
                const fefoBatch = getFefoBatch(prod.id);
                const hasAlternatives = getAlternativeProducts(prod.id).length > 0;
                const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
                const isOutOfStock = stock <= 0;

                const defaultUnit = prod.units.find((u) => u.name === 'Strip') || prod.units[0];

                return (
                  <div
                    key={prod.id}
                    className="p-3.5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {prod.name}
                          </h4>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-600 shrink-0">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-600 shrink-0">Low: {stock}</span>
                          ) : (
                            <span className="text-[10px] text-slate-500 shrink-0">{stock} {prod.baseUnit}s</span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {prod.brand} • <span className="text-slate-700 font-semibold">{defaultUnit?.defaultSellingPrice || '—'}/{defaultUnit?.name}</span>
                          {fefoBatch && <span className="text-slate-400"> • Batch: {fefoBatch.batchNumber}</span>}
                        </div>

                        {prod.compositions?.length > 0 && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {prod.compositions.map((c) => `${c.ingredient} ${c.strength}`).join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {hasAlternatives && (
                        <button
                          onClick={() => setViewingAlternativesFor(prod)}
                          title="View alternative brands with same composition"
                          className="py-1 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-semibold transition"
                        >
                          Alt
                        </button>
                      )}

                      <button
                        id={`add-to-cart-${prod.id}`}
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(prod)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT 5 COLUMNS: Billing Cart, Unit Converter, Batch Override, Customer & Payment */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Current Bill</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Customer & Prescription Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Customer</label>
              <select
                id="pos-customer-select"
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Doctor (Rx)</label>
              <input
                id="pos-doctor-input"
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Doctor Name (Optional)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Cart Items List - Clean, Unboxed */}
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {cartSummary.items.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-1">
                <Pill className="w-7 h-7 mx-auto text-slate-300 stroke-1" />
                <div className="text-xs font-semibold text-slate-600">Bill is empty</div>
              </div>
            ) : (
              cartSummary.items.map((item, idx) => {
                const availableBatches = getProductBatches(item.product.id, false);

                return (
                  <div
                    key={`${item.product.id}-${item.selectedBatchId}-${idx}`}
                    className="py-3 space-y-2 text-xs"
                  >
                    {/* Line Item Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{item.product.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.product.brand}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-extrabold text-slate-900">
                          {Number(item.net || 0).toFixed(2)}
                        </div>
                        <button
                          onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Batch & Selling Unit Selectors in a clean row */}
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={item.selectedBatchId}
                        onChange={(e) => {
                          const newBatchId = e.target.value;
                          setCart((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, selectedBatchId: newBatchId } : it))
                          );
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:outline-none"
                      >
                        {availableBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} (Exp: {b.expiryDate})
                          </option>
                        ))}
                      </select>

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
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-800 focus:outline-none"
                      >
                        {item.product.units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.defaultSellingPrice || '—'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity & Loose Tablets Selector */}
                    <div className="pt-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantityInUnit > 1) {
                                setCart((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, quantityInUnit: it.quantityInUnit - 1 } : it
                                  )
                                );
                              } else if (item.secondaryQuantity && item.secondaryQuantity > 0) {
                                // Allow setting primary pack to 0 if selling loose units
                                setCart((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, quantityInUnit: 0 } : it
                                  )
                                );
                              } else {
                                setCart((prev) => prev.filter((_, i) => i !== idx));
                              }
                            }}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.quantityInUnit}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*$/.test(val)) {
                                const numVal = val === '' ? 0 : parseInt(val, 10);
                                setCart((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, quantityInUnit: numVal } : it))
                                );
                              }
                            }}
                            className="w-12 text-center bg-slate-50 border border-slate-200 rounded py-0.5 text-xs font-bold text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCart((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, quantityInUnit: it.quantityInUnit + 1 } : it
                                )
                              );
                            }}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-medium text-slate-700">
                            {item.unit.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Total: <strong className="text-slate-800">{item.totalBaseQuantity}</strong> {item.product.baseUnit}s
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
                          <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200/80 rounded-lg px-2 py-1 text-[11px]">
                            <span className="font-semibold text-emerald-900">
                              + Loose {baseUnit.name}s ({secPrice.toFixed(2)}/ea):
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
                                className="w-4 h-4 rounded bg-white hover:bg-emerald-100 disabled:opacity-40 text-slate-700 flex items-center justify-center font-bold border border-emerald-200"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={secQty === 0 ? '' : secQty}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*$/.test(val)) {
                                    const next = val === '' ? 0 : parseInt(val, 10);
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
                                  }
                                }}
                                className="w-10 text-center bg-white border border-emerald-300 rounded py-0.5 text-xs font-bold text-slate-900"
                              />
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
                                className="w-4 h-4 rounded bg-white hover:bg-emerald-100 text-slate-700 flex items-center justify-center font-bold border border-emerald-200"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Payment & Summary Totals */}
          {cartSummary.items.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              {/* Financial Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{Number(cartSummary.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Batch Cost Recorded</span>
                  <span>{Number(cartSummary.totalCost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Gross Profit</span>
                  <span>
                    {Number(cartSummary.totalProfit || 0).toFixed(2)} ({Number(cartSummary.profitMargin || 0).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t">
                  <span>Grand Total</span>
                  <span className="text-emerald-700">{Number(cartSummary.grandTotal || 0).toFixed(2)}</span>
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
                    <div className="px-3 py-1.5 bg-amber-100/80 rounded-xl font-extrabold text-amber-900 text-xs">
                      {Math.max(
                        0,
                        (cartSummary.grandTotal || 0) - (amountReceived === '' ? 0 : Number(amountReceived))
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Sale Button */}
              <button
                id="pos-complete-sale-btn"
                onClick={handleCheckout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Sale ({Number(cartSummary.grandTotal || 0).toFixed(2)})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SAME COMPOSITION / ALTERNATIVE PRODUCT MODAL */}
      {viewingAlternativesFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                          <img
                            src={alt.image}
                            alt={alt.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
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
    </div>
  );
};
