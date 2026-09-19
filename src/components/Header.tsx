import React, { useState } from 'react';
import {
  Search,
  Bell,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
  Store,
  Menu,
  CheckCircle2,
  X,
  HelpCircle,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Role } from '../types';
import { UserGuideModal } from './UserGuideModal';

interface HeaderProps {
  onOpenQuickSale: () => void;
  onOpenAddProduct: () => void;
  onOpenNewPO: () => void;
  onOpenMobileMenu: () => void;
  onSelectProductFromSearch: (productId: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQuickSale,
  onOpenAddProduct,
  onOpenNewPO,
  onOpenMobileMenu,
  onSelectProductFromSearch,
  setActiveTab,
}) => {
  const {
    settings,
    products,
    notifications,
    currentRole,
    setCurrentRole,
    currentUser,
    runAcceptanceTest,
    getProductTotalStock,
  } = usePharmacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);

  // Global search filtering across Name, Brand, Composition, Barcode, SKU
  const searchResults = searchQuery.trim().length > 1
    ? products.filter((p) => {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesBrand = p.brand.toLowerCase().includes(q);
        const matchesBarcode = p.barcode.includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesComposition = p.compositions?.some((c) =>
          `${c.ingredient} ${c.strength}`.toLowerCase().includes(q)
        );
        return matchesName || matchesBrand || matchesBarcode || matchesSku || matchesComposition;
      }).slice(0, 6)
    : [];

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-2.5">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger & Store Title */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-nav-toggle"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-sm shadow-emerald-200">
              AX
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-bold text-slate-900 tracking-tight leading-none">
                AushadhiX
              </h1>
            </div>
          </div>
        </div>

        {/* Center: Global Search with Instant Composition & Brand Dropdown */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Search medicine, brand, composition (e.g. Paracetamol), barcode..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showSearchDropdown && searchQuery.trim().length > 1 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs">
              <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Matching Medicines & Compositions ({searchResults.length})</span>
                <span className="text-emerald-700 font-medium">Instant Lookup</span>
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-500">
                  No products or compositions matching "{searchQuery}"
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {searchResults.map((prod) => {
                    const stock = getProductTotalStock(prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          onSelectProductFromSearch(prod.id);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        className="p-2.5 hover:bg-emerald-50/60 cursor-pointer flex items-center justify-between transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-semibold text-slate-800 group-hover:text-emerald-700">
                              {prod.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Brand: <span className="font-medium text-slate-700">{prod.brand}</span>
                              {prod.compositions?.length > 0 && (
                                <span className="ml-1.5 text-emerald-600 font-medium">
                                  • {prod.compositions.map((c) => `${c.ingredient} ${c.strength}`).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-semibold ${stock <= prod.minStockBaseUnits ? 'text-amber-600' : 'text-slate-700'}`}>
                            {stock} {prod.baseUnit}s
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {prod.units[0]?.defaultSellingPrice || '—'}/{prod.units[0]?.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Actions: User Guide, Quick Add, Notifications, Role Switcher */}
        <div className="flex items-center gap-2">
          {/* Help & Operations Guide Modal Trigger */}
          <button
            id="user-guide-btn"
            onClick={() => setShowUserGuide(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Guide & Help</span>
          </button>

          {/* Quick Action Button */}
          <div className="relative">
            <button
              id="quick-add-btn"
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Quick Action</span>
            </button>

            {showQuickMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 text-xs">
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenQuickSale();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  New POS Sale (F2)
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenAddProduct();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Add Product / Medicine
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenNewPO();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Create Purchase Order
                </button>
              </div>
            )}
          </div>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              id="notifications-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              aria-label="View system notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {/* Notifications Drawer */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pharmacy Alerts ({notifications.length})</span>
                  </div>
                  <span className="text-[11px] text-slate-500">FEFO & Expiry Watch</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">All systems optimal. No alerts.</div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (notif.linkTab) setActiveTab(notif.linkTab);
                          setShowNotifications(false);
                        }}
                        className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5"
                      >
                        {notif.type === 'danger' ? (
                          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 flex-shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        ) : notif.type === 'warning' ? (
                          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 flex-shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 flex-shrink-0">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 flex items-center justify-between">
                            <span>{notif.title}</span>
                            <span className="text-[10px] text-slate-400">{notif.timestamp}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <select
              id="role-select"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as Role)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
              title="Switch user security role"
            >
              <option value="Admin">Admin (Owner)</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="InventoryUser">Inventory Mgr</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dedicated User Guide & Operations Modal */}
      <UserGuideModal
        isOpen={showUserGuide}
        onClose={() => setShowUserGuide(false)}
        onNavigateTab={(tab) => {
          setShowUserGuide(false);
          setActiveTab(tab);
        }}
      />
    </header>
  );
};
