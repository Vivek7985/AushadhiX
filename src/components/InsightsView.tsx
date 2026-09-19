import React from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ClockAlert,
  PlusCircle,
  Truck,
  Users,
  Building2,
  ShoppingCart,
  Boxes,
  Percent,
  Layers,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';

interface InsightsViewProps {
  setActiveTab: (tab: string) => void;
  onOpenQuickSale: () => void;
  onOpenAddProduct: () => void;
  onOpenNewPO: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  setActiveTab,
  onOpenQuickSale,
  onOpenAddProduct,
  onOpenNewPO,
}) => {
  const {
    products,
    batches,
    sales,
    purchaseOrders,
    getProductTotalStock,
    selectedDateFilter,
    setSelectedDateFilter,
    settings,
  } = usePharmacy();

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter sales based on selected date filter
  const filteredSales = sales.filter((s) => {
    const saleDate = s.dateTime.slice(0, 10);
    if (selectedDateFilter === 'today') return saleDate === todayStr;
    if (selectedDateFilter === '7days') {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      return new Date(s.dateTime) >= pastDate;
    }
    if (selectedDateFilter === '30days') {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      return new Date(s.dateTime) >= pastDate;
    }
    return true;
  });

  // Calculate Metrics
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + Number(s.grandTotal ?? s.totalAmount ?? 0), 0);
  const totalSalesCost = filteredSales.reduce((acc, s) => acc + Number(s.totalCost ?? 0), 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + Number(s.totalProfit ?? s.netProfit ?? 0), 0);
  const profitMargin = totalSalesCost > 0 ? (totalProfit / totalSalesCost) * 100 : 0;
  const orderCount = filteredSales.length;

  // Purchases
  const periodPurchases = purchaseOrders
    .filter((po) => {
      if (selectedDateFilter === 'today') return po.orderDate === todayStr || po.receivedDate === todayStr;
      return true;
    })
    .reduce((sum, po) => sum + Number(po.grandTotal ?? po.totalAmount ?? 0), 0);

  // Actual Inventory Valuation = Sum of (Batch Available Qty × Batch Purchase Price Per Base Unit)
  const inventoryValuation = batches
    .filter((b) => b.availableBaseQuantity > 0 && b.expiryDate >= todayStr)
    .reduce((sum, b) => sum + b.availableBaseQuantity * b.purchasePricePerBaseUnit, 0);

  // Stock status counts
  const lowStockProducts = products.filter((p) => {
    const stock = getProductTotalStock(p.id);
    return stock > 0 && stock <= p.minStockBaseUnits;
  });

  const outOfStockProducts = products.filter((p) => getProductTotalStock(p.id) === 0);

  // Category sales breakdown
  const categoryMap: Record<string, number> = {};
  filteredSales.forEach((sale) => {
    sale.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const cat = prod?.category || 'Medicines';
      categoryMap[cat] = (categoryMap[cat] || 0) + item.netAmount;
    });
  });

  const categories = Object.keys(categoryMap).map((key) => ({
    name: key,
    amount: categoryMap[key],
    percent: totalSalesRevenue > 0 ? (categoryMap[key] / totalSalesRevenue) * 100 : 0,
  }));

  // Top selling products
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.productName,
          qty: 0,
          revenue: 0,
          profit: 0,
        };
      }
      productSalesMap[item.productId].qty += item.totalBaseQuantity;
      productSalesMap[item.productId].revenue += item.netAmount;
      productSalesMap[item.productId].profit += item.profitAmount;
    });
  });

  const sortedProductsBySales = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);
  const topSellers = sortedProductsBySales.slice(0, 4);

  // Lowest selling active products
  const productsWithNoOrLowSales = products
    .map((p) => {
      const s = productSalesMap[p.id];
      return {
        name: p.name,
        qty: s ? s.qty : 0,
        revenue: s ? s.revenue : 0,
        stock: getProductTotalStock(p.id),
      };
    })
    .sort((a, b) => a.qty - b.qty)
    .slice(0, 3);

  // Payment Methods
  const paymentBreakdown: Record<string, number> = { UPI: 0, Cash: 0, Card: 0 };
  filteredSales.forEach((s) => {
    if (s.paymentMethod in paymentBreakdown) {
      paymentBreakdown[s.paymentMethod] += s.grandTotal;
    } else {
      paymentBreakdown['Other'] = (paymentBreakdown['Other'] || 0) + s.grandTotal;
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Business Insights & Analytics</h2>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
          <button
            onClick={() => setSelectedDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedDateFilter === 'today' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDateFilter('7days')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedDateFilter === '7days' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-50'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setSelectedDateFilter('30days')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedDateFilter === '30days' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-50'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        <div className="bg-white p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Sales Revenue</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
            {totalSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">{orderCount} bills</div>
        </div>

        <div className="bg-white p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Gross Profit</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-emerald-700 tracking-tight truncate">
            {totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {(profitMargin || 0).toFixed(1)}% margin
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Period Purchases</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
            {periodPurchases.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Inventory Valuation</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
            {inventoryValuation.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('low-stock')}
          className="bg-white p-2.5 rounded-lg sm:rounded-xl border border-slate-200 cursor-pointer hover:border-amber-400 transition"
        >
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Low Stock Items</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-amber-600">{lowStockProducts.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-2.5 rounded-lg sm:rounded-xl border border-slate-200 cursor-pointer hover:border-rose-400 transition"
        >
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Out of Stock</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-rose-600">{outOfStockProducts.length}</div>
        </div>
      </div>

      {/* Quick Actions Shortcuts */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="text-xs font-bold text-slate-800 mb-3">Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New POS Sale</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Add Medicine</span>
          </button>

          <button
            onClick={onOpenNewPO}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition"
          >
            <Truck className="w-4 h-4 text-blue-600" />
            <span>Purchase Order</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition"
          >
            <Package className="w-4 h-4 text-purple-600" />
            <span>Receive Goods</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition"
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>Suppliers</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Customers</span>
          </button>
        </div>
      </div>

      {/* Charts & Categorical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales vs Cost vs Profit */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Sales, Cost & Profit Comparison</h3>
              <p className="text-[11px] text-slate-500">Unit-converted batch profitability across transactions</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Sales ({(totalSalesRevenue || 0).toFixed(0)})
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Cost ({(totalSalesCost || 0).toFixed(0)})
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Profit ({(totalProfit || 0).toFixed(0)})
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3.5">
            {filteredSales.slice(0, 5).map((sale) => {
              const saleGrandTotal = Number(sale.grandTotal ?? sale.totalAmount ?? 0);
              const saleCost = Number(sale.totalCost ?? 0);
              const saleProfit = Number(sale.totalProfit ?? sale.netProfit ?? (saleGrandTotal - saleCost));
              const saleMargin = Number(sale.profitMarginPercent ?? (saleCost > 0 ? (saleProfit / saleCost) * 100 : 0));
              const maxVal = Math.max(saleGrandTotal, 1);
              const costPct = (saleCost / maxVal) * 100;
              const profitPct = (saleProfit / maxVal) * 100;

              return (
                <div key={sale.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">
                      {sale.invoiceNumber} <span className="text-slate-400 font-normal">({sale.customerName})</span>
                    </span>
                    <span className="text-slate-600">
                      Sale: <strong className="text-slate-900">{saleGrandTotal.toFixed(2)}</strong> • Profit: <strong className="text-emerald-700">{saleProfit.toFixed(2)}</strong> ({saleMargin.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${costPct}%` }}
                      className="bg-slate-400/80 transition-all duration-500"
                      title={`Batch Cost: ${saleCost.toFixed(2)}`}
                    ></div>
                    <div
                      style={{ width: `${profitPct}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                      title={`Net Profit: ${saleProfit.toFixed(2)}`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Grey = Actual Batch Cost • Green = Gross Profit</span>
            <span>Real-time FEFO Batch Ledger</span>
          </div>
        </div>

        {/* Category Breakdown & Payment Methods */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Sales by Category</h3>
              <p className="text-[11px] text-slate-500">Revenue split across store departments</p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="mt-3.5 space-y-3">
            {categories.map((cat, i) => {
              const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500'];
              const color = colors[i % colors.length];

              return (
                <div key={cat.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                    <span className="font-bold text-slate-900">
                      {(cat.amount || 0).toFixed(0)} ({(cat.percent || 0).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${cat.percent}%` }}
                      className={`h-full ${color} rounded-full`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Method Distribution */}
          <div className="mt-5 pt-3.5 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Payment Methods</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">UPI</div>
                <div className="font-bold text-slate-900">{paymentBreakdown.UPI || 0}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">Cash</div>
                <div className="font-bold text-slate-900">{paymentBreakdown.Cash || 0}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">Card</div>
                <div className="font-bold text-slate-900">{paymentBreakdown.Card || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling & Slow Moving Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Highest Selling */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Highest Selling Products</h3>
              <p className="text-[11px] text-slate-500">Ranked by revenue and units dispensed</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Top Performers
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 text-xs">
            {topSellers.map((item, index) => (
              <div key={index} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{item.name}</div>
                    <div className="text-[11px] text-slate-400">{item.qty} base units sold</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{item.revenue}</div>
                  <div className="text-[11px] text-emerald-700 font-semibold">+{item.profit} profit</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lowest Selling */}
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Slow Moving / Low Selling</h3>
              <p className="text-[11px] text-slate-500">Review for stock reduction or reordering</p>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Slow Inventory
            </span>
          </div>

          <div className="mt-3 divide-y divide-slate-100 text-xs">
            {productsWithNoOrLowSales.map((item, index) => (
              <div key={index} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{item.name}</div>
                  <div className="text-[11px] text-slate-400">Current Stock: {item.stock} in warehouse</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-700">{item.qty} units sold</div>
                  <div className="text-[11px] text-amber-700 font-medium">Re-evaluate Stock</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
