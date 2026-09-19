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
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { StockLedgerEntry } from '../types';

export const StockLedgerView: React.FC = () => {
  const { ledger, products } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');

  const filteredEntries = ledger.filter((entry) => {
    if (selectedType !== 'All' && entry.transactionType !== selectedType) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const ref = ((entry as any).referenceNumber || entry.referenceId || '').toLowerCase();
    const notes = (entry.notes || '').toLowerCase();
    const pName = (entry.productName || '').toLowerCase();
    const bNum = (entry.batchNumber || '').toLowerCase();
    return (
      pName.includes(q) ||
      bNum.includes(q) ||
      ref.includes(q) ||
      notes.includes(q)
    );
  });

  // Calculate inflows & outflows
  const totalInflowUnits = ledger
    .filter((e) => Number((e as any).quantityBaseUnits ?? e.baseQuantity ?? 0) > 0)
    .reduce((sum, e) => sum + Number((e as any).quantityBaseUnits ?? e.baseQuantity ?? 0), 0);

  const totalOutflowUnits = ledger
    .filter((e) => Number((e as any).quantityBaseUnits ?? e.baseQuantity ?? 0) < 0)
    .reduce((sum, e) => sum + Math.abs(Number((e as any).quantityBaseUnits ?? e.baseQuantity ?? 0)), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Stock Ledger & Audit Trail</h2>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Total Records</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{ledger.length}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700">Total Inflow Received</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600">+{totalInflowUnits} units</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-600">Total Outflows</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-800">-{totalOutflowUnits} units</div>
        </div>
      </div>

      {/* Filters & Search */}
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Medicine</th>
                <th className="p-3.5">Batch No</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5 text-right">Quantity Delta</th>
                <th className="p-3.5 text-right">Unit Rate</th>
                <th className="p-3.5 text-right">Running Stock</th>
                <th className="p-3.5">Ref / Document</th>
                <th className="p-3.5">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEntries.map((entry) => {
                const baseQty = Number((entry as any).quantityBaseUnits ?? entry.baseQuantity ?? 0);
                const isPositive = baseQty > 0;
                const dateStr = (entry as any).timestamp || entry.date || new Date().toISOString();
                const unitPrice = Number((entry as any).unitPrice ?? entry.purchaseCostPerBaseUnit ?? (entry as any).sellingPricePerBaseUnit ?? 0);
                const balanceQty = Number((entry as any).balanceBaseUnitsAfter ?? entry.balanceBaseQuantity ?? 0);
                const refNum = (entry as any).referenceNumber || entry.referenceId || 'N/A';
                const user = (entry as any).userName || entry.performedBy || 'System';

                return (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                      {new Date(dateStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">
                      {entry.productName}
                    </td>

                    <td className="p-3.5 font-mono font-semibold text-slate-800">
                      {entry.batchNumber || 'N/A'}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                    </td>

                    <td className={`p-3.5 text-right font-extrabold ${isPositive ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {isPositive ? `+${baseQty}` : baseQty}
                    </td>

                    <td className="p-3.5 text-right text-slate-700">
                      {unitPrice.toFixed(2)}
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {balanceQty}
                    </td>

                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      <div className="font-semibold text-slate-900">{refNum}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{entry.notes || ''}</div>
                    </td>

                    <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {user}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
