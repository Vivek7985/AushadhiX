import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  ShoppingCart,
  Users,
  Pill,
  Boxes,
  AlertOctagon,
  ClockAlert,
  ScrollText,
  Truck,
  Building2,
  Settings,
  ReceiptText,
  Warehouse,
  PackageCheck,
  LineChart,
} from 'lucide-react';

export interface NavChildItem {
  id: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  shortcut?: string;
}

export interface NavParentGroup {
  id: string;
  title: string;
  categoryTag?: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  children: NavChildItem[];
}

export interface NavigationBadges {
  lowStockCount?: number;
  expiringCount?: number;
  pendingPOCount?: number;
}

/**
 * Industry-Standard Pharmacy ERP Navigation Hierarchy
 * Groups operational functions into logical Parent-Child modules:
 * 1. Overview & Analytics
 * 2. Sales & Billing (POS)
 * 3. Inventory & Medicines
 * 4. Procurement & Supply Chain
 * 5. Administration & Settings
 */
export const getNavigationGroups = (badges: NavigationBadges = {}): NavParentGroup[] => [
  {
    id: 'overview-analytics',
    title: 'Overview & Analytics',
    categoryTag: 'Analytics',
    icon: LineChart,
    description: 'Executive KPI dashboard, insights & reports',
    children: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        shortLabel: 'Dashboard',
        description: 'Store KPIs, today revenue & actions',
        icon: LayoutDashboard,
        shortcut: 'F4',
      },
      {
        id: 'insights',
        label: 'Insights & AI Trends',
        shortLabel: 'Insights',
        description: 'Demand forecasting & margins',
        icon: TrendingUp,
      },
      {
        id: 'reports',
        label: 'Reports & GST Analytics',
        shortLabel: 'Reports',
        description: 'Sales summaries & audit reports',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'sales-billing',
    title: 'Sales & Billing (POS)',
    categoryTag: 'Counter',
    icon: ReceiptText,
    description: 'Counter dispensing, billing & customer accounts',
    children: [
      {
        id: 'pos',
        label: 'Sales Counter / POS',
        shortLabel: 'Billing',
        description: 'Fast barcode, FEFO batch selection & bill print',
        icon: ShoppingCart,
        highlight: true,
        shortcut: 'F1',
      },
      {
        id: 'customers',
        label: 'Customer & Patient Directory',
        shortLabel: 'Customers',
        description: 'Patient profiles, prescriptions & credit ledger',
        icon: Users,
      },
    ],
  },
  {
    id: 'inventory-medicines',
    title: 'Inventory & Medicines',
    categoryTag: 'Stock',
    icon: Warehouse,
    description: 'Drug catalog, batch inventory, alerts & ledger',
    children: [
      {
        id: 'products',
        label: 'Products & Salt Compositions',
        shortLabel: 'Products',
        description: 'Salt masters, generic alternatives & units',
        icon: Pill,
        shortcut: 'F3',
      },
      {
        id: 'inventory',
        label: 'Inventory & Batches',
        shortLabel: 'Batches',
        description: 'Physical stock, rack locations & packaging',
        icon: Boxes,
        shortcut: 'F2',
      },
      {
        id: 'low-stock',
        label: 'Low Stock Alerts',
        shortLabel: 'Low Stock',
        description: 'Medicines below minimum threshold',
        icon: AlertOctagon,
      },
      {
        id: 'expiry',
        label: 'Expiry Radar (FEFO)',
        shortLabel: 'Expiry Radar',
        description: 'Near-expiry batches & quarantine return',
        icon: ClockAlert,
      },
      {
        id: 'stock-ledger',
        label: 'Stock Ledger (Audit Trail)',
        shortLabel: 'Ledger',
        description: 'Batch-wise audit history & adjustments',
        icon: ScrollText,
      },
    ],
  },
  {
    id: 'procurement-supply',
    title: 'Procurement & Vendors',
    categoryTag: 'Supply Chain',
    icon: PackageCheck,
    description: 'Purchase orders, GRN inward & vendor records',
    children: [
      {
        id: 'purchases',
        label: 'Purchases & Goods Receipt',
        shortLabel: 'Purchases',
        description: 'Purchase orders, inward stock & bills',
        icon: Truck,
      },
      {
        id: 'suppliers',
        label: 'Suppliers & Vendors',
        shortLabel: 'Suppliers',
        description: 'Distributor directory & payment terms',
        icon: Building2,
      },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    categoryTag: 'System',
    icon: Settings,
    description: 'Pharmacy config, tax & security audit',
    children: [
      {
        id: 'settings',
        label: 'Settings & Verification',
        shortLabel: 'Settings',
        description: 'Pharmacy profile, tax rules & compliance',
        icon: Settings,
      },
    ],
  },
];
