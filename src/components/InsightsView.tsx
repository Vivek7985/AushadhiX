import React, { useState, useMemo } from 'react';
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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Eye,
  CheckCircle2,
  Clock,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Sale } from '../types';
import { ReceiptModal } from './ReceiptModal';

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

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Calendar State
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth()); // 0-11
  const [selectedDayDate, setSelectedDayDate] = useState<string>(todayStr); // YYYY-MM-DD
  const [viewingReceiptSale, setViewingReceiptSale] = useState<Sale | null>(null);

  // Map of date string -> { totalRevenue, totalProfit, totalCost, count, sales: Sale[] }
  const salesByDateMap = useMemo(() => {
    const map: Record<
      string,
      { totalRevenue: number; totalProfit: number; totalCost: number; count: number; sales: Sale[] }
    > = {};

    sales.forEach((s) => {
      const dStr = s.dateTime.slice(0, 10);
      if (!map[dStr]) {
        map[dStr] = { totalRevenue: 0, totalProfit: 0, totalCost: 0, count: 0, sales: [] };
      }
      const rev = Number(s.grandTotal ?? s.totalAmount ?? 0);
      const prof = Number(s.totalProfit ?? s.netProfit ?? 0);
      const cost = Number(s.totalCost ?? 0);
      map[dStr].totalRevenue += rev;
      map[dStr].totalProfit += prof;
      map[dStr].totalCost += cost;
      map[dStr].count += 1;
      map[dStr].sales.push(s);
    });

    return map;
  }, [sales]);

  // Filter sales based on selected date filter (including calendar single day)
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const saleDate = s.dateTime.slice(0, 10);
      if (selectedDateFilter === 'calendar') {
        return saleDate === selectedDayDate;
      }
      if (selectedDateFilter === 'today') {
        return saleDate === todayStr;
      }
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
  }, [sales, selectedDateFilter, selectedDayDate, todayStr]);

  // Calculate Metrics
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + Number(s.grandTotal ?? s.totalAmount ?? 0), 0);
  const totalSalesCost = filteredSales.reduce((acc, s) => acc + Number(s.totalCost ?? 0), 0);
  const totalProfit = filteredSales.reduce((acc, s) => acc + Number(s.totalProfit ?? s.netProfit ?? 0), 0);
  const profitMargin = totalSalesCost > 0 ? (totalProfit / totalSalesCost) * 100 : 0;
  const orderCount = filteredSales.length;

  // Purchases
  const periodPurchases = purchaseOrders
    .filter((po) => {
      if (selectedDateFilter === 'calendar') {
        return po.orderDate === selectedDayDate || po.receivedDate === selectedDayDate;
      }
      if (selectedDateFilter === 'today') {
        return po.orderDate === todayStr || po.receivedDate === todayStr;
      }
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
  filteredSales.forEach((sale) => {
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

  // Calendar calculations
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const paddingDays = Array.from({ length: firstDayOfWeek });
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Month overall stats
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthSales = useMemo(() => {
    return sales.filter((s) => s.dateTime.startsWith(monthPrefix));
  }, [sales, monthPrefix]);

  const monthRevenue = monthSales.reduce((acc, s) => acc + Number(s.grandTotal ?? s.totalAmount ?? 0), 0);
  const monthOrders = monthSales.length;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const d = new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDayDate(todayStr);
    setSelectedDateFilter('calendar');
  };

  const handleSelectDay = (day: number) => {
    const formattedDayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDayDate(formattedDayStr);
    setSelectedDateFilter('calendar');
  };

  // Day data for currently selected day
  const selectedDayInfo = salesByDateMap[selectedDayDate] || {
    totalRevenue: 0,
    totalProfit: 0,
    totalCost: 0,
    count: 0,
    sales: [],
  };

  const selectedDaySalesList = selectedDayInfo.sales;

  // Format readable selected date
  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = selectedDayDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return selectedDayDate;
    }
  }, [selectedDayDate]);

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Business Insights &amp; Analytics</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time sales tracking, financial performance, and calendar audit
          </p>
        </div>

        {/* Filter Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 flex-wrap">
          <button
            onClick={() => setSelectedDateFilter('today')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              selectedDateFilter === 'today' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-50'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedDateFilter('7days')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              selectedDateFilter === '7days' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-50'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setSelectedDateFilter('30days')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              selectedDateFilter === '30days' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-50'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setSelectedDateFilter('calendar')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              selectedDateFilter === 'calendar' ? 'bg-emerald-600 text-white shadow-xs' : 'hover:bg-slate-50 text-slate-700'
            }`}
            title="View stats for selected calendar day"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Day: {selectedDayDate.slice(5)}</span>
          </button>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
            {selectedDateFilter === 'calendar' ? 'Day Sales' : 'Sales Revenue'}
          </div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
            ₹{(totalSalesRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">{orderCount} bills</div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Gross Profit</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-emerald-700 tracking-tight truncate">
            ₹{(totalProfit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {(profitMargin || 0).toFixed(1)}% margin
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Period Purchases</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
            ₹{(periodPurchases ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Inventory Valuation</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
            ₹{(inventoryValuation ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('low-stock')}
          className="bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:border-amber-400 transition shadow-2xs"
        >
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Low Stock Items</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-amber-600">{lowStockProducts.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:border-rose-400 transition shadow-2xs"
        >
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">Out of Stock</div>
          <div className="mt-0.5 text-xs sm:text-sm font-bold text-rose-600">{outOfStockProducts.length}</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SALES CALENDAR & DAILY TRANSACTIONS AUDIT SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Calendar Section Top Bar */}
        <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          {/* Month Controls & Today button */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2 min-w-[110px] text-center select-none">
              {monthName}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Calendar and Day Details 2-Column or Stacked Grid */}
        <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Left Column: Calendar Days Grid (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <div
                    key={d}
                    className={`text-[10px] sm:text-[11px] font-bold py-1 ${
                      i === 0 ? 'text-rose-500' : 'text-slate-500'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {/* Empty cells for leading offset */}
                {paddingDays.map((_, idx) => (
                  <div key={`pad-${idx}`} className="h-9 sm:h-11 rounded-lg bg-slate-50/40 border border-transparent opacity-30" />
                ))}

                {/* Actual Month Days */}
                {monthDays.map((day) => {
                  const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDayDate === dayStr;
                  const isToday = dayStr === todayStr;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-9 sm:h-11 p-1 rounded-lg sm:rounded-xl border text-center transition flex items-center justify-center cursor-pointer relative group ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-xs'
                          : isToday
                          ? 'border-emerald-400 bg-emerald-50/70 text-emerald-800 font-bold'
                          : 'border-slate-100 bg-slate-50/40 hover:bg-white hover:border-slate-300 text-slate-700 font-medium'
                      }`}
                      title={`${day} ${monthName}`}
                    >
                      <span className={`text-xs sm:text-sm leading-none ${isSelected ? 'text-white' : ''}`}>
                        {day}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Legend / Summary */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded border border-emerald-600 bg-emerald-600"></span>
                  <span>Selected Day</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded border border-emerald-400 bg-emerald-50"></span>
                  <span>Today</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Click any day to view sales &amp; transactions
              </span>
            </div>
          </div>

          {/* Right Column: Selected Day Sales Details Panel */}
          <div className="lg:col-span-5 bg-slate-50/70 rounded-xl border border-slate-200/90 p-3 sm:p-4 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Selected Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {selectedDayDate.slice(8, 10)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {formattedSelectedDate}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {selectedDayDate === todayStr ? 'Today\'s performance' : 'Historical daily record'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {selectedDayInfo.count} {selectedDayInfo.count === 1 ? 'Bill' : 'Bills'}
                  </span>
                </div>
              </div>

              {/* Day Key Metrics Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium">Daily Revenue</span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    ₹{(selectedDayInfo.totalRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-medium">Gross Profit</span>
                  <div className="text-xs font-bold text-emerald-700 mt-0.5">
                    ₹{(selectedDayInfo.totalProfit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Transactions List on Selected Day */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-800">
                    Bills on this day ({selectedDaySalesList.length})
                  </span>
                </div>

                {selectedDaySalesList.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-white text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">No Sales on {formattedSelectedDate}</p>
                      <p className="text-[11px] text-slate-400">Zero customer bills recorded on this date.</p>
                    </div>
                    {selectedDayDate === todayStr && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('pos')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Create Sale in POS</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {selectedDaySalesList.map((sale) => {
                      const saleTime = sale.dateTime.slice(11, 16) || 'N/A';
                      const itemsText = sale.items
                        .map((it) => `${it.productName} (${it.quantityInUnit} ${it.unitName || 'Units'})`)
                        .join(', ');

                      return (
                        <div
                          key={sale.id}
                          className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-emerald-300 transition space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {sale.invoiceNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                • {saleTime}
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-bold text-xs text-slate-900">
                                ₹{Number(sale.grandTotal ?? sale.totalAmount ?? 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Customer & Payment Mode */}
                          <div className="flex items-center justify-between text-[11px] text-slate-600">
                            <span className="truncate">
                              {sale.customerName ? `Patient: ${sale.customerName}` : 'Walk-in Customer'}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                sale.paymentMethod === 'UPI'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : sale.paymentMethod === 'Card'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {sale.paymentMethod || 'Cash'}
                            </span>
                          </div>

                          {/* Items Dispensed Summary */}
                          <div className="text-[10px] text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                            {itemsText || 'Prescription items'}
                          </div>

                          {/* Profit & View Receipt Action */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                            <span className="text-emerald-700 font-semibold">
                              +₹{Number(sale.totalProfit ?? sale.netProfit ?? 0).toFixed(2)} Profit
                            </span>
                            <button
                              type="button"
                              onClick={() => setViewingReceiptSale(sale)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Receipt</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom link to view all sales in POS or Ledger */}
            <div className="pt-2 mt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <span>Looking for detailed invoices?</span>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Sales Reports</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Shortcuts */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="text-xs font-bold text-slate-800 mb-2.5">Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition cursor-pointer shadow-xs active:scale-98"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New POS Sale</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition cursor-pointer active:scale-98"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Add Medicine</span>
          </button>

          <button
            onClick={onOpenNewPO}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition cursor-pointer active:scale-98"
          >
            <Truck className="w-4 h-4 text-blue-600" />
            <span>Purchase Order</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition cursor-pointer active:scale-98"
          >
            <Package className="w-4 h-4 text-purple-600" />
            <span>Receive Goods</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition cursor-pointer active:scale-98"
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>Suppliers</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold transition cursor-pointer active:scale-98"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Customers</span>
          </button>
        </div>
      </div>

      {/* Charts & Categorical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales vs Cost vs Profit */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Sales, Cost &amp; Profit Comparison</h3>
              <p className="text-[11px] text-slate-500">Unit-converted batch profitability across transactions</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Sales (₹{(totalSalesRevenue || 0).toFixed(0)})
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Cost (₹{(totalSalesCost || 0).toFixed(0)})
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Profit (₹{(totalProfit || 0).toFixed(0)})
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {filteredSales.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No transactions recorded for the selected filter.
              </div>
            ) : (
              filteredSales.slice(0, 5).map((sale) => {
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
                        {sale.invoiceNumber} <span className="text-slate-400 font-normal">({sale.customerName || 'Walk-in'})</span>
                      </span>
                      <span className="text-slate-600">
                        Sale: <strong className="text-slate-900">₹{saleGrandTotal.toFixed(2)}</strong> • Profit: <strong className="text-emerald-700">₹{saleProfit.toFixed(2)}</strong> ({saleMargin.toFixed(1)}%)
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${costPct}%` }}
                        className="bg-slate-400/80 transition-all duration-500"
                        title={`Batch Cost: ₹${saleCost.toFixed(2)}`}
                      ></div>
                      <div
                        style={{ width: `${profitPct}%` }}
                        className="bg-emerald-500 transition-all duration-500"
                        title={`Net Profit: ₹${saleProfit.toFixed(2)}`}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Grey = Actual Batch Cost • Green = Gross Profit</span>
            <span>Real-time FEFO Batch Ledger</span>
          </div>
        </div>

        {/* Category Breakdown & Payment Methods */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Sales by Category</h3>
              <p className="text-[11px] text-slate-500">Revenue split across store departments</p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="mt-3.5 space-y-3">
            {categories.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No category data for this selection.
              </div>
            ) : (
              categories.map((cat, i) => {
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500'];
                const color = colors[i % colors.length];

                return (
                  <div key={cat.name} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                      <span className="font-bold text-slate-900">
                        ₹{(cat.amount || 0).toFixed(0)} ({(cat.percent || 0).toFixed(0)}%)
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
              })
            )}
          </div>

          {/* Payment Method Distribution */}
          <div className="mt-5 pt-3.5 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Payment Methods</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">UPI</div>
                <div className="font-bold text-slate-900">₹{(paymentBreakdown.UPI || 0).toFixed(0)}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">Cash</div>
                <div className="font-bold text-slate-900">₹{(paymentBreakdown.Cash || 0).toFixed(0)}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500">Card</div>
                <div className="font-bold text-slate-900">₹{(paymentBreakdown.Card || 0).toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling & Slow Moving Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Highest Selling */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
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
            {topSellers.length === 0 ? (
              <div className="py-6 text-center text-slate-400">No sales recorded for this period.</div>
            ) : (
              topSellers.map((item, index) => (
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
                    <div className="font-bold text-slate-900">₹{item.revenue.toFixed(0)}</div>
                    <div className="text-[11px] text-emerald-700 font-semibold">+₹{item.profit.toFixed(0)} profit</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lowest Selling */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
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

      {/* Full Itemized Receipt Modal when user clicks "View Receipt" */}
      {viewingReceiptSale && (
        <ReceiptModal
          sale={viewingReceiptSale}
          onClose={() => setViewingReceiptSale(null)}
        />
      )}
    </div>
  );
};
