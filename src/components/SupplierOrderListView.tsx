import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Copy,
  Check,
  Send,
  Trash2,
  Phone,
  Sparkles,
  CheckCircle2,
  Package,
  ShoppingBag,
  MessageSquare,
  X,
  User,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { SupplierOrderList, SupplierOrderStatus } from '../types';

export const SupplierOrderListView: React.FC<{
  onOpenNewPO?: () => void;
  standalone?: boolean;
}> = ({ onOpenNewPO, standalone = false }) => {
  const {
    products,
    suppliers,
    currentUser,
    supplierOrderLists,
    createSupplierOrderList,
    updateSupplierOrderList,
    deleteSupplierOrderList,
    addSupplierOrderItem,
    updateSupplierOrderItem,
    removeSupplierOrderItem,
    addLowStockToOrderList,
    generateWhatsAppOrderText,
    convertOrderListToPurchase,
    getProductTotalStock,
  } = usePharmacy();

  // Active selected list ID
  const [selectedListId, setSelectedListId] = useState<string>(() => {
    return supplierOrderLists[0]?.id || '';
  });

  // Active list memo
  const activeList = useMemo(() => {
    return (
      supplierOrderLists.find((l) => l.id === selectedListId) ||
      supplierOrderLists[0] ||
      null
    );
  }, [supplierOrderLists, selectedListId]);

  // Modals state
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // New list form state
  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const [newListTitle, setNewListTitle] = useState(`${currentMonthName} Order`);
  const [newListSupplierId, setNewListSupplierId] = useState(suppliers[0]?.id || '');
  const [newListSupplierName, setNewListSupplierName] = useState(suppliers[0]?.name || '');
  const [newListSupplierPhone, setNewListSupplierPhone] = useState(suppliers[0]?.phone || '');
  const [newListAssignedUser, setNewListAssignedUser] = useState(currentUser || 'Pharmacist');
  const [newListMonth, setNewListMonth] = useState(currentMonthStr);
  const [newListNotes, setNewListNotes] = useState('Fresh batch with long expiry please.');

  // Add Item to active list form state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [customItemName, setCustomItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(10);
  const [itemUnit, setItemUnit] = useState<string>('Strip');
  const [itemNotes, setItemNotes] = useState('');
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  // Filtered search results from product catalog
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [products, searchQuery]);

  // Count low stock items across store that are NOT yet in the active list
  const lowStockProductsCount = useMemo(() => {
    if (!activeList) return 0;
    const existingIds = new Set(activeList.items.map((i) => i.productId).filter(Boolean));
    return products.filter((p) => {
      const stock = getProductTotalStock(p.id);
      return stock <= p.minStockBaseUnits && !existingIds.has(p.id);
    }).length;
  }, [products, activeList, getProductTotalStock]);

  const handleSelectProduct = (prod: any) => {
    setSelectedProduct(prod);
    setCustomItemName(prod.name);
    setSearchQuery(prod.name);
    setIsSearchingProduct(false);

    if (prod.units && prod.units.length > 0) {
      setItemUnit(prod.units[0].name);
    } else {
      setItemUnit(prod.baseUnit || 'Strip');
    }
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeList) return;

    const nameToUse = selectedProduct ? selectedProduct.name : customItemName.trim();
    if (!nameToUse) return;

    const currentStock = selectedProduct ? getProductTotalStock(selectedProduct.id) : undefined;
    const minThreshold = selectedProduct ? selectedProduct.minStockBaseUnits : undefined;
    const estPrice = selectedProduct
      ? selectedProduct.purchasePrice || selectedProduct.basePurchasePrice || 0
      : undefined;

    addSupplierOrderItem(activeList.id, {
      productId: selectedProduct ? selectedProduct.id : undefined,
      productName: nameToUse,
      brand: selectedProduct?.brand || '',
      category: selectedProduct?.category || '',
      unitName: itemUnit,
      quantity: Number(itemQuantity) || 1,
      currentStock,
      minStockThreshold: minThreshold,
      purchasePriceEstimate: estPrice,
      notes: itemNotes.trim(),
    });

    setSearchQuery('');
    setCustomItemName('');
    setSelectedProduct(null);
    setItemNotes('');
    setItemQuantity(10);
    setIsSearchingProduct(false);

    triggerNotification(`Added ${nameToUse} (${itemQuantity} ${itemUnit})`);
  };

  const handleCreateNewList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    const created = createSupplierOrderList({
      title: newListTitle.trim(),
      supplierId: newListSupplierId,
      supplierName: newListSupplierName.trim() || 'General Supplier',
      supplierPhone: newListSupplierPhone.trim(),
      assignedUser: newListAssignedUser.trim() || currentUser || 'Pharmacist',
      createdBy: newListAssignedUser.trim() || currentUser || 'Pharmacist',
      monthYear: newListMonth,
      notes: newListNotes.trim(),
    });

    setSelectedListId(created.id);
    setShowNewListModal(false);
    triggerNotification(`Created draft "${created.title}"`);
  };

  const handleAddAllLowStock = () => {
    if (!activeList) return;
    const addedCount = addLowStockToOrderList(activeList.id);
    if (addedCount > 0) {
      triggerNotification(`Added ${addedCount} low stock items`);
    } else {
      triggerNotification(`All low stock items already in list`);
    }
  };

  const handleCopyWhatsAppText = () => {
    if (!activeList) return;
    const text = generateWhatsAppOrderText(activeList);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSuccess(true);
      triggerNotification('Order text copied');
      setTimeout(() => setCopiedSuccess(false), 2500);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!activeList) return;
    const text = generateWhatsAppOrderText(activeList);
    const encoded = encodeURIComponent(text);

    let cleanPhone = (activeList.supplierPhone || '').replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.replace('+', '');
    } else if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    let url = `https://wa.me/?text=${encoded}`;
    if (cleanPhone && cleanPhone.length >= 10) {
      url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    }

    updateSupplierOrderList(activeList.id, {
      status: 'Sent',
      lastSharedAt: new Date().toISOString(),
    });

    window.open(url, '_blank');
  };

  const handleConvertToPurchase = () => {
    if (!activeList || activeList.items.length === 0) return;
    const confirmed = window.confirm(
      `Convert "${activeList.title}" to a Purchase Order? This will record inward stock once received. Draft remains saved.`
    );
    if (!confirmed) return;

    convertOrderListToPurchase(activeList.id);
    triggerNotification('Converted to Purchase Order');
    if (onOpenNewPO) onOpenNewPO();
  };

  const handleDeleteDraft = (list: SupplierOrderList) => {
    const confirmed = window.confirm(
      `Delete draft "${list.title}"? Other drafts will not be affected.`
    );
    if (!confirmed) return;

    deleteSupplierOrderList(list.id);
    triggerNotification(`Deleted "${list.title}"`);

    if (selectedListId === list.id) {
      const remaining = supplierOrderLists.filter((l) => l.id !== list.id);
      if (remaining.length > 0) {
        setSelectedListId(remaining[0].id);
      }
    }
  };

  const triggerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const getStatusBadge = (status: SupplierOrderStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Draft
          </span>
        );
      case 'Ready':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Ready
          </span>
        );
      case 'Sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Send className="w-3 h-3 text-emerald-600" />
            Sent
          </span>
        );
      case 'Received':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Package className="w-3 h-3 text-purple-600" />
            Received
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`w-full max-w-full space-y-3 ${standalone ? 'pb-12' : ''}`}>
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white shadow-md text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Header Bar (Compact & Small Font like other screens) */}
      <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight leading-tight">
              Monthly Order List
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              Order shortages for suppliers & share on WhatsApp
            </p>
          </div>
        </div>

        {/* Draft Selector & New Draft Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Draft:</span>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none max-w-[200px] sm:max-w-xs truncate cursor-pointer"
            >
              {supplierOrderLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.supplierName} ({l.items.length}) - {l.assignedUser || 'Staff'}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewListSupplierId(suppliers[0]?.id || '');
              setNewListSupplierName(suppliers[0]?.name || '');
              setNewListSupplierPhone(suppliers[0]?.phone || '');
              setNewListAssignedUser(currentUser || 'Pharmacist');
              setNewListTitle(`${currentMonthName} Order`);
              setShowNewListModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Draft</span>
          </button>
        </div>
      </div>

      {activeList ? (
        <div className="space-y-3">
          {/* Active Draft Details & Action Strip (Simple, Compact, No Clutter) */}
          <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-semibold text-slate-900">{activeList.supplierName}</span>
              {activeList.supplierPhone && (
                <span className="font-mono text-emerald-700 text-[11px]">{activeList.supplierPhone}</span>
              )}
              <span className="text-slate-400 text-[11px]">•</span>
              <span className="text-slate-500 text-[11px]">User: <strong className="text-slate-700 font-medium">{activeList.assignedUser || 'Staff'}</strong></span>
              <span className="text-slate-400 text-[11px]">•</span>
              <span className="text-slate-500 text-[11px]">{activeList.monthYear}</span>
              {getStatusBadge(activeList.status)}
            </div>

            {/* Compact Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
                title="Send order on WhatsApp"
              >
                <Send className="w-3 h-3 fill-white" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyWhatsAppText}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
                title="Copy text"
              >
                {copiedSuccess ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-500" />
                )}
                <span>{copiedSuccess ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
                title="Preview text"
              >
                <MessageSquare className="w-3 h-3 text-slate-500" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={handleConvertToPurchase}
                className="flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium transition cursor-pointer"
                title="Convert to PO"
              >
                <Package className="w-3 h-3 text-purple-600" />
                <span>Convert to PO</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteDraft(activeList)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer ml-1"
                title="Delete this draft"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Add Medicine Bar (Single Compact Form, No Horizontal Scroll) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs">
            <form onSubmit={handleAddItemSubmit} className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Search Medicine Input */}
                <div className="sm:col-span-5 relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Medicine name (e.g. Augmentin, Dolo)..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCustomItemName(e.target.value);
                        setSelectedProduct(null);
                        setIsSearchingProduct(true);
                      }}
                      onFocus={() => setIsSearchingProduct(true)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isSearchingProduct && filteredProducts.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredProducts.map((p) => {
                        const stock = getProductTotalStock(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(p)}
                            className="p-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{p.brand}</p>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">
                              Stock: {stock}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Packaging Unit */}
                <div className="sm:col-span-2">
                  <select
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none"
                  >
                    <option value="Strip">Strip</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Box">Box</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Tube">Tube</option>
                    <option value="Vial">Vial</option>
                    <option value="Sachet">Sachet</option>
                    <option value="Piece">Piece</option>
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 5))}
                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1 py-1.5 text-center text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setItemQuantity(itemQuantity + 5)}
                    className="px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600"
                  >
                    +
                  </button>
                </div>

                {/* Notes (Optional) */}
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Submit Add Button */}
                <div className="sm:col-span-1">
                  <button
                    type="submit"
                    className="w-full h-full min-h-[30px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* In-store match hint & Low Stock quick-fill */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                {selectedProduct ? (
                  <span className="text-emerald-700 font-medium">
                    Stock: {getProductTotalStock(selectedProduct.id)} {selectedProduct.baseUnit}
                  </span>
                ) : (
                  <span className="text-slate-400">Can add any catalog or custom medicine</span>
                )}

                {lowStockProductsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleAddAllLowStock}
                    className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 font-medium transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>+ Add {lowStockProductsCount} Low Stock</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Medicines in Order (Simple, Compact, No Horizontal Scroll) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-700 font-semibold bg-slate-50/50">
              <span>Items ({activeList.items.length})</span>
              <span className="text-slate-500 font-normal text-[11px]">
                Total: <strong className="text-slate-800 font-semibold">{activeList.items.reduce((s, it) => s + it.quantity, 0)} units</strong>
              </span>
            </div>

            {activeList.items.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <ShoppingBag className="w-5 h-5 mx-auto text-slate-300" />
                <p>No medicines added yet. Type above to add.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeList.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="px-3.5 py-2 hover:bg-slate-50 transition flex items-center justify-between gap-2 text-xs"
                  >
                    {/* Index & Name */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 font-medium w-4 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 truncate">
                        <span className="font-semibold text-slate-900 truncate">
                          {item.productName}
                        </span>
                        {item.brand && (
                          <span className="text-[11px] text-slate-400 ml-1.5">
                            ({item.brand})
                          </span>
                        )}
                        {item.notes && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded ml-1.5">
                            {item.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock, Stepper, Unit, Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.currentStock !== undefined && (
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          Stock: {item.currentStock}
                        </span>
                      )}

                      {/* Stepper */}
                      <div className="flex items-center border border-slate-200 rounded bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            updateSupplierOrderItem(activeList.id, item.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 py-0.5 text-xs font-semibold text-slate-800 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSupplierOrderItem(activeList.id, item.id, {
                              quantity: item.quantity + 1,
                            })
                          }
                          className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          +
                        </button>
                      </div>

                      {/* Unit */}
                      <span className="text-[11px] text-slate-500 font-medium w-12 text-left">
                        {item.unitName}
                      </span>

                      {/* Remove Item */}
                      <button
                        type="button"
                        onClick={() => removeSupplierOrderItem(activeList.id, item.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded transition cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-2 text-xs">
          <p className="text-slate-500">No draft order found.</p>
          <button
            type="button"
            onClick={() => setShowNewListModal(true)}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium text-xs shadow-xs"
          >
            Create Draft Order
          </button>
        </div>
      )}

      {/* MODAL: CREATE NEW DRAFT (Compact & Simple) */}
      {showNewListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-4 space-y-3 shadow-xl border border-slate-200 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-semibold text-sm text-slate-900">New Draft Order</h3>
              <button
                type="button"
                onClick={() => setShowNewListModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewList} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Order Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sep Order - MediCare"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Supplier
                  </label>
                  <select
                    value={newListSupplierId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setNewListSupplierId(id);
                      const s = suppliers.find((sup) => sup.id === id);
                      if (s) {
                        setNewListSupplierName(s.name);
                        setNewListSupplierPhone(s.phone);
                        setNewListTitle(`${currentMonthName} - ${s.name}`);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                    <option value="">Other</option>
                  </select>
                </div>

                {!newListSupplierId ? (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Supplier Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Supplier Name"
                      value={newListSupplierName}
                      onChange={(e) => setNewListSupplierName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      WhatsApp Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9811122334"
                      value={newListSupplierPhone}
                      onChange={(e) => setNewListSupplierPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Staff / User
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vivek, Counter 1"
                    value={newListAssignedUser}
                    onChange={(e) => setNewListAssignedUser(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Month
                  </label>
                  <input
                    type="month"
                    value={newListMonth}
                    onChange={(e) => setNewListMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Remarks / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Long expiry please"
                  value={newListNotes}
                  onChange={(e) => setNewListNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewListModal(false)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW WHATSAPP (Compact) */}
      {showPreviewModal && activeList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-4 space-y-3 shadow-xl border border-slate-200 text-xs animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-semibold text-sm text-slate-900">WhatsApp Text Preview</h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {generateWhatsAppOrderText(activeList)}
            </div>

            <div className="pt-1 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 truncate">
                To: {activeList.supplierName} ({activeList.supplierPhone || 'Select in WhatsApp'})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyWhatsAppText}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleOpenWhatsApp();
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
