import React, { useState } from 'react';
import {
  Settings,
  Store,
  ShieldCheck,
  UserCheck,
  Bell,
  RefreshCw,
  Save,
  AlertTriangle,
  PlayCircle,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { PharmacySettings, UserRole } from '../types';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    currentRole,
    setCurrentRole,
    runAcceptanceTest,
    resetToDemoData,
  } = usePharmacy();

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRunTest = async () => {
    const res = await runAcceptanceTest();
    setTestResult(res);
  };

  const [formStoreName, setFormStoreName] = useState(settings.storeName);
  const [formTagline, setFormTagline] = useState(settings.tagline);
  const [formDl, setFormDl] = useState(settings.dlNumber);
  const [formGstin, setFormGstin] = useState(settings.gstin);
  const [formAddress, setFormAddress] = useState(settings.address);
  const [formPhone, setFormPhone] = useState(settings.phone);
  const [formExpiryDays, setFormExpiryDays] = useState(settings.expiryWarningDays);
  const [formLowStock, setFormLowStock] = useState(settings.defaultLowStockThreshold);
  const [formAllowExpired, setFormAllowExpired] = useState(settings.allowExpiredSale);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: formStoreName,
      tagline: formTagline,
      dlNumber: formDl,
      gstin: formGstin,
      address: formAddress,
      phone: formPhone,
      expiryWarningDays: formExpiryDays,
      defaultLowStockThreshold: formLowStock,
      allowExpiredSale: formAllowExpired,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const roles: UserRole[] = ['Admin', 'Pharmacist', 'Cashier', 'InventoryUser'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">System Settings & Pharmacy Configuration</h2>
          <p className="text-xs text-slate-500">
            Manage pharmacy licensing, regulatory thresholds, RBAC user role permissions, and acceptance testing.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* RBAC Role Switcher (Section 31 & 32) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-sm text-slate-900">Current Role-Based Access Control (RBAC)</h3>
        </div>
        <p className="text-xs text-slate-500">
          Switch roles to simulate permissions across POS billing, master product modifications, and batch intakes.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setCurrentRole(r)}
              className={`p-3 rounded-2xl border text-xs font-bold transition text-left flex flex-col justify-between ${
                currentRole === r
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="font-extrabold">{r}</div>
              <div className={`text-[10px] mt-1 ${currentRole === r ? 'text-emerald-100' : 'text-slate-400'}`}>
                {r === 'Admin' && 'Full system access'}
                {r === 'Pharmacist' && 'Prescription & POS'}
                {r === 'Cashier' && 'Billing & Receipt print'}
                {r === 'InventoryUser' && 'Stock & Batches only'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* Pharmacy Profile & License */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">Store Profile & Licensing (DL / GSTIN)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Pharmacy Name</label>
              <input
                type="text"
                required
                value={formStoreName}
                onChange={(e) => setFormStoreName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Store Tagline / Slogan</label>
              <input
                type="text"
                value={formTagline}
                onChange={(e) => setFormTagline(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Drug License Numbers (DL)</label>
              <input
                type="text"
                required
                value={formDl}
                onChange={(e) => setFormDl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">GSTIN Number</label>
              <input
                type="text"
                required
                value={formGstin}
                onChange={(e) => setFormGstin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Physical Address</label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Regulatory Thresholds */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Inventory & Expiry Safeguards</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Expiry Alert Lead Time (Days)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                value={formExpiryDays}
                onChange={(e) => setFormExpiryDays(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Batches expiring within this window show in early warning lists.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Default Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={formLowStock}
                onChange={(e) => setFormLowStock(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Threshold measured in smallest sellable Base Units (Tablets).
              </span>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-start gap-3">
              <input
                type="checkbox"
                id="allow-expired"
                checked={formAllowExpired}
                onChange={(e) => setFormAllowExpired(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <div>
                <label htmlFor="allow-expired" className="text-xs font-bold text-slate-900 cursor-pointer">
                  Allow Billing Expired Batches (Emergency Override)
                </label>
                <p className="text-[11px] text-rose-600 font-medium">
                  Default is FALSE. Strict safeguards mandate that expired stock cannot be selected or billed during POS sales.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </form>

      {/* Acceptance Test & Demo Reset Panel */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <span>End-to-End Acceptance Test</span>
          </div>
          <button
            onClick={resetToDemoData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Demo Seed Data</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Verifies the exact scenario:
          <br />
          <strong>Step 1:</strong> Opening stock: 10 strips (100 tablets), Purchase cost = 100/strip (10/tab), MRP = 140/strip (14/tab), Selling price = 120/strip (12/tab).
          <br />
          <strong>Step 2:</strong> Sale: 3 tablets sold.
          <br />
          <strong>Result Verification:</strong> Revenue = 36, Cost = 30, Gross Profit = 6, Remaining Stock = 97 tablets.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            id="run-acceptance-test-btn"
            onClick={handleRunTest}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-xl text-xs font-extrabold shadow-md transition active:scale-95 cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Run Test Scenario</span>
          </button>

          {testResult && (
            <div className={`p-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-950 text-rose-300 border border-rose-500/40'
            }`}>
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
