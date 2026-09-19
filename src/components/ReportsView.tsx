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

export const ReportsView: React.FC = () => {
  const { sales, batches, ledger, products } = usePharmacy();
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

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
          sGrandTotal.toFixed(2),
          sTotalCost.toFixed(2),
          sTotalProfit.toFixed(2),
          sMargin.toFixed(1),
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
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
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
          <div className="mt-0.5 text-xs sm:text-base font-bold text-slate-900 truncate">{totalRevenue.toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Across {sales.length} orders</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-700 truncate">Realized Batch Gross Profit</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-emerald-600 truncate">{totalProfit.toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-emerald-700 font-semibold mt-0.5 truncate">
            {overallMargin.toFixed(1)}% profit margin
          </div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-purple-700 truncate">Current Stock Valuation</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-purple-700 truncate">{totalInventoryValuation.toFixed(2)}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Batch acquisition cost</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-rose-700 truncate">Quarantine & Expiry Loss</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-rose-600 truncate">{expiryLoss.toFixed(2)}</div>
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
                  formatter={(val: number) => [`${val.toFixed(2)}`, '']}
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
                  formatter={(val: number) => [`${val.toFixed(2)}`, '']}
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
                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{item.value.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Transactions & Profit Margin Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900 flex items-center justify-between">
          <span>Invoices & Realized Batch Margins Audit</span>
          <span className="text-emerald-700 font-medium">{sales.length} Invoices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Invoice / Date</th>
                <th className="p-3.5">Customer / Doctor</th>
                <th className="p-3.5">Items Sold</th>
                <th className="p-3.5 text-right">Selling Total</th>
                <th className="p-3.5 text-right">Batch Acquisition Cost</th>
                <th className="p-3.5 text-right">Realized Profit</th>
                <th className="p-3.5 text-right">Margin %</th>
                <th className="p-3.5 text-center">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3.5">
                    <div className="font-bold font-mono text-slate-900">{sale.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(sale.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </td>

                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{sale.customerName}</div>
                    <div className="text-[10px] text-slate-400">
                      {sale.doctorName ? `Rx: ${sale.doctorName}` : 'OTC'}
                    </div>
                  </td>

                  <td className="p-3.5">
                    <div className="space-y-0.5">
                      {sale.items.map((it, i) => (
                        <div key={i} className="text-[11px] text-slate-600">
                          {it.productName} ({it.quantityInUnit} {it.unitName} • Batch {it.batchNumber})
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="p-3.5 text-right font-extrabold text-slate-900">
                    {Number(sale.grandTotal ?? sale.totalAmount ?? 0).toFixed(2)}
                  </td>

                  <td className="p-3.5 text-right font-semibold text-slate-600">
                    {Number(sale.totalCost ?? 0).toFixed(2)}
                  </td>

                  <td className="p-3.5 text-right font-bold text-emerald-700">
                    {Number(sale.totalProfit ?? sale.netProfit ?? 0).toFixed(2)}
                  </td>

                  <td className="p-3.5 text-right font-extrabold text-emerald-800">
                    {Number(sale.profitMarginPercent ?? (Number(sale.totalCost) > 0 ? (Number(sale.totalProfit ?? sale.netProfit ?? 0) / Number(sale.totalCost)) * 100 : 0)).toFixed(1)}%
                  </td>

                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {sale.paymentMethod}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
