import React, { useState } from 'react';
import { Trash2, AlertTriangle, ArrowRight, RotateCcw, X, CheckCircle2, PackageCheck } from 'lucide-react';
import { Sale } from '../types';

interface ConfirmDeleteInvoiceModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (saleId: string) => Promise<boolean | void> | void;
}

export const ConfirmDeleteInvoiceModal: React.FC<ConfirmDeleteInvoiceModalProps> = ({
  sale,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const totalAmount = Number(sale.grandTotal ?? sale.totalAmount ?? 0);
  const totalProfit = Number(sale.totalProfit ?? sale.netProfit ?? 0);
  const items = sale.items || [];

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(sale.id);
      setSuccessMessage(`Invoice #${sale.invoiceNumber} removed. Stock restored & today's sales adjusted.`);
      setTimeout(() => {
        setSuccessMessage(null);
        setIsDeleting(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-rose-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight leading-tight">Delete Invoice & Restore Stock</h3>
              <p className="text-xs text-rose-100 font-mono mt-0.5">Invoice #{sale.invoiceNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-slate-700">
          {successMessage ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-900 text-sm">{successMessage}</p>
              <p className="text-xs text-slate-500">Closing dialog...</p>
            </div>
          ) : (
            <>
              {/* Invoice Summary Box */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-800">{sale.customerName || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Date & Time:</span>
                  <span className="font-medium text-slate-700">{sale.dateTime ? new Date(sale.dateTime).toLocaleString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Payment Mode:</span>
                  <span className="font-medium text-slate-700">{sale.paymentMethod || 'Cash'}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-bold text-slate-700">Invoice Total:</span>
                  <span className="text-base font-extrabold text-rose-700">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Automatic Stock Restitution Preview */}
              <div className="border border-emerald-100 bg-emerald-50/60 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automatic Inventory Restitution ({items.length} item{items.length === 1 ? '' : 's'})</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Deleting this sale will automatically add the sold quantities back to their respective batch stocks in the database:
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {items.map((it, idx) => {
                    const returnQty = Number(
                      it.totalBaseQuantity ?? 
                      it.baseQuantity ?? 
                      ((it.quantityInUnit || it.quantity || 1) * (it.conversionFactor || it.multiplierToBase || 1))
                    );
                    const unitLabel = it.unitName || it.packagingUnit || 'Units';
                    return (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-emerald-200/60 shadow-2xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[210px]">
                          {it.productName || 'Medicine'}
                        </span>
                        <div className="flex items-center gap-1 font-bold text-emerald-700 shrink-0">
                          <RotateCcw className="w-3 h-3 text-emerald-600" />
                          <span>+{returnQty} {unitLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Today's Sales Adjustment Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <span className="font-bold block text-amber-950">Today's Sales & Metrics Adjustment</span>
                  <p className="text-[11px] text-amber-900">
                    This will immediately deduct <strong className="font-bold">₹{totalAmount.toFixed(2)}</strong> from today's revenue and <strong className="font-bold">₹{totalProfit.toFixed(2)}</strong> from today's profit margin across all dashboard widgets.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!successMessage && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Keep Invoice (Cancel)
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deleting & Restoring Stock...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete & Restore Stock</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
