import React, { useState, useMemo } from 'react';
import {
  X,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  User,
  Phone,
  Stethoscope,
  Calendar,
  Search,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Sale, SaleItem, Product, ProductBatch, DiscountType, PaymentMethod } from '../types';
import { ConfirmDeleteInvoiceModal } from './ConfirmDeleteInvoiceModal';

interface EditInvoiceModalProps {
  sale: Sale;
  onClose: () => void;
  onSaved?: (updatedSale: Sale) => void;
}

interface EditableItem {
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
  sellingPricePerUnit: number;
  discountType: DiscountType;
  discountValue: number;
  taxPercent: number;
  costPerBaseUnit: number;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({ sale, onClose, onSaved }) => {
  const { products, batches, updateSale, deleteSale } = usePharmacy();

  // Basic invoice fields
  const [invoiceDate, setInvoiceDate] = useState(() => (sale.dateTime ? sale.dateTime.slice(0, 10) : new Date().toISOString().slice(0, 10)));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerName, setCustomerName] = useState(sale.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(sale.customerPhone || '');
  const [doctorName, setDoctorName] = useState(sale.doctorName || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale.paymentMethod || 'Cash');
  const [notes, setNotes] = useState(sale.notes || '');
  const [editReason, setEditReason] = useState('Price correction / rate adjustment');

  // Bill-level discount
  const [billDiscountType, setBillDiscountType] = useState<DiscountType>(sale.discountType || 'fixed');
  const [billDiscountValue, setBillDiscountValue] = useState<number>(sale.discountValue || sale.discountAmount || 0);

  // Catalog update toggle
  const [updateProductCatalogPrice, setUpdateProductCatalogPrice] = useState(false);

  // Items state
  const [items, setItems] = useState<EditableItem[]>(() => {
    return (sale.items || []).map((it, idx) => {
      const prod = products.find((p) => p.id === it.productId);
      const batch = batches.find((b) => b.id === it.batchId);
      const mult = it.multiplierToBase || 1;
      const unitSelling = Number(it.sellingPricePerUnit ?? (it as any).unitSellingPrice ?? 0);
      const costBase = Number(it.costPerBaseUnit ?? (it as any).unitPurchaseCost ?? batch?.purchasePricePerBaseUnit ?? 0);

      return {
        id: it.id || `edit-item-${idx}`,
        productId: it.productId,
        productName: it.productName || prod?.name || 'Medicine',
        brand: it.brand || prod?.brand || '',
        batchId: it.batchId,
        batchNumber: it.batchNumber || batch?.batchNumber || 'N/A',
        expiryDate: it.expiryDate || batch?.expiryDate || '',
        unitId: it.unitId,
        unitName: it.unitName || 'Unit',
        multiplierToBase: mult,
        quantityInUnit: Number(it.quantityInUnit || 1),
        sellingPricePerUnit: unitSelling,
        discountType: (it.discountType as DiscountType) || 'percentage',
        discountValue: Number(it.discountValue ?? it.discountPercent ?? 0),
        taxPercent: Number(it.taxPercent ?? prod?.gstPercent ?? 0),
        costPerBaseUnit: costBase,
      };
    });
  });

  // Adding new items to invoice
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [searchAddMedicine, setSearchAddMedicine] = useState('');
  const [selectedAddProductId, setSelectedAddProductId] = useState('');

  // Save / Error states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time calculation per item
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const gross = Number((item.quantityInUnit * item.sellingPricePerUnit).toFixed(2));
      let discount = 0;
      if (item.discountType === 'percentage') {
        discount = Number(((gross * Math.min(100, Math.max(0, item.discountValue))) / 100).toFixed(2));
      } else {
        discount = Number(Math.min(gross, Math.max(0, item.discountValue)).toFixed(2));
      }
      const net = Number(Math.max(0, gross - discount).toFixed(2));
      const baseQty = item.quantityInUnit * item.multiplierToBase;
      const cost = Number((baseQty * item.costPerBaseUnit).toFixed(2));
      const profit = Number((net - cost).toFixed(2));
      const profitMargin = cost > 0 ? Number(((profit / cost) * 100).toFixed(1)) : 100;
      const tax = Number(((net * item.taxPercent) / 100).toFixed(2));

      return {
        ...item,
        gross,
        discount,
        net,
        tax,
        cost,
        profit,
        profitMargin,
      };
    });
  }, [items]);

  // Overall Invoice Calculations
  const calculatedSummary = useMemo(() => {
    const subtotal = Number(calculatedItems.reduce((acc, it) => acc + it.net, 0).toFixed(2));
    const totalCost = Number(calculatedItems.reduce((acc, it) => acc + it.cost, 0).toFixed(2));
    const totalTax = Number(calculatedItems.reduce((acc, it) => acc + it.tax, 0).toFixed(2));

    let billDiscount = 0;
    if (billDiscountType === 'percentage') {
      billDiscount = Number(((subtotal * Math.min(100, Math.max(0, billDiscountValue))) / 100).toFixed(2));
    } else {
      billDiscount = Number(Math.min(subtotal, Math.max(0, billDiscountValue)).toFixed(2));
    }

    const grandTotal = Number(Math.max(0, subtotal - billDiscount).toFixed(2));
    const totalProfit = Number((grandTotal - totalCost).toFixed(2));
    const profitMarginPercent = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : 100;

    return {
      subtotal,
      billDiscount,
      totalTax,
      grandTotal,
      totalCost,
      totalProfit,
      profitMarginPercent,
    };
  }, [calculatedItems, billDiscountType, billDiscountValue]);

  // Amount paid & change
  const [customAmountPaid, setCustomAmountPaid] = useState<number | null>(null);
  const amountPaid = customAmountPaid !== null ? customAmountPaid : calculatedSummary.grandTotal;
  const changeGiven = paymentMethod === 'Cash' ? Math.max(0, Number((amountPaid - calculatedSummary.grandTotal).toFixed(2))) : 0;
  const dueAmount = Math.max(0, Number((calculatedSummary.grandTotal - amountPaid).toFixed(2)));

  // Handlers for modifying items
  const handlePriceChange = (index: number, newPrice: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, sellingPricePerUnit: Math.max(0, newPrice) } : it))
    );
  };

  const handleQuantityChange = (index: number, newQty: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantityInUnit: Math.max(1, newQty) } : it))
    );
  };

  const handleDiscountChange = (index: number, type: DiscountType, val: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, discountType: type, discountValue: Math.max(0, val) } : it))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    if (items.length <= 1) {
      setErrorMessage('An invoice must have at least 1 medicine item. Please add your new replacement item first before removing this one.');
      return;
    }
    setErrorMessage(null);
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Add medicine handler with full null/undefined safety and search across all fields
  const availableProductsToAdd = useMemo(() => {
    const q = (searchAddMedicine || '').toLowerCase().trim();
    if (!q) {
      return (products || []).slice(0, 40);
    }

    return (products || []).filter((p) => {
      if (!p) return false;
      const name = (p.name || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const generic = (p.genericName || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const compositions = (p.compositions || [])
        .map((c) => `${c?.ingredient || ''} ${c?.strength || ''}`.trim())
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        name.includes(q) ||
        brand.includes(q) ||
        generic.includes(q) ||
        barcode.includes(q) ||
        sku.includes(q) ||
        compositions.includes(q)
      );
    });
  }, [products, searchAddMedicine]);

  const handleAddProductToInvoice = (prod: Product) => {
    if (!prod) return;

    // Look for active batch in store inventory
    const prodBatches = (batches || []).filter(
      (b) => b.productId === prod.id && Number(b.availableBaseQuantity || 0) > 0
    );
    const fallbackBatches = (batches || []).filter((b) => b.productId === prod.id);
    const batch = prodBatches[0] || fallbackBatches[0];

    // Determine unit and conversion factor
    const unit = prod.units?.[0] || {
      id: 'default-unit',
      name: prod.baseUnit || 'Unit',
      multiplierToBase: 1,
      defaultSellingPrice: prod.sellingPrice || 0,
      defaultPurchasePrice: prod.basePurchasePrice || prod.purchasePrice || 0,
    };

    const mult = Number(unit.multiplierToBase || 1);
    const selling = Number(
      unit.defaultSellingPrice ||
      prod.sellingPrice ||
      (batch ? Number(batch.sellingPricePerBaseUnit || 0) * mult : 0) ||
      (prod as any).mrp ||
      20
    );
    const cost = Number(
      batch
        ? batch.purchasePricePerBaseUnit
        : (unit.defaultPurchasePrice || prod.basePurchasePrice || prod.purchasePrice || 0)
    );

    const safeBatchId = batch?.id || `BATCH-${prod.id.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
    const safeBatchNumber = batch?.batchNumber || `B-${Date.now().toString().slice(-4)}`;
    const safeExpiry = batch?.expiryDate || '2028-12-31';

    const newItem: EditableItem = {
      id: `edit-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: prod.id,
      productName: prod.name || 'Medicine',
      brand: prod.brand || '',
      batchId: safeBatchId,
      batchNumber: safeBatchNumber,
      expiryDate: safeExpiry,
      unitId: unit.id || 'default-unit',
      unitName: unit.name || 'Unit',
      multiplierToBase: mult,
      quantityInUnit: 1,
      sellingPricePerUnit: Math.max(0, selling),
      discountType: 'percentage',
      discountValue: 0,
      taxPercent: Number(prod.gstPercent || 0),
      costPerBaseUnit: Math.max(0, cost),
    };

    setItems((prev) => [...prev, newItem]);
    setShowAddMedicine(false);
    setSearchAddMedicine('');
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMessage('Cannot save an invoice with no medicine items.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const buildInvoiceDateTime = () => {
        if (!invoiceDate) return sale.dateTime;
        const origTime = sale.dateTime && sale.dateTime.includes('T')
          ? sale.dateTime.split('T')[1]
          : '12:00:00.000Z';
        return `${invoiceDate}T${origTime}`;
      };

      const updatedSale = updateSale(sale.id, {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        doctorName: doctorName.trim() || undefined,
        dateTime: buildInvoiceDateTime(),
        paymentMethod,
        amountPaid,
        notes: notes.trim() || undefined,
        discountType: billDiscountType,
        discountValue: billDiscountValue,
        editReason: editReason.trim() || 'Price correction / rate adjustment',
        updateProductCatalogPrice,
        items: items.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.productName,
          brand: it.brand,
          batchId: it.batchId,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          unitId: it.unitId,
          unitName: it.unitName,
          multiplierToBase: it.multiplierToBase,
          quantityInUnit: it.quantityInUnit,
          sellingPricePerUnit: it.sellingPricePerUnit,
          discountType: it.discountType,
          discountValue: it.discountValue,
          taxPercent: it.taxPercent,
        })),
      });

      if (onSaved) {
        onSaved(updatedSale);
      }
      onClose();
    } catch (err: any) {
      console.error('[EditInvoiceModal] Save error:', err);
      setErrorMessage(err.message || 'Failed to update invoice. Please check stock and amounts.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <Pencil className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight leading-tight">
                Edit Invoice #{sale.invoiceNumber}
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight">
                {new Date(sale.dateTime).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at{' '}
                {new Date(sale.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-rose-50 px-4 py-2 border-b border-rose-100 flex items-center gap-2 text-[11px] font-medium text-rose-700">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {/* Section 1: Customer & Invoice Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/80">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Customer</label>
              <div className="relative">
                <User className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full h-7 pl-6 pr-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Phone</label>
              <div className="relative">
                <Phone className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Mobile number"
                  className="w-full h-7 pl-6 pr-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Doctor (Rx)</label>
              <div className="relative">
                <Stethoscope className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Doctor name"
                  className="w-full h-7 pl-6 pr-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Payment</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-7 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="Card">Card</option>
                <option value="Due">Credit / Khata</option>
                <option value="Mix">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Invoice Date</label>
              <div className="relative">
                <Calendar className="w-3 h-3 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                <input
                  type="date"
                  value={invoiceDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full h-7 pl-6 pr-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  title="Edit invoice date"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Medicine Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-[11px] text-slate-800">
                  Items
                </h4>
                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-medium">
                  {calculatedItems.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAddMedicine(!showAddMedicine)}
                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold transition border border-emerald-200/80"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Quick Add Medicine Selector */}
            {showAddMedicine && (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Select Medicine to Add to Invoice</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMedicine(false);
                      setSearchAddMedicine('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search medicine by name, brand, salt composition, barcode..."
                    value={searchAddMedicine}
                    onChange={(e) => setSearchAddMedicine(e.target.value)}
                    className="w-full h-7.5 pl-8 pr-7 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  />
                  {searchAddMedicine && (
                    <button
                      type="button"
                      onClick={() => setSearchAddMedicine('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white rounded-md border border-slate-200 shadow-2xs">
                  {availableProductsToAdd.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-slate-400">
                      No matching medicines found for "{searchAddMedicine}"
                    </div>
                  ) : (
                    availableProductsToAdd.map((p) => {
                      const pBatches = (batches || []).filter(
                        (b) => b.productId === p.id && Number(b.availableBaseQuantity || 0) > 0
                      );
                      const totalStock = pBatches.reduce(
                        (sum, b) => sum + Number(b.availableBaseQuantity || 0),
                        0
                      );
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleAddProductToInvoice(p)}
                          className="p-2 flex items-center justify-between hover:bg-emerald-50/70 cursor-pointer transition text-[11px] group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                              {p.name || 'Medicine'}
                              {p.brand && (
                                <span className="text-slate-400 font-normal ml-1 text-[10px]">
                                  ({p.brand})
                                </span>
                              )}
                            </div>
                            {p.genericName && (
                              <div className="text-[10px] text-slate-400 truncate">
                                {p.genericName}
                              </div>
                            )}
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                              totalStock > 0
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                                : 'text-slate-500 bg-slate-100'
                            }`}
                          >
                            Stock: {totalStock} {p.baseUnit || 'Units'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Line Items List */}
            <div className="space-y-1.5">
              {calculatedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg border border-slate-200/90 p-2.5 shadow-2xs hover:border-slate-300 transition space-y-2"
                >
                  {/* Top Bar: Medicine Name, Batch, Unit, Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-[11px] text-slate-900 truncate">{item.productName}</span>
                      {item.brand && (
                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {item.brand}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400 font-mono">
                        {item.batchNumber}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className={`p-1 rounded-md transition ${
                        items.length <= 1
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                      }`}
                      title={items.length <= 1 ? 'An invoice requires at least 1 item. Add replacement item first.' : 'Remove item from invoice'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Input Grid: Rate, Quantity, Discount & Item Total */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 border-t border-slate-100 items-end">
                    {/* Rate */}
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Rate ({item.unitName})</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-medium">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.sellingPricePerUnit}
                          onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full h-7 pl-4.5 pr-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-500 mb-0.5">Qty</label>
                      <div className="flex items-center h-7">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, Math.max(1, item.quantityInUnit - 1))}
                          className="w-5 h-7 flex items-center justify-center bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-l text-slate-700 text-xs font-bold transition"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantityInUnit}
                          onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                          className="w-10 h-7 py-0.5 text-center bg-white border-y border-slate-200 text-[11px] font-bold text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(idx, item.quantityInUnit + 1)}
                          className="w-5 h-7 flex items-center justify-center bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-r text-slate-700 text-xs font-bold transition"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Discount */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[9px] font-semibold text-slate-500">Discount</label>
                        <div className="flex items-center gap-0.5 bg-slate-100 p-0.2 rounded">
                          <button
                            type="button"
                            onClick={() => handleDiscountChange(idx, 'percentage', item.discountValue)}
                            className={`px-1 py-0 rounded text-[8px] font-bold ${
                              item.discountType === 'percentage' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscountChange(idx, 'fixed', item.discountValue)}
                            className={`px-1 py-0 rounded text-[8px] font-bold ${
                              item.discountType === 'fixed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                            }`}
                          >
                            ₹
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step={item.discountType === 'percentage' ? '1' : '0.5'}
                        max={item.discountType === 'percentage' ? '100' : undefined}
                        value={item.discountValue}
                        onChange={(e) => handleDiscountChange(idx, item.discountType, parseFloat(e.target.value) || 0)}
                        className="w-full h-7 px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Total */}
                    <div className="text-right pb-0.5">
                      <span className="block text-[9px] font-semibold text-slate-400">Total</span>
                      <span className="text-[11px] font-bold text-slate-900 tabular-nums">
                        ₹{Number(item.net || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Bill Discount & Catalog Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50/70 rounded-lg border border-slate-200/80">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-semibold text-slate-600">Bill Discount</label>
                <div className="flex items-center gap-0.5 bg-slate-200 p-0.2 rounded">
                  <button
                    type="button"
                    onClick={() => setBillDiscountType('fixed')}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition ${
                      billDiscountType === 'fixed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    ₹ Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillDiscountType('percentage')}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold transition ${
                      billDiscountType === 'percentage' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                value={billDiscountValue}
                onChange={(e) => setBillDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full h-7 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Note (Optional)</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Reason or note"
                className="w-full h-7 px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-700">
                <input
                  type="checkbox"
                  checked={updateProductCatalogPrice}
                  onChange={(e) => setUpdateProductCatalogPrice(e.target.checked)}
                  className="w-3 h-3 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-[10px] font-medium text-slate-600">
                  Update product catalog selling price for future bills
                </span>
              </label>
            </div>
          </div>

          {/* Section 4: Clean Summary Card */}
          <div className="bg-slate-900 text-white rounded-lg p-2.5 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
                <span className="text-[9px] text-slate-400 block font-medium">Subtotal</span>
                <span className="text-xs font-bold tabular-nums text-white">
                  ₹{Number(calculatedSummary.subtotal || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
                <span className="text-[9px] text-amber-300 block font-medium">Discount</span>
                <span className="text-xs font-bold tabular-nums text-amber-300">
                  -₹{Number(calculatedSummary.billDiscount || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
                <span className="text-[9px] text-slate-400 block font-medium">GST</span>
                <span className="text-xs font-bold tabular-nums text-slate-200">
                  +₹{Number(calculatedSummary.totalTax || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/30">
                <span className="text-[9px] text-emerald-300 block font-bold">Total</span>
                <span className="text-sm font-extrabold tabular-nums text-emerald-300">
                  ₹{Number(calculatedSummary.grandTotal || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Paid / Due */}
            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">Paid:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setCustomAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-18 h-6 px-1.5 py-0 bg-white/10 border border-white/20 rounded text-[11px] font-bold text-white text-right focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              {dueAmount > 0 ? (
                <span className="text-rose-400 text-[11px] font-bold">Due: ₹{Number(dueAmount || 0).toFixed(2)}</span>
              ) : changeGiven > 0 ? (
                <span className="text-emerald-400 text-[11px] font-bold">Change: ₹{Number(changeGiven || 0).toFixed(2)}</span>
              ) : (
                <span className="text-slate-400 text-[11px]">Paid</span>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-1.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 h-7 px-2.5 py-1 rounded-md border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold transition cursor-pointer"
              title="Delete this invoice"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              <span>Delete Invoice</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-7 px-3 py-1 rounded-md border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1 h-7 px-3.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Invoice Confirmation Modal with Stock Restitution Preview */}
      <ConfirmDeleteInvoiceModal
        isOpen={showDeleteConfirm}
        sale={sale}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async (id) => {
          await deleteSale(id);
          onClose();
        }}
      />
    </div>
  );
};
