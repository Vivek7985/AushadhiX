import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  ShoppingCart,
  Store,
  Sparkles,
  Zap,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { getNavigationGroups, NavParentGroup, NavChildItem } from '../data/navigation';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}) => {
  const {
    products,
    batches,
    purchaseOrders,
    getProductTotalStock,
    settings,
    currentRole,
    sales,
  } = usePharmacy();

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

  // Compute dynamic alert badge counts
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

  // Track expanded parent state (all default to true for immediate visibility)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'overview-analytics': true,
    'sales-billing': true,
    'inventory-medicines': true,
    'procurement-supply': true,
    'administration': true,
  });

  // Helper to get child item badge count & color
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

  // Compute parent group alert badges (excluding pos since pos is featured prominently at top)
  const getParentGroupAlertCount = (group: NavParentGroup): number => {
    return group.children
      .filter((c) => c.id !== 'pos')
      .reduce((sum, child) => {
        const { count } = getChildBadge(child.id);
        return sum + (count || 0);
      }, 0);
  };

  // Automatically expand parent group when active tab changes into it
  useEffect(() => {
    const parent = groups.find((g) => g.children.some((c) => c.id === activeTab));
    if (parent && !expandedGroups[parent.id]) {
      setExpandedGroups((prev) => ({ ...prev, [parent.id]: true }));
    }
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <aside
      className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200/90 shadow-xs transition-all duration-300 select-none ${
        collapsed ? 'w-16' : 'w-80'
      }`}
    >
      {/* Brand Header */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0">
              AX
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-lg tracking-tight text-slate-900 leading-none truncate">
                {settings.storeName || 'AushadhiX'}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase truncate">
                  FEFO Pharmacy ERP
                </span>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
            AX
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
          title={collapsed ? 'Expand sidebar (Alt+B)' : 'Collapse sidebar (Alt+B)'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Prominent POS Hero Section - Acquires Entire Left Sidebar Menu */}
      {!collapsed ? (
        <div className="px-3.5 pt-3 pb-1 shrink-0">
          <button
            id="nav-pos"
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`w-full text-left rounded-2xl p-3.5 transition-all duration-200 border cursor-pointer group relative overflow-hidden ${
              activeTab === 'pos'
                ? 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white border-emerald-500 shadow-md shadow-emerald-700/20 ring-2 ring-emerald-500/30'
                : 'bg-gradient-to-br from-emerald-50/85 via-white to-slate-50 border-emerald-200/90 text-slate-800 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/10'
            }`}
          >
            {/* Ambient background decoration */}
            <div
              className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-xl pointer-events-none transition-opacity ${
                activeTab === 'pos' ? 'bg-white/15' : 'bg-emerald-300/20 group-hover:opacity-100 opacity-60'
              }`}
            />

            {/* Top row: Icon + Title + Shortcut */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    activeTab === 'pos'
                      ? 'bg-white/20 text-white shadow-inner scale-105'
                      : 'bg-emerald-600 text-white shadow-xs group-hover:scale-105'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-black tracking-tight truncate ${
                        activeTab === 'pos' ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      POS Billing & Counter
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-medium truncate block ${
                      activeTab === 'pos' ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    Fast Barcode · FEFO Batch Billing
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                  activeTab === 'pos'
                    ? 'bg-white/20 text-white border-white/30'
                    : 'bg-emerald-100/80 text-emerald-800 border-emerald-200'
                }`}
                title="Keyboard shortcut: Press F1 anytime"
              >
                F1
              </span>
            </div>

            {/* Bottom Row: Live Sales Stats & Counter Status */}
            <div
              className={`pt-2 border-t flex items-center justify-between text-xs ${
                activeTab === 'pos'
                  ? 'border-white/20 text-emerald-50'
                  : 'border-slate-100 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-[11px] tracking-tight">
                  {todaySalesCount > 0 ? `${todaySalesCount} Bills Today` : 'Counter Ready'}
                </span>
              </div>

              <div className="text-right font-bold text-[11px] tabular-nums">
                {todaySalesCount > 0 ? (
                  <span className={activeTab === 'pos' ? 'text-white font-extrabold' : 'text-slate-900 font-bold'}>
                    ₹{todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                ) : (
                  <span className={activeTab === 'pos' ? 'text-emerald-100' : 'text-emerald-700'}>
                    Start Sale →
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>
      ) : (
        /* Collapsed View: Prominent POS Icon Button */
        <div className="px-2 pt-2 pb-2 border-b border-slate-100 shrink-0">
          <button
            id="nav-pos"
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center transition-all relative group cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-400/30 ring-2 ring-emerald-500'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 border border-emerald-200'
            }`}
            title={`POS Billing (F1) - ${todaySalesCount} Bills Today (₹${todayRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })})`}
          >
            <ShoppingCart className="w-5 h-5" />
            {todaySalesCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {todaySalesCount > 99 ? '99+' : todaySalesCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Navigation List in Parent-Child Hierarchy */}
      <div className="flex-1 py-2 px-2.5 space-y-2.5 overflow-y-auto">
        {groups.map((group) => {
          const ParentIcon = group.icon;
          const isExpanded = expandedGroups[group.id] ?? true;
          const parentAlertCount = getParentGroupAlertCount(group);
          // Filter out pos from child list because it is prominently rendered as the hero launcher above
          const visibleChildren = group.children.filter((c) => c.id !== 'pos');
          const hasActiveChild = visibleChildren.some((c) => c.id === activeTab);

          if (visibleChildren.length === 0) {
            return null;
          }

          if (collapsed) {
            // Collapsed view: Grouped icon pills with category dividers
            return (
              <div key={group.id} className="pt-1 pb-2 border-b border-slate-100 last:border-b-0 space-y-1">
                <div
                  className="w-7 h-7 mx-auto flex items-center justify-center text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  title={group.title}
                >
                  <ParentIcon className="w-3.5 h-3.5" />
                </div>
                {visibleChildren.map((child) => {
                  const ChildIcon = child.icon;
                  const isActive = activeTab === child.id;
                  const badgeInfo = getChildBadge(child.id);

                  return (
                    <button
                      key={child.id}
                      id={`nav-${child.id}`}
                      onClick={() => setActiveTab(child.id)}
                      className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition relative group cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                          : child.highlight
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={`${group.title} > ${child.label}`}
                    >
                      <ChildIcon className="w-4 h-4" />
                      {badgeInfo.count !== undefined && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          }

          // Expanded view: Clean, Collapsible Parent Category with Spacious Indented Children
          return (
            <div key={group.id} className="space-y-1">
              {/* Parent Category Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition group cursor-pointer ${
                  hasActiveChild
                    ? 'text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                      hasActiveChild ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <ParentIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-bold truncate">
                    {group.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {parentAlertCount > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-rose-200">
                      {parentAlertCount}
                    </span>
                  )}
                  <span className="text-slate-400 group-hover:text-slate-600 transition-transform">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                </div>
              </button>

              {/* Child Sub-Options (Clean Hierarchy & Comfortable Touch Targets) */}
              {isExpanded && (
                <div className="pl-3 pr-1 py-0.5 space-y-0.5 border-l-2 border-slate-100 ml-3.5 transition-all">
                  {visibleChildren.map((child: NavChildItem) => {
                    const ChildIcon = child.icon;
                    const isActive = activeTab === child.id;
                    const badgeInfo = getChildBadge(child.id);

                    return (
                      <button
                        key={child.id}
                        id={`nav-${child.id}`}
                        onClick={() => setActiveTab(child.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all group cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-200'
                            : child.highlight
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <ChildIcon
                            className={`w-4 h-4 flex-shrink-0 ${
                              isActive
                                ? 'text-white'
                                : child.highlight
                                ? 'text-emerald-600'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          />
                          <span className="truncate">{child.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                          {child.shortcut && !isActive && (
                            <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.2 bg-slate-100 rounded border border-slate-200">
                              {child.shortcut}
                            </span>
                          )}

                          {badgeInfo.count !== undefined && (
                            <span
                              className={`border px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-white/20 text-white border-white/30'
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

      {/* User Role & Pharmacy System Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">
                Role: {currentRole}
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>FEFO & GST Ready</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="w-10 h-10 mx-auto rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"
            title={`Role: ${currentRole} - FEFO Pharmacy Active`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
        )}
      </div>
    </aside>
  );
};


