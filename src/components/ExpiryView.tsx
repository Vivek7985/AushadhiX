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
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { ProductBatch, Product } from '../types';

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
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Tracked' },
            { id: 'expired', label: `Expired (${expiredBatches.length})` },
            { id: '30days', label: `&le; 30 Days (${expiring30.length})` },
            { id: '60days', label: `31-60 Days (${expiring60.length})` },
            { id: '90days', label: `61-90 Days (${expiring90.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              dangerouslySetInnerHTML={{ __html: tab.label }}
            />
          ))}
        </div>
      </div>

      {/* Batch Expiry Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Medicine Details</th>
                <th className="p-3.5">Batch Number</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5">Days Left</th>
                <th className="p-3.5 text-right">Remaining Stock</th>
                <th className="p-3.5 text-right">Cost Value At Risk</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-center">Expiry Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No batches match the selected expiry criteria.
                  </td>
                </tr>
              ) : (
                displayed.map(({ batch, product, daysLeft, isExpired, valueAtRisk }) => (
                  <tr key={batch.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{product?.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Brand: {product?.brand} • Base Unit: {product?.baseUnit}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {batch.batchNumber}
                    </td>

                    <td className="p-3.5 font-semibold">
                      <span className={isExpired ? 'text-rose-600 font-bold' : daysLeft <= 30 ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                        {batch.expiryDate}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {isExpired ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                          EXPIRED ({Math.abs(daysLeft)}d ago)
                        </span>
                      ) : daysLeft <= 30 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {daysLeft} days remaining
                        </span>
                      ) : (
                        <span className="text-slate-600 font-medium">{daysLeft} days</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right font-extrabold text-slate-900">
                      {batch.availableBaseQuantity} {product?.baseUnit}s
                    </td>

                    <td className="p-3.5 text-right font-bold text-purple-700">
                      {Number(valueAtRisk || 0).toFixed(2)}
                    </td>

                    <td className="p-3.5 text-slate-600 truncate max-w-[140px]">
                      {batch.supplierName}
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isExpired ? (
                          <button
                            onClick={() => setSelectedActionBatch({ batch, product: product!, action: 'dispose' })}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Dispose & Write-off</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedActionBatch({ batch, product: product!, action: 'discount' })}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                              title="Set promotional discount to sell before expiry"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              <span>Discount</span>
                            </button>
                            <button
                              onClick={() => setSelectedActionBatch({ batch, product: product!, action: 'return' })}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                              title="Return batch to supplier"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" />
                              <span>Return</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  This will deduct all <strong>{selectedActionBatch.batch.availableBaseQuantity} units</strong> as a regulatory safe disposal. A permanent stock ledger audit entry will be recorded with cost write-off of <strong>{(selectedActionBatch.batch.availableBaseQuantity * selectedActionBatch.batch.purchasePricePerBaseUnit).toFixed(2)}</strong>.
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
                    Current Selling Price: {selectedActionBatch.batch.sellingPricePerBaseUnit.toFixed(2)} &rarr; New Promotional Price: {(selectedActionBatch.batch.sellingPricePerBaseUnit * (1 - discountPercent / 100)).toFixed(2)}
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
