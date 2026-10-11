import React, { useState } from 'react';
import {
  Percent,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Calculator,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { GSTRate } from '../types';

export const GSTView: React.FC = () => {
  const {
    gstRates,
    addGSTRate,
    updateGSTRate,
    deleteGSTRate,
    setDefaultGSTRate,
    products,
    updateSettings,
  } = usePharmacy();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<GSTRate | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRate, setFormRate] = useState<string>('12');
  const [formDescription, setFormDescription] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formHsn, setFormHsn] = useState('3004');
  const [formIsActive, setFormIsActive] = useState(true);

  // Interactive Live GST Calculator state
  const [calcPrice, setCalcPrice] = useState<string>('100');
  const [calcMode, setCalcMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [calcSelectedRateId, setCalcSelectedRateId] = useState<string>(
    gstRates.find((r) => r.isDefault)?.id || gstRates[0]?.id || ''
  );

  const openAddModal = () => {
    setEditingRate(null);
    setFormName('');
    setFormRate('12');
    setFormDescription('Standard Pharmaceuticals GST');
    setFormHsn('3004');
    setFormIsDefault(false);
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (rate: GSTRate) => {
    setEditingRate(rate);
    setFormName(rate.name);
    setFormRate(rate.rate.toString());
    setFormDescription(rate.description || '');
    setFormHsn(rate.hsnCode || '3004');
    setFormIsDefault(Boolean(rate.isDefault));
    setFormIsActive(rate.isActive);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numericRate = parseFloat(formRate) || 0;
    if (numericRate < 0) return;

    const cgst = Number((numericRate / 2).toFixed(2));
    const sgst = Number((numericRate / 2).toFixed(2));
    const igst = numericRate;

    const finalName = formName.trim() || `GST ${numericRate}%`;

    if (editingRate) {
      updateGSTRate(editingRate.id, {
        name: finalName,
        rate: numericRate,
        cgst,
        sgst,
        igst,
        cgstPercent: cgst,
        sgstPercent: sgst,
        igstPercent: igst,
        description: formDescription.trim(),
        hsnCode: formHsn.trim(),
        isDefault: formIsDefault,
        isActive: formIsActive,
      });
      if (formIsDefault) {
        setDefaultGSTRate(editingRate.id);
      }
    } else {
      const created = addGSTRate({
        name: finalName,
        rate: numericRate,
        cgst,
        sgst,
        igst,
        cgstPercent: cgst,
        sgstPercent: sgst,
        igstPercent: igst,
        description: formDescription.trim(),
        hsnCode: formHsn.trim(),
        isDefault: formIsDefault,
        isActive: formIsActive,
      });
      if (formIsDefault) {
        setDefaultGSTRate(created.id);
      }
    }
    setShowModal(false);
  };

  // Live Calculator computation
  const selectedCalcRate = gstRates.find((r) => r.id === calcSelectedRateId) || gstRates[0];
  const rateVal = selectedCalcRate ? selectedCalcRate.rate : 0;
  const inputAmt = parseFloat(calcPrice) || 0;

  let baseAmount = 0;
  let taxAmount = 0;
  let finalAmount = 0;

  if (calcMode === 'exclusive') {
    baseAmount = inputAmt;
    taxAmount = Number(((baseAmount * rateVal) / 100).toFixed(2));
    finalAmount = Number((baseAmount + taxAmount).toFixed(2));
  } else {
    // Inclusive: finalAmount = inputAmt
    finalAmount = inputAmt;
    baseAmount = Number((finalAmount / (1 + rateVal / 100)).toFixed(2));
    taxAmount = Number((finalAmount - baseAmount).toFixed(2));
  }

  const cgstVal = Number((taxAmount / 2).toFixed(2));
  const sgstVal = Number((taxAmount / 2).toFixed(2));

  // Count products using each rate
  const getProductCountForRate = (ratePercent: number) => {
    return products.filter((p) => (p.gstPercent || 0) === ratePercent).length;
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header & Quick Action */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
              <Percent className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                GST Tax Module & Slabs Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Configure GST tax brackets (0%, 5%, 12%, 18%, 28%), CGST/SGST splits, and assign them during product master creation.
              </p>
            </div>
          </div>
        </div>

        <button
          id="add-gst-slab-btn"
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New GST Slab</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Slabs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{gstRates.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Configured tax rules</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Default Pharma Slab</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {gstRates.find((r) => r.isDefault)?.rate ?? 12}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Applied on new drugs</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Products</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{products.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Assigned tax rates</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Compliance</div>
          <div className="text-2xl font-black text-teal-700 mt-1">CGST + SGST</div>
          <div className="text-[11px] text-slate-500 mt-0.5">50/50 Dual Tax Split</div>
        </div>
      </div>

      {/* Main Grid: GST Slabs List + Live GST Price Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Slabs List (Left 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configured GST Tax Slabs</h3>
                <p className="text-xs text-slate-500">
                  Select default slab or customize rates for medicines, medical equipment, and health products.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {gstRates.map((rate) => {
                const prodCount = getProductCountForRate(rate.rate);
                return (
                  <div
                    key={rate.id}
                    className={`p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      rate.isDefault ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black text-sm shrink-0 border ${
                          rate.isDefault
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <span>{rate.rate}%</span>
                        <span className="text-[8px] font-bold opacity-80 uppercase tracking-tighter">GST</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">{rate.name}</h4>
                          {rate.isDefault && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px] inline-flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Default Slab
                            </span>
                          )}
                          {!rate.isActive && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 font-bold text-[10px]">
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-0.5">{rate.description}</p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono text-slate-700">
                            HSN: {rate.hsnCode || '3004'}
                          </span>
                          <span>
                            CGST: <strong className="text-slate-800">{rate.cgst ?? rate.cgstPercent ?? (rate.rate / 2)}%</strong>
                          </span>
                          <span>
                            SGST: <strong className="text-slate-800">{rate.sgst ?? rate.sgstPercent ?? (rate.rate / 2)}%</strong>
                          </span>
                          <span>
                            IGST: <strong className="text-slate-800">{rate.igst ?? rate.igstPercent ?? rate.rate}%</strong>
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-emerald-700 font-semibold">{prodCount} products linked</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!rate.isDefault && (
                        <button
                          type="button"
                          onClick={() => setDefaultGSTRate(rate.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-semibold transition cursor-pointer"
                        >
                          Make Default
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditModal(rate)}
                        title="Edit GST slab"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {gstRates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete GST slab "${rate.name}"?`)) {
                              deleteGSTRate(rate.id);
                            }
                          }}
                          title="Delete GST slab"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live GST Price Simulator (Right 4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Live GST Price Simulator</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 font-mono">
                Verify
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Calculate tax breakdown instantly when pricing drugs and creating sales invoices.
            </p>

            {/* Input Price */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Enter Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={calcPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) setCalcPrice(val);
                  }}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* Price Type Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCalcMode('exclusive')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  calcMode === 'exclusive' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tax Exclusive (+GST)
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('inclusive')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer ${
                  calcMode === 'inclusive' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tax Inclusive (MRP)
              </button>
            </div>

            {/* Select GST Slab */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Select GST Slab</label>
              <select
                value={calcSelectedRateId}
                onChange={(e) => setCalcSelectedRateId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-medium focus:outline-none"
              >
                {gstRates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.rate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Computation Card */}
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Taxable Base Value:</span>
                <span className="font-mono font-bold text-white">₹{baseAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>CGST ({selectedCalcRate?.cgstPercent || 0}%):</span>
                <span className="font-mono font-bold text-emerald-400">₹{cgstVal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>SGST ({selectedCalcRate?.sgstPercent || 0}%):</span>
                <span className="font-mono font-bold text-emerald-400">₹{sgstVal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 pt-1.5 border-t border-slate-700">
                <span className="text-emerald-300 font-bold">Total GST Tax:</span>
                <span className="font-mono font-extrabold text-emerald-300">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-sm font-extrabold">
                <span className="text-white">Final Customer Price:</span>
                <span className="font-mono text-white text-base">₹{finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">
                  {editingRate ? 'Edit GST Slab' : 'Add New GST Slab'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Slab Title / Label
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. GST 12% (Medicines)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    GST Rate (%)
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="decimal"
                    value={formRate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setFormRate(val);
                    }}
                    placeholder="12"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    HSN / Chapter Code
                  </label>
                  <input
                    type="text"
                    value={formHsn}
                    onChange={(e) => setFormHsn(e.target.value)}
                    placeholder="3004"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Preview of CGST and SGST Split */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-700 mb-1">Automatic Split:</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                    <div className="text-[9px] text-slate-400 uppercase font-bold">CGST</div>
                    <div className="font-bold text-slate-800 text-xs">
                      {((parseFloat(formRate) || 0) / 2).toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                    <div className="text-[9px] text-slate-400 uppercase font-bold">SGST</div>
                    <div className="font-bold text-slate-800 text-xs">
                      {((parseFloat(formRate) || 0) / 2).toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                    <div className="text-[9px] text-slate-400 uppercase font-bold">IGST</div>
                    <div className="font-bold text-slate-800 text-xs">
                      {(parseFloat(formRate) || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description / Applicability Notes
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Applicable on standard allopathic formulations and tablets"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-800 font-semibold">
                    Set as Default GST Slab for new products
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-800 font-semibold">Active & Available in Product Forms</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-gst-slab-btn"
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition active:scale-95 cursor-pointer"
                >
                  {editingRate ? 'Update Slab' : 'Create Slab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
