import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
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
  const { products, batches, purchaseOrders, getProductTotalStock, settings, currentRole } = usePharmacy();

  // Compute dynamic badge counts
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

  // Compute parent group alert badges
  const getParentGroupAlertCount = (group: NavParentGroup): number => {
    return group.children.reduce((sum, child) => {
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
      className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200 transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-sm shadow-xs">
              AX
            </div>
            <div>
              <h2 className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
                AushadhiX
              </h2>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                Pharmacy ERP
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
            AX
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List in Parent-Child Hierarchy */}
      <div className="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
        {groups.map((group) => {
          const ParentIcon = group.icon;
          const isExpanded = expandedGroups[group.id] ?? true;
          const parentAlertCount = getParentGroupAlertCount(group);
          const hasActiveChild = group.children.some((c) => c.id === activeTab);

          if (collapsed) {
            // Collapsed view: Grouped icon pills with category dividers
            return (
              <div key={group.id} className="pt-1 pb-2 border-b border-slate-100 last:border-b-0 space-y-1">
                <div
                  className="w-8 h-8 mx-auto flex items-center justify-center text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  title={group.title}
                >
                  <ParentIcon className="w-4 h-4" />
                </div>
                {group.children.map((child) => {
                  const ChildIcon = child.icon;
                  const isActive = activeTab === child.id;
                  const badgeInfo = getChildBadge(child.id);

                  return (
                    <button
                      key={child.id}
                      id={`nav-${child.id}`}
                      onClick={() => setActiveTab(child.id)}
                      className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition relative group ${
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

          // Expanded view: Industry-standard Collapsible Parent Category with Indented Children
          return (
            <div key={group.id} className="space-y-0.5">
              {/* Parent Category Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition group ${
                  hasActiveChild
                    ? 'text-slate-900 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'
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

              {/* Child Sub-Options (Indented Hierarchy) */}
              {isExpanded && (
                <div className="pl-3.5 pr-1 py-0.5 space-y-0.5 border-l-2 border-slate-100 ml-3 transition-all">
                  {group.children.map((child: NavChildItem) => {
                    const ChildIcon = child.icon;
                    const isActive = activeTab === child.id;
                    const badgeInfo = getChildBadge(child.id);

                    return (
                      <button
                        key={child.id}
                        id={`nav-${child.id}`}
                        onClick={() => setActiveTab(child.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-200'
                            : child.highlight
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <ChildIcon
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
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
                            <span className="text-[9px] text-slate-400 font-mono px-1 py-0.2 bg-slate-100 rounded border border-slate-200">
                              {child.shortcut}
                            </span>
                          )}

                          {badgeInfo.count !== undefined && (
                            <span
                              className={`border px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
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

      {/* User Role Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-800 truncate">
                Role: {currentRole}
              </div>
              <div className="text-[10px] text-slate-400 truncate">FEFO Pharmacy Active</div>
            </div>
          </div>
        ) : (
          <div
            className="w-9 h-9 mx-auto rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"
            title={`Role: ${currentRole}`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
        )}
      </div>
    </aside>
  );
};

