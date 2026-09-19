import React, { useState } from 'react';
import { Camera, Barcode, X, Check, Search } from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';

interface BarcodeScannerModalProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onScan, onClose }) => {
  const { products } = usePharmacy();
  const [manualCode, setManualCode] = useState('');

  const handleSimulate = (code: string) => {
    onScan(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Barcode className="w-5 h-5" />
            <span>Barcode & Camera Scanner</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Scanner Viewfinder Simulation */}
          <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-white border-2 border-emerald-500/40">
            <div className="w-48 h-28 border-2 border-dashed border-emerald-400 rounded-xl relative flex items-center justify-center">
              <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_8px_#34d399]"></div>
              <span className="text-[10px] text-emerald-300 font-medium bg-black/60 px-2 py-0.5 rounded-full">
                Align Barcode inside frame
              </span>
            </div>
            <div className="absolute bottom-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Camera active (Mobile & Web)</span>
            </div>
          </div>

          {/* Quick Barcode Simulator for Demo / Instant Click */}
          <div>
            <div className="text-xs font-bold text-slate-800 mb-2">Instant Barcode Click (Quick Tap):</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {products.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSimulate(p.barcode)}
                  className="p-2 text-left rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-800 transition truncate"
                >
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="font-mono text-[10px] text-slate-400">{p.barcode}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Barcode Input */}
          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or type barcode (e.g. 890123400001)"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode) {
                  handleSimulate(manualCode);
                }
              }}
            />
            <button
              onClick={() => manualCode && handleSimulate(manualCode)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
            >
              Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
