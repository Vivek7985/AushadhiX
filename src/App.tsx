import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShoppingCart,
  Pill,
  Boxes,
  TrendingUp,
  Truck,
  BarChart3,
  Settings,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { InsightsView } from './components/InsightsView';
import { POSView } from './components/POSView';
import { ProductsView } from './components/ProductsView';
import { InventoryView } from './components/InventoryView';
import { PurchasesView } from './components/PurchasesView';
import { ExpiryView } from './components/ExpiryView';
import { StockLedgerView } from './components/StockLedgerView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { BusinessSettingsView } from './components/BusinessSettingsView';
import { GSTView } from './components/GSTView';
import { SuppliersView } from './components/SuppliersView';
import { CustomersView } from './components/CustomersView';
import { CategoriesView } from './components/CategoriesView';
import { SupplierOrderListView } from './components/SupplierOrderListView';
import { getNavigationGroups, NavParentGroup, NavChildItem } from './data/navigation';

const VALID_TABS = new Set([
  'dashboard',
  'insights',
  'pos',
  'products',
  'categories',
  'inventory',
  'low-stock',
  'expiry',
  'purchases',
  'supplier-orders',
  'order-list',
  'suppliers',
  'customers',
  'stock-ledger',
  'ledger',
  'reports',
  'gst',
  'business-settings',
  'settings',
]);

const TAB_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  insights: 'Business Insights',
  pos: 'POS Billing',
  products: 'Products Directory',
  categories: 'Categories',
  inventory: 'Inventory & Stock',
  'low-stock': 'Low Stock Alerts',
  expiry: 'Expiry Control',
  purchases: 'Purchases & Goods Receipt',
  'supplier-orders': 'Supplier Orders',
  'order-list': 'Supplier Orders',
  suppliers: 'Suppliers & Vendors',
  customers: 'Customer Directory',
  'stock-ledger': 'Stock Ledger Audit',
  ledger: 'Stock Ledger Audit',
  reports: 'Sales & Profit Reports',
  gst: 'GST Tax Rates',
  'business-settings': 'Business Settings',
  settings: 'System Settings',
};

const getInitialTab = (): string => {
  try {
    if (typeof window !== 'undefined') {
      // 1. Check URL hash first
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_TABS.has(hash)) {
        return hash;
      }
      // 2. Check localStorage
      const savedTab = localStorage.getItem('aushadhix_active_tab');
      if (savedTab && VALID_TABS.has(savedTab)) {
        return savedTab;
      }
    }
  } catch (err) {
    console.error('Error restoring active tab:', err);
  }
  return 'dashboard';
};

