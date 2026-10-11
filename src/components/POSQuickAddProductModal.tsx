import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Package,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Pill,
  Tag,
  Hash,
  ShoppingCart,
  Percent,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePharmacy } from '../context/PharmacyContext';
import { Product, ProductBatch, PackagingUnit } from '../types';

interface POSQuickAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchQuery?: string;
  onProductCreatedAndAdded: (
    product: Product,
    batch: ProductBatch,
    quantityToBill: number,
    unitId: string
  ) => void;
}

export const POSQuickAddProductModal: React.FC<POSQuickAddProductModalProps> = ({
  isOpen,
  onClose,
  initialSearchQuery = '',
  onProductCreatedAndAdded,
}) => {
  const { quickAddProductForPOS, categories, gstRates, suppliers, settings } = usePharmacy();

  // Form States
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Generic');
  const [category, setCategory] = useState('Medicines');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [composition, setComposition] = useState('');
  
  // Packaging Unit
  const [packUnitName, setPackUnitName] = useState('Strip');
  const [baseUnitName, setBaseUnitName] = useState('Tablet');
  const [unitsPerPack, setUnitsPerPack] = useState<number>(10);

  // Pricing
  const [mrpPerPack, setMrpPerPack] = useState<string>('100');
  const [sellingPricePerPack, setSellingPricePerPack] = useState<string>('100');
  const [purchaseCostPerPack, setPurchaseCostPerPack] = useState<string>('75');

  // Batch & Expiry
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-28`;
  });
  const [mfgDate, setMfgDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });

  // Quantities
  const [inwardStockQty, setInwardStockQty] = useState<number>(20);
  const [billQuantity, setBillQuantity] = useState<number>(1);

  // Taxes & Options
  const [gstPercent, setGstPercent] = useState<number>(() => settings.defaultGstPercent || 12);
  const [requiresPrescription, setRequiresPrescription] = useState<boolean>(false);
  const [storageRack, setStorageRack] = useState<string>('Counter A1');

  // Error & Loading
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      const cleanQuery = initialSearchQuery.trim();
      setName(cleanQuery || '');
      setBatchNumber(`B-${Date.now().toString().slice(-5)}`);
      setInwardStockQty(20);
      setBillQuantity(1);

      // Guess dosage form from name if applicable
      const lower = cleanQuery.toLowerCase();
      if (lower.includes('syrup') || lower.includes('suspension')) {
        setDosageForm('Syrup');
        setPackUnitName('Bottle');
        setBaseUnitName('ml');
        setUnitsPerPack(100);
      } else if (lower.includes('drop') || lower.includes('drops')) {
        setDosageForm('Drops');
        setPackUnitName('Bottle');
        setBaseUnitName('ml');
        setUnitsPerPack(15);
      } else if (lower.includes('ointment') || lower.includes('cream') || lower.includes('gel')) {
        setDosageForm('Ointment');
        setPackUnitName('Tube');
        setBaseUnitName('gm');
        setUnitsPerPack(30);
      } else if (lower.includes('capsule') || lower.includes('cap')) {
        setDosageForm('Capsule');
        setPackUnitName('Strip');
        setBaseUnitName('Capsule');
        setUnitsPerPack(10);
      } else if (lower.includes('injection') || lower.includes('inj') || lower.includes('vial')) {
        setDosageForm('Injection');
        setPackUnitName('Vial');
        setBaseUnitName('Piece');
        setUnitsPerPack(1);
      } else {
        setDosageForm('Tablet');
        setPackUnitName('Strip');
        setBaseUnitName('Tablet');
        setUnitsPerPack(10);
      }
    }
  }, [isOpen, initialSearchQuery]);

  if (!isOpen) return null;

  // Auto calculate profit margin
  const sellingNum = parseFloat(sellingPricePerPack) || 0;
  const purchaseNum = parseFloat(purchaseCostPerPack) || 0;
  const profitMarginPercent =
    purchaseNum > 0 && sellingNum > purchaseNum
      ? (((sellingNum - purchaseNum) / purchaseNum) * 100).toFixed(1)
      : '0.0';

  const handlePackTypeChange = (type: string) => {
    setDosageForm(type);
    if (type === 'Syrup') {
      setPackUnitName('Bottle');
      setBaseUnitName('ml');
      setUnitsPerPack(100);
    } else if (type === 'Drops') {
      setPackUnitName('Bottle');
      setBaseUnitName('ml');
      setUnitsPerPack(15);
    } else if (type === 'Ointment' || type === 'Gel') {
      setPackUnitName('Tube');
      setBaseUnitName('gm');
      setUnitsPerPack(30);
    } else if (type === 'Capsule') {
      setPackUnitName('Strip');
      setBaseUnitName('Capsule');
      setUnitsPerPack(10);
    } else if (type === 'Injection') {
      setPackUnitName('Vial');
      setBaseUnitName('Piece');
      setUnitsPerPack(1);
    } else {
      setPackUnitName('Strip');
      setBaseUnitName('Tablet');
      setUnitsPerPack(10);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a product / medicine name.');
      return;
    }

    const mrp = parseFloat(mrpPerPack);
    const selling = parseFloat(sellingPricePerPack);
    const purchase = parseFloat(purchaseCostPerPack);

    if (isNaN(selling) || selling <= 0) {
      setError('Please enter a valid selling price greater than 0.');
      return;
    }

    if (inwardStockQty < billQuantity) {
      setError(`Opening stock (${inwardStockQty}) cannot be less than the quantity to bill (${billQuantity}).`);
      return;
    }

    setIsSubmitting(true);

    try {
      const primaryUnitId = `unit-${Date.now()}-1`;
      const baseUnitId = `unit-${Date.now()}-2`;
      const multiplier = Math.max(1, Number(unitsPerPack) || 1);
      const finalPurchase = isNaN(purchase) ? selling * 0.75 : purchase;
      const tabPurchase = parseFloat((finalPurchase / multiplier).toFixed(2));
      const tabSelling = parseFloat((selling / multiplier).toFixed(2));

      // Construct packaging units
      const units: PackagingUnit[] = [
        {
          id: primaryUnitId,
          name: packUnitName || 'Strip',
          shortCode: (packUnitName || 'ST').slice(0, 4).toUpperCase(),
          multiplierToBase: multiplier,
          defaultSellingPrice: selling,
          defaultPurchasePrice: finalPurchase,
          isBaseUnit: multiplier === 1,
        },
      ];

      // If multiplier > 1, add the base unit (e.g. Tablet or ml)
      if (multiplier > 1) {
        units.push({
          id: baseUnitId,
          name: baseUnitName || 'Unit',
          shortCode: (baseUnitName || 'UN').slice(0, 4).toUpperCase(),
          multiplierToBase: 1,
          defaultSellingPrice: tabSelling,
          defaultPurchasePrice: tabPurchase,
          isBaseUnit: true,
        });
      }

      // Compositions
      const cleanCompositions = composition.trim()
        ? [
            {
              ingredient: composition.trim(),
              strength: '',
              isPrimary: true,
            },
          ]
        : [];

      // Create product and opening batch
      const { product, batch } = quickAddProductForPOS(
        {
          name: cleanName,
          brand: brand.trim() || 'Generic',
          manufacturer: brand.trim() || 'Generic',
          category: category || 'Medicines',
          dosageForm,
          subcategory: dosageForm,
          barcode: `890${Date.now().toString().slice(-9)}`,
          sku: `SKU-${Date.now().toString().slice(-5)}`,
          productCode: `P-${Date.now().toString().slice(-4)}`,
          description: cleanCompositions[0]
            ? `${cleanName} (${cleanCompositions[0].ingredient})`
            : cleanName,
          image:
            dosageForm === 'Syrup'
              ? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'
              : 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&auto=format&fit=crop&q=60',
          images: [],
          compositions: cleanCompositions,
          baseUnit: baseUnitName || 'Unit',
          units,
          minStockBaseUnits: 10 * multiplier,
          isActive: true,
          requiresPrescription,
          gstPercent,
          purchasePrice: isNaN(purchase) ? selling * 0.75 : purchase,
          sellingPrice: selling,
          profitPercentage: parseFloat(profitMarginPercent),
          basePurchasePrice: (isNaN(purchase) ? selling * 0.75 : purchase) / multiplier,
          baseSellingPrice: selling / multiplier,
        },
        {
          batchNumber: batchNumber.trim() || `B-${Date.now().toString().slice(-4)}`,
          mfgDate: mfgDate || new Date().toISOString().slice(0, 10),
          expiryDate: expiryDate || '2028-12-31',
          supplierId: suppliers[0]?.id || 'SUP-01',
          purchasePricePerUnit: isNaN(purchase) ? selling * 0.75 : purchase,
          mrpPerUnit: isNaN(mrp) ? selling : mrp,
          sellingPricePerUnit: selling,
          unitId: primaryUnitId,
          quantity: Math.max(1, Number(inwardStockQty) || 1),
        }
      );

      // Trigger celebratory confetti
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
      });

      // Instantly add to current POS bill
      onProductCreatedAndAdded(product, batch, billQuantity, primaryUnitId);
      onClose();
    } catch (err: any) {
      console.error('[POSQuickAddProductModal] Error adding product:', err);
      setError(err?.message || 'Failed to create product and add to bill.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-add-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-inner">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="quick-add-title" className="font-bold text-base sm:text-lg tracking-tight">
                  Quick Add Product to POS
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 text-[10px] font-bold border border-emerald-400/30">
                  Instant Sell
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Add unlisted medicine to inventory and put into current bill immediately
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Product Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Medicine / Product Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Pill className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paracetamol 650mg, Augmentin 625, Benadryl..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Brand / Mfr
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Cipla, Sun, Generic"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Dosage Form & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Dosage Form
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {['Tablet', 'Capsule', 'Syrup', 'Drops', 'Injection', 'Ointment'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handlePackTypeChange(type)}
                    className={`py-1.5 px-2 rounded-xl font-semibold border transition text-center text-[11px] cursor-pointer ${
                      dosageForm === type
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-2xs font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Medicines">Medicines</option>
                <option value="Personal Care">Personal Care</option>
                <option value="General Items">General Items</option>
                <option value="Vitamins & Supplements">Vitamins & Supplements</option>
                <option value="Medical Devices">Medical Devices</option>
                <option value="Ayurvedic">Ayurvedic</option>
              </select>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Prescription (Rx)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresPrescription}
                    onChange={(e) => setRequiresPrescription(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-600"></div>
                  <span className="ml-1.5 text-[10px] font-bold text-slate-700">
                    {requiresPrescription ? 'Schedule H' : 'OTC'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Packaging Unit & Multiplier */}
          <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Packaging Configuration</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Pack Unit
                </label>
                <input
                  type="text"
                  value={packUnitName}
                  onChange={(e) => setPackUnitName(e.target.value)}
                  placeholder="Strip / Bottle / Box"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Contains (Qty)
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitsPerPack}
                  onChange={(e) => setUnitsPerPack(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                  Base Unit
                </label>
                <input
                  type="text"
                  value={baseUnitName}
                  onChange={(e) => setBaseUnitName(e.target.value)}
                  placeholder="Tablet / ml / gm"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between">
              <span>1 {packUnitName} contains {unitsPerPack} {baseUnitName}s.</span>
              {sellingNum > 0 && unitsPerPack > 1 && (
                <span className="font-semibold text-emerald-700">
                  Single {baseUnitName}: ₹{(sellingNum / unitsPerPack).toFixed(2)} (Cost: ₹{(purchaseNum / unitsPerPack).toFixed(2)})
                </span>
              )}
            </div>
          </div>

          {/* Pricing & GST */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Selling Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={sellingPricePerPack}
                onChange={(e) => {
                  setSellingPricePerPack(e.target.value);
                  if (parseFloat(mrpPerPack) < parseFloat(e.target.value)) {
                    setMrpPerPack(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">MRP (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={mrpPerPack}
                onChange={(e) => setMrpPerPack(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">Purchase Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchaseCostPerPack}
                onChange={(e) => setPurchaseCostPerPack(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Batch Number & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Batch Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="B-2401"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Expiry Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={expiryDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Opening Inward Stock & Immediate Bill Addition (THE CORE BENEFIT) */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <ShoppingCart className="w-4 h-4 text-emerald-700" />
                <span>Inventory & Current Bill Quantities</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-800 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200">
                Pack Unit: {packUnitName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Initial Store Stock
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardStockQty}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setInwardStockQty(val);
                      if (billQuantity > val) setBillQuantity(val);
                    }}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900"
                  />
                  <span className="text-slate-600 text-xs font-medium">{packUnitName}s</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Added to store stock ({inwardStockQty * unitsPerPack} {baseUnitName}s)
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-300 space-y-1 ring-2 ring-emerald-500/20">
                <label className="block text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                  <span>Add to Current Bill</span>
                  <span className="text-emerald-700 text-[10px] font-bold">Ready to Sell</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={inwardStockQty}
                    required
                    value={billQuantity}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(inwardStockQty, parseInt(e.target.value) || 1));
                      setBillQuantity(val);
                    }}
                    className="w-20 bg-emerald-50/60 border border-emerald-300 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-900"
                  />
                  <span className="text-emerald-800 text-xs font-bold">{packUnitName}s</span>
                </div>
                <p className="text-[10px] text-emerald-700 font-semibold">
                  = ₹{(billQuantity * sellingNum).toFixed(2)} in active cart
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting ? 'Saving & Adding...' : 'Add to Inventory & Bill Now'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
