import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  ShoppingCart,
  Boxes,
  ClockAlert,
  ScrollText,
  Keyboard,
  Sparkles,
  CheckCircle2,
  PlayCircle,
  Layers,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const [activeTab, setActiveTab] = useState<'billing' | 'inventory' | 'expiry' | 'audit' | 'shortcuts'>('billing');
  const { runAcceptanceTest } = usePharmacy();
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  if (!isOpen) return null;

  const handleExecuteTest = async () => {
    setIsRunningTest(true);
    try {
      const res = await runAcceptanceTest();
      setTestResult(res);
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Pharmacy Operations & User Guide</h3>
              <p className="text-[11px] text-slate-400">Workflow guides, packaging conversions, and system guidelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'billing'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS & Billing</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Inventory & Batches</span>
          </button>

          <button
            onClick={() => setActiveTab('expiry')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'expiry'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClockAlert className="w-3.5 h-3.5" />
            <span>Expiry & FEFO</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Audit & Verification</span>
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'shortcuts'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1 text-slate-600 leading-relaxed">
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Packaging Unit Hierarchy & Partial Sales</span>
                </div>
                <p>
                  Medicines can be dispensed in full Boxes, Strips, or loose individual Tablets. When dispensing partial units:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                  <li>The system automatically computes exact stock reductions in the <strong>Base Unit</strong>.</li>
                  <li>Batch purchase costs and customer selling prices scale accurately based on the unit multiplier.</li>
                  <li>Discounts (percentage or flat amount) and GST are calculated line-by-line in real time.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Alternative Brand Discovery</span>
                </div>
                <p>
                  When a prescribed brand is unavailable or low in stock, clicking <strong>Alternatives</strong> scans your catalog for brands matching the exact active salt composition (e.g., Paracetamol 500mg).
                </p>
                <p className="text-[11px] text-slate-500">
                  In compliance with pharmacy dispensing protocols, the application never automatically substitutes brands without pharmacist confirmation.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ClockAlert className="w-4 h-4 text-amber-600" />
                  <span>Automatic FEFO Batch Selection</span>
                </div>
                <p>
                  Items added to a bill automatically default to the nearest-expiring active batch (First Expiry, First Out) to minimize expiry waste. Cashiers or pharmacists may override the batch if needed.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span>Batch-Level Purchase Cost Tracking</span>
                </div>
                <p>
                  Different shipments of the same medicine retain their individual purchase costs, manufacturing dates, expiry dates, and supplier invoice references.
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                  <li>Total inventory valuation is computed as the exact sum of remaining batch quantities multiplied by their respective purchase costs.</li>
                  <li>Sales profit is recorded against the actual purchase price of the specific batch dispensed.</li>
                </ul>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Goods Receipt Notes (GRN)</span>
                </div>
                <p>
                  When recording incoming shipments from distributors, each line item assigns an independent batch number, expiry date, purchase price, MRP, and selling rate directly into stock.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'expiry' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ClockAlert className="w-4 h-4 text-rose-600" />
                  <span>Expiry Radar & Warning Tiers</span>
                </div>
                <p>
                  The system monitors all stocked batches and groups them into 30, 60, and 90-day warning windows:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-700">
                  <li><strong>Expiring Soon</strong>: Flagged for prioritized dispensing or promotional discounts.</li>
                  <li><strong>Expired Batches</strong>: Automatically locked and blocked from being sold at the billing counter.</li>
                  <li><strong>Regulatory Disposal</strong>: Write-off action logs safe quarantine and records cost loss in the Stock Ledger.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-indigo-600" />
                  <span>Double-Entry Stock Ledger</span>
                </div>
                <p>
                  Every physical stock movement (inflow from purchases, outflow from sales, damage write-offs, or audit corrections) generates an immutable ledger record tracking quantity changes, batch balances, and unit prices.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-3">
                <div className="font-bold text-emerald-400 flex items-center justify-between">
                  <span>System Acceptance Test Scenario</span>
                  <button
                    onClick={handleExecuteTest}
                    disabled={isRunningTest}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>{isRunningTest ? 'Running...' : 'Run Scenario'}</span>
                  </button>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Verification flow:</strong>
                  <br />
                  1. Opening stock: 10 strips (100 tablets), Purchase cost = 10/tab, Selling price = 12/tab.
                  <br />
                  2. Sale: 3 tablets sold.
                  <br />
                  3. Verified: Revenue = 36, Cost = 30, Gross Profit = 6, Remaining Stock = 97 tablets.
                </p>

                {testResult && (
                  <div className={`p-2 rounded-xl text-[11px] font-mono font-bold flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-emerald-600" />
                  <span>Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">New POS Sale</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">F1</kbd>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Inventory Management</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">F2</kbd>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Medicine Catalog</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">F3</kbd>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Dashboard</span>
                    <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">F4</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">AushadhiX Standard Operating Procedures</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
