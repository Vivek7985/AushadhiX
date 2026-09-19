import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Percent,
  ShoppingBag,
  ShoppingCart,
  Search,
  Receipt,
  Eye,
  Calendar,
  X,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Sale } from '../types';
import { ReceiptModal } from './ReceiptModal';

interface DashboardViewProps {
  setActiveTab: (tab: string) => void;
  onOpenQuickSale: () => void;
  onOpenAddProduct?: () => void;
  onOpenNewPO?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onOpenQuickSale,
}) => {
  const { sales } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UPI' | 'Cash' | 'Card'>('ALL');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter strictly for Today's Sales Orders
  const todaySales = useMemo(() => {
    return sales
      .filter((s) => s.dateTime.slice(0, 10) === todayStr)
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [sales, todayStr]);

  // Key KPI Calculations for Today ONLY
  const todaySalesRevenue = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + Number(s.grandTotal ?? s.totalAmount ?? 0), 0);
  }, [todaySales]);

  const todaySalesCost = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + Number(s.totalCost ?? 0), 0);
  }, [todaySales]);

  const todaySalesProfit = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + Number(s.totalProfit ?? s.netProfit ?? 0), 0);
  }, [todaySales]);

  const todayProfitMargin = todaySalesCost > 0 ? (todaySalesProfit / todaySalesCost) * 100 : 0;
  const todayOrdersCount = todaySales.length;

  const totalItemsSoldToday = useMemo(() => {
    return todaySales.reduce((total, s) => {
      return total + s.items.reduce((itemSum, item) => itemSum + (item.quantityInUnit || 1), 0);
    }, 0);
  }, [todaySales]);

  // Filtered Today's Orders for the table
  const displayedOrders = useMemo(() => {
    return todaySales.filter((order) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        order.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerPhone && order.customerPhone.includes(searchQuery)) ||
        order.items.some((it) => it.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPayment =
        paymentFilter === 'ALL' || order.paymentMethod.toUpperCase() === paymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [todaySales, searchQuery, paymentFilter]);

  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header with Today's Date & POS Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedToday}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="dashboard-new-sale-btn"
            onClick={onOpenQuickSale}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale (POS)</span>
          </button>
        </div>
      </div>

      {/* ONLY TODAY'S 3 METRICS: Sales, Sales Revenue, Sales Profit (Optimized Compact Mobile Tiles) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {/* 1. Today's Sales (Orders Count) */}
        <div className="bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Today's Sales</span>
            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 text-xs sm:text-base font-bold text-slate-900 tracking-tight truncate">
            {todayOrdersCount} <span className="text-[10px] sm:text-xs font-normal text-slate-500">Orders</span>
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-500 truncate">
            {totalItemsSoldToday} items
          </div>
        </div>

        {/* 2. Today's Sales Revenue */}
        <div className="bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Sales Revenue</span>
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 flex-shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 text-xs sm:text-base font-bold text-slate-900 tracking-tight truncate">
            {todaySalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] sm:text-[11px] text-emerald-700 font-medium truncate">
            Gross Collections
          </div>
        </div>

        {/* 3. Today's Sales Profit */}
        <div className="bg-white p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Sales Profit</span>
            <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-600 flex-shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 text-xs sm:text-base font-bold text-emerald-700 tracking-tight truncate">
            {todaySalesProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] sm:text-[11px] text-slate-500 truncate">
            Margin: <strong className="text-emerald-700 font-semibold">{todayProfitMargin.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* TODAY'S SALES ORDERS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Section Header & Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Today's Sales Orders</h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {displayedOrders.length} {displayedOrders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Live list of all sales invoices generated today
            </div>
          </div>

          {/* Search and Payment Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, customer, medicine..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Payment Filter Buttons */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
              {(['ALL', 'UPI', 'Cash', 'Card'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPaymentFilter(mode)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    paymentFilter === mode
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table or Empty State */}
        {displayedOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-800">
              {todaySales.length === 0
                ? "No sales orders recorded today yet"
                : "No orders match your filter"}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {todaySales.length === 0
                ? "Generate your first customer bill or invoice through the POS checkout terminal."
                : "Try clearing your search query or switching payment mode filter."}
            </p>
            {todaySales.length === 0 && (
              <button
                onClick={onOpenQuickSale}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Create Sale (POS)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice # & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Medicines / Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Revenue (Total)</th>
                  <th className="py-3 px-4 text-right">Profit</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedOrders.map((order) => {
                  const timeStr = new Date(order.dateTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition group"
                    >
                      {/* Invoice # & Time */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {order.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {timeStr} • {order.cashierName || 'Cashier'}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {order.customerName || 'Walk-in Customer'}
                        </div>
                        {order.customerPhone && (
                          <div className="text-[11px] text-slate-400">{order.customerPhone}</div>
                        )}
                      </td>

                      {/* Medicines / Items Dispensed */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-slate-800 font-medium truncate">
                          {order.items.map((it) => `${it.productName} (${it.quantityInUnit || 1} ${it.unitName})`).join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </div>
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          order.paymentMethod === 'UPI'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : order.paymentMethod === 'Cash'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {order.paymentMethod === 'UPI' && <Smartphone className="w-3 h-3" />}
                          {order.paymentMethod === 'Cash' && <Banknote className="w-3 h-3" />}
                          {order.paymentMethod === 'Card' && <CreditCard className="w-3 h-3" />}
                          <span>{order.paymentMethod}</span>
                        </span>
                      </td>

                      {/* Revenue / Grand Total */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-slate-900 text-sm">
                          {Number(order.grandTotal ?? order.totalAmount ?? 0).toFixed(2)}
                        </div>
                        {order.discountAmount > 0 && (
                          <div className="text-[10px] text-amber-600">
                            Disc: {order.discountAmount.toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Profit */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-emerald-700">
                          +{Number(order.totalProfit ?? order.netProfit ?? 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {(order.profitMarginPercent || 0).toFixed(1)}% margin
                        </div>
                      </td>

                      {/* Receipt Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedSaleForReceipt(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 text-slate-600 bg-white hover:bg-emerald-50/50 text-xs font-medium transition"
                          title="View / Print Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        {displayedOrders.length > 0 && (
          <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              Showing <strong className="text-slate-800">{displayedOrders.length}</strong> of{' '}
              <strong className="text-slate-800">{todaySales.length}</strong> orders today
            </div>
            <div className="flex items-center gap-4 text-slate-700">
              <span>
                Today's Total: <strong className="text-slate-900">{todaySalesRevenue.toFixed(2)}</strong>
              </span>
              <span>
                Today's Profit: <strong className="text-emerald-700">+{todaySalesProfit.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}
    </div>
  );
};
