import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Pill,
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Camera,
  Upload,
  X,
  Eye,
  Info,
  List,
  LayoutGrid,
  Table,
  TrendingUp,
  TrendingDown,
  Percent,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Product, PackagingUnit, ProductComposition } from '../types';

export const ProductsView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    suppliers,
    getProductTotalStock,
    getProductBatches,
    getAlternativeProducts,
    currentRole,
  } = usePharmacy();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [altModalProduct, setAltModalProduct] = useState<Product | null>(null);

  // Quick packaging preset
  const [packagingPreset, setPackagingPreset] = useState<'strip10' | 'strip15' | 'strip4' | 'single' | 'bottle' | 'custom'>('strip10');

  const handlePresetChange = (preset: 'strip10' | 'strip15' | 'strip4' | 'single' | 'bottle' | 'custom') => {
    setPackagingPreset(preset);
    if (preset === 'strip10') {
      setBaseUnitName('Tablet');
      setUnits([
        { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: 10, defaultSellingPrice: 100, defaultPurchasePrice: 80, profitPercentage: 20 },
        { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 10, defaultPurchasePrice: 8, profitPercentage: 20 },
      ]);
    } else if (preset === 'strip15') {
      setBaseUnitName('Tablet');
      setUnits([
        { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: 15, defaultSellingPrice: 150, defaultPurchasePrice: 120, profitPercentage: 20 },
        { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 10, defaultPurchasePrice: 8, profitPercentage: 20 },
      ]);
    } else if (preset === 'strip4') {
      setBaseUnitName('Tablet');
      setUnits([
        { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: 4, defaultSellingPrice: 40, defaultPurchasePrice: 32, profitPercentage: 20 },
        { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 10, defaultPurchasePrice: 8, profitPercentage: 20 },
      ]);
    } else if (preset === 'single') {
      setBaseUnitName('Piece');
      setUnits([
        { id: 'u-1', name: 'Piece', shortCode: 'PC', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 100, defaultPurchasePrice: 80, profitPercentage: 20 },
      ]);
    } else if (preset === 'bottle') {
      setBaseUnitName('Bottle');
      setUnits([
        { id: 'u-1', name: 'Bottle', shortCode: 'BTL', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 120, defaultPurchasePrice: 90, profitPercentage: 25 },
      ]);
    }
  };

  // Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formMfr, setFormMfr] = useState('');
  const [formCategory, setFormCategory] = useState('Medicines');
  const [formSubcategory, setFormSubcategory] = useState('Tablets');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formProductCode, setFormProductCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60');
  const [formRx, setFormRx] = useState(false);
  const [formGst, setFormGst] = useState(12);
  const [formMinStock, setFormMinStock] = useState<string>('20');

  // Pricing and Profit
  const [formPurchasePrice, setFormPurchasePrice] = useState<string>('80');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('100');

  // Live Profit Calculations
  const numSelling = formSellingPrice.trim() !== '' ? Number(formSellingPrice) : 0;
  const numPurchase = formPurchasePrice.trim() !== '' ? Number(formPurchasePrice) : 0;
  const profitAmount = numSelling - numPurchase;
  const profitMarginPercent = numSelling > 0 ? (profitAmount / numSelling) * 100 : 0;
  const markupPercent = numPurchase > 0 ? (profitAmount / numPurchase) * 100 : 0;

  // Compositions
  const [compositions, setCompositions] = useState<ProductComposition[]>([
    { ingredient: 'Paracetamol', strength: '500 mg' },
  ]);

  // Packaging Units Hierarchy (Base unit + Strips/Boxes)
  const [baseUnitName, setBaseUnitName] = useState('Tablet');
  const [units, setUnits] = useState<PackagingUnit[]>([
    { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: 10, defaultSellingPrice: 100, defaultPurchasePrice: 80, profitPercentage: 20 },
    { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 10, defaultPurchasePrice: 8, profitPercentage: 20 },
  ]);

  // Optional Opening Batch
  const [includeOpeningStock, setIncludeOpeningStock] = useState(true);
  const [batchNo, setBatchNo] = useState('BATCH01');
  const [mfgDate, setMfgDate] = useState('2026-01');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || 'SUP-01');
  const [openingQty, setOpeningQty] = useState<string>('10'); // 10 strips
  const [openingUnitId, setOpeningUnitId] = useState('u-1');
  const [purchasePricePerUnit, setPurchasePricePerUnit] = useState<string>('80');
  const [sellingPricePerUnit, setSellingPricePerUnit] = useState<string>('100');
  const [mrpPerUnit, setMrpPerUnit] = useState<string>('100');

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormMfr('');
    setFormCategory('Medicines');
    setFormSubcategory('Tablets');
    setFormBarcode(String(Date.now()).slice(-8));
    setFormSku(`MED-${Date.now().toString().slice(-4)}`);
    setFormProductCode(`PC-${Date.now().toString().slice(-4)}`);
    setFormDescription('');
    setFormRx(false);
    setFormGst(12);
    setFormMinStock('20');
    setFormPurchasePrice('80');
    setFormSellingPrice('100');
    setCompositions([{ ingredient: '', strength: '' }]);
    setBaseUnitName('Tablet');
    setUnits([
      { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: 10, defaultSellingPrice: 100, defaultPurchasePrice: 80, profitPercentage: 20 },
      { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 10, defaultPurchasePrice: 8, profitPercentage: 20 },
    ]);
    setPackagingPreset('strip10');
    setIncludeOpeningStock(false);
    setBatchNo(`B-${Date.now().toString().slice(-4)}`);
    setMfgDate('2026-01');
    setExpiryDate('2027-12-31');
    setOpeningQty('10');
    setPurchasePricePerUnit('80');
    setSellingPricePerUnit('100');
    setMrpPerUnit('100');
    setEditingProduct(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowMoreDetails(false);
    setShowAddModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const finalBrand = formBrand.trim() || formName.trim().split(' ')[0] || 'Generic';
    const finalMfr = formMfr.trim() || 'Standard Pharma';
    const cleanCompositions = compositions.filter((c) => c.ingredient.trim().length > 0);

    const numericPurchase = formPurchasePrice === '' ? 0 : Number(formPurchasePrice) || 0;
    const numericSelling = formSellingPrice === '' ? 0 : Number(formSellingPrice) || 0;
    const calculatedProfitPercent = Number(profitMarginPercent.toFixed(2));

    // Ensure base unit is included in units array
    const hasBaseUnit = units.some((u) => u.name.toLowerCase() === baseUnitName.toLowerCase() || u.isBaseUnit);
    let finalUnits = [...units];
    if (!hasBaseUnit) {
      const baseMult = 1;
      const primaryMult = units[0]?.multiplierToBase || 1;
      finalUnits.push({
        id: `u-base-${Date.now()}`,
        name: baseUnitName,
        shortCode: baseUnitName.slice(0, 3).toUpperCase(),
        multiplierToBase: baseMult,
        isBaseUnit: true,
        defaultSellingPrice: Number((numericSelling / primaryMult).toFixed(2)),
        defaultPurchasePrice: Number((numericPurchase / primaryMult).toFixed(2)),
        profitPercentage: calculatedProfitPercent,
      });
    }

    // Apply selling and purchase prices to units
    finalUnits = finalUnits.map((u, idx) => {
      if (idx === 0) {
        return {
          ...u,
          defaultSellingPrice: numericSelling,
          defaultPurchasePrice: numericPurchase,
          profitPercentage: calculatedProfitPercent,
        };
      }
      const primaryMult = finalUnits[0]?.multiplierToBase || 1;
      const thisMult = u.multiplierToBase || 1;
      return {
        ...u,
        defaultSellingPrice: Number(((numericSelling / primaryMult) * thisMult).toFixed(2)),
        defaultPurchasePrice: Number(((numericPurchase / primaryMult) * thisMult).toFixed(2)),
        profitPercentage: calculatedProfitPercent,
      };
    });

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formName,
        brand: finalBrand,
        manufacturer: finalMfr,
        category: formCategory,
        subcategory: formSubcategory,
        barcode: formBarcode,
        sku: formSku,
        productCode: formProductCode,
        description: formDescription,
        image: formImage,
        compositions: cleanCompositions,
        baseUnit: baseUnitName,
        units: finalUnits,
        minStockBaseUnits: Number(formMinStock) || 0,
        requiresPrescription: formRx,
        gstPercent: formGst,
        purchasePrice: numericPurchase,
        sellingPrice: numericSelling,
        profitPercentage: calculatedProfitPercent,
      });
    } else {
      addProduct(
        {
          name: formName,
          brand: finalBrand,
          manufacturer: finalMfr,
          category: formCategory,
          subcategory: formSubcategory,
          barcode: formBarcode || `890${Date.now().toString().slice(-9)}`,
          sku: formSku || `SKU-${Date.now().toString().slice(-5)}`,
          productCode: formProductCode || `P-${Date.now().toString().slice(-4)}`,
          description: formDescription,
          image: formImage,
          compositions: cleanCompositions,
          baseUnit: baseUnitName,
          units: finalUnits,
          minStockBaseUnits: Number(formMinStock) || 0,
          isActive: true,
          requiresPrescription: formRx,
          gstPercent: formGst,
          purchasePrice: numericPurchase,
          sellingPrice: numericSelling,
          profitPercentage: calculatedProfitPercent,
        },
        includeOpeningStock
          ? {
              batchNumber: batchNo,
              mfgDate,
              expiryDate,
              supplierId,
              purchasePricePerUnit: numericPurchase || Number(purchasePricePerUnit) || 0,
              mrpPerUnit: numericSelling || Number(mrpPerUnit) || 0,
              sellingPricePerUnit: numericSelling || Number(sellingPricePerUnit) || 0,
              unitId: openingUnitId || finalUnits[0].id,
              quantity: Number(openingQty) || 0,
            }
          : undefined
      );
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBrand(p.brand);
    setFormMfr(p.manufacturer);
    setFormCategory(p.category);
    setFormSubcategory(p.subcategory || '');
    setFormBarcode(p.barcode);
    setFormSku(p.sku);
    setFormProductCode(p.productCode);
    setFormDescription(p.description || '');
    setFormImage(p.image);
    setFormRx(p.requiresPrescription || false);
    setFormGst(p.gstPercent || 12);
    setFormMinStock(String(p.minStockBaseUnits ?? 20));

    const initSelling = p.sellingPrice ?? p.units[0]?.defaultSellingPrice ?? 100;
    const initPurchase = p.purchasePrice ?? p.units[0]?.defaultPurchasePrice ?? 80;
    setFormSellingPrice(initSelling !== undefined ? String(initSelling) : '');
    setFormPurchasePrice(initPurchase !== undefined ? String(initPurchase) : '');

    setCompositions(p.compositions?.length ? p.compositions : [{ ingredient: '', strength: '' }]);
    setBaseUnitName(p.baseUnit);
    setUnits(p.units);
    setIncludeOpeningStock(false);
    setShowMoreDetails(true);
    setShowAddModal(true);
  };

  // Dynamic categories extracted from products
  const categoryList = useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    products.forEach((p) => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    // Ensure core pharmacy categories are present
    ['Medicines', 'Personal Care', 'General Items', 'Vitamins & Supplements'].forEach((c) => cats.add(c));
    return Array.from(cats);
  }, [products]);

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    if (!matchCat) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.compositions?.some((c) => `${c.ingredient} ${c.strength}`.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Single Integrated Container (No multiple separated tiles) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Top Integrated Controls */}
        <div className="p-3 sm:p-4 space-y-2.5">
          {/* Row 1: Products Title + Count, View Mode Switcher, and Add Medicine Action */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Products</h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-bold rounded-full">
                {filtered.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* View Mode Switcher */}
              <div className="flex items-center gap-0.5 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Cards View (Compact)"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white shadow-xs text-emerald-700 font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white shadow-xs text-emerald-700 font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white shadow-xs text-emerald-700 font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Add Medicine Button */}
              <button
                id="add-medicine-btn"
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine</span>
              </button>
            </div>
          </div>

          {/* Row 2: Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="products-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine, salt composition, brand, barcode..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 sm:py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Row 3: Swipeable/Slideable Category Chips Slider */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-1 px-1">
            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = cat === 'All' ? products.length : products.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`ml-1 text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400 font-normal'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Integrated Divider */}
        <div className="border-t border-slate-200" />

        {/* Integrated Products Content */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Pill className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No medicines found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or category filter.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* Mobile-First Integrated List: Clean rows with Name, Price, Stock, and "i" */
          <div className="divide-y divide-slate-100">
            {filtered.map((prod) => {
              const stock = getProductTotalStock(prod.id);
              const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
              const isOutOfStock = stock <= 0;
              const primaryUnit = prod.units[0];

              return (
                <div
                  key={prod.id}
                  className="p-3 sm:p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => setInspectingProduct(prod)}
                  >
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-slate-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {prod.name}
                        </h3>
                        {isOutOfStock && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 shrink-0">
                            Out
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-emerald-700 mt-0.5">
                        {primaryUnit?.defaultSellingPrice ? `₹${primaryUnit.defaultSellingPrice}` : '—'}
                        {primaryUnit?.name && (
                          <span className="text-[10px] text-slate-400 font-normal"> / {primaryUnit.name}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-xs sm:text-sm font-bold ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                        {stock} {prod.baseUnit}s
                      </div>
                      <div className="text-[10px] text-slate-400">Stock</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectingProduct(prod)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition cursor-pointer"
                      title="View full details (i)"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    {(currentRole === 'Admin' || currentRole === 'Manager') && (
                      <button
                        type="button"
                        onClick={() => handleEditClick(prod)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition cursor-pointer"
                        title="Edit medicine"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'grid' ? (
          /* Small, Compact Cards: only Name, Price, Stock, and "i" Info button */
          <div className="p-3 sm:p-4 bg-slate-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {filtered.map((prod) => {
                const stock = getProductTotalStock(prod.id);
                const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
                const isOutOfStock = stock <= 0;
                const primaryUnit = prod.units[0];

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 flex flex-col justify-between hover:border-emerald-400 hover:shadow-xs transition relative group"
                  >
                    <div>
                      {/* Top: Thumbnail + "i" icon + optional edit */}
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => setInspectingProduct(prod)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            title="View more details (i)"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          {(currentRole === 'Admin' || currentRole === 'Manager') && (
                            <button
                              type="button"
                              onClick={() => handleEditClick(prod)}
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                              title="Edit medicine"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 1. Name */}
                      <h3
                        className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug cursor-pointer hover:text-emerald-700 transition"
                        onClick={() => setInspectingProduct(prod)}
                        title={prod.name}
                      >
                        {prod.name}
                      </h3>

                      {/* 2. Price & Profit */}
                      <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
                        <div className="text-xs font-bold text-emerald-700">
                          {prod.sellingPrice
                            ? `₹${prod.sellingPrice}`
                            : primaryUnit?.defaultSellingPrice
                            ? `₹${primaryUnit.defaultSellingPrice}`
                            : '—'}
                          {primaryUnit?.name ? (
                            <span className="text-[10px] text-slate-400 font-normal">
                              {' '}/ {primaryUnit.name}
                            </span>
                          ) : null}
                        </div>
                        {((prod.profitPercentage !== undefined && prod.profitPercentage > 0) ||
                          (primaryUnit?.profitPercentage !== undefined && primaryUnit.profitPercentage > 0)) && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            +{prod.profitPercentage ?? primaryUnit?.profitPercentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. Stock */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 text-[10px]">Stock</span>
                      {isOutOfStock ? (
                        <span className="font-bold text-rose-600 text-[10px] bg-rose-50 px-1.5 py-0.5 rounded">
                          Out
                        </span>
                      ) : isLowStock ? (
                        <span className="font-bold text-amber-600 text-[10px] bg-amber-50 px-1.5 py-0.5 rounded">
                          {stock} {prod.baseUnit}s
                        </span>
                      ) : (
                        <span className="font-bold text-slate-800 text-[10px]">
                          {stock} {prod.baseUnit}s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table View inside the integrated container */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Medicine & Brand</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Composition</th>
                  <th className="p-3.5">Packaging & Pricing</th>
                  <th className="p-3.5 text-right">Available Stock</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((prod) => {
                  const stock = getProductTotalStock(prod.id);
                  const alternatives = getAlternativeProducts(prod.id);
                  const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
                  const isOutOfStock = stock <= 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                              {prod.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {prod.brand} • <span className="text-slate-400">{prod.manufacturer}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-600 font-medium">{prod.category}</span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        {prod.compositions?.length > 0 ? (
                          <div className="text-slate-700 font-medium leading-relaxed">
                            {prod.compositions.map((c) => `${c.ingredient} ${c.strength}`).join(' • ')}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No salt specified</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">
                            ₹{prod.sellingPrice ?? prod.units[0]?.defaultSellingPrice ?? '—'}
                          </span>
                          {(prod.purchasePrice || prod.units[0]?.defaultPurchasePrice) && (
                            <span className="text-slate-400 text-[11px]">
                              (Cost: ₹{prod.purchasePrice ?? prod.units[0]?.defaultPurchasePrice})
                            </span>
                          )}
                          {((prod.profitPercentage !== undefined && prod.profitPercentage > 0) ||
                            (prod.units[0]?.profitPercentage !== undefined && prod.units[0]?.profitPercentage > 0)) && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              +{prod.profitPercentage ?? prod.units[0]?.profitPercentage}%
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {prod.units.map((u) => `${u.name}: ₹${u.defaultSellingPrice || '—'}`).join(' • ')}
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className={`font-extrabold ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                          {stock} {prod.baseUnit}s
                        </div>
                        <div>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-600">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-600">Low Stock</span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">In Stock</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {alternatives.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setAltModalProduct(prod)}
                              className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                              title="View same-composition alternative brands"
                            >
                              {alternatives.length} Alt
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setInspectingProduct(prod)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            title="View details & batches"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(currentRole === 'Admin' || currentRole === 'Manager') && (
                            <button
                              type="button"
                              onClick={() => handleEditClick(prod)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                              title="Edit medicine"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-800/60 flex items-center justify-center">
                  <Pill className="w-4 h-4 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add Medicine / Product'}
                  </h3>
                  <p className="text-[10px] text-emerald-200">
                    {editingProduct ? 'Update product pricing and information' : 'Simple quick intake: enter name & price to start billing'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              {/* Essential Fields */}
              <div className="space-y-3">
                {/* Product Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Medicine / Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!formBrand) {
                        const firstWord = e.target.value.trim().split(' ')[0];
                        if (firstWord && firstWord.length >= 2) setFormBrand(firstWord);
                      }
                    }}
                    placeholder="e.g. Paracetamol 500mg, Dolo 650, Amoxicillin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
                  />
                </div>

                {/* Category & Packaging */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="Medicines">Medicines</option>
                      <option value="Personal Care">Personal Care</option>
                      <option value="General Items">General Items</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Pack Form &amp; Multiplier</label>
                    <select
                      value={packagingPreset}
                      onChange={(e) => handlePresetChange(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="strip10">Strip of 10 Tablets</option>
                      <option value="strip15">Strip of 15 Tablets</option>
                      <option value="strip4">Strip of 4 Tablets</option>
                      <option value="single">Single Unit / Piece</option>
                      <option value="bottle">Bottle / Syrup (100ml)</option>
                    </select>
                  </div>
                </div>

                {/* Price & Profit */}
                <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Purchase Cost (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formPurchasePrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setFormPurchasePrice(val);
                            }
                          }}
                          placeholder="0.00"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Selling MRP (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formSellingPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setFormSellingPrice(val);
                            }
                          }}
                          placeholder="0.00"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-slate-900 font-bold text-xs focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Simple Live Profit preview */}
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Estimated Profit:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={profitAmount >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        ₹{profitAmount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({profitMarginPercent >= 0 ? `+${profitMarginPercent.toFixed(1)}%` : `${profitMarginPercent.toFixed(1)}%`} margin)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible More Details Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="w-full flex items-center justify-between py-2 px-3 bg-slate-100/80 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-[11px] transition cursor-pointer"
                >
                  <span>{showMoreDetails ? 'Hide Additional Details' : '+ More Details (Brand, Salt Composition, Barcode, Stock Alert)'}</span>
                  {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                </button>

                {showMoreDetails && (
                  <div className="mt-3 space-y-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
                    {/* Brand & Mfr */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Brand Name</label>
                        <input
                          type="text"
                          value={formBrand}
                          onChange={(e) => setFormBrand(e.target.value)}
                          placeholder="e.g. Calpol / Dolo"
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Manufacturer</label>
                        <input
                          type="text"
                          value={formMfr}
                          onChange={(e) => setFormMfr(e.target.value)}
                          placeholder="e.g. Micro Labs / Cipla"
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Barcode & Min Stock */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Barcode / EAN</label>
                        <input
                          type="text"
                          value={formBarcode}
                          onChange={(e) => setFormBarcode(e.target.value)}
                          placeholder="890..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-slate-900 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Low Stock Alert ({baseUnitName}s)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formMinStock}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) setFormMinStock(val);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs font-bold focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Salt Composition */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-bold text-slate-600">Active Salt Composition</label>
                        <button
                          type="button"
                          onClick={() => setCompositions([...compositions, { ingredient: '', strength: '' }])}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Salt</span>
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {compositions.map((comp, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={comp.ingredient}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCompositions((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, ingredient: val } : c))
                                );
                              }}
                              placeholder="Ingredient (e.g. Paracetamol)"
                              className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-900 text-xs focus:outline-none"
                            />
                            <input
                              type="text"
                              value={comp.strength}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCompositions((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, strength: val } : c))
                                );
                              }}
                              placeholder="500 mg"
                              className="w-24 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-900 text-xs focus:outline-none"
                            />
                            {compositions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setCompositions((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Opening Batch (Optional) */}
                    {!editingProduct && (
                      <div className="pt-2 border-t border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                          <input
                            type="checkbox"
                            checked={includeOpeningStock}
                            onChange={(e) => setIncludeOpeningStock(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>Receive Initial Batch Stock</span>
                        </label>

                        {includeOpeningStock && (
                          <div className="grid grid-cols-3 gap-2 mt-2 p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Batch No</label>
                              <input
                                type="text"
                                value={batchNo}
                                onChange={(e) => setBatchNo(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs font-bold focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Expiry Date</label>
                              <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Opening Qty</label>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={openingQty}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*$/.test(val)) setOpeningQty(val);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-xs focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-product-btn"
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition active:scale-95 cursor-pointer"
                >
                  {editingProduct ? 'Save Changes' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAME COMPOSITION BRAND ALTERNATIVES MODAL (Section 6) */}
      {altModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-300" />
                <h3 className="font-bold text-sm">Equivalent Medicines (Same Salt)</h3>
              </div>
              <button
                onClick={() => setAltModalProduct(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs text-slate-600">
                Products sharing identical active composition with <strong className="text-slate-900">{altModalProduct.name}</strong>:
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {getAlternativeProducts(altModalProduct.id).map((alt) => {
                  const stock = getProductTotalStock(alt.id);
                  const tab = alt.units.find((u) => u.name === 'Tablet') || alt.units[0];

                  return (
                    <div key={alt.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{alt.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Brand: {alt.brand} • Mfr: {alt.manufacturer}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          {tab?.defaultSellingPrice || '—'}/{tab?.name}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700">
                          {stock} {alt.baseUnit}s available
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS & BATCHES INSPECTOR DRAWER (Shown on 'i' icon click) */}
      {inspectingProduct && (() => {
        const totalStock = getProductTotalStock(inspectingProduct.id);
        const alternatives = getAlternativeProducts(inspectingProduct.id);
        const batches = getProductBatches(inspectingProduct.id, true);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base leading-tight">{inspectingProduct.name}</h3>
                    <div className="text-[11px] text-slate-400">
                      SKU: {inspectingProduct.sku} • Barcode: {inspectingProduct.barcode}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingProduct(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
                {/* Summary Info Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={inspectingProduct.image}
                      alt={inspectingProduct.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {inspectingProduct.category}
                        </span>
                        <span className="text-slate-600 font-medium">
                          Brand: <strong className="text-slate-800">{inspectingProduct.brand}</strong>
                        </span>
                        {inspectingProduct.manufacturer && (
                          <span className="text-slate-500">
                            • Mfr: {inspectingProduct.manufacturer}
                          </span>
                        )}
                      </div>

                      {/* Salt / Composition */}
                      {inspectingProduct.compositions?.length > 0 && (
                        <div className="text-[11px] text-slate-700 pt-1">
                          <span className="text-slate-400 font-medium">Active Salt: </span>
                          <span className="font-semibold text-slate-900">
                            {inspectingProduct.compositions.map((c) => `${c.ingredient} (${c.strength})`).join(' + ')}
                          </span>
                        </div>
                      )}

                      {/* Stock summary */}
                      <div className="text-[11px] text-slate-600 flex items-center gap-2 pt-1 flex-wrap">
                        <span>Total Available Stock:</span>
                        <span className="font-bold text-emerald-700 text-xs">
                          {totalStock} {inspectingProduct.baseUnit}s
                        </span>
                        <span className="text-slate-400">
                          (Min Alert: {inspectingProduct.minStockBaseUnits} {inspectingProduct.baseUnit}s)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Packaging Units & Pricing with Profit Margins */}
                  <div className="pt-2 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-bold text-slate-700">Pricing &amp; Profit Margins</div>
                      {(inspectingProduct.profitPercentage !== undefined && inspectingProduct.profitPercentage > 0) && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>+{inspectingProduct.profitPercentage.toFixed(1)}% Profit Margin</span>
                        </span>
                      )}
                    </div>

                    {/* High-level Pricing Summary */}
                    <div className="grid grid-cols-3 gap-2 mb-2.5 p-2.5 rounded-xl bg-white border border-slate-200">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Purchase Price</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">
                          {inspectingProduct.purchasePrice
                            ? `₹${inspectingProduct.purchasePrice.toFixed(2)}`
                            : inspectingProduct.units[0]?.defaultPurchasePrice
                            ? `₹${inspectingProduct.units[0].defaultPurchasePrice.toFixed(2)}`
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Selling Price</div>
                        <div className="text-xs font-bold text-emerald-700 mt-0.5">
                          {inspectingProduct.sellingPrice
                            ? `₹${inspectingProduct.sellingPrice.toFixed(2)}`
                            : inspectingProduct.units[0]?.defaultSellingPrice
                            ? `₹${inspectingProduct.units[0].defaultSellingPrice.toFixed(2)}`
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Profit / Unit</div>
                        <div className="text-xs font-bold text-emerald-700 mt-0.5">
                          {inspectingProduct.sellingPrice && inspectingProduct.purchasePrice
                            ? `₹${(inspectingProduct.sellingPrice - inspectingProduct.purchasePrice).toFixed(2)}`
                            : inspectingProduct.units[0]?.defaultSellingPrice && inspectingProduct.units[0]?.defaultPurchasePrice
                            ? `₹${(inspectingProduct.units[0].defaultSellingPrice - inspectingProduct.units[0].defaultPurchasePrice).toFixed(2)}`
                            : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Packaging Units Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {inspectingProduct.units.map((u) => {
                        const unitProfit = (u.defaultSellingPrice && u.defaultPurchasePrice)
                          ? u.defaultSellingPrice - u.defaultPurchasePrice
                          : null;
                        const unitMargin = (u.defaultSellingPrice && unitProfit)
                          ? (unitProfit / u.defaultSellingPrice) * 100
                          : u.profitPercentage;

                        return (
                          <div key={u.name} className="bg-white border border-slate-200 rounded-xl p-2 text-center">
                            <div className="text-[10px] text-slate-500 font-medium">{u.name}</div>
                            <div className="text-xs font-bold text-emerald-700 mt-0.5">
                              {u.defaultSellingPrice ? `₹${u.defaultSellingPrice}` : '—'}
                            </div>
                            {u.defaultPurchasePrice && (
                              <div className="text-[10px] text-slate-400">
                                Cost: ₹{u.defaultPurchasePrice}
                              </div>
                            )}
                            {unitMargin !== undefined && unitMargin > 0 && (
                              <div className="text-[9px] font-bold text-emerald-600 mt-0.5">
                                +{unitMargin.toFixed(0)}% profit
                              </div>
                            )}
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              = {u.multiplierToBase} {inspectingProduct.baseUnit}s
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                    {alternatives.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAltModalProduct(inspectingProduct);
                          setInspectingProduct(null);
                        }}
                        className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Pill className="w-3.5 h-3.5 text-teal-600" />
                        View {alternatives.length} Same-Salt Substitute Brands
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Unique salt (no direct brand substitutes)</span>
                    )}

                    {(currentRole === 'Admin' || currentRole === 'Manager') && (
                      <button
                        type="button"
                        onClick={() => {
                          const prod = inspectingProduct;
                          setInspectingProduct(null);
                          handleEditClick(prod);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Product
                      </button>
                    )}
                  </div>
                </div>

                {/* Batches Table */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                    <span>Associated Batches (FEFO Tracked)</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {batches.length} Active {batches.length === 1 ? 'Batch' : 'Batches'}
                    </span>
                  </h4>
                  {batches.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                      No stock batches available for this medicine. Add a purchase invoice to replenish inventory.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="p-2.5">Batch No</th>
                            <th className="p-2.5">Expiry Date</th>
                            <th className="p-2.5">Cost/Base</th>
                            <th className="p-2.5">Sell/Base</th>
                            <th className="p-2.5">Stock Left</th>
                            <th className="p-2.5">Supplier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {batches.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold font-mono text-slate-900">{b.batchNumber}</td>
                              <td className="p-2.5 font-medium">{b.expiryDate}</td>
                              <td className="p-2.5">₹{b.purchasePricePerBaseUnit.toFixed(2)}</td>
                              <td className="p-2.5 font-semibold text-emerald-700">₹{b.sellingPricePerBaseUnit.toFixed(2)}</td>
                              <td className="p-2.5 font-bold text-slate-800">
                                {b.availableBaseQuantity} {inspectingProduct.baseUnit}s
                              </td>
                              <td className="p-2.5 text-slate-500 truncate max-w-[120px]">{b.supplierName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
