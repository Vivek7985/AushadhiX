import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Eye,
  X,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { StockLedgerEntry } from '../types';

export const StockLedgerView: React.FC = () => {
  const { ledger, products } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [inspectingEntry, setInspectingEntry] = useState<StockLedgerEntry | null>(null);

  const filteredEntries = ledger.filter((entry) => {
    if (selectedType !== 'All' && entry.transactionType !== selectedType) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const ref = ((entry as any).referenceNumber || entry.referenceId || '').toLowerCase();
    const notes = (entry.notes || '').toLowerCase();
    const pName = (entry.productName || '').toLowerCase();
    const bNum = (entry.batchNumber || '').toLowerCase();
    return (
      ref.includes(q) ||
      notes.includes(q) ||
      pName.includes(q) ||
      bNum.includes(q)
    );
  });

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Stock Ledger Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of all inventory movements, sales decrements, returns, and adjustments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Audit-Ready (Schedule H Compliant)</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar (No Horizontal Slider) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine, batch, reference invoice/PO..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {['All', 'Purchase', 'Sale', 'Damage', 'Expiry', 'StockAdjustment'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap ${
                selectedType === t
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Tiles View (Mobile-First, Responsive Grid, No Sliders) */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
          No stock movement logs match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredEntries.map((entry) => {
            const baseQty = Number((entry as any).quantityBaseUnits ?? entry.baseQuantity ?? 0);
            const isPositive = baseQty > 0;
            const dateStr = (entry as any).timestamp || entry.date || new Date().toISOString();
            const unitPrice = Number((entry as any).unitPrice ?? entry.purchaseCostPerBaseUnit ?? (entry as any).sellingPricePerBaseUnit ?? 0);
            const balanceQty = Number((entry as any).balanceBaseUnitsAfter ?? entry.balanceBaseQuantity ?? 0);
            const refNum = (entry as any).referenceNumber || entry.referenceId || 'N/A';
            const user = (entry as any).userName || entry.performedBy || 'System';

            return (
              <div
                key={entry.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between gap-2.5"
              >
                {/* Header: Medicine & Tx Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4
                      className="font-bold text-slate-900 text-sm truncate cursor-pointer hover:text-emerald-700 transition"
                      onClick={() => setInspectingEntry(entry)}
                      title={entry.productName}
                    >
                      {entry.productName}
                    </h4>
                    <div className="text-[11px] text-slate-400 truncate">
                      Batch: <span className="font-mono font-bold text-slate-600">{entry.batchNumber || 'N/A'}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      entry.transactionType === 'Sale'
                        ? 'bg-blue-100 text-blue-800'
                        : entry.transactionType === 'Purchase'
                        ? 'bg-emerald-100 text-emerald-800'
                        : entry.transactionType === 'Damage'
                        ? 'bg-rose-100 text-rose-800'
                        : entry.transactionType === 'Expiry'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {entry.transactionType}
                  </span>
                </div>

                {/* Primary Metric Tile Details */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Qty Change</span>
                    <span className={`font-extrabold text-sm block ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {isPositive ? `+${baseQty}` : baseQty} units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Stock Balance</span>
                    <span className="font-bold text-slate-800 text-sm block">
                      {balanceQty} units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Unit Rate</span>
                    <span className="font-semibold text-slate-700 block">
                      ₹{Number(unitPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Date</span>
                    <span className="font-medium text-slate-600 text-[11px] block truncate">
                      {dateStr ? new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Footer / More Details Button */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
                  <div className="text-slate-400 font-mono truncate max-w-[150px]">
                    Ref: <span className="font-semibold text-slate-700">{refNum}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingEntry(entry)}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 px-2 py-1 rounded-lg transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INSPECT LEDGER ENTRY DETAILS MODAL */}
      {inspectingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Stock Ledger Entry</h3>
                <p className="text-[11px] text-slate-300">Transaction log ID: #{inspectingEntry.id.slice(0, 8)}</p>
              </div>
              <button
                onClick={() => setInspectingEntry(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                <div className="text-sm font-bold text-slate-900">{inspectingEntry.productName}</div>
                <div className="text-slate-500">
                  Batch: <span className="font-mono font-bold text-slate-800">{inspectingEntry.batchNumber || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Transaction Type</span>
                  <span className="font-bold text-slate-900">{inspectingEntry.transactionType}</span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Timestamp</span>
                  <span className="font-medium text-slate-800">
                    {new Date((inspectingEntry as any)?.timestamp || inspectingEntry?.date || Date.now()).toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Quantity Moved</span>
                  <span className="font-extrabold text-sm text-emerald-700">
                    {Number((inspectingEntry as any).quantityBaseUnits ?? inspectingEntry.baseQuantity ?? 0)} units
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Balance After</span>
                  <span className="font-bold text-sm text-slate-900">
                    {Number((inspectingEntry as any).balanceBaseUnitsAfter ?? inspectingEntry.balanceBaseQuantity ?? 0)} units
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Unit Rate</span>
                  <span className="font-bold text-slate-900">
                    ₹{Number((inspectingEntry as any).unitPrice ?? inspectingEntry.purchaseCostPerBaseUnit ?? (inspectingEntry as any).sellingPricePerBaseUnit ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Authorized By</span>
                  <span className="font-medium text-slate-800">
                    {(inspectingEntry as any).userName || inspectingEntry.performedBy || 'System'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Reference Document / Memo</div>
                <div className="font-mono font-bold text-slate-900">
                  {(inspectingEntry as any).referenceNumber || inspectingEntry.referenceId || 'N/A'}
                </div>
                {inspectingEntry.notes && (
                  <div className="text-slate-600 mt-1 italic text-[11px]">{inspectingEntry.notes}</div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingEntry(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
