import React, { useState } from 'react';
import {
  Boxes,
  AlertTriangle,
  ClockAlert,
  Search,
  Plus,
  ShieldCheck,
  TrendingDown,
  Layers,
  ArrowRight,
  X,
  PlusCircle,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Product, ProductBatch } from '../types';
import { HorizontalSlidingChips } from './HorizontalSlidingChips';
import { getProductSingleTabletPricing } from '../utils/unitPricing';

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
    deleteProduct,
    currentRole,
  } = usePharmacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'LowStock' | 'OutOfStock' | 'Expiring' | 'Expired'>(initialFilter);

  React.useEffect(() => {
    if (initialFilter) {
      setStockStatusFilter(initialFilter);
    }
  }, [initialFilter]);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Delete Product Confirmation State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    const name = productToDelete.name;
    const ok = deleteProduct(productToDelete.id, true);
    if (ok) {
      if (expandedProductId === productToDelete.id) {
        setExpandedProductId(null);
      }
      setProductToDelete(null);
      setDeleteSuccessToast(`Product "${name}" deleted from system.`);
      setTimeout(() => setDeleteSuccessToast(null), 4000);
    }
  };

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
    setExpandedProductId((prev) => (prev === id ? null : id));
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

    const stripPricing = getProductSingleTabletPricing(product);
    const mult = stripPricing.isStripOrPack ? stripPricing.stripMultiplier : 1;
    const rawPurchase = Number(newPurchasePrice) || 0;
    const rawSelling = Number(newSellingPrice) || 0;
    const rawMrp = Number(newMrp) || 0;
    const rawQty = Math.max(1, Number(newQuantity) || 1);

    // If product has a strip multiplier (e.g. 10, 15, 30 tablets per strip),
    // calculate the cost per single tablet by dividing the strip purchase price!
    const purchaseCostPerBase = mult > 1 ? Number((rawPurchase / mult).toFixed(2)) : rawPurchase;
    const sellingPricePerBase = mult > 1 ? Number((rawSelling / mult).toFixed(2)) : rawSelling;
    const mrpPerBase = mult > 1 ? Number((rawMrp / mult).toFixed(2)) : rawMrp;
    const totalBaseQty = mult > 1 ? rawQty * mult : rawQty;

    addBatch({
      productId: product.id,
      batchNumber: newBatchNo,
      mfgDate: newMfgDate,
      expiryDate: newExpiryDate,
      purchaseDate: new Date().toISOString().slice(0, 10),
      supplierId: newSupplierId,
      supplierName: supplier?.name || 'Direct Wholesale',
      purchasePricePerBaseUnit: purchaseCostPerBase,
      mrpPerBaseUnit: mrpPerBase,
      sellingPricePerBaseUnit: sellingPricePerBase,
      initialBaseQuantity: totalBaseQty,
      notes: mult > 1 ? `New batch received (${rawQty} strips of ${mult} = ${totalBaseQty} ${product.baseUnit}s @ ₹${purchaseCostPerBase}/${product.baseUnit})` : 'New batch received at revised cost',
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
    <div className="w-full space-y-5 pb-12">
      {/* Top Header */}
      <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Inventory & Stock</h2>
        </div>

        <div className="flex items-center gap-2">
          {currentRole === 'Admin' || currentRole === 'Manager' || currentRole === 'InventoryUser' ? (
            <button
              id="inventory-add-batch-btn"
              onClick={() => setShowNewBatchModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-medium shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Receive New Batch</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Summary KPI Cards (Section 12) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[10px] font-normal text-slate-500 truncate">Total Products</div>
          <div className="mt-0.5 text-xs font-normal text-slate-800 truncate">{products.length}</div>
        </div>

        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
          <div className="text-[10px] font-normal text-slate-500 truncate">Stock Valuation</div>
          <div className="mt-0.5 text-xs font-normal text-purple-700 truncate">{Number(totalValuation || 0).toFixed(0)}</div>
        </div>

        <div
          onClick={() => setStockStatusFilter('LowStock')}
          className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition"
        >
          <div className="text-[10px] font-normal text-amber-700 truncate">Low Stock</div>
          <div className="mt-0.5 text-xs font-normal text-amber-600 truncate">{lowStockCount}</div>
        </div>

        <div
          onClick={() => setStockStatusFilter('OutOfStock')}
          className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs hover:border-rose-400 cursor-pointer transition"
        >
          <div className="text-[10px] font-normal text-rose-700 truncate">Out of Stock</div>
          <div className="mt-0.5 text-xs font-normal text-rose-600 truncate">{outOfStockCount}</div>
        </div>

        <div
          onClick={() => setStockStatusFilter('Expiring')}
          className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs hover:border-amber-400 cursor-pointer transition"
        >
          <div className="text-[10px] font-normal text-amber-700 truncate">Expiring Soon</div>
          <div className="mt-0.5 text-xs font-normal text-amber-600 truncate">{expiringCount}</div>
        </div>

        <div
          onClick={() => setStockStatusFilter('Expired')}
          className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs hover:border-rose-400 cursor-pointer transition"
        >
          <div className="text-[10px] font-normal text-rose-700 truncate">Expired Stock</div>
          <div className="mt-0.5 text-xs font-normal text-rose-600 truncate">{expiredCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Input */}
      <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product, brand, batch..."
            className="w-full h-6.5 sm:h-7 bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 text-[10px] sm:text-[11px] text-slate-700 placeholder:text-[10px] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition"
          />
        </div>

        <HorizontalSlidingChips id="inventory-filter-chips" ariaLabel="Inventory status filters" className="max-w-full sm:max-w-md">
          {(['All', 'LowStock', 'OutOfStock', 'Expiring', 'Expired'] as const).map((filter) => {
            const isSelected = stockStatusFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                data-selected={isSelected ? 'true' : 'false'}
                aria-selected={isSelected}
                onClick={() => setStockStatusFilter(filter)}
                className={`h-6 sm:h-7 flex items-center px-2.5 rounded-lg font-normal transition whitespace-nowrap text-[11px] active:scale-95 cursor-pointer ${
                  isSelected
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
            );
          })}
        </HorizontalSlidingChips>
      </div>

      {/* Products & Expandable Batches Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredProducts.map((prod) => {
            const stock = getProductTotalStock(prod.id);
            const isExpanded = expandedProductId === prod.id;
            const pBatches = getProductBatches(prod.id, true);
            const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
            const isOutOfStock = stock <= 0;

            return (
              <div key={prod.id} className="transition">
                {/* Product Summary Row */}
                <div
                  onClick={() => toggleExpand(prod.id)}
                  className={`p-3 sm:p-3.5 hover:bg-slate-50/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none transition ${
                    isExpanded ? 'bg-slate-50/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={(prod.images && prod.images[0]) || prod.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'}
                      alt={prod.name}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-normal text-slate-800 text-xs truncate">{prod.name}</span>
                        {isOutOfStock ? (
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                            Low
                          </span>
                        ) : null}
                      </div>
                      {prod.brand && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {prod.brand}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 text-xs pl-11 sm:pl-0 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] text-slate-400">Stock</div>
                      <div className="text-xs font-normal text-slate-700">
                        {stock} {prod.baseUnit}s
                      </div>
                      {(() => {
                        const singlePricing = getProductSingleTabletPricing(prod);
                        if (!singlePricing.isStripOrPack) return null;
                        return (
                          <div className="text-[9.5px] text-slate-400 font-medium">
                            {singlePricing.singleSellingFormatted}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Batches</div>
                      <div className="text-xs font-normal text-emerald-700">
                        {pBatches.length}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductToDelete(prod);
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete product from system"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Batches Breakdown - Simple, Clean View */}
                {isExpanded && (
                  <div className="bg-slate-50/70 p-3 sm:p-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 text-xs">
                          Batches of {prod.name} ({pBatches.length})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          First Expiring First Out (FEFO)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductToDelete(prod);
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                        title="Delete product from system"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        <span>Delete Product</span>
                      </button>
                    </div>

                    {pBatches.length === 0 ? (
                      <div className="py-4 text-center text-slate-400 text-xs">
                        No active batches currently in stock for this medicine.
                      </div>
                    ) : (
                      <>
                        {/* Desktop / Tablet Table View */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-[11px] font-semibold text-slate-400 border-b border-slate-200/60">
                                <th className="py-2 pr-3">Batch No.</th>
                                <th className="py-2 px-3">Expiry Date</th>
                                <th className="py-2 px-3">Available Stock</th>
                                <th className="py-2 px-3">Purchase / Selling</th>
                                <th className="py-2 pl-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {pBatches.map((batch, idx) => {
                                const isExpired = batch.expiryDate < todayStr;
                                const isExpiringSoon = !isExpired && batch.expiryDate <= warnThresholdStr;

                                return (
                                  <tr key={batch.id} className="hover:bg-white/80 transition-colors">
                                    <td className="py-2.5 pr-3 font-mono font-bold text-slate-800">
                                      <div className="flex items-center gap-1.5">
                                        <span>{batch.batchNumber}</span>
                                        {idx === 0 && !isExpired && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                            FEFO
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-1.5 font-medium">
                                        <span
                                          className={
                                            isExpired
                                              ? 'text-rose-600 font-bold'
                                              : isExpiringSoon
                                              ? 'text-amber-600 font-bold'
                                              : 'text-slate-700'
                                          }
                                        >
                                          {batch.expiryDate}
                                        </span>
                                        {isExpired && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                            Expired
                                          </span>
                                        )}
                                        {isExpiringSoon && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                            Expiring Soon
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 font-bold text-slate-900">
                                      {batch.availableBaseQuantity} {prod.baseUnit}s
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600">
                                      <span>Cost: ₹{Number(batch.purchasePricePerBaseUnit || 0).toFixed(2)}</span>
                                      <span className="text-slate-300 mx-1.5">|</span>
                                      <span className="font-semibold text-emerald-700">
                                        Sell: ₹{Number(batch.sellingPricePerBaseUnit || 0).toFixed(2)}
                                      </span>
                                      {(() => {
                                        const singlePricing = getProductSingleTabletPricing(prod, batch);
                                        if (!singlePricing.isStripOrPack) return null;
                                        return (
                                          <span className="text-[9.5px] text-slate-400 font-medium ml-1">
                                            ({singlePricing.singleSellingFormatted})
                                          </span>
                                        );
                                      })()}
                                    </td>
                                    <td className="py-2.5 pl-3 text-right">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAdjustModalItem({ product: prod, batch });
                                        }}
                                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer"
                                      >
                                        Adjust
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Clean List View */}
                        <div className="sm:hidden space-y-2 pt-1">
                          {pBatches.map((batch, idx) => {
                            const isExpired = batch.expiryDate < todayStr;
                            const isExpiringSoon = !isExpired && batch.expiryDate <= warnThresholdStr;

                            return (
                              <div
                                key={batch.id}
                                className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                      {batch.batchNumber}
                                    </span>
                                    {idx === 0 && !isExpired && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                        FEFO
                                      </span>
                                    )}
                                    {isExpired && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                        Expired
                                      </span>
                                    )}
                                    {isExpiringSoon && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                        Expiring Soon
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-1">
                                    Exp: <strong className={isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-700'}>{batch.expiryDate}</strong>
                                    <span className="mx-1">•</span>
                                    Stock: <strong className="text-slate-900">{batch.availableBaseQuantity} {prod.baseUnit}s</strong>
                                    <span className="mx-1">•</span>
                                    <span className="text-emerald-700 font-bold">₹{Number(batch.sellingPricePerBaseUnit || 0).toFixed(0)}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAdjustModalItem({ product: prod, batch });
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer"
                                >
                                  Adjust
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
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

      {/* Floating Toast Notification */}
      {deleteSuccessToast && (
        <div className="fixed top-5 right-5 z-80 max-w-md p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 mr-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{deleteSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessToast(null)}
            className="p-1 rounded-md text-emerald-100 hover:bg-emerald-700/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {productToDelete && (() => {
        const prod = productToDelete;
        const totalStock = getProductTotalStock(prod.id);
        const pBatches = getProductBatches(prod.id, true);
        const hasStock = totalStock > 0;

        return (
          <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-rose-950">Delete Product from System</h3>
                    <p className="text-[11px] text-rose-700/80">Permanent catalog & inventory removal</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs">
                {/* Product Card Preview */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                  <img
                    src={(prod.images && prod.images[0]) || prod.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'}
                    alt={prod.name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{prod.name}</h4>
                    <div className="text-[11px] text-slate-500 truncate">
                      {prod.category} • {prod.brand || 'Generic'}
                    </div>
                    {prod.sku && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        SKU: {prod.sku}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Warning Box */}
                {hasStock ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-xs text-amber-950">Active Stock Detected</div>
                      <div className="text-[11px] text-amber-800 leading-relaxed">
                        This medicine currently has <strong className="font-bold text-amber-950">{totalStock} {prod.baseUnit}s</strong> in stock across <strong className="font-bold text-amber-950">{pBatches.length} batch(es)</strong>. Deleting will permanently remove this medicine and clear all related batch records.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-slate-600 leading-relaxed">
                      This medicine has <strong>0 units</strong> in stock. Deleting it will safely remove it from your product catalog.
                    </div>
                  </div>
                )}

                {/* Invoices & Sales Safety Guarantee */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start gap-2.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-emerald-800 leading-relaxed">
                    <strong className="text-emerald-950 font-semibold">Invoices &amp; Sales Protected:</strong> Deleting this product will <span className="underline decoration-emerald-500 font-semibold">NOT delete</span> any past sales, customer invoices, or accounting records. All historical sales receipts remain 100% intact.
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Are you sure you want to delete <span className="font-semibold text-slate-800">"{prod.name}"</span>?
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-medium transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs hover:shadow transition cursor-pointer flex items-center gap-1.5 text-xs active:scale-98"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete Product</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
