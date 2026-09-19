import React, { useState } from 'react';
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
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Customer } from '../types';

interface CustomersViewProps {
  onStartSale?: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onStartSale }) => {
  const { customers, addCustomer, sales } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDoctor, setFormDoctor] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.doctorName && c.doctorName.toLowerCase().includes(q))
    );
  });

  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    addCustomer({
      name: formName,
      phone: formPhone,
      email: formEmail,
      doctorName: formDoctor,
      address: formAddress,
      notes: formNotes,
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
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Customer & Patient Directory</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              {customers.length} Profiles
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Keep track of patient medical histories, prescribing physicians, contact information, and order profiles.
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
          <span>Add New Customer</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">Patient Profiles</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-slate-900 truncate">{customers.length}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Purchase history</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-emerald-700 truncate">Lifetime Value</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-emerald-600 truncate">{totalSpent.toLocaleString()}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Total patient spend</div>
        </div>

        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-bold text-blue-700 truncate">Invoices Fulfilled</div>
          <div className="mt-0.5 text-xs sm:text-base font-bold text-blue-600 truncate">{totalOrders}</div>
          <div className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Dispensed transactions</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search patients by name, mobile number, or prescribing doctor..."
          className="w-full text-xs text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.id}
            className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-blue-300 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">{cust.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{cust.phone}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {cust.totalOrders} Orders
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                {cust.doctorName && (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Doctor: {cust.doctorName}</span>
                  </div>
                )}
                {cust.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                )}
                {cust.address && (
                  <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{cust.address}</span>
                  </div>
                )}
                {cust.notes && (
                  <div className="p-2 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-100">
                    {cust.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Total Purchases</div>
                <div className="font-bold text-slate-900">{cust.totalSpent.toLocaleString()}</div>
              </div>

              {onStartSale && (
                <button
                  onClick={() => onStartSale(cust)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>New Sale</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
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

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3.5 text-xs max-h-[82vh] overflow-y-auto">
              {/* Primary essentials: Name & Phone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Customer / Patient Name *
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
                  Mobile Phone *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98765 00000"
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
                  <span>{showMoreDetails ? 'Hide Additional Details' : '+ More Details (Doctor, Email, Address, Allergies)'}</span>
                  {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                </button>

                {showMoreDetails && (
                  <div className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Prescribing Doctor</label>
                      <input
                        type="text"
                        value={formDoctor}
                        onChange={(e) => setFormDoctor(e.target.value)}
                        placeholder="e.g. Dr. A. Sharma"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="patient@gmail.com"
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        placeholder="Flat 201, Green View Apartments..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Allergies / Special Notes</label>
                      <textarea
                        rows={2}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="e.g. Penicillin allergy, Diabetic patient"
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
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
