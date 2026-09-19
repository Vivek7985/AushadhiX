import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Trash2,
  ArrowRight,
  Receipt,
  FileCheck,
  Building,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { PurchaseOrder, Product } from '../types';

export const PurchasesView: React.FC = () => {
  const {
    products,
    suppliers,
    purchases,
    receiveGoods,
    currentRole,
  } = usePharmacy();

  const [showNewPOModal, setShowNewPOModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [poNumber, setPoNumber] = useState(`PO-${Date.now().toString().slice(-4)}`);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-4)}`);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // Line items state
  const [orderItems, setOrderItems] = useState<
    Array<{
      productId: string;
      unitId: string;
      quantityInUnit: number;
      batchNumber: string;
      mfgDate: string;
      expiryDate: string;
      purchasePricePerUnit: number;
      mrpPerUnit: number;
      sellingPricePerUnit: number;
    }>
  >([
    {
      productId: products[0]?.id || '',
      unitId: products[0]?.units[0]?.id || '',
      quantityInUnit: 10,
      batchNumber: `NB-${Date.now().toString().slice(-4)}`,
      mfgDate: '2026-02',
      expiryDate: '2028-01-31',
      purchasePricePerUnit: 100,
      mrpPerUnit: 140,
      sellingPricePerUnit: 120,
    },
  ]);

  const handleAddItem = () => {
    const defaultProduct = products[0];
    setOrderItems((prev) => [
      ...prev,
      {
        productId: defaultProduct?.id || '',
        unitId: defaultProduct?.units[0]?.id || '',
        quantityInUnit: 5,
        batchNumber: `B-${Date.now().toString().slice(-4)}`,
        mfgDate: '2026-02',
        expiryDate: '2028-06-30',
        purchasePricePerUnit: 50,
        mrpPerUnit: 70,
        sellingPricePerUnit: 60,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitGRN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || orderItems.length === 0) return;

    receiveGoods({
      supplierId: selectedSupplierId,
      poNumber,
      invoiceNumber,
      notes: purchaseNotes,
      items: orderItems,
    });

    setShowNewPOModal(false);
    setOrderItems([]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Purchases & Goods Receipt</h2>
        </div>

        <div>
          {currentRole === 'Admin' || currentRole === 'Manager' ? (
            <button
              id="new-purchase-order-btn"
              onClick={() => {
                setPoNumber(`PO-${Date.now().toString().slice(-4)}`);
                setInvoiceNumber(`INV-${Date.now().toString().slice(-4)}`);
                setShowNewPOModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase / GRN</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Historical Purchases List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900 flex items-center justify-between">
          <span>Completed Goods Receipts & Invoices</span>
          <span className="text-slate-400 font-medium">{purchases.length} recorded</span>
        </div>

        <div className="divide-y divide-slate-100">
          {purchases.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No purchase orders recorded yet. Click "Create Purchase / GRN" to intake stock.
            </div>
          ) : (
            purchases.map((po) => (
              <div key={po.id} className="p-4 hover:bg-slate-50/70 transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                        <span>{po.supplierName}</span>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          PO: {po.poNumber}
                        </span>
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          Inv: {po.invoiceNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Received on {new Date(po.purchaseDate).toLocaleDateString()} • {po.items.length} product lines
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Total Purchase Value</div>
                    <div className="text-base font-extrabold text-slate-900">
                      {po.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Sub-items in purchase */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  {po.items.map((it, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/80">
                      <div className="font-bold text-slate-900 truncate">{it.productName}</div>
                      <div className="text-[11px] text-slate-500 flex justify-between mt-1">
                        <span>Batch: <strong className="font-mono text-slate-800">{it.batchNumber}</strong></span>
                        <span>Exp: {it.expiryDate}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 font-semibold flex justify-between mt-0.5">
                        <span>Qty: {it.quantityInUnit} {it.unitName} ({it.totalBaseQuantity} base)</span>
                        <span>{it.purchasePricePerUnit}/unit</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CREATE PURCHASE / GOODS RECEIPT MODAL */}
      {showNewPOModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileCheck className="w-5 h-5" />
                <span>New Goods Receipt Note (GRN) & Stock Intake</span>
              </div>
              <button onClick={() => setShowNewPOModal(false)} className="text-white/80 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGRN} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PO Number *</label>
                  <input
                    type="text"
                    required
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Supplier Invoice No *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Medicine Line Items & Batch Specifics
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Each line creates a distinct batch with its own purchase cost.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {orderItems.map((item, idx) => {
                    const product = products.find((p) => p.id === item.productId) || products[0];

                    return (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 text-xs">Item #{idx + 1}</span>
                          {orderItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Medicine *</label>
                            <select
                              value={item.productId}
                              onChange={(e) => {
                                const newProdId = e.target.value;
                                const newProd = products.find((p) => p.id === newProdId);
                                setOrderItems((prev) =>
                                  prev.map((it, i) =>
                                    i === idx
                                      ? {
                                          ...it,
                                          productId: newProdId,
                                          unitId: newProd?.units[0]?.id || '',
                                        }
                                      : it
                                  )
                                );
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-bold"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.brand})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Packaging Unit *</label>
                            <select
                              value={item.unitId}
                              onChange={(e) => {
                                const newUnitId = e.target.value;
                                setOrderItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, unitId: newUnitId } : it))
                                );
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-bold"
                            >
                              {product?.units.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} (x{u.multiplierToBase} {product.baseUnit}s)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Quantity Received *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.quantityInUnit}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setOrderItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, quantityInUnit: val } : it))
                                );
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-bold"
                            />
                          </div>
                        </div>

                        {/* Batch Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Batch Number *</label>
                            <input
                              type="text"
                              required
                              value={item.batchNumber}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOrderItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, batchNumber: val } : it))
                                );
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Expiry Date *</label>
                            <input
                              type="date"
                              required
                              value={item.expiryDate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOrderItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, expiryDate: val } : it))
                                );
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Cost / Unit *</label>
                            <input
                              type="number"
                              required
                              min="0.1"
                              step="any"
                              value={item.purchasePricePerUnit}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setOrderItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, purchasePricePerUnit: val } : it))
                                );
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Selling / Unit *</label>
                            <input
                              type="number"
                              required
                              min="0.1"
                              step="any"
                              value={item.sellingPricePerUnit}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setOrderItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, sellingPricePerUnit: val } : it))
                                );
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">MRP / Unit *</label>
                            <input
                              type="number"
                              required
                              min="0.1"
                              step="any"
                              value={item.mrpPerUnit}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setOrderItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, mrpPerUnit: val } : it))
                                );
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Submit */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPOModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition active:scale-95"
                >
                  Post Goods Receipt & Update Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
