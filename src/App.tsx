import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
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
import { SuppliersView } from './components/SuppliersView';
import { CustomersView } from './components/CustomersView';
import { getNavigationGroups, NavParentGroup, NavChildItem } from './data/navigation';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { products, batches, purchaseOrders, getProductTotalStock, settings } = usePharmacy();

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans antialiased">
      {/* Desktop Persistent Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Workspace Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Top App Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenQuickSale={() => setActiveTab('pos')}
          onOpenAddProduct={() => setActiveTab('products')}
          onOpenNewPO={() => setActiveTab('purchases')}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSelectProductFromSearch={() => setActiveTab('inventory')}
        />

        {/* Dynamic View Content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8">
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
          {activeTab === 'inventory' && <InventoryView initialFilter="All" />}
          {activeTab === 'low-stock' && <InventoryView initialFilter="LowStock" />}
          {activeTab === 'expiry' && <ExpiryView />}
          {activeTab === 'purchases' && <PurchasesView />}
          {activeTab === 'suppliers' && (
            <SuppliersView onOpenNewPO={() => setActiveTab('purchases')} />
          )}
          {activeTab === 'customers' && (
            <CustomersView onStartSale={() => setActiveTab('pos')} />
          )}
          {(activeTab === 'stock-ledger' || activeTab === 'ledger') && <StockLedgerView />}
          {activeTab === 'reports' && <ReportsView />}
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
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-5/6 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-sm shadow-xs">
                  AX
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-slate-900">
                      AushadhiX
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      PHARMACY ERP
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Standard Module Menu</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation items in Parent-Child Formation */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {groups.map((group) => {
                const ParentIcon = group.icon;
                const isExpanded = mobileExpandedGroups[group.id] ?? true;
                const parentAlertCount = getParentAlertCount(group);
                const hasActiveChild = group.children.some((c) => c.id === activeTab);

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/40 overflow-hidden"
                  >
                    {/* Parent Module Header */}
                    <button
                      type="button"
                      onClick={() => toggleMobileGroup(group.id)}
                      className={`w-full flex items-center justify-between p-2.5 text-left transition ${
                        hasActiveChild
                          ? 'bg-emerald-50/70 text-slate-900 font-bold'
                          : 'hover:bg-slate-100/70 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                            hasActiveChild
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600'
                          }`}
                        >
                          <ParentIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-slate-900">
                            {group.title}
                          </div>
                          {group.categoryTag && (
                            <span className="text-[9px] font-medium text-slate-400 block">
                              {group.categoryTag}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {parentAlertCount > 0 && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-rose-200">
                            {parentAlertCount} alerts
                          </span>
                        )}
                        <span className="text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Child Sub-Options */}
                    {isExpanded && (
                      <div className="px-2 pb-2 pt-1 space-y-1 bg-white border-t border-slate-100">
                        {group.children.map((child: NavChildItem) => {
                          const ChildIcon = child.icon;
                          const isActive = activeTab === child.id;
                          const badgeInfo = getChildBadge(child.id);

                          return (
                            <button
                              key={child.id}
                              id={`mobile-menu-${child.id}`}
                              onClick={() => {
                                setActiveTab(child.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                                isActive
                                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                                  : child.highlight
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <ChildIcon
                                  className={`w-4 h-4 flex-shrink-0 ${
                                    isActive
                                      ? 'text-white'
                                      : child.highlight
                                      ? 'text-emerald-600'
                                      : 'text-slate-500'
                                  }`}
                                />
                                <div className="text-left truncate">
                                  <div className="truncate font-medium">{child.label}</div>
                                  {child.description && !isActive && (
                                    <div className="text-[10px] text-slate-400 truncate font-normal">
                                      {child.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                                {child.shortcut && !isActive && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                    {child.shortcut}
                                  </span>
                                )}

                                {badgeInfo.count !== undefined && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                                      isActive
                                        ? 'bg-white text-emerald-800 border-transparent'
                                        : badgeInfo.color
                                    }`}
                                  >
                                    {badgeInfo.count}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Pharmacy ERP Architecture</span>
              </div>
              <p className="text-[10px] text-slate-400">
                FEFO Compliance • Batch Tracking • Multi-Unit
              </p>
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
