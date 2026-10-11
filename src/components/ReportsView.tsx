import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Calendar,
  Download,
  Printer,
  PieChart as PieIcon,
  Percent,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { usePharmacy } from '../context/PharmacyContext';
import { Sale } from '../types';
import { EditInvoiceModal } from './EditInvoiceModal';
import { ConfirmDeleteInvoiceModal } from './ConfirmDeleteInvoiceModal';

export const ReportsView: React.FC = () => {
  const { sales, batches, ledger, products, deleteSale } = usePharmacy();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [inspectingSale, setInspectingSale] = useState<any | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  // Aggregates
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.grandTotal ?? s.totalAmount ?? 0), 0);
  const totalCost = sales.reduce((sum, s) => sum + Number(s.totalCost ?? 0), 0);
  const totalProfit = sales.reduce((sum, s) => sum + Number(s.totalProfit ?? s.netProfit ?? 0), 0);
  const overallMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

  // Valuation
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalInventoryValuation = batches
    .filter((b) => b.availableBaseQuantity > 0 && b.expiryDate >= todayStr)
    .reduce((sum, b) => sum + b.availableBaseQuantity * b.purchasePricePerBaseUnit, 0);

  // Expiry / Damage losses
  const expiryLoss = ledger
    .filter((l) => l.transactionType === 'Expiry' || l.transactionType === 'Damage')
    .reduce((sum, l) => sum + Math.abs(l.totalValue), 0);

  // Sales by product
  const productSalesMap: Record<string, { name: string; revenue: number; profit: number; units: number }> = {};
  sales.forEach((s) => {
    s.items.forEach((it) => {
      if (!productSalesMap[it.productName]) {
        productSalesMap[it.productName] = { name: it.productName, revenue: 0, profit: 0, units: 0 };
      }
      productSalesMap[it.productName].revenue += Number(it.netAmount ?? it.totalAmount ?? 0);
      productSalesMap[it.productName].profit += Number(it.profitAmount ?? it.itemProfit ?? it.profit ?? 0);
      productSalesMap[it.productName].units += Number(it.totalBaseQuantity ?? it.baseQuantity ?? it.quantityInUnit ?? 0);
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Payment Breakdown
  const paymentMethodData = [
    { name: 'Cash', value: sales.filter((s) => s.paymentMethod === 'Cash').reduce((sum, s) => sum + Number(s.grandTotal ?? s.totalAmount ?? 0), 0) },
    { name: 'UPI', value: sales.filter((s) => s.paymentMethod === 'UPI').reduce((sum, s) => sum + Number(s.grandTotal ?? s.totalAmount ?? 0), 0) },
    { name: 'Card', value: sales.filter((s) => s.paymentMethod === 'Card').reduce((sum, s) => sum + Number(s.grandTotal ?? s.totalAmount ?? 0), 0) },
  ].filter((p) => p.value > 0);

  const COLORS = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b'];

  const handleExportCSV = () => {
    const csvContent = [
      ['Invoice No', 'Date', 'Customer', 'Doctor', 'Subtotal', 'Tax', 'Grand Total', 'Batch Cost', 'Gross Profit', 'Margin %', 'Payment'],
      ...sales.map((s) => {
        const sGrandTotal = Number(s.grandTotal ?? s.totalAmount ?? 0);
        const sTotalCost = Number(s.totalCost ?? 0);
        const sTotalProfit = Number(s.totalProfit ?? s.netProfit ?? (sGrandTotal - sTotalCost));
        const sMargin = Number(s.profitMarginPercent ?? (sTotalCost > 0 ? (sTotalProfit / sTotalCost) * 100 : 0));
        return [
          s.invoiceNumber,
          s.dateTime,
          s.customerName,
          s.doctorName || 'N/A',
          Number(s.subtotal ?? sGrandTotal).toFixed(2),
          Number(s.taxAmount ?? 0).toFixed(2),
          Number(sGrandTotal || 0).toFixed(2),
          Number(sTotalCost || 0).toFixed(2),
          Number(sTotalProfit || 0).toFixed(2),
          Number(sMargin || 0).toFixed(1),
          s.paymentMethod,
        ];
      }),
    ]
      .map((e) => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AushadhiX_Sales_Profit_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Sales & Profit Reports</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">Gross Sales Revenue</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-slate-900 truncate">₹{Number(totalRevenue || 0).toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Across {sales.length} orders</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-700 truncate">Realized Batch Gross Profit</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-emerald-600 truncate">₹{Number(totalProfit || 0).toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-emerald-700 font-semibold mt-0.5 truncate">
            {Number(overallMargin || 0).toFixed(1)}% profit margin
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-purple-700 truncate">Current Stock Valuation</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-purple-700 truncate">₹{Number(totalInventoryValuation || 0).toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Batch acquisition cost</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-rose-700 truncate">Quarantine & Expiry Loss</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-rose-600 truncate">₹{Number(expiryLoss || 0).toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Audit records</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue vs Profit Chart */}
        <div className="lg:col-span-8 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Product Revenue & Gross Profit Breakdown</h3>
            <span className="text-[10px] text-slate-400">By top selling items</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`₹${(Number(val) || 0).toFixed(2)}`, '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" name="Batch Profit" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="lg:col-span-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Payment Collection</h3>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${(Number(val) || 0).toFixed(2)}`, '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-around text-xs pt-2 border-t border-slate-100">
            {paymentMethodData.map((item, idx) => (
              <div key={item.name} className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="font-bold text-slate-700">{item.name}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{Number(item.value || 0).toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Invoices & Realized Batch Margins - Tiles View (Mobile-First, No Sliders) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Invoices & Realized Batch Margins Audit</h3>
          <span className="text-emerald-700 font-medium text-xs">{sales.length} Invoices</span>
        </div>

        {sales.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No invoices recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sales.map((sale) => {
              const sGrandTotal = Number(sale.grandTotal ?? sale.totalAmount ?? 0);
              const sTotalCost = Number(sale.totalCost ?? 0);
              const sTotalProfit = Number(sale.totalProfit ?? sale.netProfit ?? (sGrandTotal - sTotalCost));
              const sMargin = Number(sale.profitMarginPercent ?? (sTotalCost > 0 ? (sTotalProfit / sTotalCost) * 100 : 0));
              const primaryItemNames = sale.items?.slice(0, 2).map((it) => it.productName) || [];
              const extraCount = (sale.items?.length || 0) - primaryItemNames.length;

              return (
                <div
                  key={sale.id}
                  className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between gap-2.5"
                >
                  {/* Top Row: Invoice No, Customer, Payment symbol */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={() => setInspectingSale(sale)}
                          className="font-mono font-bold text-slate-900 text-xs hover:text-emerald-700 transition cursor-pointer"
                        >
                          {sale.invoiceNumber}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {sale?.dateTime ? new Date(sale.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                        {sale.customerName || 'Walk-in Customer'}
                      </div>
                    </div>

                    {/* Payment Symbol Badge */}
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 shrink-0"
                      title={`Paid via ${sale.paymentMethod || 'Cash'}`}
                    >
                      {sale.paymentMethod === 'Cash'
                        ? '💵 Cash'
                        : sale.paymentMethod === 'UPI'
                        ? '📱 UPI'
                        : sale.paymentMethod === 'Card'
                        ? '💳 Card'
                        : '💰 Other'}
                    </span>
                  </div>

                  {/* Primary Products preview on tile */}
                  {primaryItemNames.length > 0 && (
                    <div className="bg-slate-50/70 p-2 rounded-xl text-[11px] text-slate-600 space-y-0.5">
                      {primaryItemNames.map((name, i) => (
                        <div key={i} className="truncate font-medium">
                          • {name}
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <div className="text-[10px] text-slate-400 italic">
                          +{extraCount} more items
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sales & Profit Metrics */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Selling Total</span>
                      <span className="font-extrabold text-slate-900 text-sm block">
                        ₹{Number(sGrandTotal || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Net Profit</span>
                      <span className="font-extrabold text-emerald-700 text-sm block">
                        ₹{Number(sTotalProfit || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Cost</span>
                      <span className="font-semibold text-slate-600 block">
                        ₹{Number(sTotalCost || 0).toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Margin</span>
                      <span className="font-bold text-emerald-800 block">
                        {Number(sMargin || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Action / Details */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-slate-400 truncate">
                        {sale.doctorName ? `Dr. ${sale.doctorName}` : 'OTC'}
                      </span>
                      {sale.isEdited && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200 shrink-0">
                          Edited
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSaleToDelete(sale)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition border border-transparent hover:border-rose-200 cursor-pointer"
                        title="Delete this invoice and restore stock"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingSale(sale)}
                        className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition cursor-pointer border border-amber-200"
                        title="Edit this invoice"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-700" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInspectingSale(sale)}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 px-2 py-1 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSPECT SALE / INVOICE PROFIT DETAILS MODAL */}
      {inspectingSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Invoice Audit & Margin Breakdown</h3>
                <p className="text-[11px] text-slate-300 font-mono">{inspectingSale.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setInspectingSale(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Customer</span>
                  <span className="font-bold text-slate-900">{inspectingSale.customerName || 'Walk-in'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Doctor (Rx)</span>
                  <span className="font-semibold text-slate-800">{inspectingSale.doctorName || 'OTC (No Doctor)'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Date & Time</span>
                  <span className="text-slate-600">{inspectingSale?.dateTime ? new Date(inspectingSale.dateTime).toLocaleString() : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Payment Method</span>
                  <span className="font-bold text-slate-800">{inspectingSale.paymentMethod}</span>
                </div>
              </div>

              {/* Items in Invoice */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-2">Prescribed Items & Batch Margins</h4>
                <div className="space-y-1.5">
                  {inspectingSale.items?.map((it: any, i: number) => {
                    const itCost = Number(it.costAmount ?? (it.purchaseCostPerBaseUnit * (it.totalBaseQuantity || it.quantityInUnit)) ?? 0);
                    const itTotal = Number(it.netAmount ?? it.totalAmount ?? 0);
                    const itProfit = Number(it.profitAmount ?? (itTotal - itCost) ?? 0);

                    return (
                      <div key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{it.productName}</div>
                          <div className="text-[10px] text-slate-400">
                            Batch: {it.batchNumber} • Qty: {it.quantityInUnit} {it.unitName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">₹{Number(itTotal || 0).toFixed(2)}</div>
                          <div className="text-[10px] text-emerald-700 font-semibold">
                            Profit: ₹{Number(itProfit || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    ₹{Number(inspectingSale.subtotal ?? inspectingSale.grandTotal ?? 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Tax (GST)</span>
                  <span className="font-semibold text-slate-800">
                    ₹{Number(inspectingSale.taxAmount ?? 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Batch Cost</span>
                  <span className="font-semibold text-slate-800">
                    ₹{Number(inspectingSale.totalCost ?? 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Net Profit</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    ₹{Number(inspectingSale.totalProfit ?? (Number(inspectingSale.grandTotal ?? 0) - Number(inspectingSale.totalCost ?? 0))).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = inspectingSale;
                    setInspectingSale(null);
                    setSaleToDelete(toDelete);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="Delete this invoice and restore stock"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Invoice</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const saleToEdit = inspectingSale;
                      setInspectingSale(null);
                      setEditingSale(saleToEdit);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-700" />
                    <span>Edit Invoice & Rates</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectingSale(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingSale && (
        <EditInvoiceModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={(updated) => {
            setEditingSale(null);
          }}
        />
      )}

      {/* Delete Invoice Confirmation Modal with Stock Restitution Preview */}
      <ConfirmDeleteInvoiceModal
        isOpen={!!saleToDelete}
        sale={saleToDelete}
        onClose={() => setSaleToDelete(null)}
        onConfirm={async (saleId) => {
          await deleteSale(saleId);
        }}
      />
    </div>
  );
};
