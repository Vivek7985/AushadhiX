import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Boxes,
  MoreHorizontal,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMoreMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenMoreMenu,
}) => {
  const { products, getProductTotalStock } = usePharmacy();

  const lowStockCount = products.filter((p) => {
    const stock = getProductTotalStock(p.id);
    return stock > 0 && stock <= p.minStockBaseUnits;
  }).length;

  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'pos', label: 'POS Sale', icon: ShoppingCart, highlight: true },
    { id: 'products', label: 'Products', icon: Pill },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = activeTab === it.id;

        return (
          <button
            key={it.id}
            id={`mobile-nav-${it.id}`}
            onClick={() => setActiveTab(it.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition relative min-w-[56px] ${
              isActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 ${
                  isActive
                    ? 'text-emerald-600 scale-110'
                    : it.highlight
                    ? 'text-emerald-500'
                    : 'text-slate-400'
                }`}
              />
              {it.badge && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {it.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{it.label}</span>
          </button>
        );
      })}

      <button
        id="mobile-nav-more"
        onClick={onOpenMoreMenu}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 hover:text-slate-900 font-medium min-w-[56px]"
      >
        <MoreHorizontal className="w-5 h-5 text-slate-400" />
        <span className="text-[10px] mt-0.5">More</span>
      </button>
    </nav>
  );
};
