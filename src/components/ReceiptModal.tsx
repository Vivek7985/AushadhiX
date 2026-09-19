import React from 'react';
import { Printer, CheckCircle2, X, Download, ShieldCheck } from 'lucide-react';
import { Sale } from '../types';
import { usePharmacy } from '../context/PharmacyContext';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings } = usePharmacy();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-sm">Sale Completed Successfully</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-emerald-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Container */}
        <div id="printable-receipt" className="p-6 text-slate-800 text-xs font-mono">
          {/* Pharmacy Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <div className="font-extrabold text-base tracking-tight font-sans text-slate-900">
              {settings.storeName}
            </div>
            <div className="text-[11px] text-slate-500 font-sans">{settings.tagline}</div>
            <div className="text-[10px] text-slate-600 mt-1 leading-tight">{settings.address}</div>
            <div className="text-[10px] text-slate-600">Ph: {settings.phone} • DL: {settings.dlNumber}</div>
            <div className="text-[10px] text-slate-600">GSTIN: {settings.gstin}</div>
          </div>

          {/* Invoice Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-300 grid grid-cols-2 gap-1 text-[11px]">
            <div>
              <span className="text-slate-500">Invoice:</span> <strong>{sale.invoiceNumber}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Date:</span> {new Date(sale.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </div>
            <div>
              <span className="text-slate-500">Customer:</span> {sale.customerName}
            </div>
            <div className="text-right">
              <span className="text-slate-500">Doctor:</span> {sale.doctorName || 'Self / OTC'}
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
                  <div className="col-span-3 text-right font-bold">
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
              <span>{Number(sale.subtotal ?? sale.grandTotal ?? (sale as any).totalAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST Included (est):</span>
              <span>{Number(sale.taxAmount ?? (sale as any).taxTotal ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t">
              <span>NET PAYABLE:</span>
              <span>{Number(sale.grandTotal ?? (sale as any).totalAmount ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 text-[10px] pt-0.5">
              <span>Payment ({sale.paymentMethod}):</span>
              <span>
                Paid: {Number(sale.amountPaid ?? 0).toFixed(2)}
                {(sale.changeGiven || 0) > 0 ? ` • Change: ${Number(sale.changeGiven).toFixed(2)}` : ''}
                {(sale.dueAmount || 0) > 0 ? ` • Due: ${Number(sale.dueAmount).toFixed(2)}` : ''}
              </span>
            </div>
          </div>

          {/* Batch Profit Audit (Internal Transparency for Demo) */}
          <div className="mt-2 p-2 bg-emerald-50 rounded-lg text-[10px] text-emerald-800 border border-emerald-200">
            <div className="font-bold flex items-center justify-between">
              <span>Batch Profit Recorded (Audit):</span>
              <span>{Number(sale.totalProfit ?? (sale as any).netProfit ?? 0).toFixed(2)} ({Number(sale.profitMarginPercent ?? (Number(sale.totalCost) > 0 ? (Number(sale.totalProfit ?? (sale as any).netProfit ?? 0) / Number(sale.totalCost)) * 100 : 0)).toFixed(1)}%)</span>
            </div>
            <div className="text-emerald-700/80 mt-0.5">
              Cost: {Number(sale.totalCost ?? 0).toFixed(2)} • Exact unit-level batch deduction applied.
            </div>
          </div>

          {/* Footer Notes */}
          <div className="text-center text-[10px] text-slate-400 mt-4 leading-normal">
            Thank you for choosing {settings.storeName}!
            <br />
            Medicines once sold can only be returned in original sealed packaging.
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Close Window
          </button>

          <button
            id="print-receipt-btn"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
