import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  Building2,
  FileBadge,
  Upload,
  Image as ImageIcon,
  Trash2,
  Save,
  CheckCircle2,
  Printer,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Sparkles,
  Cloud,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { StoreSettings } from '../types';
import { optimizeImageFile } from '../lib/imageOptimizer';

export const BusinessSettingsView: React.FC = () => {
  const { settings, updateSettings } = usePharmacy();

  // Form states
  const [formStoreName, setFormStoreName] = useState(settings.storeName || '');
  const [formTagline, setFormTagline] = useState(settings.tagline || '');
  const [formAddress, setFormAddress] = useState(settings.address || '');
  const [formPhone, setFormPhone] = useState(settings.phone || '');
  const [formEmail, setFormEmail] = useState(settings.email || '');
  const [formDlNumber, setFormDlNumber] = useState(settings.dlNumber || '');
  const [formDlNumber2, setFormDlNumber2] = useState(settings.dlNumber2 || '');
  const [formGstin, setFormGstin] = useState(settings.gstin || '');
  const [formFssai, setFormFssai] = useState(settings.fssaiNumber || '');
  const [formInvoiceTerms, setFormInvoiceTerms] = useState(
    settings.invoiceTerms ||
      'Medicines once sold can only be returned in original sealed packaging within 7 days with valid bill.'
  );
  const [storeLogo, setStoreLogo] = useState<string>(settings.storeLogo || '');
  const [stampLogo, setStampLogo] = useState<string>(settings.stampLogo || '');

  // Keep form in sync if remote database settings arrive
  useEffect(() => {
    if (settings.storeName) setFormStoreName(settings.storeName);
    if (settings.tagline !== undefined) setFormTagline(settings.tagline);
    if (settings.address) setFormAddress(settings.address);
    if (settings.phone) setFormPhone(settings.phone);
    if (settings.email !== undefined) setFormEmail(settings.email);
    if (settings.dlNumber) setFormDlNumber(settings.dlNumber);
    if (settings.dlNumber2 !== undefined) setFormDlNumber2(settings.dlNumber2);
    if (settings.gstin) setFormGstin(settings.gstin);
    if (settings.fssaiNumber !== undefined) setFormFssai(settings.fssaiNumber);
    if (settings.invoiceTerms) setFormInvoiceTerms(settings.invoiceTerms);
    if (settings.storeLogo) setStoreLogo(settings.storeLogo);
    if (settings.stampLogo) setStampLogo(settings.stampLogo);
  }, [settings]);

  // UI status
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  // File to Base64 reader with size validation (max 1.5MB)
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'logo' | 'stamp'
  ) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    try {
      const optimizedDataUrl = await optimizeImageFile(file, 800, 0.85);
      if (target === 'logo') {
        setStoreLogo(optimizedDataUrl);
      } else {
        setStampLogo(optimizedDataUrl);
      }
    } catch {
      setUploadError('Failed to process image file. Please try another image.');
    }
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: formStoreName.trim(),
      tagline: formTagline.trim(),
      address: formAddress.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      dlNumber: formDlNumber.trim(),
      dlNumber2: formDlNumber2.trim(),
      gstin: formGstin.trim(),
      fssaiNumber: formFssai.trim(),
      invoiceTerms: formInvoiceTerms.trim(),
      storeLogo,
      stampLogo,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleResetToCurrent = () => {
    setFormStoreName(settings.storeName || '');
    setFormTagline(settings.tagline || '');
    setFormAddress(settings.address || '');
    setFormPhone(settings.phone || '');
    setFormEmail(settings.email || '');
    setFormDlNumber(settings.dlNumber || '');
    setFormDlNumber2(settings.dlNumber2 || '');
    setFormGstin(settings.gstin || '');
    setFormFssai(settings.fssaiNumber || '');
    setFormInvoiceTerms(settings.invoiceTerms || '');
    setStoreLogo(settings.storeLogo || '');
    setStampLogo(settings.stampLogo || '');
    setUploadError(null);
  };

  const handleSamplePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Business Settings</h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold border border-emerald-200/80">
                  Invoice Branding
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200/60">
                  <Cloud className="w-3 h-3 text-blue-500" />
                  <Smartphone className="w-3 h-3 text-blue-500" />
                  Database Synced (Web & Phone)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure your medical store name, address, drug license number, logo, and stamp. Changes sync automatically across all web and mobile devices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Synced with Phone & Database!</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            id="save-business-settings-top-btn"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save & Sync to Phone</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Main Grid: Form on Left (60%), Live Invoice Preview on Right (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Settings Configuration Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Card 1: Medical Store Identity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Medical Store Identity</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medical Store Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="business-store-name-input"
                value={formStoreName}
                onChange={(e) => setFormStoreName(e.target.value)}
                placeholder="e.g. Apex Medical & General Store"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This exact name will be displayed at the very top of all billing receipts and invoices.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tagline / Sub-Heading <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="business-tagline-input"
                value={formTagline}
                onChange={(e) => setFormTagline(e.target.value)}
                placeholder="e.g. 24x7 Chemist & Surgical Equipment"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
              />
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    id="business-phone-input"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. +91 98200 12345"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    id="business-email-input"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. pharmacy@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Physical Store Address */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Store Address</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Physical Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="business-address-input"
                rows={3}
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Shop No. 4, Health Plaza, Station Road, Opp. Civil Hospital, City, State - 400001"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Printed directly below the store name in the invoice header for legal compliance.
              </p>
            </div>
          </div>

          {/* Card 3: Drug License & Regulatory Details (NOT MANDATORY) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileBadge className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Drug License & Tax Compliance</h3>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                Not Mandatory
              </span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Drug License and GSTIN numbers are <strong>not mandatory</strong>. If you provide them, they will be automatically rendered in the header of all printed invoices as required by pharmacy law.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Drug License No. (DL 1) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="business-dl-input"
                  value={formDlNumber}
                  onChange={(e) => setFormDlNumber(e.target.value)}
                  placeholder="e.g. 20B/MH/2024/09812"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Drug License (DL 2) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="business-dl2-input"
                  value={formDlNumber2}
                  onChange={(e) => setFormDlNumber2(e.target.value)}
                  placeholder="e.g. 21B/MH/2024/09813"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GSTIN Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="business-gstin-input"
                  value={formGstin}
                  onChange={(e) => setFormGstin(e.target.value)}
                  placeholder="e.g. 27AABCU9603R1ZM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  FSSAI License No. <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  id="business-fssai-input"
                  value={formFssai}
                  onChange={(e) => setFormFssai(e.target.value)}
                  placeholder="e.g. 11521018000123"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Store Logo & Stamp Logo Uploaders */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Store Logo & Stamp Logo</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Store Logo Uploader */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Store Logo <span className="text-slate-400 font-normal">(Header)</span>
                  </label>
                  {storeLogo && (
                    <button
                      type="button"
                      onClick={() => setStoreLogo('')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {storeLogo ? (
                  <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl">
                    <img
                      src={storeLogo}
                      alt="Store Logo Preview"
                      className="h-16 w-auto max-w-full object-contain"
                    />
                    <span className="text-[10px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Logo Active
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl cursor-pointer transition text-center group"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1 transition" />
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                      Upload Store Logo
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG, SVG (Max 2MB)
                    </span>
                  </div>
                )}

                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={(e) => handleImageUpload(e, 'logo')}
                  accept="image/*"
                  className="hidden"
                />

                <div className="text-[10px] text-slate-500 leading-tight">
                  Displays in the top center/header of printed invoices and patient receipts.
                </div>
              </div>

              {/* Stamp Logo / Seal Uploader */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Store Stamp / Seal <span className="text-slate-400 font-normal">(Signatory)</span>
                  </label>
                  {stampLogo && (
                    <button
                      type="button"
                      onClick={() => setStampLogo('')}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {stampLogo ? (
                  <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl">
                    <img
                      src={stampLogo}
                      alt="Stamp Logo Preview"
                      className="h-16 w-auto max-w-full object-contain"
                    />
                    <span className="text-[10px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Stamp Active
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => stampInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl cursor-pointer transition text-center group"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1 transition" />
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                      Upload Stamp / Seal
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Round seal or signature stamp
                    </span>
                  </div>
                )}

                <input
                  type="file"
                  ref={stampInputRef}
                  onChange={(e) => handleImageUpload(e, 'stamp')}
                  accept="image/*"
                  className="hidden"
                />

                <div className="text-[10px] text-slate-500 leading-tight">
                  Displays at the bottom right corner of the invoice over "Authorized Signatory".
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Invoice Terms & Footer */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Invoice Terms & Return Policy</h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Footer Terms & Instructions
              </label>
              <textarea
                id="business-invoice-terms-input"
                rows={2}
                value={formInvoiceTerms}
                onChange={(e) => setFormInvoiceTerms(e.target.value)}
                placeholder="e.g. Medicines once sold can only be returned in original sealed packaging within 7 days with valid bill."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetToCurrent}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Reset Changes
            </button>

            <button
              type="submit"
              id="save-business-settings-bottom-btn"
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save & Sync to Phone</span>
            </button>
          </div>
        </form>

        {/* Right: Live Interactive Invoice Preview */}
        <div className="lg:col-span-5 space-y-4 sticky top-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Live Invoice Print Preview</h3>
            </div>
            <button
              type="button"
              onClick={handleSamplePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Test print current invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Test Print</span>
            </button>
          </div>

          {/* Realistic Paper Receipt Preview */}
          <div className="bg-white border border-slate-300 rounded-3xl p-6 shadow-lg text-slate-800 font-mono text-xs space-y-3 relative overflow-hidden">
            {/* Pharmacy Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
              {storeLogo ? (
                <div className="mb-2 flex justify-center">
                  <img
                    src={storeLogo}
                    alt="Store Logo"
                    className="h-12 w-auto max-w-[150px] object-contain"
                  />
                </div>
              ) : null}

              <div className="font-extrabold text-base tracking-tight font-sans text-slate-900 leading-tight">
                {formStoreName || 'Your Medical Store Name'}
              </div>

              {formTagline && (
                <div className="text-[11px] text-slate-500 font-sans">{formTagline}</div>
              )}

              <div className="text-[10px] text-slate-600 leading-tight">
                {formAddress || 'Store Address Line, City, State - Pincode'}
              </div>

              {(formPhone || formEmail) && (
                <div className="text-[10px] text-slate-600">
                  {[formPhone ? `Ph: ${formPhone}` : null, formEmail ? `Email: ${formEmail}` : null]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              )}

              {/* Drug License Numbers (rendered only if provided!) */}
              {(formDlNumber || formDlNumber2) && (
                <div className="text-[10px] font-bold text-slate-800 pt-0.5">
                  {[
                    formDlNumber ? `DL: ${formDlNumber}` : null,
                    formDlNumber2 ? `DL-2: ${formDlNumber2}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              )}

              {/* GSTIN (rendered only if provided!) */}
              {formGstin && (
                <div className="text-[10px] text-slate-600">GSTIN: {formGstin}</div>
              )}
            </div>

            {/* Bill Meta */}
            <div className="py-2 border-b border-dashed border-slate-300 grid grid-cols-2 gap-1 text-[10px]">
              <div>
                <span className="text-slate-500">Invoice:</span>{' '}
                <strong>INV-2026-9042</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Date:</span> 20/09/2026, 11:30 AM
              </div>
              <div>
                <span className="text-slate-500">Patient:</span> Walk-in Customer
              </div>
              <div className="text-right">
                <span className="text-slate-500">Doctor:</span> Self / OTC
              </div>
            </div>

            {/* Items Table Mock */}
            <div className="py-2 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 gap-1 font-bold text-[9px] text-slate-500 uppercase border-b pb-1">
                <span className="col-span-6">Item (Batch • Exp)</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Amount</span>
              </div>
              <div className="divide-y divide-slate-100 py-1 text-[10px]">
                <div className="grid grid-cols-12 gap-1 py-1 items-center">
                  <div className="col-span-6 leading-tight">
                    <div className="font-bold text-slate-900 font-sans">Dolo 650mg Tablet</div>
                    <div className="text-[9px] text-slate-500">B: DL092 • Exp: 2027-12</div>
                  </div>
                  <div className="col-span-2 text-center">1 Strip</div>
                  <div className="col-span-4 text-right font-semibold">₹34.00</div>
                </div>
                <div className="grid grid-cols-12 gap-1 py-1 items-center">
                  <div className="col-span-6 leading-tight">
                    <div className="font-bold text-slate-900 font-sans">Azithromycin 500mg</div>
                    <div className="text-[9px] text-slate-500">B: AZ441 • Exp: 2028-06</div>
                  </div>
                  <div className="col-span-2 text-center">1 Strip</div>
                  <div className="col-span-4 text-right font-semibold">₹118.00</div>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">₹135.71</span>
              </div>
              <div className="flex justify-between">
                <span>GST (12%):</span>
                <span className="font-medium">₹16.29</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900 pt-1 border-t">
                <span>NET PAYABLE:</span>
                <span>₹152.00</span>
              </div>
            </div>

            {/* Bottom Stamp & Signatory */}
            <div className="pt-2 flex items-end justify-between gap-2">
              <div className="text-[8px] text-slate-500 max-w-[190px] leading-tight font-sans">
                {formInvoiceTerms ||
                  'Medicines once sold can only be returned in original sealed packaging.'}
              </div>

              <div className="text-center shrink-0">
                {stampLogo ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={stampLogo}
                      alt="Official Store Stamp"
                      className="h-14 w-auto max-w-[90px] object-contain mb-0.5"
                    />
                    <span className="text-[8px] font-bold text-slate-800 uppercase tracking-tight">
                      Authorized Signatory
                    </span>
                  </div>
                ) : (
                  <div className="pt-4">
                    <div className="border-t border-slate-400 w-24 mx-auto mb-0.5" />
                    <span className="text-[8px] text-slate-500 uppercase tracking-tight">
                      Authorized Signatory
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All printed bills in <strong>Sales Counter (POS)</strong>, <strong>Dashboard</strong>, and receipts will immediately reflect these business details.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
