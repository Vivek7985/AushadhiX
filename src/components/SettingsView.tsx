import React, { useState, useEffect } from 'react';
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
  Cloud,
  Database,
  Smartphone,
  Check,
  Copy,
  ExternalLink,
  ClipboardList,
} from 'lucide-react';
import { SupplierOrderListView } from './SupplierOrderListView';
import { usePharmacy } from '../context/PharmacyContext';
import { PharmacySettings, UserRole } from '../types';
import { seedFirestoreIfEmpty } from '../lib/firestoreSync';
import {
  testFirestoreConnection,
  activeDatabaseId,
  isFirestoreQuotaExhausted,
  tryReenableFirestoreNetwork,
} from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    currentRole,
    setCurrentRole,
    runAcceptanceTest,
    resetToDemoData,
    products,
    batches,
    suppliers,
    customers,
    purchaseOrders,
    sales,
    stockLedger,
  } = usePharmacy();

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedDbId] = useState(activeDatabaseId);
  const [quotaExhausted, setQuotaExhausted] = useState(isFirestoreQuotaExhausted());

  useEffect(() => {
    const handler = () => {
      setQuotaExhausted(isFirestoreQuotaExhausted());
    };
    window.addEventListener('firestore-quota-status', handler);
    return () => window.removeEventListener('firestore-quota-status', handler);
  }, []);

  const handleRunTest = async () => {
    const res = await runAcceptanceTest();
    setTestResult(res);
  };

  const handleManualCloudSync = async () => {
    setIsSyncing(true);
    try {
      const isConnected = await tryReenableFirestoreNetwork();
      setQuotaExhausted(isFirestoreQuotaExhausted());
      if (!isConnected) {
        if (isFirestoreQuotaExhausted()) {
          setCloudSyncStatus(
            'Daily Firestore write quota reached on free tier. System is operating safely with PostgreSQL local database.'
          );
        } else {
          setCloudSyncStatus('Warning: Offline or Firestore network unreachable');
        }
      } else {
        await seedFirestoreIfEmpty({
          products,
          batches,
          suppliers,
          customers,
          purchaseOrders,
          sales,
          stockLedger,
        });
        setCloudSyncStatus('Synchronized successfully with Cloud Firestore!');
      }
    } catch (err: any) {
      setCloudSyncStatus(`Sync notice: ${err.message || 'Error syncing'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setCloudSyncStatus(null), 6000);
    }
  };

  const handleCopyProjectId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(firebaseConfig.projectId);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
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

  useEffect(() => {
    if (settings.storeName) setFormStoreName(settings.storeName);
    if (settings.tagline !== undefined) setFormTagline(settings.tagline);
    if (settings.dlNumber) setFormDl(settings.dlNumber);
    if (settings.gstin) setFormGstin(settings.gstin);
    if (settings.address) setFormAddress(settings.address);
    if (settings.phone) setFormPhone(settings.phone);
    if (settings.expiryWarningDays !== undefined) setFormExpiryDays(settings.expiryWarningDays);
    if (settings.defaultLowStockThreshold !== undefined) setFormLowStock(settings.defaultLowStockThreshold);
    if (settings.allowExpiredSale !== undefined) setFormAllowExpired(settings.allowExpiredSale);
  }, [settings]);

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
  const [activeSection, setActiveSection] = useState<'supplier-orders' | 'profile' | 'safeguards' | 'cloud' | 'all'>('supplier-orders');

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">System Settings & Pharmacy Configuration</h2>
          <p className="text-xs text-slate-500">
            Manage monthly supplier orders, pharmacy licensing, regulatory thresholds, RBAC permissions, and cloud sync.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          onClick={() => setActiveSection('supplier-orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSection === 'supplier-orders'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Supplier Order List (WhatsApp)</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
              activeSection === 'supplier-orders'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            Chemist Indent
          </span>
        </button>

        <button
          onClick={() => setActiveSection('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSection === 'profile'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Store Profile & DL / GSTIN</span>
        </button>

        <button
          onClick={() => setActiveSection('safeguards')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSection === 'safeguards'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>RBAC & Safeguards</span>
        </button>

        <button
          onClick={() => setActiveSection('cloud')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSection === 'cloud'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Cloud Sync & Verification</span>
        </button>

        <button
          onClick={() => setActiveSection('all')}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
            activeSection === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
          }`}
        >
          <span>All Settings</span>
        </button>
      </div>

      {/* SECTION 1: Supplier Order List (Monthly Indent & WhatsApp Sharing) */}
      {(activeSection === 'supplier-orders' || activeSection === 'all') && (
        <div className="space-y-4">
          <SupplierOrderListView />
        </div>
      )}

      {/* Reminder Banner when viewing other sections */}
      {activeSection !== 'supplier-orders' && activeSection !== 'all' && (
        <div
          onClick={() => setActiveSection('supplier-orders')}
          className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 flex items-center justify-between cursor-pointer transition group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Need to create or update your Monthly Medicine Order List for suppliers?
              </p>
              <p className="text-[11px] text-emerald-700">
                Build your shortage list with quantities throughout the month and share on WhatsApp in normal text.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition flex items-center gap-1 shrink-0">
            <span>Open Order List</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* SECTION 2: RBAC Role Switcher */}
      {(activeSection === 'safeguards' || activeSection === 'all') && (
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
      )}

      {/* SECTION 3: Settings Form (Profile & Safeguards) */}
      {(activeSection === 'profile' || activeSection === 'safeguards' || activeSection === 'all') && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          {/* Pharmacy Profile & License */}
          {(activeSection === 'profile' || activeSection === 'all') && (
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600">Drug License Number (DL)</label>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={formDl}
                    onChange={(e) => setFormDl(e.target.value)}
                    placeholder="e.g. 20B/MH/2024/09812"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600">GSTIN Number</label>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={formGstin}
                    onChange={(e) => setFormGstin(e.target.value)}
                    placeholder="e.g. 27AABCU9603R1ZM"
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

              {activeSection === 'profile' && (
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Profile Configuration</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Regulatory Thresholds */}
          {(activeSection === 'safeguards' || activeSection === 'all') && (
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
          )}
        </form>
      )}

      {/* SECTION 4: Cloud Firestore & Mobile App Real-Time Sync Panel */}
      {(activeSection === 'cloud' || activeSection === 'all') && (
        <>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Cloud Firestore & Mobile App Sync</h3>
              <p className="text-xs text-slate-500">
                Live bidirectional synchronization between Web and Mobile applications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {quotaExhausted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Firestore daily free tier quota limit reached. Local PostgreSQL database is actively persisting all pharmacy data.">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Local Database Active (Daily Cloud Quota Reached)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            )}
            <button
              onClick={handleManualCloudSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Testing...' : quotaExhausted ? 'Recheck Cloud' : 'Push to Cloud'}</span>
            </button>
          </div>
        </div>

        {quotaExhausted && (
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Cloud Firestore Free Daily Write Quota Reached</p>
              <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                The free tier Firestore database has reached its daily write quota limit (20,000 writes/day). The system is safely operating on the primary local PostgreSQL database. All inventory, sales, products, batches, and reports are fully preserved and operational without interruption. Cloud sync will automatically resume when quota resets.
              </p>
            </div>
          </div>
        )}

        {cloudSyncStatus && (
          <div className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            cloudSyncStatus.includes('Warning') || cloudSyncStatus.includes('quota')
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${
              cloudSyncStatus.includes('Warning') || cloudSyncStatus.includes('quota')
                ? 'text-amber-600'
                : 'text-emerald-600'
            }`} />
            <span>{cloudSyncStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cloud Project ID</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyProjectId}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                >
                  <span>Open Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <p className="font-mono text-xs font-bold text-slate-800">{firebaseConfig.projectId}</p>
            <p className="text-[11px] text-slate-500">
              Provisioned for <span className="font-semibold text-slate-700">salevivekd@gmail.com</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Firestore Database</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>
            <p className="font-mono text-xs font-bold text-slate-800 truncate" title={selectedDbId}>
              {selectedDbId}
            </p>
            <p className="text-[11px] text-slate-500">
              Provisioned Enterprise Database Instance
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Why isn't the database showing in Firebase Console?</span>
          </div>
          <ol className="text-xs text-amber-800/90 space-y-1.5 list-decimal list-inside leading-relaxed pl-0.5">
            <li>
              <strong>Make sure you are in project "{firebaseConfig.projectId}":</strong> In the top-left dropdown of Firebase Console, select <strong>{firebaseConfig.projectId}</strong> (not an older project).
            </li>
            <li>
              <strong>Click "Create database" if prompted:</strong> In new projects, Firebase asks you to pick a location (e.g. <code>asia-south1</code> or <code>us-central1</code>) to activate Cloud Firestore. Click <strong>Create database</strong> in the Firebase Console.
            </li>
            <li>
              <strong>Check the Database Dropdown:</strong> If your Firebase console only displays <code>(default)</code>, toggle between <strong>(default)</strong> and <strong>Custom</strong> above to match what is created in your console, then click <strong>Push to Cloud</strong>.
            </li>
          </ol>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-emerald-950">Mobile Application Sync Instructions</h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              To connect your mobile app (Android Kotlin, Flutter, or React Native), add the Firebase project configuration using project ID <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono font-semibold">{firebaseConfig.projectId}</code> and database <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono font-semibold">{selectedDbId}</code>. Collections synced automatically: <span className="font-semibold">products, batches, sales, suppliers, customers, purchase_orders, stock_ledger</span>.
            </p>
          </div>
        </div>
      </div>

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
      </>
      )}
    </div>
  );
};