const MainApp: React.FC = () => {
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('aushadhix_active_tab', tab);
      if (typeof window !== 'undefined') {
        window.history.replaceState({ tab }, '', `#${tab}`);
      }
    } catch {}
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aushadhix_sidebar_collapsed');
      if (saved !== null) {
        return saved === 'true';
      }
      return false;
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aushadhix_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleSetSidebarCollapsed = (val: boolean) => {
    setSidebarCollapsed(val);
    try {
      localStorage.setItem('aushadhix_sidebar_collapsed', String(val));
    } catch {}
  };

  const { products, batches, purchaseOrders, getProductTotalStock, settings, sales } = usePharmacy();

  // Calculate live today's sales metrics for the prominent POS card
  const now = new Date();
  const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const utcTodayStr = now.toISOString().slice(0, 10);
  const todaySales = (sales || []).filter((s) => {
    const d = s.dateTime || s.createdAt || '';
    return d.startsWith(localTodayStr) || d.startsWith(utcTodayStr);
  });
  const todaySalesCount = todaySales.length;
  const todayRevenue = todaySales.reduce(
    (sum, s) => sum + Number(s.grandTotal || s.totalAmount || 0),
    0
  );

  // Dynamic badge counts
  const lowStockCount = products.filter((p) => {
    const stock = getProductTotalStock(p.id);
    return stock > 0 && stock <= p.minStockBaseUnits;
  }).length;

  const warnThresholdDate = new Date();
  warnThresholdDate.setDate(warnThresholdDate.getDate() + (settings.expiryWarningDays || 60));
  const warnThresholdStr = warnThresholdDate.toISOString().slice(0, 10);

  const expiringCount = batches.filter(
    (b) => b.availableBaseQuantity > 0 && b.expiryDate <= warnThresholdStr
  ).length;

  const pendingPOCount = purchaseOrders.filter((po) => po.status === 'Ordered').length;

  // Retrieve industry-standard parent-child navigation groups
  const groups: NavParentGroup[] = getNavigationGroups({
    lowStockCount,
    expiringCount,
    pendingPOCount,
  });

  // Track expanded parent groups in the mobile drawer (all default open)
  const [mobileExpandedGroups, setMobileExpandedGroups] = useState<Record<string, boolean>>({
    'overview-analytics': true,
    'sales-billing': true,
    'inventory-medicines': true,
    'procurement-supply': true,
    'administration': true,
  });

  const toggleMobileGroup = (groupId: string) => {
    setMobileExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const getChildBadge = (itemId: string): { count?: number; color: string } => {
    if (itemId === 'low-stock' && lowStockCount > 0) {
      return { count: lowStockCount, color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (itemId === 'expiry' && expiringCount > 0) {
      return { count: expiringCount, color: 'bg-rose-100 text-rose-800 border-rose-300' };
    }
    if (itemId === 'purchases' && pendingPOCount > 0) {
      return { count: pendingPOCount, color: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    return { count: undefined, color: '' };
  };

  const getParentAlertCount = (group: NavParentGroup): number => {
    return group.children.reduce((sum, child) => {
      const { count } = getChildBadge(child.id);
      return sum + (count || 0);
    }, 0);
  };

  // Global hotkeys for rapid pharmacy workflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
        return;
      }

      if (e.key === 'F1' || (e.altKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F2' || (e.altKey && e.key.toLowerCase() === 'i')) {
        e.preventDefault();
        setActiveTab('inventory');
      } else if (e.key === 'F3' || (e.altKey && e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        setActiveTab('products');
      } else if (e.key === 'F4' || (e.altKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        setActiveTab('dashboard');
      } else if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle URL hash changes and closing mobile navigation drawer on back
  useEffect(() => {
    const handlePopState = () => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_TABS.has(hash) && hash !== activeTabRef.current) {
        setActiveTabState(hash);
        try {
          localStorage.setItem('aushadhix_active_tab', hash);
        } catch {}
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile navigation drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-slate-50 flex text-slate-900 font-sans antialiased">
      {/* Desktop Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={handleSetSidebarCollapsed}
      />

      {/* Main Workspace Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-80'
        }`}
      >
        {/* Top App Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onOpenQuickSale={() => setActiveTab('pos')}
          onOpenAddProduct={() => setActiveTab('products')}
          onOpenNewPO={() => setActiveTab('purchases')}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSelectProductFromSearch={() => setActiveTab('inventory')}
        />

        {/* Dynamic View Content */}
        <main className="flex-1 w-full max-w-full overflow-x-hidden p-3 sm:p-5 lg:p-6 pb-24 lg:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              setActiveTab={setActiveTab}
              onOpenQuickSale={() => setActiveTab('pos')}
              onOpenAddProduct={() => setActiveTab('products')}
              onOpenNewPO={() => setActiveTab('purchases')}
            />
          )}
          {activeTab === 'insights' && (
            <InsightsView
              setActiveTab={setActiveTab}
              onOpenQuickSale={() => setActiveTab('pos')}
              onOpenAddProduct={() => setActiveTab('products')}
              onOpenNewPO={() => setActiveTab('purchases')}
            />
          )}
          {activeTab === 'pos' && <POSView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'categories' && <CategoriesView />}
          {activeTab === 'inventory' && <InventoryView initialFilter="All" />}
          {activeTab === 'low-stock' && <InventoryView initialFilter="LowStock" />}
          {activeTab === 'expiry' && <ExpiryView />}
          {activeTab === 'purchases' && <PurchasesView />}
          {(activeTab === 'supplier-orders' || activeTab === 'order-list') && (
            <SupplierOrderListView
              onOpenNewPO={() => setActiveTab('purchases')}
              standalone
            />
          )}
          {activeTab === 'suppliers' && (
            <SuppliersView onOpenNewPO={() => setActiveTab('purchases')} />
          )}
          {activeTab === 'customers' && (
            <CustomersView onStartSale={() => setActiveTab('pos')} />
          )}
          {(activeTab === 'stock-ledger' || activeTab === 'ledger') && <StockLedgerView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'gst' && <GSTView />}
          {activeTab === 'business-settings' && <BusinessSettingsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        onOpenMoreMenu={() => setMobileMenuOpen(true)}
      />

      {/* Mobile Navigation Drawer / Slide-Over Sheet */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex overflow-hidden max-w-[100vw]">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-[280px] sm:w-[320px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 overflow-hidden animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-2xs shrink-0">
                  AX
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 truncate block">
                    {settings.storeName || 'AushadhiX'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Pharmacy Navigation</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent POS Billing Card in Mobile Drawer */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pos');
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left rounded-2xl p-3 transition-all duration-200 border cursor-pointer relative overflow-hidden group ${
                  activeTab === 'pos'
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500 shadow-md shadow-emerald-700/20'
                    : 'bg-white border-emerald-200/90 text-slate-800 hover:border-emerald-400 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        activeTab === 'pos'
                          ? 'bg-white/20 text-white shadow-inner'
                          : 'bg-emerald-600 text-white shadow-xs'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-black tracking-tight truncate leading-tight ${
                          activeTab === 'pos' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        POS Billing & Counter
                      </div>
                      <span
                        className={`text-[10px] font-medium truncate block ${
                          activeTab === 'pos' ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        Fast FEFO Barcode Sale
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      activeTab === 'pos'
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    F1
                  </span>
                </div>

                <div
                  className={`pt-1.5 border-t flex items-center justify-between text-[11px] font-semibold ${
                    activeTab === 'pos'
                      ? 'border-white/20 text-emerald-50'
                      : 'border-slate-100 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{todaySalesCount > 0 ? `${todaySalesCount} Bills Today` : 'Counter Ready'}</span>
                  </div>

                  <span className={activeTab === 'pos' ? 'text-white font-bold' : 'text-emerald-700 font-bold'}>
                    {todaySalesCount > 0 ? `₹${todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'Start →'}
                  </span>
                </div>
              </button>
            </div>

            {/* Simple Elegant Navigation Items */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1 overscroll-contain">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-1 select-none">
                Menu Options
              </div>
              {[
                {
                  id: 'dashboard',
                  label: 'Dashboard',
                  icon: LayoutDashboard,
                  color: 'text-emerald-600 bg-emerald-50',
                },
                {
                  id: 'products',
                  label: 'Products',
                  icon: Pill,
                  color: 'text-indigo-600 bg-indigo-50',
                },
                {
                  id: 'categories',
                  label: 'Categories',
                  icon: Boxes,
                  color: 'text-blue-600 bg-blue-50',
                },
                {
                  id: 'inventory',
                  label: 'Inventory & Stock',
                  icon: Boxes,
                  color: 'text-amber-600 bg-amber-50',
                  badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
                  badgeColor: 'bg-amber-100 text-amber-800',
                },
                {
                  id: 'insights',
                  label: 'Sales & Insights',
                  icon: TrendingUp,
                  color: 'text-sky-600 bg-sky-50',
                },
                {
                  id: 'purchases',
                  label: 'Purchases & PO',
                  icon: Truck,
                  color: 'text-teal-600 bg-teal-50',
                  badge: pendingPOCount > 0 ? `${pendingPOCount}` : undefined,
                  badgeColor: 'bg-blue-100 text-blue-800',
                },
                {
                  id: 'suppliers',
                  label: 'Suppliers',
                  icon: Truck,
                  color: 'text-orange-600 bg-orange-50',
                },
                {
                  id: 'customers',
                  label: 'Customers',
                  icon: Users,
                  color: 'text-pink-600 bg-pink-50',
                },
                {
                  id: 'reports',
                  label: 'Reports & Analytics',
                  icon: BarChart3,
                  color: 'text-violet-600 bg-violet-50',
                },
                {
                  id: 'gst',
                  label: 'GST Rates',
                  icon: BarChart3,
                  color: 'text-purple-600 bg-purple-50',
                },
                {
                  id: 'business-settings',
                  label: 'Business Settings',
                  icon: Settings,
                  color: 'text-slate-600 bg-slate-100',
                },
                {
                  id: 'settings',
                  label: 'System Settings',
                  icon: Settings,
                  color: 'text-slate-600 bg-slate-100',
                },
              ].map((item) => {
                const ItemIcon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    id={`mobile-menu-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11.5px] font-semibold transition-all duration-150 cursor-pointer group active:scale-[0.98] ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.color
                        }`}
                      >
                        <ItemIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full transition-colors ${
                          isActive
                            ? 'bg-white text-emerald-800'
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Simple Drawer Footer */}
            <div className="p-2 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-1 text-center text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md shadow-2xs transition cursor-pointer"
              >
                Close Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <PharmacyProvider>
      <MainApp />
    </PharmacyProvider>
  );
}
