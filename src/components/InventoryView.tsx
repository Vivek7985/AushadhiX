import React, { useState } from 'react';
import {
  Boxes,
  AlertTriangle,
  ClockAlert,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  TrendingDown,
  Layers,
  ArrowRight,
  X,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Product, ProductBatch } from '../types';

interface InventoryViewProps {
  initialFilter?: 'All' | 'LowStock' | 'OutOfStock' | 'Expiring' | 'Expired';
}

export const InventoryView: React.FC<InventoryViewProps> = ({ initialFilter = 'All' }) => {
  const {
    products,
    batches,
    suppliers,
    settings,
    getProductTotalStock,
    getProductBatches,
    adjustStock,
    addBatch,
    currentRole,
  } = usePharmacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'LowStock' | 'OutOfStock' | 'Expiring' | 'Expired'>(initialFilter);

  React.useEffect(() => {
    if (initialFilter) {
      setStockStatusFilter(initialFilter);
    }
  }, [initialFilter]);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({ 'PROD-01': true });

  // Stock Adjustment Modal
  const [adjustModalItem, setAdjustModalItem] = useState<{
    product: Product;
    batch: ProductBatch;
  } | null>(null);
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustType, setAdjustType] = useState<'Damage' | 'Expiry' | 'StockAdjustment' | 'ManualCorrection'>('Damage');
  const [adjustNotes, setAdjustNotes] = useState('');

  // New Batch Modal
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('2026-02');
  const [newExpiryDate, setNewExpiryDate] = useState('2027-11-30');
  const [newSupplierId, setNewSupplierId] = useState(suppliers[0]?.id || '');
  const [newQuantity, setNewQuantity] = useState('50');
  const [newPurchasePrice, setNewPurchasePrice] = useState('11');
  const [newSellingPrice, setNewSellingPrice] = useState('13');
  const [newMrp, setNewMrp] = useState('15');

  const todayStr = new Date().toISOString().slice(0, 10);
  const warnThresholdDate = new Date();
  warnThresholdDate.setDate(warnThresholdDate.getDate() + (settings.expiryWarningDays || 60));
  const warnThresholdStr = warnThresholdDate.toISOString().slice(0, 10);

  // Totals
  const totalValuation = batches
    .filter((b) => b.availableBaseQuantity > 0 && b.expiryDate >= todayStr)
    .reduce((sum, b) => sum + b.availableBaseQuantity * b.purchasePricePerBaseUnit, 0);

  const lowStockCount = products.filter((p) => {
    const s = getProductTotalStock(p.id);
    return s > 0 && s <= p.minStockBaseUnits;
  }).length;

  const outOfStockCount = products.filter((p) => getProductTotalStock(p.id) === 0).length;

  const expiringCount = batches.filter(
    (b) => b.availableBaseQuantity > 0 && b.expiryDate <= warnThresholdStr && b.expiryDate >= todayStr
  ).length;

  const expiredCount = batches.filter(
    (b) => b.availableBaseQuantity > 0 && b.expiryDate < todayStr
  ).length;

  const toggleExpand = (id: string) => {
    setExpandedProductIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem) return;

    const parsedQty = Math.max(1, Number(adjustQty) || 1);
    // Positive or negative based on reason
    const delta = adjustType === 'StockAdjustment' ? parsedQty : -Math.abs(parsedQty);
    adjustStock(
      adjustModalItem.product.id,
      adjustModalItem.batch.id,
      delta,
      adjustType,
      adjustNotes
    );

    setAdjustModalItem(null);
    setAdjustQty('1');
    setAdjustNotes('');
  };

  const handleCreateNewBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === selectedProductId);
    const supplier = suppliers.find((s) => s.id === newSupplierId);
    if (!product || !newBatchNo) return;

    addBatch({
      productId: product.id,
      batchNumber: newBatchNo,
      mfgDate: newMfgDate,
      expiryDate: newExpiryDate,
      purchaseDate: new Date().toISOString().slice(0, 10),
      supplierId: newSupplierId,
      supplierName: supplier?.name || 'Direct Wholesale',
      purchasePricePerBaseUnit: Number(newPurchasePrice) || 0,
      mrpPerBaseUnit: Number(newMrp) || 0,
      sellingPricePerBaseUnit: Number(newSellingPrice) || 0,
      initialBaseQuantity: Math.max(1, Number(newQuantity) || 1),
      notes: 'New batch received at revised cost',
    });

    setShowNewBatchModal(false);
    setNewBatchNo('');
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const stock = getProductTotalStock(p.id);
    const pBatches = getProductBatches(p.id, true);

    if (stockStatusFilter === 'LowStock' && (stock <= 0 || stock > p.minStockBaseUnits)) return false;
    if (stockStatusFilter === 'OutOfStock' && stock > 0) return false;
    if (stockStatusFilter === 'Expiring' && !pBatches.some((b) => b.availableBaseQuantity > 0 && b.expiryDate <= warnThresholdStr && b.expiryDate >= todayStr)) return false;
    if (stockStatusFilter === 'Expired' && !pBatches.some((b) => b.availableBaseQuantity > 0 && b.expiryDate < todayStr)) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      pBatches.some((b) => b.batchNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Inventory & Stock</h2>
        </div>

        <div className="flex items-center gap-2">
          {currentRole === 'Admin' || currentRole === 'Manager' || currentRole === 'InventoryUser' ? (
            <button
              id="inventory-add-batch-btn"
              onClick={() => setShowNewBatchModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Receive New Batch</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Summary KPI Cards (Section 12) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 truncate">Total Products</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 truncate">{products.length}</div>
        </div>

        <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 truncate">Stock Valuation</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-purple-700 truncate">{totalValuation.toFixed(0)}</div>
        </div>

        <div
          onClick={() => setStockStatusFilter('LowStock')}
          className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition"
        >
          <div className="text-[10px] font-bold text-amber-700 truncate">Low Stock</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-amber-600 truncate">{lowStockCount}</div>
        </div>

        <div
          onClick={() => setStockStatusFilter('OutOfStock')}
          className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-400 cursor-pointer transition"
        >
          <div className="text-[10px] font-bold text-rose-700 truncate">Out of Stock</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-rose-600 truncate">{outOfStockCount}</div>
        </div>

        <div
          onClick={() => setStockStatusFilter('Expiring')}
          className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition"
        >
          <div className="text-[10px] font-bold text-amber-700 truncate">Expiring Soon</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-amber-600 truncate">{expiringCount}</div>
        </div>

        <div
          onClick={() => setStockStatusFilter('Expired')}
          className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-400 cursor-pointer transition"
        >
          <div className="text-[10px] font-bold text-rose-700 truncate">Expired Stock</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-rose-600 truncate">{expiredCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Input */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product, brand, batch number..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['All', 'LowStock', 'OutOfStock', 'Expiring', 'Expired'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStockStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                stockStatusFilter === filter
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'LowStock'
                ? 'Low Stock'
                : filter === 'OutOfStock'
                ? 'Out of Stock'
                : filter === 'Expiring'
                ? 'Expiring Soon'
                : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Products & Expandable Batches Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredProducts.map((prod) => {
            const stock = getProductTotalStock(prod.id);
            const isExpanded = !!expandedProductIds[prod.id];
            const pBatches = getProductBatches(prod.id, true);
            const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
            const isOutOfStock = stock <= 0;

            return (
              <div key={prod.id} className="transition">
                {/* Product Summary Row */}
                <div
                  onClick={() => toggleExpand(prod.id)}
                  className="p-4 hover:bg-slate-50/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 p-1">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-emerald-700" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{prod.name}</span>
                        {isOutOfStock ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                            Low: {stock} {prod.baseUnit}s
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Brand: <strong className="text-slate-700">{prod.brand}</strong> • SKU: {prod.sku} • Min Stock: {prod.minStockBaseUnits} {prod.baseUnit}s
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-xs pl-8 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="text-[11px] text-slate-400">Total Available Stock</div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {stock} {prod.baseUnit}s
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Tracked Batches</div>
                      <div className="font-bold text-emerald-700">
                        {pBatches.length} batch{pBatches.length !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Batches Breakdown */}
                {isExpanded && (
                  <div className="bg-slate-50/70 p-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Batches & Unit Costs</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                          <tr>
                            <th className="p-3">Batch Number</th>
                            <th className="p-3">Expiry Date</th>
                            <th className="p-3">Supplier</th>
                            <th className="p-3 text-right">Purchase Cost</th>
                            <th className="p-3 text-right">Selling Price</th>
                            <th className="p-3 text-right">Available Stock</th>
                            <th className="p-3 text-right">Batch Valuation</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {pBatches.map((batch, idx) => {
                            const isExpired = batch.expiryDate < todayStr;
                            const isExpiringSoon = !isExpired && batch.expiryDate <= warnThresholdStr;
                            const batchValue = batch.availableBaseQuantity * batch.purchasePricePerBaseUnit;

                            return (
                              <tr key={batch.id} className="hover:bg-slate-50/60">
                                <td className="p-3 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{batch.batchNumber}</span>
                                  {idx === 0 && !isExpired && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                      FEFO
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-medium">
                                  <span className={isExpired ? 'text-rose-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-bold' : 'text-slate-700'}>
                                    {batch.expiryDate}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600">{batch.supplierName}</td>
                                <td className="p-3 text-right font-semibold text-slate-800">
                                  {batch.purchasePricePerBaseUnit.toFixed(2)}/{prod.baseUnit}
                                </td>
                                <td className="p-3 text-right font-bold text-emerald-800">
                                  {batch.sellingPricePerBaseUnit.toFixed(2)}/{prod.baseUnit}
                                </td>
                                <td className="p-3 text-right font-extrabold text-slate-900">
                                  {batch.availableBaseQuantity} {prod.baseUnit}s
                                </td>
                                <td className="p-3 text-right font-bold text-purple-700">
                                  {batchValue.toFixed(2)}
                                </td>
                                <td className="p-3 text-center">
                                  {isExpired ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                      EXPIRED
                                    </span>
                                  ) : isExpiringSoon ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      Expiring Soon
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Valid Stock
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => setAdjustModalItem({ product: prod, batch })}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                                  >
                                    Adjust / Damage
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STOCK ADJUSTMENT MODAL (Damage, Expiry Write-off, Correction) */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="font-bold text-sm">Stock Adjustment & Write-off</div>
              <button onClick={() => setAdjustModalItem(null)} className="text-white/80 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} className="p-5 space-y-3 text-xs">
              <div>
                <div className="font-bold text-slate-900">{adjustModalItem.product.name}</div>
                <div className="text-[11px] text-slate-500">
                  Batch: <strong>{adjustModalItem.batch.batchNumber}</strong> • Available: <strong>{adjustModalItem.batch.availableBaseQuantity} {adjustModalItem.product.baseUnit}s</strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Reason for Adjustment</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none"
                >
                  <option value="Damage">Damaged Stock (Deduction)</option>
                  <option value="Expiry">Expired Disposal (Deduction)</option>
                  <option value="ManualCorrection">Manual Audit Correction</option>
                  <option value="StockAdjustment">Physical Stock Surplus (Addition)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Quantity ({adjustModalItem.product.baseUnit}s) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={adjustQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*$/.test(val)) setAdjustQty(val);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Audit Notes</label>
                <textarea
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Broken packaging / Water damage in storage"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW BATCH MODAL (New Purchase with Changed Price) */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <PlusCircle className="w-4 h-4" />
                <span>Receive New Batch (Independent Batch Pricing)</span>
              </div>
              <button onClick={() => setShowNewBatchModal(false)} className="text-white/80 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewBatch} className="p-5 space-y-3 text-xs">
              <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-[11px] leading-relaxed">
                When the purchase price changes, this creates a new batch. Existing historical batches retain their original cost.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Medicine *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.brand})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Batch Number *</label>
                  <input
                    type="text"
                    required
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value)}
                    placeholder="e.g. PARA003"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Qty (Base Units) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newQuantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) setNewQuantity(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-bold focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Purchase Cost *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={newPurchasePrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setNewPurchasePrice(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-bold focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Selling Price *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={newSellingPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setNewSellingPrice(val);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-bold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Supplier *</label>
                <select
                  value={newSupplierId}
                  onChange={(e) => setNewSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBatchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
