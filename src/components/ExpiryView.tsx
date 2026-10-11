import React, { useState } from 'react';
import {
  ClockAlert,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  DollarSign,
  ArrowRight,
  Filter,
  CheckCircle2,
  Trash2,
  CornerUpLeft,
  Tag,
  Search,
  Eye,
  X,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { ProductBatch, Product } from '../types';
import { HorizontalSlidingChips } from './HorizontalSlidingChips';

export const ExpiryView: React.FC = () => {
  const {
    products,
    batches,
    suppliers,
    settings,
    adjustStock,
    updateBatch,
  } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'all' | 'expired' | '30days' | '60days' | '90days'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionBatch, setSelectedActionBatch] = useState<{
    batch: ProductBatch;
    product: Product;
    action: 'dispose' | 'return' | 'discount';
  } | null>(null);
  const [inspectingBatch, setInspectingBatch] = useState<{
    batch: ProductBatch;
    product: Product;
    daysLeft: number;
    isExpired: boolean;
    valueAtRisk: number;
  } | null>(null);

  const [discountPercent, setDiscountPercent] = useState(25);
  const [returnNotes, setReturnNotes] = useState('');

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Compute expiry dates and days left for all batches with stock
  const batchesWithMeta = batches
    .filter((b) => b.availableBaseQuantity > 0)
    .map((b) => {
      const product = products.find((p) => p.id === b.productId);
      const expDate = new Date(b.expiryDate);
      const diffTime = expDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const valueAtRisk = b.availableBaseQuantity * b.purchasePricePerBaseUnit;

      return {
        batch: b,
        product,
        daysLeft,
        isExpired: daysLeft < 0,
        valueAtRisk,
      };
    })
    .filter((item) => item.product !== undefined);

  // Filter tabs
  const expiredBatches = batchesWithMeta.filter((b) => b.daysLeft < 0);
  const expiring30 = batchesWithMeta.filter((b) => b.daysLeft >= 0 && b.daysLeft <= 30);
  const expiring60 = batchesWithMeta.filter((b) => b.daysLeft > 30 && b.daysLeft <= 60);
  const expiring90 = batchesWithMeta.filter((b) => b.daysLeft > 60 && b.daysLeft <= 90);

  const totalExpiredValue = expiredBatches.reduce((acc, b) => acc + b.valueAtRisk, 0);
  const totalNearExpiryValue = [...expiring30, ...expiring60].reduce((acc, b) => acc + b.valueAtRisk, 0);

  // Filtered by current tab and search
  const displayed = batchesWithMeta.filter((item) => {
    if (activeTab === 'expired' && !item.isExpired) return false;
    if (activeTab === '30days' && (item.daysLeft < 0 || item.daysLeft > 30)) return false;
    if (activeTab === '60days' && (item.daysLeft <= 30 || item.daysLeft > 60)) return false;
    if (activeTab === '90days' && (item.daysLeft <= 60 || item.daysLeft > 90)) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.product?.name.toLowerCase().includes(q) ||
      item.product?.brand.toLowerCase().includes(q) ||
      item.batch.batchNumber.toLowerCase().includes(q)
    );
  });

  // Action handlers
  const handleConfirmAction = () => {
    if (!selectedActionBatch || !selectedActionBatch.product) return;
    const { batch, product, action } = selectedActionBatch;

    if (action === 'dispose') {
      // Write off entire quantity to 0
      adjustStock(
        product.id,
        batch.id,
        -batch.availableBaseQuantity,
        'Expiry',
        'Expired batch safely disposed and quarantined as per regulatory guidelines.'
      );
    } else if (action === 'return') {
      adjustStock(
        product.id,
        batch.id,
        -batch.availableBaseQuantity,
        'StockAdjustment',
        `Returned to supplier ${batch.supplierName}. ${returnNotes}`
      );
    } else if (action === 'discount') {
      const newPrice = Math.max(
        batch.purchasePricePerBaseUnit,
        batch.sellingPricePerBaseUnit * (1 - discountPercent / 100)
      );
      updateBatch(batch.id, {
        sellingPricePerBaseUnit: newPrice,
      });
    }

    setSelectedActionBatch(null);
  };

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Expiry & Quarantine Control</h2>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div
          onClick={() => setActiveTab('expired')}
          className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-rose-700 truncate">Expired Batches</span>
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
          </div>
          <div className="mt-1 text-xs sm:text-base font-bold text-rose-600">{expiredBatches.length}</div>
          <div className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
            Value: {(totalExpiredValue || 0).toFixed(2)}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('30days')}
          className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-amber-700 truncate">Expiring &le; 30 Days</span>
            <ClockAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          </div>
          <div className="mt-1 text-xs sm:text-base font-bold text-amber-600">{expiring30.length} batches</div>
        </div>

        <div
          onClick={() => setActiveTab('60days')}
          className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs hover:border-amber-200 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-amber-700 truncate">Expiring 31-60 Days</span>
            <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
          </div>
          <div className="mt-1 text-xs sm:text-base font-bold text-slate-800">{expiring60.length} batches</div>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-700 truncate">Total Value At Risk</span>
            <DollarSign className="w-4 h-4 text-purple-600 flex-shrink-0" />
          </div>
          <div className="mt-1 text-xs sm:text-base font-bold text-purple-700">{(totalNearExpiryValue || 0).toFixed(2)}</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine name, batch, or brand..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
          />
        </div>

        <HorizontalSlidingChips id="expiry-filter-chips" ariaLabel="Expiry filters" className="max-w-full sm:max-w-md">
          {[
            { id: 'all', label: 'All Tracked' },
            { id: 'expired', label: `Expired (${expiredBatches.length})` },
            { id: '30days', label: `&le; 30 Days (${expiring30.length})` },
            { id: '60days', label: `31-60 Days (${expiring60.length})` },
            { id: '90days', label: `61-90 Days (${expiring90.length})` },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-selected={isSelected ? 'true' : 'false'}
                aria-selected={isSelected}
                onClick={() => setActiveTab(tab.id as any)}
                className={`h-[30px] flex items-center px-3 rounded-xl font-semibold transition whitespace-nowrap text-xs active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                dangerouslySetInnerHTML={{ __html: tab.label }}
              />
            );
          })}
        </HorizontalSlidingChips>
      </div>

      {/* Batch Expiry Tiles View (Mobile-First, No Sliders) */}
      <div>
        {displayed.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            No batches match the selected expiry criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayed.map((item) => {
              const { batch, product, daysLeft, isExpired, valueAtRisk } = item;
              return (
                <div
                  key={batch.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between gap-2.5"
                >
                  {/* Top: Medicine & Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4
                        className="font-bold text-slate-900 text-sm truncate cursor-pointer hover:text-emerald-700 transition"
                        onClick={() => setInspectingBatch(item as any)}
                        title={product?.name}
                      >
                        {product?.name || 'Medicine'}
                      </h4>
                      <div className="text-[11px] text-slate-400 truncate">
                        Brand: <strong className="text-slate-600">{product?.brand || 'Generic'}</strong>
                      </div>
                    </div>
                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                        EXPIRED
                      </span>
                    ) : daysLeft <= 30 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        {daysLeft}d left
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {daysLeft}d left
                      </span>
                    )}
                  </div>

                  {/* Primary Info Tile Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Batch #</span>
                      <span className="font-mono font-bold text-slate-900 truncate block">
                        {batch.batchNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Expiry Date</span>
                      <span className={`font-semibold block ${isExpired ? 'text-rose-600 font-bold' : daysLeft <= 30 ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
                        {batch.expiryDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Available Stock</span>
                      <span className="font-bold text-slate-800 block">
                        {batch.availableBaseQuantity} {product?.baseUnit || 'units'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Value at Risk</span>
                      <span className="font-bold text-purple-700 block">
                        ₹{Number(valueAtRisk || 0).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setInspectingBatch(item as any)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50/60 px-2.5 py-1 rounded-lg border border-slate-200 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {isExpired ? (
                        <button
                          onClick={() => setSelectedActionBatch({ batch, product: product!, action: 'dispose' })}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Dispose</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setSelectedActionBatch({ batch, product: product!, action: 'discount' })}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                            title="Set promotional discount"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Discount</span>
                          </button>
                          <button
                            onClick={() => setSelectedActionBatch({ batch, product: product!, action: 'return' })}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                            title="Return to supplier"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSPECT BATCH DETAILS MODAL */}
      {inspectingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Batch Expiry Details</h3>
                <p className="text-[11px] text-slate-300">Complete batch history and valuation</p>
              </div>
              <button
                onClick={() => setInspectingBatch(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                <div className="text-sm font-bold text-slate-900">{inspectingBatch.product?.name}</div>
                <div className="text-slate-500">
                  Brand: {inspectingBatch.product?.brand || '—'} • Category: {inspectingBatch.product?.category || '—'}
                </div>
                {inspectingBatch.product?.composition?.saltName && (
                  <div className="text-[11px] text-emerald-700 font-medium">
                    Salt: {inspectingBatch.product.composition.saltName} {inspectingBatch.product.composition.strength}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Batch Number</span>
                  <span className="font-mono font-bold text-slate-900">{inspectingBatch.batch.batchNumber}</span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Expiry Status</span>
                  <span className={inspectingBatch.isExpired ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>
                    {inspectingBatch.batch.expiryDate} ({inspectingBatch.daysLeft}d)
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Available Stock</span>
                  <span className="font-bold text-slate-900">
                    {inspectingBatch.batch.availableBaseQuantity} {inspectingBatch.product?.baseUnit}s
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Value at Risk</span>
                  <span className="font-bold text-purple-700">₹{Number(inspectingBatch.valueAtRisk || 0).toFixed(2)}</span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Purchase Cost</span>
                  <span className="font-semibold text-slate-800">
                    ₹{Number(inspectingBatch.batch.purchasePricePerBaseUnit || 0).toFixed(2)}/{inspectingBatch.product?.baseUnit}
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Selling Price</span>
                  <span className="font-semibold text-emerald-700">
                    ₹{Number(inspectingBatch.batch.sellingPricePerBaseUnit || 0).toFixed(2)}/{inspectingBatch.product?.baseUnit}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-bold uppercase mb-0.5">Supplier</span>
                <span className="font-medium text-slate-800">{inspectingBatch.batch.supplierName || 'Not recorded'}</span>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingBatch(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION MODAL (Dispose, Return, Discount) */}
      {selectedActionBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-4 text-white flex items-center justify-between ${
              selectedActionBatch.action === 'dispose'
                ? 'bg-rose-700'
                : selectedActionBatch.action === 'discount'
                ? 'bg-amber-600'
                : 'bg-slate-800'
            }`}>
              <h3 className="font-bold text-sm">
                {selectedActionBatch.action === 'dispose' && 'Dispose Expired Batch'}
                {selectedActionBatch.action === 'discount' && 'Apply Near-Expiry Clearance Discount'}
                {selectedActionBatch.action === 'return' && 'Return to Supplier'}
              </h3>
              <button onClick={() => setSelectedActionBatch(null)} className="text-white/80 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <div className="font-bold text-slate-900 text-sm">{selectedActionBatch.product.name}</div>
                <div className="text-slate-500 text-[11px]">
                  Batch: <strong>{selectedActionBatch.batch.batchNumber}</strong> • Expiry: <strong>{selectedActionBatch.batch.expiryDate}</strong>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Available Quantity: <strong>{selectedActionBatch.batch.availableBaseQuantity} {selectedActionBatch.product.baseUnit}s</strong>
                </div>
              </div>

              {selectedActionBatch.action === 'dispose' && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 leading-relaxed text-[11px]">
                  This will deduct all <strong>{selectedActionBatch.batch.availableBaseQuantity} units</strong> as a regulatory safe disposal. A permanent stock ledger audit entry will be recorded with cost write-off of <strong>₹{Number((selectedActionBatch.batch.availableBaseQuantity || 0) * Number(selectedActionBatch.batch.purchasePricePerBaseUnit || 0)).toFixed(2)}</strong>.
                </div>
              )}

              {selectedActionBatch.action === 'discount' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Clearance Discount %:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Number(e.target.value))}
                        className="flex-1 accent-amber-600"
                      />
                      <span className="font-bold text-amber-700 w-12 text-right">{discountPercent}%</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Current Selling Price: ₹{Number(selectedActionBatch.batch.sellingPricePerBaseUnit || 0).toFixed(2)} &rarr; New Promotional Price: ₹{Number(Number(selectedActionBatch.batch.sellingPricePerBaseUnit || 0) * (1 - discountPercent / 100)).toFixed(2)}
                  </div>
                </div>
              )}

              {selectedActionBatch.action === 'return' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Return Reason / Note:</label>
                  <textarea
                    rows={2}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    placeholder="e.g. Returned to supplier prior to 30-day cutoff for credit note."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedActionBatch(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 text-white rounded-xl font-bold transition shadow-sm ${
                    selectedActionBatch.action === 'dispose'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  Confirm Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
