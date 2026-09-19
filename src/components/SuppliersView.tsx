import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Calendar,
  Truck,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Supplier } from '../types';

interface SuppliersViewProps {
  onOpenNewPO?: (supplierId?: string) => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({ onOpenNewPO }) => {
  const { suppliers, addSupplier, purchaseOrders } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30 Days');

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.gstin && s.gstin.toLowerCase().includes(q))
    );
  });

  const totalPurchases = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);
  const totalPendingBalance = suppliers.reduce((sum, s) => sum + s.pendingBalance, 0);

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    addSupplier({
      name: formName,
      contactPerson: formContact,
      phone: formPhone,
      email: formEmail,
      address: formAddress,
      gstin: formGstin,
      paymentTerms: formPaymentTerms,
      totalPurchases: 0,
      pendingBalance: 0,
      isActive: true,
    });

    setShowAddModal(false);
    setFormName('');
    setFormContact('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormGstin('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Suppliers & Wholesale Distributors</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {suppliers.length} Active Vendors
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Manage pharmaceutical wholesalers, delivery contacts, credit terms, and purchase orders.
          </p>
        </div>

        <button
          onClick={() => {
            setShowMoreDetails(false);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">Total Suppliers</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-slate-900 truncate">{suppliers.length}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Verified distributors</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-700 truncate">Cumulative Procurements</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-emerald-600 truncate">{totalPurchases.toLocaleString()}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Total purchases</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-amber-700 truncate">Pending Payables</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-amber-600 truncate">{totalPendingBalance.toLocaleString()}</div>
          <div className="text-[9px] sm:text-[10px] text-amber-700 font-medium mt-0.5 truncate">Outstanding vendor credit</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search suppliers by company name, contact person, phone, or GSTIN..."
          className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((sup) => {
          const supplierPOs = purchaseOrders.filter((po) => po.supplierId === sup.id);

          return (
            <div
              key={sup.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">{sup.name}</h3>
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      Contact: {sup.contactPerson}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {sup.paymentTerms}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.phone}</span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{sup.email}</span>
                    </div>
                  )}
                  {sup.gstin && (
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>GSTIN: {sup.gstin}</span>
                    </div>
                  )}
                  {sup.address && (
                    <div className="flex items-start gap-2 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{sup.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Pending Balance</div>
                  <div className={`font-bold ${sup.pendingBalance > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {sup.pendingBalance.toLocaleString()}
                  </div>
                </div>

                {onOpenNewPO && (
                  <button
                    onClick={() => onOpenNewPO(sup.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold transition"
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>New Order</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Building2 className="w-4 h-4" />
                <span>Add Medicine Supplier / Distributor</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-3.5 text-xs max-h-[82vh] overflow-y-auto">
              {/* Primary essentials: Name & Phone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Company / Wholesaler Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Apex Pharma Agencies"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Collapsible Additional Details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="w-full flex items-center justify-between py-2 px-3 bg-slate-100/80 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-[11px] transition cursor-pointer"
                >
                  <span>{showMoreDetails ? 'Hide Additional Details' : '+ More Details (Contact Person, Email, GSTIN, Terms, Address)'}</span>
                  {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                </button>

                {showMoreDetails && (
                  <div className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Contact Person</label>
                        <input
                          type="text"
                          value={formContact}
                          onChange={(e) => setFormContact(e.target.value)}
                          placeholder="e.g. Rajeev Gupta"
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Payment Terms</label>
                        <select
                          value={formPaymentTerms}
                          onChange={(e) => setFormPaymentTerms(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="Immediate / Cash">Immediate / Cash</option>
                          <option value="Net 7 Days">Net 7 Days</option>
                          <option value="Net 15 Days">Net 15 Days</option>
                          <option value="Net 30 Days">Net 30 Days</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Email</label>
                        <input
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="sales@supplier.com"
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">GSTIN Number</label>
                        <input
                          type="text"
                          value={formGstin}
                          onChange={(e) => setFormGstin(e.target.value)}
                          placeholder="27AABCM..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-slate-900 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Warehouse Address</label>
                      <input
                        type="text"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="Plot 10, Industrial Area..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
