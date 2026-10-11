import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Percent,
  ShoppingCart,
  Search,
  Receipt,
  Eye,
  Calendar,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  LayoutGrid,
  Clock,
  User,
  Pill,
  Zap,
  ChevronRight,
  FileText,
  Stethoscope,
  Phone,
  Printer,
  Sparkles,
  Package,
  Pencil,
  Trash2,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Sale } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { ConfirmDeleteInvoiceModal } from './ConfirmDeleteInvoiceModal';

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
  const { sales, deleteSale } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UPI' | 'Cash' | 'Card'>('ALL');
  const [orderScope, setOrderScope] = useState<'all' | 'today'>('all');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<Sale | null>(null);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  const { localTodayStr, utcTodayStr } = useMemo(() => {
    const now = new Date();
    return {
      localTodayStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      utcTodayStr: now.toISOString().slice(0, 10),
    };
  }, []);

  // Filter strictly for Today's Sales Orders (matching local calendar or UTC today)
  const todaySales = useMemo(() => {
    return sales
      .filter((s) => {
        const d = (s.dateTime || s.createdAt || '').slice(0, 10);
        return d === localTodayStr || d === utcTodayStr;
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [sales, localTodayStr, utcTodayStr]);

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

  // Clean, simple payment symbol replacing full text
  const renderPaymentSymbol = (method: string) => {
    if (method === 'UPI') {
      return (
        <span
          title="Payment: UPI"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 border border-blue-200 shrink-0"
        >
          <Zap className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
        </span>
      );
    }
    if (method === 'Card') {
      return (
        <span
          title="Payment: Card"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-50 text-purple-600 border border-purple-200 shrink-0"
        >
          <CreditCard className="w-3.5 h-3.5" />
        </span>
      );
    }
    // Default Cash: Indian Rupee symbol
    return (
      <span
        title="Payment: Cash"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs shrink-0"
      >
        ₹
      </span>
    );
  };

  // Scoped orders based on filter (All Orders vs Today's Orders)
  const scopedOrders = useMemo(() => {
    return orderScope === 'today' ? todaySales : sales;
  }, [orderScope, todaySales, sales]);

  // Filtered Orders for the view
  const displayedOrders = useMemo(() => {
    return scopedOrders.filter((order) => {
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
  }, [scopedOrders, searchQuery, paymentFilter]);

  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Header with Today's Date & POS Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <button
            id="dashboard-new-sale-btn"
            onClick={onOpenQuickSale}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs active:scale-95"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>New Sale (POS)</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formattedToday}</span>
        </div>
      </div>

      {/* TODAY'S METRICS: Sales Revenue & Sales Profit (Optimized Compact Mobile Tiles) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* 1. Today's Sales Revenue */}
        <div className="bg-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Sales Revenue</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
            ₹{(todaySalesRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-700 font-medium truncate">
            Gross Collections
          </div>
        </div>

        {/* 2. Today's Sales Profit */}
        <div className="bg-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 font-medium">
            <span className="truncate">Sales Profit</span>
            <Percent className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
          </div>
          <div className="mt-0.5 sm:mt-1 text-sm sm:text-base font-bold text-emerald-700 tracking-tight truncate">
            ₹{(todaySalesProfit ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            Margin: <strong className="text-emerald-700 font-semibold">{Number(todayProfitMargin || 0).toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* TODAY'S SALES ORDERS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Section Header & Filters */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Today's Invoices & Sales</h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {displayedOrders.length} {displayedOrders.length === 1 ? 'order' : 'orders'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Live invoice stream • Clean mobile card layout
            </div>
          </div>

          {/* Search, Payment Filters & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, customer..."
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

            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2">
              {/* Order Scope Filter (All vs Today) */}
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderScope('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    orderScope === 'all'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show all recorded invoices (newest first)"
                >
                  All Invoices ({sales.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderScope('today')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    orderScope === 'today'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show today's sales only"
                >
                  Today's Bills ({todaySales.length})
                </button>
              </div>

              {/* Payment Filter Buttons */}
              <div className="flex flex-wrap items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs">
                {(['ALL', 'UPI', 'Cash', 'Card'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentFilter(mode)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition text-center cursor-pointer ${
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
        </div>

        {/* Orders Content or Empty State */}
        {displayedOrders.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-800">
              {scopedOrders.length === 0
                ? (orderScope === 'today' ? "No sales orders recorded today yet" : "No sales orders recorded yet")
                : "No orders match your filter"}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {scopedOrders.length === 0
                ? "Generate your customer bill or invoice through the POS checkout terminal."
                : "Try clearing your search query or switching payment mode filter."}
            </p>
            {scopedOrders.length === 0 && (
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
          /* TILES VIEW - RESPONSIVE TILES GRID (NO SLIDERS) */
          <div className="p-3 sm:p-4 bg-slate-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {displayedOrders.map((order) => {
                const dateObj = order.dateTime ? new Date(order.dateTime) : new Date();
                const timeStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';
                const dateStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString([], { day: 'numeric', month: 'short' })
                  : '';

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedSaleForDetails(order)}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 active:scale-[0.99] touch-manipulation group"
                  >
                    {/* Top Row: Invoice Number + Simple Payment Symbol */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-sm text-slate-900 tracking-tight group-hover:text-emerald-700 transition truncate">
                          {order.invoiceNumber}
                        </span>
                      </div>
                      {/* Simple payment symbol (no text) */}
                      {renderPaymentSymbol(order.paymentMethod)}
                    </div>

                    {/* Date & Time and Customer */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{dateStr} • {timeStr}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{order.customerName || 'Walk-in Customer'}</span>
                        {order.customerPhone && (
                          <span className="text-[10px] text-slate-400 font-normal truncate">({order.customerPhone})</span>
                        )}
                      </div>
                    </div>

                    {/* Products on Tile: Max 2 Products */}
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1 text-xs">
                      {order.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-1.5 text-slate-700">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Pill className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate text-xs font-medium text-slate-800">{it.productName}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                            {it.quantityInUnit || 1} {it.unitName}
                          </span>
                        </div>
                      ))}

                      {order.items.length > 2 && (
                        <div className="text-[10px] font-semibold text-emerald-700 pt-0.5 flex items-center justify-between">
                          <span>+{order.items.length - 2} more medicine{order.items.length - 2 > 1 ? 's' : ''}</span>
                          <span className="text-slate-400 font-normal">tap to view</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Total Sales Amount & Tap indicator */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Sales</div>
                        <div className="text-base font-semibold tabular-nums text-slate-900 leading-tight">
                          ₹{Number(order.grandTotal ?? order.totalAmount ?? 0).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSaleToDelete(order);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete this invoice and restore stock"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSaleForEdit(order);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-800 hover:bg-amber-50 transition"
                          title="Edit this invoice"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 group-hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition">
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Summary */}
        {displayedOrders.length > 0 && (
          <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              Showing <strong className="text-slate-800">{displayedOrders.length}</strong> of{' '}
              <strong className="text-slate-800">{scopedOrders.length}</strong> {orderScope === 'today' ? 'orders today' : 'total orders'}
            </div>
            <div className="flex items-center gap-4 text-slate-700">
              <span>
                Today's Total: <strong className="text-slate-900">₹{Number(todaySalesRevenue || 0).toFixed(2)}</strong>
              </span>
              <span>
                Today's Profit: <strong className="text-emerald-700">+₹{Number(todaySalesProfit || 0).toFixed(2)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Invoice Details Modal when a tile is clicked */}
      {selectedSaleForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {selectedSaleForDetails.invoiceNumber}
                    </h3>
                    <div className="flex items-center gap-1">
                      {renderPaymentSymbol(selectedSaleForDetails.paymentMethod)}
                      <span className="text-xs font-semibold text-slate-600">
                        {selectedSaleForDetails.paymentMethod}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {selectedSaleForDetails.dateTime
                      ? new Date(selectedSaleForDetails.dateTime).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedSaleForDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Customer & Doctor Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Customer Details</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {selectedSaleForDetails.customerName || 'Walk-in Customer'}
                  </div>
                  {selectedSaleForDetails.customerPhone && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{selectedSaleForDetails.customerPhone}</span>
                    </div>
                  )}
                  {selectedSaleForDetails.customerAddress && (
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {selectedSaleForDetails.customerAddress}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 text-slate-400" />
                    <span>Prescription & Doctor</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {selectedSaleForDetails.doctorName || 'Over The Counter (OTC)'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Items dispensed: {selectedSaleForDetails.items.length} {selectedSaleForDetails.items.length === 1 ? 'item' : 'items'}
                  </div>
                  {selectedSaleForDetails.notes && (
                    <div className="text-[11px] text-slate-600 italic line-clamp-1">
                      Note: {selectedSaleForDetails.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Dispensed Medicines List */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dispensed Medicines ({selectedSaleForDetails.items.length})</span>
                  </span>
                  <span className="text-slate-400 font-normal">All batch details</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {selectedSaleForDetails.items.map((item, idx) => {
                    const itemTotal = Number(item.netAmount ?? item.totalAmount ?? ((item.quantityInUnit || 1) * Number(item.sellingPricePerUnit ?? (item as any).unitSellingPrice ?? 0)));
                    return (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/60 transition">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {item.productName}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {item.batchNumber && (
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono text-[10px]">
                                Batch: {item.batchNumber}
                              </span>
                            )}
                            {item.expiryDate && (
                              <span className="text-slate-400 text-[10px]">
                                Exp: {item.expiryDate.slice(0, 7)}
                              </span>
                            )}
                            <span>
                              Qty: <strong>{item.quantityInUnit || 1} {item.unitName}</strong> @ ₹{Number(item.sellingPricePerUnit ?? (item as any).unitSellingPrice ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-xs text-slate-900">
                            ₹{Number(itemTotal || 0).toFixed(2)}
                          </div>
                          {item.discountAmount ? (
                            <div className="text-[10px] text-amber-600">
                              -₹{Number(item.discountAmount || 0).toFixed(2)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Subtotal Amount:</span>
                  <span>₹{Number(selectedSaleForDetails.subtotal ?? selectedSaleForDetails.totalAmount ?? 0).toFixed(2)}</span>
                </div>

                {selectedSaleForDetails.discountAmount > 0 && (
                  <div className="flex justify-between text-amber-600 text-xs font-medium">
                    <span>Discount Applied:</span>
                    <span>-₹{Number(selectedSaleForDetails.discountAmount || 0).toFixed(2)}</span>
                  </div>
                )}

                {selectedSaleForDetails.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Tax (GST):</span>
                    <span>+₹{Number(selectedSaleForDetails.taxAmount || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-slate-900">Grand Total:</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">
                    ₹{Number(selectedSaleForDetails.grandTotal ?? selectedSaleForDetails.totalAmount ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-dashed border-slate-200 flex justify-between items-center text-[11px] text-emerald-700 font-semibold">
                  <span>Estimated Net Profit:</span>
                  <span>
                    +₹{Number(selectedSaleForDetails.totalProfit ?? selectedSaleForDetails.netProfit ?? 0).toFixed(2)}{' '}
                    {selectedSaleForDetails.profitMarginPercent ? `(${Number(selectedSaleForDetails.profitMarginPercent || 0).toFixed(1)}% margin)` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSaleForDetails(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold transition"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const toDelete = selectedSaleForDetails;
                    setSelectedSaleForDetails(null);
                    setSaleToDelete(toDelete);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="Delete this invoice and restore stock"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Invoice</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const saleToEdit = selectedSaleForDetails;
                    setSelectedSaleForDetails(null);
                    setSelectedSaleForEdit(saleToEdit);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition shadow-2xs"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-700" />
                  <span>Edit Invoice</span>
                </button>

                <button
                  onClick={() => {
                    const saleToPrint = selectedSaleForDetails;
                    setSelectedSaleForDetails(null);
                    setSelectedSaleForReceipt(saleToPrint);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>View & Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
          onEdit={(s) => {
            setSelectedSaleForReceipt(null);
            setSelectedSaleForEdit(s);
          }}
        />
      )}

      {/* Edit Invoice Modal */}
      {selectedSaleForEdit && (
        <EditInvoiceModal
          sale={selectedSaleForEdit}
          onClose={() => setSelectedSaleForEdit(null)}
          onSaved={(updated) => {
            setSelectedSaleForEdit(null);
            setSelectedSaleForReceipt(updated);
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
