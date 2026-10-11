import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  ShoppingBag,
  Clock,
  CheckCircle2,
  X,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Inbox,
  RotateCcw,
  MessageCircle,
  FileText,
  MoreVertical,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Calendar,
  HeartPulse,
  Receipt,
  Printer,
  Pencil,
  History,
  Repeat,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Tag,
  Pill,
  Trash2,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Customer, Sale } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { ConfirmDeleteInvoiceModal } from './ConfirmDeleteInvoiceModal';

interface CustomersViewProps {
  onStartSale?: (customer: Customer) => void;
}

type FilterCategory = 'all' | 'doctor' | 'frequent' | 'notes';

export const CustomersView: React.FC<CustomersViewProps> = ({ onStartSale }) => {
  const {
    customers,
    sales,
    addCustomer,
    updateCustomer,
    seedDummyCustomers,
    clearAllCustomers,
    deleteSale,
  } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<Customer | null>(null);
  const [customerModalTab, setCustomerModalTab] = useState<'history' | 'profile'>('history');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(new Set());
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [copiedInvoiceNumber, setCopiedInvoiceNumber] = useState<string | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDoctor, setEditDoctor] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // Close options menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    if (showOptionsMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showOptionsMenu]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDoctor, setFormDoctor] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Counts for filter pills
  const withDoctorCount = useMemo(() => {
    return customers.filter((c) => Boolean(c.doctorName && c.doctorName.trim())).length;
  }, [customers]);

  const frequentBuyersCount = useMemo(() => {
    return customers.filter((c) => Number(c.totalOrders || 0) >= 2).length;
  }, [customers]);

  const withNotesCount = useMemo(() => {
    return customers.filter((c) => Boolean(c.notes && c.notes.trim())).length;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.doctorName && c.doctorName.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeFilter === 'doctor') {
        return Boolean(c.doctorName && c.doctorName.trim());
      }
      if (activeFilter === 'frequent') {
        return Number(c.totalOrders || 0) >= 2;
      }
      if (activeFilter === 'notes') {
        return Boolean(c.notes && c.notes.trim());
      }

      return true;
    });
  }, [customers, searchQuery, activeFilter]);

  const totalSpent = useMemo(
    () => customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0),
    [customers]
  );
  const totalOrders = useMemo(
    () => customers.reduce((sum, c) => sum + Number(c.totalOrders || 0), 0),
    [customers]
  );

  // Helper to format sale date & check if from today
  const formatSaleDate = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) return { label: dateTimeStr, isToday: false, timeStr: '' };
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const timeStr = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      if (isToday) {
        return { label: `Today, ${timeStr}`, isToday: true, timeStr };
      }

      const dateStr = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return { label: `${dateStr} • ${timeStr}`, isToday: false, timeStr };
    } catch (e) {
      return { label: dateTimeStr, isToday: false, timeStr: '' };
    }
  };

  // Check if a customer purchased today
  const checkCustomerPurchasedToday = (cust: Customer) => {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    if (cust.lastOrderDate === todayPrefix) return true;
    const custPhone = (cust.phone || '').replace(/\D/g, '');
    const custName = (cust.name || '').trim().toLowerCase();
    return sales.some(
      (s) =>
        s.dateTime.startsWith(todayPrefix) &&
        ((s.customerId && s.customerId === cust.id) ||
          (custPhone && s.customerPhone && s.customerPhone.replace(/\D/g, '') === custPhone) ||
          (custName && s.customerName && s.customerName.trim().toLowerCase() === custName))
    );
  };

  // Sales matching the currently inspected customer
  const selectedCustomerSales = useMemo(() => {
    if (!selectedCustomerForDetails) return [];
    const custId = selectedCustomerForDetails.id;
    const custPhone = (selectedCustomerForDetails.phone || '').replace(/\D/g, '');
    const custName = (selectedCustomerForDetails.name || '').trim().toLowerCase();

    return sales
      .filter((s) => {
        if (s.customerId && s.customerId === custId) return true;
        if (custPhone && s.customerPhone && s.customerPhone.replace(/\D/g, '') === custPhone) return true;
        if (custName && s.customerName && s.customerName.trim().toLowerCase() === custName) return true;
        return false;
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [selectedCustomerForDetails, sales]);

  // Expand latest sale by default
  useEffect(() => {
    if (selectedCustomerSales.length > 0) {
      setExpandedSaleIds(new Set([selectedCustomerSales[0].id]));
    } else {
      setExpandedSaleIds(new Set());
    }
    setHistorySearchQuery('');
  }, [selectedCustomerForDetails?.id]);

  const filteredCustomerSales = useMemo(() => {
    if (!historySearchQuery.trim()) return selectedCustomerSales;
    const q = historySearchQuery.toLowerCase().trim();
    return selectedCustomerSales.filter((s) => {
      if (s.invoiceNumber.toLowerCase().includes(q)) return true;
      if (s.paymentMethod.toLowerCase().includes(q)) return true;
      if (s.doctorName && s.doctorName.toLowerCase().includes(q)) return true;
      if (
        s.items &&
        s.items.some(
          (it) =>
            it.productName.toLowerCase().includes(q) ||
            (it.brand && it.brand.toLowerCase().includes(q)) ||
            (it.batchNumber && it.batchNumber.toLowerCase().includes(q))
        )
      ) {
        return true;
      }
      return false;
    });
  }, [selectedCustomerSales, historySearchQuery]);

  const toggleSaleExpand = (saleId: string) => {
    setExpandedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const handleCopyInvoice = (invNum: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(invNum);
      setCopiedInvoiceNumber(invNum);
      setTimeout(() => setCopiedInvoiceNumber(null), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleStartEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditName(cust.name || '');
    setEditPhone(cust.phone || '');
    setEditEmail(cust.email || '');
    setEditDoctor(cust.doctorName || '');
    setEditAddress(cust.address || '');
    setEditNotes(cust.notes || '');
  };

  const handleSaveEditCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName.trim() || !editPhone.trim()) return;

    const updates: Partial<Customer> = {
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      doctorName: editDoctor.trim(),
      address: editAddress.trim(),
      notes: editNotes.trim(),
    };

    const updated = updateCustomer(editingCustomer.id, updates);
    if (updated) {
      if (selectedCustomerForDetails?.id === editingCustomer.id) {
        setSelectedCustomerForDetails(updated);
      }
    }
    setEditingCustomer(null);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    addCustomer({
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      doctorName: formDoctor.trim(),
      address: formAddress.trim(),
      notes: formNotes.trim(),
      totalSpent: 0,
      totalOrders: 0,
    });

    setShowAddModal(false);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormDoctor('');
    setFormAddress('');
    setFormNotes('');
    setShowMoreDetails(false);
  };

  const handleStartSaleForCustomer = (cust: Customer) => {
    try {
      sessionStorage.setItem('aushadhix_selected_customer', JSON.stringify(cust));
    } catch (e) {
      console.warn('Error saving customer session:', e);
    }
    if (onStartSale) {
      onStartSale(cust);
    }
  };

  const handleCopyPhone = (cust: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(cust.phone);
      setCopiedPhoneId(cust.id);
      setTimeout(() => setCopiedPhoneId(null), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // Avatar palette based on name hash
  const getAvatarStyles = (name: string) => {
    const palettes = [
      'bg-emerald-100 text-emerald-800 border-emerald-200/80',
      'bg-teal-100 text-teal-800 border-teal-200/80',
      'bg-sky-100 text-sky-800 border-sky-200/80',
      'bg-indigo-100 text-indigo-800 border-indigo-200/80',
      'bg-violet-100 text-violet-800 border-violet-200/80',
      'bg-amber-100 text-amber-900 border-amber-200/80',
      'bg-rose-100 text-rose-800 border-rose-200/80',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palettes[Math.abs(hash) % palettes.length];
  };

  const getInitials = (name: string) => {
    if (!name) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="w-full space-y-3.5 sm:space-y-4 pb-20 lg:pb-12">
      {/* 1. Mobile-Native App Bar Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                Patients & Customers
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 tabular-nums shrink-0">
                {customers.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5 hidden sm:block">
              Medical records, prescribing doctors, contact info & lifetime billing
            </p>
          </div>
        </div>

        {/* Primary Action & Options Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowMoreDetails(false);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
            title="Register a new patient or customer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Patient</span>
          </button>

          {/* More options menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="More directory options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    seedDummyCustomers();
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Load Sample Data</span>
                </button>
                {customers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      if (window.confirm('Clear customer and patient directory to test the empty state?')) {
                        clearAllCustomers();
                      }
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-semibold border-t border-slate-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                    <span>Clear All Profiles</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sleek Mobile Metrics Ribbon */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">Patients</div>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-slate-900 tracking-tight tabular-nums truncate">
            {customers.length}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">Directory profiles</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">Fulfilled Orders</div>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-emerald-700 tracking-tight tabular-nums truncate">
            {totalOrders}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium truncate mt-0.5">Dispensed Rx bills</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 truncate">Total Purchases</div>
          <div className="mt-0.5 text-sm sm:text-base font-bold text-slate-900 tracking-tight tabular-nums truncate">
            ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">Lifetime revenue</div>
        </div>
      </div>

      {/* 3. Search & Interactive Filter Segment */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        {/* Search input with quick clear */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="customers-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name, mobile, doctor, notes..."
            className="w-full bg-slate-50/90 border border-slate-200 rounded-xl pl-9.5 pr-9 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips with touch-friendly pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`h-7 px-3 rounded-xl font-semibold whitespace-nowrap text-[11px] transition cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            All ({customers.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('doctor')}
            className={`h-7 px-3 rounded-xl font-semibold whitespace-nowrap text-[11px] transition cursor-pointer shrink-0 flex items-center gap-1 ${
              activeFilter === 'doctor'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3 h-3 text-emerald-600" />
            <span>Prescription / Dr. ({withDoctorCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('frequent')}
            className={`h-7 px-3 rounded-xl font-semibold whitespace-nowrap text-[11px] transition cursor-pointer shrink-0 ${
              activeFilter === 'frequent'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            Frequent (2+ Orders) ({frequentBuyersCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('notes')}
            className={`h-7 px-3 rounded-xl font-semibold whitespace-nowrap text-[11px] transition cursor-pointer shrink-0 ${
              activeFilter === 'notes'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
            }`}
          >
            Allergies / Notes ({withNotesCount})
          </button>
        </div>
      </div>

      {/* 4. Customer Cards Grid / Empty State */}
      {filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              onClick={() => setSelectedCustomerForDetails(cust)}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between overflow-hidden active:scale-[0.99] touch-manipulation group cursor-pointer"
            >
              {/* Card Body - Target of CSS selector 1 */}
              <div className="p-3.5 sm:p-4 space-y-3">
                {/* Header Row: Initials Avatar + Name + Prescribing Doctor */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs border shrink-0 ${getAvatarStyles(
                        cust.name
                      )}`}
                    >
                      {getInitials(cust.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition truncate leading-snug">
                        {cust.name}
                      </h3>
                      {cust.doctorName ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 mt-0.5 truncate">
                          <Stethoscope className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">Dr. {cust.doctorName}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 mt-0.5">Walk-in patient</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {checkCustomerPurchasedToday(cust) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Today
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
                      {cust.totalOrders} {cust.totalOrders === 1 ? 'order' : 'orders'}
                    </span>
                  </div>
                </div>

                {/* Contact & Location Strip */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`tel:${cust.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-slate-800 font-semibold hover:text-emerald-700 transition"
                      title="Tap to call patient"
                    >
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{cust.phone}</span>
                    </a>
                    <button
                      type="button"
                      onClick={(e) => handleCopyPhone(cust, e)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                      title="Copy phone number"
                    >
                      {copiedPhoneId === cust.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {cust.address && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{cust.address}</span>
                    </div>
                  )}

                  {/* Medical Allergy / Note Badge */}
                  {cust.notes && (
                    <div className="p-2 bg-amber-50/80 rounded-xl text-[11px] text-amber-900 border border-amber-200/80 flex items-start gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{cust.notes}</span>
                    </div>
                  )}
                </div>

                {/* Lifetime Spending Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Lifetime Purchases</div>
                    <div className="font-bold text-slate-900 tabular-nums">
                      ₹{Number(cust.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    <span>View Profile</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Card Action Footer */}
              <div
                className="px-3.5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerForDetails(cust);
                      setCustomerModalTab('history');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer text-xs font-semibold"
                    title={`View purchase history (${cust.totalOrders} orders)`}
                  >
                    <History className="w-3.5 h-3.5 text-emerald-600" />
                    <span>History ({cust.totalOrders})</span>
                  </button>

                  <a
                    href={`tel:${cust.phone}`}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                    title="Call patient"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  {cust.phone && (
                    <a
                      href={`https://wa.me/91${cust.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                      title="Send WhatsApp message"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleStartSaleForCustomer(cust)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                  title={`Start new POS bill for ${cust.name}`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>+ New Sale</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs my-4 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              No Patient Profiles Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
              Maintain patient health histories, prescribing doctor relationships, contact numbers, and purchase trends.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={seedDummyCustomers}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Load Sample Patients</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMoreDetails(false);
                setShowAddModal(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Patient</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center max-w-md mx-auto shadow-2xs my-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">No patients matched &ldquo;{searchQuery}&rdquo;</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try searching by mobile phone number or check for typos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveFilter('all');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Patient Profile Details Sheet (Mobile-Native Bottom Sheet / Modal) */}
      {/* Patient Profile & Purchase History Modal (Native Bottom Sheet / Modal) */}
      {selectedCustomerForDetails && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
          onClick={() => setSelectedCustomerForDetails(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm border shrink-0 ${getAvatarStyles(
                    selectedCustomerForDetails.name
                  )}`}
                >
                  {getInitials(selectedCustomerForDetails.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                      {selectedCustomerForDetails.name}
                    </h2>
                    {checkCustomerPurchasedToday(selectedCustomerForDetails) && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Purchased Today
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-semibold text-slate-700">{selectedCustomerForDetails.phone}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">
                      {selectedCustomerSales.length} invoice{selectedCustomerSales.length === 1 ? '' : 's'}
                    </span>
                    <span>•</span>
                    <span className="text-slate-800 font-bold tabular-nums">
                      ₹{Number(selectedCustomerForDetails.totalSpent || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartEditCustomer(selectedCustomerForDetails)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 flex items-center gap-1 text-xs font-semibold transition cursor-pointer"
                  title="Edit customer profile"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForDetails(null)}
                  className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Contact Action Bar */}
            <div className="grid grid-cols-4 gap-2 p-2.5 sm:px-5 bg-slate-50 border-b border-slate-100 text-xs">
              <a
                href={`tel:${selectedCustomerForDetails.phone}`}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 transition active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate">Call</span>
              </a>

              <a
                href={`https://wa.me/91${selectedCustomerForDetails.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 transition active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate">WhatsApp</span>
              </a>

              {selectedCustomerForDetails.email ? (
                <a
                  href={`mailto:${selectedCustomerForDetails.email}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 transition active:scale-95"
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate">Email</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleCopyPhone(selectedCustomerForDetails, e)}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 transition active:scale-95 cursor-pointer"
                >
                  {copiedPhoneId === selectedCustomerForDetails.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="truncate text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">Copy</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const cust = selectedCustomerForDetails;
                  setSelectedCustomerForDetails(null);
                  handleStartSaleForCustomer(cust);
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-bold transition active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate">+ Sale</span>
              </button>
            </div>

            {/* Navigation Tabs inside Customer Modal */}
            <div className="flex items-center border-b border-slate-200 bg-white px-4 sm:px-5 pt-1.5 text-xs">
              <button
                type="button"
                onClick={() => setCustomerModalTab('history')}
                className={`py-2.5 px-3 font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  customerModalTab === 'history'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Purchase History ({selectedCustomerSales.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCustomerModalTab('profile')}
                className={`py-2.5 px-3 font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  customerModalTab === 'profile'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>Patient Profile & Details</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs bg-slate-50/50">
              {customerModalTab === 'history' ? (
                <div className="space-y-4">
                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-3 gap-2.5 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Lifetime Spend
                      </div>
                      <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                        ₹{Number(selectedCustomerForDetails.totalSpent || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Total Invoices
                      </div>
                      <div className="text-base font-bold text-emerald-700 tabular-nums mt-0.5">
                        {selectedCustomerSales.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Avg Ticket Size
                      </div>
                      <div className="text-base font-bold text-slate-900 tabular-nums mt-0.5">
                        ₹
                        {selectedCustomerSales.length > 0
                          ? (
                              Number(selectedCustomerForDetails.totalSpent || 0) /
                              selectedCustomerSales.length
                            ).toFixed(2)
                          : '0.00'}
                      </div>
                    </div>
                  </div>

                  {/* Search within Customer's Invoices */}
                  {selectedCustomerSales.length > 1 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        placeholder="Search medicines, batch number, or invoice #..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                      />
                      {historySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setHistorySearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Customer Purchase History Invoices List */}
                  {filteredCustomerSales.length > 0 ? (
                    <div className="space-y-3">
                      {filteredCustomerSales.map((sale) => {
                        const dateInfo = formatSaleDate(sale.dateTime);
                        const isExpanded = expandedSaleIds.has(sale.id);

                        return (
                          <div
                            key={sale.id}
                            className={`bg-white rounded-2xl border transition shadow-2xs overflow-hidden ${
                              dateInfo.isToday
                                ? 'border-emerald-300 ring-1 ring-emerald-500/10'
                                : 'border-slate-200/90 hover:border-slate-300'
                            }`}
                          >
                            {/* Invoice Header */}
                            <div
                              onClick={() => toggleSaleExpand(sale.id)}
                              className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50 transition"
                            >
                              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 tracking-tight font-mono text-xs">
                                    {sale.invoiceNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyInvoice(sale.invoiceNumber, e)}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                                    title="Copy invoice number"
                                  >
                                    {copiedInvoiceNumber === sale.invoiceNumber ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>

                                {dateInfo.isToday ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {dateInfo.label}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{dateInfo.label}</span>
                                  </span>
                                )}

                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                  {sale.paymentMethod}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-400 font-semibold uppercase">
                                    Total
                                  </div>
                                  <div className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                                    ₹{Number(sale.grandTotal).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                                <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Additional metadata row */}
                            <div className="px-3.5 py-2 bg-white flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100 gap-2 flex-wrap">
                              <div className="flex items-center gap-3 flex-wrap">
                                {sale.doctorName && (
                                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                    <Stethoscope className="w-3 h-3 text-emerald-600" />
                                    <span>Prescribed by Dr. {sale.doctorName}</span>
                                  </span>
                                )}
                                {sale.cashierName && (
                                  <span>Billed by: {sale.cashierName}</span>
                                )}
                              </div>
                              <span className="font-semibold text-slate-600">
                                {sale.items.length} medicine{sale.items.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            {/* Purchased Line Items List */}
                            {isExpanded && (
                              <div className="p-3 sm:p-4 space-y-2 bg-slate-50/40">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                                  <Pill className="w-3 h-3 text-emerald-600" />
                                  <span>Prescribed & Dispensed Medicines</span>
                                </div>

                                <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 border-b border-slate-100 uppercase">
                                        <th className="py-2 px-3">Medicine & Brand</th>
                                        <th className="py-2 px-2">Batch / Exp</th>
                                        <th className="py-2 px-2 text-center">Unit / Qty</th>
                                        <th className="py-2 px-2 text-right">Rate</th>
                                        <th className="py-2 px-3 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-800">
                                      {sale.items.map((it) => (
                                        <tr key={it.id || it.productId} className="hover:bg-slate-50/60">
                                          <td className="py-2 px-3">
                                            <div className="font-bold text-slate-900 leading-tight">
                                              {it.productName}
                                            </div>
                                            {it.brand && (
                                              <div className="text-[10px] text-slate-400">
                                                {it.brand}
                                              </div>
                                            )}
                                          </td>
                                          <td className="py-2 px-2 text-[11px] text-slate-600 font-mono">
                                            <div>{it.batchNumber || '—'}</div>
                                            {it.expiryDate && (
                                              <div className="text-[10px] text-slate-400">
                                                Exp: {it.expiryDate.slice(0, 7)}
                                              </div>
                                            )}
                                          </td>
                                          <td className="py-2 px-2 text-center font-semibold text-slate-700">
                                            {it.quantityInUnit} {it.unitName || 'Units'}
                                          </td>
                                          <td className="py-2 px-2 text-right text-slate-600 tabular-nums">
                                            ₹{Number(it.sellingPricePerUnit || 0).toFixed(2)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                                            ₹{Number(it.netAmount || it.grossAmount || 0).toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Bill financial summary sub-strip */}
                                <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-500">
                                  <div className="flex items-center gap-3">
                                    <span>Subtotal: ₹{Number(sale.subtotal).toFixed(2)}</span>
                                    {sale.discountAmount > 0 && (
                                      <span className="text-emerald-700 font-medium">
                                        Discount: -₹{Number(sale.discountAmount).toFixed(2)}
                                      </span>
                                    )}
                                    {sale.taxAmount > 0 && (
                                      <span>GST: ₹{Number(sale.taxAmount).toFixed(2)}</span>
                                    )}
                                  </div>
                                  <div className="font-bold text-slate-900">
                                    Grand Total: ₹{Number(sale.grandTotal).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Card Footer Actions: Print/View Tax Receipt & Refill in POS */}
                            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSaleForReceipt(sale)}
                                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                                  title="View itemized printable tax invoice receipt"
                                >
                                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>View & Print Receipt</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSaleToDelete(sale)}
                                  className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer"
                                  title="Delete this invoice and restore stock"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const cust = selectedCustomerForDetails;
                                  setSelectedCustomerForDetails(null);
                                  handleStartSaleForCustomer(cust);
                                }}
                                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200/80 transition cursor-pointer active:scale-95"
                                title="Repeat order / Refill prescription in POS"
                              >
                                <Repeat className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Refill / Repeat in POS</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">
                          {historySearchQuery
                            ? 'No invoices match your search'
                            : 'No Purchase Invoices Found'}
                        </div>
                        <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                          {historySearchQuery
                            ? `Try clearing your search "${historySearchQuery}" to see all bills.`
                            : `Start a POS sale to begin building the clinical purchase record for ${selectedCustomerForDetails.name}.`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cust = selectedCustomerForDetails;
                          setSelectedCustomerForDetails(null);
                          handleStartSaleForCustomer(cust);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create First POS Bill</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Patient Profile & Clinical Details Tab */
                <div className="space-y-4">
                  {/* Prescribing Physician & Clinical details */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Medical Care & Prescribing Physician</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {selectedCustomerForDetails.doctorName
                        ? `Dr. ${selectedCustomerForDetails.doctorName}`
                        : 'No specific prescribing doctor recorded'}
                    </div>
                  </div>

                  {/* Allergies & Notes */}
                  {selectedCustomerForDetails.notes ? (
                    <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 shadow-2xs space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
                        <span>Allergies & Clinical Notes</span>
                      </div>
                      <div className="text-xs text-amber-950 font-medium leading-relaxed">
                        {selectedCustomerForDetails.notes}
                      </div>
                    </div>
                  ) : null}

                  {/* Residential Address */}
                  {selectedCustomerForDetails.address && (
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>Residential Address</span>
                      </div>
                      <div className="text-xs text-slate-800 leading-relaxed font-medium">
                        {selectedCustomerForDetails.address}
                      </div>
                    </div>
                  )}

                  {/* Account Balance & Credit info */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      <span>Account Balance & Credit Profile</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="text-[10px] text-slate-500">Pending Credit Due</div>
                        <div className="text-base font-bold text-slate-900 tabular-nums">
                          ₹{Number(selectedCustomerForDetails.pendingBalance || 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Credit Limit</div>
                        <div className="text-base font-bold text-slate-700 tabular-nums">
                          {selectedCustomerForDetails.creditLimit
                            ? `₹${selectedCustomerForDetails.creditLimit.toFixed(2)}`
                            : 'Standard terms'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleStartEditCustomer(selectedCustomerForDetails)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Customer Information</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Sticky Action */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCustomerForDetails(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const cust = selectedCustomerForDetails;
                  setSelectedCustomerForDetails(null);
                  handleStartSaleForCustomer(cust);
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Start POS Sale for {selectedCustomerForDetails.name.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200"
          onClick={() => setEditingCustomer(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Pencil className="w-4 h-4" />
                <span>Edit Patient Profile</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCustomer} className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Prescribing Doctor
                </label>
                <input
                  type="text"
                  value={editDoctor}
                  onChange={(e) => setEditDoctor(e.target.value)}
                  placeholder="e.g. Dr. A. K. Kulkarni"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="patient@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street / Colony / Flat"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Allergies & Clinical Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Allergies, chronic conditions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition active:scale-95 cursor-pointer text-center"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice / Receipt Modal when triggered from history */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

      {/* Add Customer Modal / Bottom Sheet */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Users className="w-4 h-4" />
                <span>Register Patient / Customer</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateCustomer}
              className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Customer / Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Amit Kumar Patel"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mobile Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Collapsible Clinical & Additional Details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="w-full flex items-center justify-between py-2.5 px-3 bg-slate-100/90 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-[11px] transition cursor-pointer"
                >
                  <span>
                    {showMoreDetails
                      ? 'Hide Additional Details'
                      : '+ More Details (Doctor, Allergies, Address, Email)'}
                  </span>
                  {showMoreDetails ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                {showMoreDetails && (
                  <div className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Prescribing Doctor
                      </label>
                      <div className="relative">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={formDoctor}
                          onChange={(e) => setFormDoctor(e.target.value)}
                          placeholder="e.g. Dr. A. Sharma"
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-2.5 py-2 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Allergies & Medical Notes
                      </label>
                      <textarea
                        rows={2}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="e.g. Penicillin allergy, Diabetic patient"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Residential Address
                      </label>
                      <input
                        type="text"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="Flat 201, Green View Apartments..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="patient@gmail.com"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition active:scale-95 cursor-pointer text-center"
                >
                  Save Patient Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal with Stock Restitution Preview */}
      <ConfirmDeleteInvoiceModal
        isOpen={!!saleToDelete}
        sale={saleToDelete}
        onClose={() => setSaleToDelete(null)}
        onConfirm={async (id) => {
          await deleteSale(id);
        }}
      />
    </div>
  );
};
