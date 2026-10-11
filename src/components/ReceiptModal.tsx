import React, { useState } from 'react';
import { Printer, CheckCircle2, X, Download, ShieldCheck, Pencil, AlertCircle } from 'lucide-react';
import { Sale } from '../types';
import { usePharmacy } from '../context/PharmacyContext';
import { EditInvoiceModal } from './EditInvoiceModal';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
  onEdit?: (sale: Sale) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale: initialSale, onClose, onEdit }) => {
  const { settings } = usePharmacy();
  const [currentSale, setCurrentSale] = useState<Sale | null>(initialSale);
  const [showEditModal, setShowEditModal] = useState(false);

  // Sync if initialSale prop changes
  React.useEffect(() => {
    setCurrentSale(initialSale);
  }, [initialSale]);

  const sale = currentSale;
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto overflow-x-hidden">
        <div className="bg-white rounded-3xl max-w-lg w-full max-w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Top Bar */}
          <div className="p-4 bg-emerald-600 text-white flex items-center justify-between no-print">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
              <div className="min-w-0">
                <h3 className="font-bold text-sm truncate">
                  {sale.isEdited ? 'Updated Invoice' : 'Sale Completed Successfully'}
                </h3>
                {sale.isEdited && (
                  <span className="text-[10px] bg-emerald-700 text-emerald-100 px-1.5 py-0.2 rounded font-medium">
                    Corrected & Recalculated
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (onEdit) {
                    onEdit(sale);
                  } else {
                    setShowEditModal(true);
                  }
                }}
                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition cursor-pointer"
                title="Edit Invoice"
                aria-label="Edit Invoice"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-emerald-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* Printable Receipt Container */}
        <div id="printable-receipt" className="p-4 sm:p-6 text-slate-800 text-xs font-mono overflow-x-hidden">
          {/* Pharmacy Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
            {settings.storeLogo && (
              <div className="mb-2 flex justify-center">
                <img
                  src={settings.storeLogo}
                  alt={settings.storeName}
                  className="h-12 w-auto max-w-[140px] object-contain"
                />
              </div>
            )}
            <div className="font-extrabold text-base tracking-tight font-sans text-slate-900 leading-tight">
              {settings.storeName || 'Medical Store'}
            </div>
            {settings.tagline && (
              <div className="text-[11px] text-slate-500 font-sans">{settings.tagline}</div>
            )}
            {settings.address && (
              <div className="text-[10px] text-slate-600 leading-tight">{settings.address}</div>
            )}
            {(settings.phone || settings.email) && (
              <div className="text-[10px] text-slate-600">
                {[settings.phone ? `Ph: ${settings.phone}` : null, settings.email ? `Email: ${settings.email}` : null]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            )}
            {/* Drug License number: rendered only if user entered it (not mandatory) */}
            {(settings.dlNumber || settings.dlNumber2) && (
              <div className="text-[10px] text-slate-800 font-bold pt-0.5">
                {[
                  settings.dlNumber ? `DL: ${settings.dlNumber}` : null,
                  settings.dlNumber2 ? `DL-2: ${settings.dlNumber2}` : null,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            )}
            {settings.gstin && (
              <div className="text-[10px] text-slate-600">GSTIN: {settings.gstin}</div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-300 grid grid-cols-2 gap-1 text-[11px]">
            <div>
              <span className="text-slate-500">Invoice:</span> <strong>{sale.invoiceNumber}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Date:</span> {sale?.dateTime ? new Date(sale.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Customer:</span> {sale.customerName}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <div className="grid grid-cols-12 gap-1 font-bold text-[10px] text-slate-500 uppercase border-b pb-1">
              <span className="col-span-5">Item (Batch • Exp)</span>
              <span className="col-span-2 text-center">Unit</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-3 text-right">Amount</span>
            </div>

            <div className="divide-y divide-slate-100 py-1">
              {sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1 py-1.5 items-center text-[11px]">
                  <div className="col-span-5 leading-tight">
                    <div className="font-bold text-slate-900 font-sans">{item.productName}</div>
                    <div className="text-[10px] text-slate-500">
                      B: {item.batchNumber} • Exp: {item.expiryDate ? item.expiryDate.slice(0, 7) : 'N/A'}
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    {item.quantityInUnit} {item.unitName}
                  </div>
                  <div className="col-span-2 text-right">
                    {Number(item.sellingPricePerUnit ?? (item as any).unitSellingPrice ?? 0).toFixed(2)}
                  </div>
                  <div className="col-span-3 text-right font-semibold tabular-nums">
                    {Number(item.netAmount ?? (item as any).totalAmount ?? 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary / Total */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium tabular-nums">{Number(sale.subtotal ?? sale.grandTotal ?? (sale as any).totalAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST Included (est):</span>
              <span className="font-medium tabular-nums">{Number(sale.taxAmount ?? (sale as any).taxTotal ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold tabular-nums text-slate-900 pt-1 border-t">
              <span className="font-bold">NET PAYABLE:</span>
              <span>₹{Number(sale.grandTotal ?? (sale as any).totalAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[10px] pt-0.5">
              <span>Payment ({sale.paymentMethod}):</span>
              <span className="tabular-nums">
                Paid: {Number(sale.amountPaid ?? 0).toFixed(2)}
                {(sale.changeGiven || 0) > 0 ? ` • Change: ${Number(sale.changeGiven).toFixed(2)}` : ''}
                {(sale.dueAmount || 0) > 0 ? ` • Due: ${Number(sale.dueAmount).toFixed(2)}` : ''}
              </span>
            </div>
          </div>

          {/* Batch Profit Audit (Internal Transparency for Demo) */}
          <div className="mt-2 p-2 bg-emerald-50 rounded-lg text-[10px] text-emerald-800 border border-emerald-200 no-print">
            <div className="font-bold flex items-center justify-between">
              <span>Batch Profit Recorded (Audit):</span>
              <span>{Number(sale.totalProfit ?? (sale as any).netProfit ?? 0).toFixed(2)} ({Number(sale.profitMarginPercent ?? (Number(sale.totalCost) > 0 ? (Number(sale.totalProfit ?? (sale as any).netProfit ?? 0) / Number(sale.totalCost)) * 100 : 0)).toFixed(1)}%)</span>
            </div>
            <div className="text-emerald-700/80 mt-0.5">
              Cost: {Number(sale.totalCost ?? 0).toFixed(2)} • Exact unit-level batch deduction applied.
            </div>
          </div>

          {/* Signatory & Stamp Section */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 flex items-end justify-between gap-3">
            <div className="text-[9px] text-slate-500 max-w-[220px] leading-tight font-sans">
              <div>{settings.invoiceTerms || 'Medicines once sold can only be returned in original sealed packaging.'}</div>
              <div className="text-[8px] text-slate-400 mt-1">
                Thank you for choosing {settings.storeName || 'us'}!
              </div>
            </div>

            <div className="text-center shrink-0">
              {settings.stampLogo ? (
                <div className="flex flex-col items-center">
                  <img
                    src={settings.stampLogo}
                    alt="Official Store Stamp"
                    className="h-14 w-auto max-w-[100px] object-contain mb-0.5"
                  />
                  <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tight font-sans">
                    Authorized Signatory
                  </span>
                </div>
              ) : (
                <div className="pt-5">
                  <div className="border-t border-slate-400 w-24 mx-auto mb-0.5" />
                  <span className="text-[9px] text-slate-500 uppercase tracking-tight font-sans">
                    Authorized Signatory
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 no-print">
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onEdit) {
                  onEdit(sale);
                } else {
                  setShowEditModal(true);
                }
              }}
              title="Edit Invoice"
              aria-label="Edit Invoice"
              className="w-9 h-9 flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Pencil className="w-4 h-4 text-amber-700" />
            </button>

            <button
              id="print-receipt-btn"
              onClick={handlePrint}
              title="Print Receipt"
              aria-label="Print Receipt"
              className="w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Edit Invoice Modal */}
    {showEditModal && (
      <EditInvoiceModal
        sale={sale}
        onClose={() => setShowEditModal(false)}
        onSaved={(updated) => {
          setCurrentSale(updated);
          setShowEditModal(false);
          if (onEdit) {
            onEdit(updated);
          }
        }}
      />
    )}
  </>
  );
};
