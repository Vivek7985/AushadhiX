import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  Pill,
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Camera,
  Upload,
  X,
  Eye,
  Info,
  List,
  LayoutGrid,
  Table,
  TrendingUp,
  TrendingDown,
  Percent,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FolderTree,
  Star,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Image as ImageIcon,
  FolderOpen,
  Check,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { Product, PackagingUnit, ProductComposition } from '../types';
import { HorizontalSlidingChips } from './HorizontalSlidingChips';
import { BODY_PARTS, getBodyPartInfo } from '../data/bodyParts';
import { ProductPhotoPickerModal } from './ProductPhotoPickerModal';
import { ProductAiScannerModal, ExtractedProductData } from './ProductAiScannerModal';
import { optimizeImageFile } from '../lib/imageOptimizer';
import { getProductSingleTabletPricing } from '../utils/unitPricing';

const PACKAGING_PRESET_OPTIONS = [
  { value: 'pack10', label: 'Pack of 10' },
  { value: 'strip10', label: 'Strip (10 tabs)' },
  { value: 'strip15', label: 'Strip (15 tabs)' },
  { value: 'strip20', label: 'Strip (20 tabs)' },
  { value: 'strip30', label: 'Strip (30 tabs)' },
  { value: 'strip4', label: 'Strip (4 tabs)' },
  { value: 'single', label: '1 Unit / Piece' },
  { value: 'bottle', label: 'Bottle / Syrup' },
] as const;

export const ProductsView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    suppliers,
    getProductTotalStock,
    getProductBatches,
    getAlternativeProducts,
    currentRole,
    gstRates,
    getDefaultGSTRate,
    getGSTRateById,
    categories,
    addCategory,
  } = usePharmacy();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBodyPart, setSelectedBodyPart] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [inspectingImageIndex, setInspectingImageIndex] = useState(0);
  const [altModalProduct, setAltModalProduct] = useState<Product | null>(null);

  // AI Scanner Modal State
  const [showAiScannerModal, setShowAiScannerModal] = useState(false);
  const [aiScannerInitialImage, setAiScannerInitialImage] = useState<string | null>(null);
  const [scannedNotification, setScannedNotification] = useState<string | null>(null);

  // Delete Product Confirmation State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);

  const handleConfirmDelete = () => {
    if (!productToDelete) return;
    const name = productToDelete.name;
    const ok = deleteProduct(productToDelete.id, true);
    if (ok) {
      if (editingProduct?.id === productToDelete.id) {
        setShowAddModal(false);
        setEditingProduct(null);
      }
      if (inspectingProduct?.id === productToDelete.id) {
        setInspectingProduct(null);
      }
      setProductToDelete(null);
      setDeleteSuccessToast(`Product "${name}" deleted successfully.`);
      setTimeout(() => setDeleteSuccessToast(null), 4000);
    }
  };

  // Quick inline category add modal inside product form
  const [showQuickAddCatModal, setShowQuickAddCatModal] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatBodyPart, setQuickCatBodyPart] = useState('Ear');
  const [quickCatIcon, setQuickCatIcon] = useState('👂');

  // Quick packaging preset
  const [packagingPreset, setPackagingPreset] = useState<'pack10' | 'strip10' | 'strip15' | 'strip20' | 'strip30' | 'strip4' | 'single' | 'bottle' | 'custom'>('strip10');

  const handlePresetChange = (preset: 'pack10' | 'strip10' | 'strip15' | 'strip20' | 'strip30' | 'strip4' | 'single' | 'bottle' | 'custom') => {
    setPackagingPreset(preset);
    const curSelling = formSellingPrice.trim() !== '' && Number(formSellingPrice) > 0 ? Number(formSellingPrice) : null;
    const curPurchase = formPurchasePrice.trim() !== '' && Number(formPurchasePrice) > 0 ? Number(formPurchasePrice) : null;

    if (preset === 'pack10') {
      const mult = 10;
      const sPrice = curSelling || 100;
      const pPrice = curPurchase || 80;
      const tabSell = Number((sPrice / mult).toFixed(2));
      const tabBuy = Number((pPrice / mult).toFixed(2));
      setBaseUnitName('Piece');
      setUnits([
        { id: 'u-1', name: 'Pack', shortCode: 'PACK', multiplierToBase: mult, defaultSellingPrice: sPrice, defaultPurchasePrice: pPrice, profitPercentage: 20 },
        { id: 'u-2', name: 'Piece', shortCode: 'PC', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: tabSell, defaultPurchasePrice: tabBuy, profitPercentage: 20 },
      ]);
    } else if (preset === 'strip10') {
      const mult = 10;
      const sPrice = curSelling || 100;
      const pPrice = curPurchase || 80;
      const tabSell = Number((sPrice / mult).toFixed(2));
      const tabBuy = Number((pPrice / mult).toFixed(2));
      setBaseUnitName('Tablet');
      setUnits([
        { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: mult, defaultSellingPrice: sPrice, defaultPurchasePrice: pPrice, profitPercentage: 20 },
        { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: tabSell, defaultPurchasePrice: tabBuy, profitPercentage: 20 },
      ]);
    } else if (preset === 'strip15') {
      const mult = 15;
      const sPrice = curSelling || 150;
      const pPrice = curPurchase || 120;
      const tabSell = Number((sPrice / mult).toFixed(2));
      const tabBuy = Number((pPrice / mult).toFixed(2));
      setBaseUnitName('Tablet');
      setUnits([
        { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: mult, defaultSellingPrice: sPrice, defaultPurchasePrice: pPrice, profitPercentage: 20 },
        { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: tabSell, defaultPurchasePrice: tabBuy, profitPercentage: 20 },
      ]);
    } else if (preset === 'strip20') {
      const mult = 20;
      const sPrice = curSelling || 200;
      const pPrice = curPurchase || 160;
      const tabSell = Number((sPrice / mult).toFixed(2));
      const tabBuy = Number((pPrice / mult).toFixed(2));
      setBaseUnitName('Tablet');
      setUnits([
        { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: mult, defaultSellingPrice: sPrice, defaultPurchasePrice: pPrice, profitPercentage: 20 },
        { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: tabSell, defaultPurchasePrice: tabBuy, profitPercentage: 20 },
      ]);
    } else if (preset === 'strip30') {
      const mult = 30;
      const sPrice = curSelling || 300;
      const pPrice = curPurchase || 240;
      const tabSell = Number((sPrice / mult).toFixed(2));
      const tabBuy = Number((pPrice / mult).toFixed(2));
      setBaseUnitName('Tablet');
      setUnits([
        { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: mult, defaultSellingPrice: sPrice, defaultPurchasePrice: pPrice, profitPercentage: 20 },
        { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: tabSell, defaultPurchasePrice: tabBuy, profitPercentage: 20 },
      ]);
    } else if (preset === 'strip4') {
      const mult = 4;
      const sPrice = curSelling || 40;
      const pPrice = curPurchase || 32;
      const tabSell = Number((sPrice / mult).toFixed(2));
      const tabBuy = Number((pPrice / mult).toFixed(2));
      setBaseUnitName('Tablet');
      setUnits([
        { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: mult, defaultSellingPrice: sPrice, defaultPurchasePrice: pPrice, profitPercentage: 20 },
        { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: tabSell, defaultPurchasePrice: tabBuy, profitPercentage: 20 },
      ]);
    } else if (preset === 'single') {
      const sPrice = curSelling || 100;
      const pPrice = curPurchase || 80;
      setBaseUnitName('Piece');
      setUnits([
        { id: 'u-1', name: 'Piece', shortCode: 'PC', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: sPrice, defaultPurchasePrice: pPrice, profitPercentage: 20 },
      ]);
    } else if (preset === 'bottle') {
      const sPrice = curSelling || 120;
      const pPrice = curPurchase || 90;
      setBaseUnitName('Bottle');
      setUnits([
        { id: 'u-1', name: 'Bottle', shortCode: 'BTL', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: sPrice, defaultPurchasePrice: pPrice, profitPercentage: 25 },
      ]);
    }
  };

  // Form State
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formMfr, setFormMfr] = useState('');
  const [formCategory, setFormCategory] = useState('Ear, Nose & Eye Care');
  const [formCategoryId, setFormCategoryId] = useState('cat-ent');
  const [formBodyPart, setFormBodyPart] = useState('Ear');
  const [formBodyPartIcon, setFormBodyPartIcon] = useState('👂');
  const [formSubcategory, setFormSubcategory] = useState('Drops');
  const [formBarcode, setFormBarcode] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formProductCode, setFormProductCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlText, setImageUrlText] = useState('');
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [photoPickerInitialMode, setPhotoPickerInitialMode] = useState<'choice' | 'camera' | 'url'>('choice');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // MacBook-style small popover dropdown states
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [packTypeDropdownOpen, setPackTypeDropdownOpen] = useState(false);
  const [gstDropdownOpen, setGstDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const packDropdownRef = useRef<HTMLDivElement>(null);
  const gstDropdownRef = useRef<HTMLDivElement>(null);

  // Close MacBook dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(target)) {
        setCategoryDropdownOpen(false);
      }
      if (packDropdownRef.current && !packDropdownRef.current.contains(target)) {
        setPackTypeDropdownOpen(false);
      }
      if (gstDropdownRef.current && !gstDropdownRef.current.contains(target)) {
        setGstDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modalFilteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const handleOpenPhotoPicker = (initialMode: 'choice' | 'camera' | 'url' = 'choice') => {
    setPhotoPickerInitialMode(initialMode);
    setShowPhotoPickerModal(true);
  };

  const handlePhotoPickerSelected = (imageDataUrl: string) => {
    if (formImages.length >= 4) {
      setImageUploadError('Maximum 4 images allowed per product.');
      return;
    }
    setFormImages((prev) => [...prev, imageDataUrl].slice(0, 4));
    setImageUploadError(null);
  };

  // Synchronized primary cover image (always the 1st image)
  const formImage = formImages[0] || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60';

  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedImageIndex === null || draggedImageIndex === targetIndex) return;
    setFormImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedImageIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
    setDraggedImageIndex(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = 4 - formImages.length;
    if (remainingSlots <= 0) {
      setImageUploadError('Maximum 4 images allowed per product.');
      return;
    }
    setImageUploadError(null);
    const toProcess: File[] = (Array.from(files) as File[]).slice(0, remainingSlots);
    const validFiles = toProcess.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length < toProcess.length) {
      setImageUploadError('Some non-image files were skipped. PNG, JPG, WebP only.');
    }
    const readers = validFiles.map((file) => optimizeImageFile(file, 800, 0.85));
    try {
      const base64List = await Promise.all(readers);
      setFormImages((prev) => {
        const combined = [...prev, ...base64List].slice(0, 4);
        return combined;
      });
    } catch {
      setImageUploadError('Failed to read or optimize one or more images.');
    }
    e.target.value = '';
  };

  const handleAddUrlImage = () => {
    if (!imageUrlText.trim()) return;
    if (formImages.length >= 4) {
      setImageUploadError('Maximum 4 images allowed per product.');
      return;
    }
    setFormImages((prev) => [...prev, imageUrlText.trim()]);
    setImageUrlText('');
    setShowUrlInput(false);
    setImageUploadError(null);
  };

  const addSamplePreset = (url: string) => {
    if (formImages.length >= 4) {
      setImageUploadError('Maximum 4 images allowed per product.');
      return;
    }
    setFormImages((prev) => [...prev, url]);
    setImageUploadError(null);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formImages.length) return;
    setFormImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const makeCoverImage = (index: number) => {
    if (index === 0) return;
    setFormImages((prev) => {
      const target = prev[index];
      const remaining = prev.filter((_, i) => i !== index);
      return [target, ...remaining];
    });
  };

  const removeImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
    setImageUploadError(null);
  };
  const [formRx, setFormRx] = useState(false);
  const [formMinStock, setFormMinStock] = useState<string>('20');

  // GST Configuration state for Product
  const defaultSlab = useMemo(() => {
    return (getDefaultGSTRate ? getDefaultGSTRate() : null) || gstRates?.find((g) => g.isDefault) || gstRates?.[2] || { id: 'gst-12', rate: 12, name: 'GST 12%' };
  }, [gstRates, getDefaultGSTRate]);

  const [formGstRateId, setFormGstRateId] = useState<string>(defaultSlab.id);
  const [formGst, setFormGst] = useState<number>(defaultSlab.rate);
  const [formPriceIncludesGst, setFormPriceIncludesGst] = useState<boolean>(true);

  // Pricing and Profit
  const [formPurchasePrice, setFormPurchasePrice] = useState<string>('80');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('100');

  // Live GST & Profit Calculations
  const numSellingInput = formSellingPrice.trim() !== '' ? Number(formSellingPrice) : 0;
  const numPurchase = formPurchasePrice.trim() !== '' ? Number(formPurchasePrice) : 0;

  let calculatedBaseSellingPrice = 0;
  let calculatedGstAmount = 0;
  let finalRetailMrp = 0;

  if (formPriceIncludesGst) {
    finalRetailMrp = numSellingInput;
    calculatedBaseSellingPrice = formGst > 0 ? Number((numSellingInput / (1 + formGst / 100)).toFixed(2)) : numSellingInput;
    calculatedGstAmount = Number((finalRetailMrp - calculatedBaseSellingPrice).toFixed(2));
  } else {
    calculatedBaseSellingPrice = numSellingInput;
    calculatedGstAmount = Number(((calculatedBaseSellingPrice * formGst) / 100).toFixed(2));
    finalRetailMrp = Number((calculatedBaseSellingPrice + calculatedGstAmount).toFixed(2));
  }

  const calculatedCgst = Number((calculatedGstAmount / 2).toFixed(2));
  const calculatedSgst = Number((calculatedGstAmount / 2).toFixed(2));

  const profitAmount = finalRetailMrp - numPurchase;
  const profitMarginPercent = finalRetailMrp > 0 ? (profitAmount / finalRetailMrp) * 100 : 0;
  const markupPercent = numPurchase > 0 ? (profitAmount / numPurchase) * 100 : 0;

  // Compositions
  const [compositions, setCompositions] = useState<ProductComposition[]>([
    { ingredient: 'Paracetamol', strength: '500 mg' },
  ]);

  // Packaging Units Hierarchy (Base unit + Strips/Boxes)
  const [baseUnitName, setBaseUnitName] = useState('Tablet');
  const [units, setUnits] = useState<PackagingUnit[]>([
    { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: 10, defaultSellingPrice: 100, defaultPurchasePrice: 80, profitPercentage: 20 },
    { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 10, defaultPurchasePrice: 8, profitPercentage: 20 },
  ]);

  // Optional Opening Batch
  const [includeOpeningStock, setIncludeOpeningStock] = useState(true);
  const [batchNo, setBatchNo] = useState('BATCH01');
  const [mfgDate, setMfgDate] = useState('2026-01');
  const [expiryMonthYear, setExpiryMonthYear] = useState('2027-12');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || 'SUP-01');
  const [openingQty, setOpeningQty] = useState<string>('50'); // Default 50 strips for immediate stock
  const [openingUnitId, setOpeningUnitId] = useState('u-1');
  const [purchasePricePerUnit, setPurchasePricePerUnit] = useState<string>('80');
  const [sellingPricePerUnit, setSellingPricePerUnit] = useState<string>('100');
  const [mrpPerUnit, setMrpPerUnit] = useState<string>('100');

  // Convert month-year (YYYY-MM) to full date (last day of the month) for system FEFO & expiry logic
  const getExpiryDateFromMonthYear = (ym: string): string => {
    if (!ym) return '2027-12-31';
    if (/^\d{4}-\d{2}-\d{2}$/.test(ym)) return ym;
    const parts = ym.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        const lastDay = new Date(y, m, 0).getDate();
        return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      }
    }
    return ym;
  };

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormMfr('');
    const defaultCat = categories[0] || { id: 'cat-ent', name: 'Ear, Nose & Eye Care', defaultBodyPart: 'Ear', icon: '👂' };
    setFormCategory(defaultCat.name);
    setFormCategoryId(defaultCat.id);
    setFormBodyPart(defaultCat.defaultBodyPart || 'Ear');
    setFormBodyPartIcon(defaultCat.icon || '👂');
    setFormSubcategory('Drops');
    setFormBarcode(String(Date.now()).slice(-8));
    setFormSku(`MED-${Date.now().toString().slice(-4)}`);
    setFormProductCode(`PC-${Date.now().toString().slice(-4)}`);
    setFormDescription('');
    setFormRx(false);
    const defGst = (getDefaultGSTRate ? getDefaultGSTRate() : null) || gstRates?.find((g) => g.isDefault) || gstRates?.[2];
    setFormGst(defGst?.rate ?? 12);
    setFormGstRateId(defGst?.id ?? 'gst-12');
    setFormPriceIncludesGst(true);
    setFormMinStock('20');
    setFormPurchasePrice('80');
    setFormSellingPrice('100');
    setCompositions([{ ingredient: '', strength: '' }]);
    setBaseUnitName('Tablet');
    setUnits([
      { id: 'u-1', name: 'Strip', shortCode: 'STRIP', multiplierToBase: 10, defaultSellingPrice: 100, defaultPurchasePrice: 80, profitPercentage: 20 },
      { id: 'u-2', name: 'Tablet', shortCode: 'TAB', multiplierToBase: 1, isBaseUnit: true, defaultSellingPrice: 10, defaultPurchasePrice: 8, profitPercentage: 20 },
    ]);
    setPackagingPreset('strip10');
    setIncludeOpeningStock(true); // Default to true so newly added products immediately have in-stock batches in POS!
    setBatchNo(`B-${Date.now().toString().slice(-4)}`);
    setMfgDate('2026-01');
    setExpiryMonthYear('2027-12');
    setExpiryDate('2027-12-31');
    setOpeningQty('50');
    setPurchasePricePerUnit('80');
    setSellingPricePerUnit('100');
    setMrpPerUnit('100');
    setFormImages([]);
    setImageUrlText('');
    setShowUrlInput(false);
    setImageUploadError(null);
    setCategoryDropdownOpen(false);
    setPackTypeDropdownOpen(false);
    setGstDropdownOpen(false);
    setCategorySearch('');
    setEditingProduct(null);
  };

  // Target Body Part Slider Ref & Controls for Add/Edit Modal
  const bodyPartSliderRef = useRef<HTMLDivElement>(null);

  const slideBodyParts = (direction: 'left' | 'right') => {
    if (bodyPartSliderRef.current) {
      const scrollAmount = 180;
      bodyPartSliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleBodyPartWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = bodyPartSliderRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      el.scrollBy({ left: e.deltaY, behavior: 'smooth' });
      e.preventDefault();
    }
  };

  // Scroll active body part pill into view inside slider when modal opens or selection changes
  useEffect(() => {
    if (showAddModal && bodyPartSliderRef.current) {
      const el = bodyPartSliderRef.current;
      const selectedChild = el.querySelector('[data-selected="true"]') as HTMLElement | null;
      if (selectedChild) {
        selectedChild.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      }
    }
  }, [formBodyPart, showAddModal]);

  const handleOpenAdd = () => {
    resetForm();
    setShowMoreDetails(false);
    setScannedNotification(null);
    setShowAddModal(true);
  };

  const handleApplyExtractedDetails = (data: ExtractedProductData, imageSrc: string) => {
    setFormName(data.name || '');
    setFormBrand(data.brand || '');
    setFormMfr(data.manufacturer || data.brand || '');

    // Match category if found
    if (data.category) {
      const matchedCat = categories.find((c) =>
        c.name.toLowerCase().includes(data.category.toLowerCase()) ||
        data.category.toLowerCase().includes(c.name.toLowerCase())
      ) || categories[0];
      if (matchedCat) {
        setFormCategory(matchedCat.name);
        setFormCategoryId(matchedCat.id);
        if (matchedCat.defaultBodyPart) {
          setFormBodyPart(matchedCat.defaultBodyPart);
          const bInfo = getBodyPartInfo(matchedCat.defaultBodyPart);
          setFormBodyPartIcon(bInfo.emoji || matchedCat.icon || '💊');
        }
      }
    }

    // Set Compositions
    if (data.compositions && data.compositions.length > 0) {
      setCompositions(
        data.compositions.map((c) => ({
          ingredient: c.ingredient || '',
          strength: c.strength || '',
        }))
      );
    }

    // Set Expiries & Batch
    if (data.expiryDate) {
      setExpiryDate(data.expiryDate);
      setExpiryMonthYear(data.expiryMonthYear || data.expiryDate.slice(0, 7));
    }
    if (data.mfgDate) {
      setMfgDate(data.mfgDate);
    }
    if (data.batchNumber) {
      setBatchNo(data.batchNumber);
    }

    // Set Pricing
    if (data.sellingPrice) {
      setFormSellingPrice(String(data.sellingPrice));
      setSellingPricePerUnit(String(data.sellingPrice));
    }
    if (data.mrp) {
      setMrpPerUnit(String(data.mrp));
    }
    if (data.purchasePrice) {
      setFormPurchasePrice(String(data.purchasePrice));
      setPurchasePricePerUnit(String(data.purchasePrice));
    }

    // Set Rx Warning
    if (data.prescriptionRequired !== undefined) {
      setFormRx(data.prescriptionRequired);
    }

    // Set Packaging Preset
    if (data.packagingPreset) {
      handlePresetChange(data.packagingPreset);
    }

    // Set Scanned Photo
    if (imageSrc) {
      setFormImages([imageSrc]);
    }

    setIncludeOpeningStock(true);
    setShowMoreDetails(true);
    setShowAddModal(true);
    setScannedNotification(`✨ Details extracted from medicine photo! Name, Compositions, Expiry & Price auto-filled. All fields below are fully editable.`);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const finalBrand = formBrand.trim() || formName.trim().split(' ')[0] || 'Generic';
    const finalMfr = formMfr.trim() || 'Standard Pharma';
    const cleanCompositions = compositions.filter((c) => c.ingredient.trim().length > 0);

    const numericPurchase = formPurchasePrice === '' ? 0 : Number(formPurchasePrice) || 0;
    const numericSelling = finalRetailMrp;
    const calculatedProfitPercent = Number(profitMarginPercent.toFixed(2));

    // Calculate single tablet / unit price by dividing strip price by primary multiplier
    const primaryMultiplier = Math.max(1, units[0]?.multiplierToBase || 1);
    const singleTabCost = primaryMultiplier > 1 ? Number((numericPurchase / primaryMultiplier).toFixed(2)) : numericPurchase;
    const singleTabSell = primaryMultiplier > 1 ? Number((numericSelling / primaryMultiplier).toFixed(2)) : numericSelling;

    // Ensure base unit is included in units array
    const hasBaseUnit = units.some((u) => u.name.toLowerCase() === baseUnitName.toLowerCase() || u.isBaseUnit);
    let finalUnits = [...units];
    if (!hasBaseUnit) {
      finalUnits.push({
        id: `u-base-${Date.now()}`,
        name: baseUnitName,
        shortCode: baseUnitName.slice(0, 3).toUpperCase(),
        multiplierToBase: 1,
        isBaseUnit: true,
        defaultSellingPrice: singleTabSell,
        defaultPurchasePrice: singleTabCost,
        profitPercentage: calculatedProfitPercent,
      });
    }

    // Apply selling and purchase prices to units
    finalUnits = finalUnits.map((u, idx) => {
      if (idx === 0) {
        return {
          ...u,
          defaultSellingPrice: numericSelling,
          defaultPurchasePrice: numericPurchase,
          profitPercentage: calculatedProfitPercent,
        };
      }
      const thisMult = u.multiplierToBase || 1;
      return {
        ...u,
        defaultSellingPrice: Number((singleTabSell * thisMult).toFixed(2)),
        defaultPurchasePrice: Number((singleTabCost * thisMult).toFixed(2)),
        profitPercentage: calculatedProfitPercent,
      };
    });

    const cleanImages = formImages.filter((img) => img && img.trim().length > 0).slice(0, 4);
    const primaryCover = cleanImages[0] || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60';
    const finalImagesArray = cleanImages.length > 0 ? cleanImages : [primaryCover];

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formName,
        brand: finalBrand,
        manufacturer: finalMfr,
        category: formCategory,
        categoryId: formCategoryId,
        bodyPart: formBodyPart,
        bodyPartIcon: formBodyPartIcon,
        subcategory: formSubcategory,
        barcode: formBarcode,
        sku: formSku,
        productCode: formProductCode,
        description: formDescription,
        image: primaryCover,
        images: finalImagesArray,
        compositions: cleanCompositions,
        baseUnit: baseUnitName,
        units: finalUnits,
        minStockBaseUnits: Number(formMinStock) || 0,
        requiresPrescription: formRx,
        gstPercent: formGst,
        gstRateId: formGstRateId,
        basePurchasePrice: singleTabCost,
        baseSellingPrice: singleTabSell,
        purchasePrice: numericPurchase,
        sellingPrice: finalRetailMrp,
        profitPercentage: calculatedProfitPercent,
      });
    } else {
      addProduct(
        {
          name: formName,
          brand: finalBrand,
          manufacturer: finalMfr,
          category: formCategory,
          categoryId: formCategoryId,
          bodyPart: formBodyPart,
          bodyPartIcon: formBodyPartIcon,
          subcategory: formSubcategory,
          barcode: formBarcode || `890${Date.now().toString().slice(-9)}`,
          sku: formSku || `SKU-${Date.now().toString().slice(-5)}`,
          productCode: formProductCode || `P-${Date.now().toString().slice(-4)}`,
          description: formDescription,
          image: primaryCover,
          images: finalImagesArray,
          compositions: cleanCompositions,
          baseUnit: baseUnitName,
          units: finalUnits,
          minStockBaseUnits: Number(formMinStock) || 0,
          isActive: true,
          requiresPrescription: formRx,
          gstPercent: formGst,
          gstRateId: formGstRateId,
          basePurchasePrice: singleTabCost,
          baseSellingPrice: singleTabSell,
          purchasePrice: numericPurchase,
          sellingPrice: finalRetailMrp,
          profitPercentage: calculatedProfitPercent,
        },
        includeOpeningStock
          ? {
              batchNumber: batchNo,
              mfgDate,
              expiryDate: getExpiryDateFromMonthYear(expiryMonthYear),
              supplierId,
              purchasePricePerUnit: numericPurchase || Number(purchasePricePerUnit) || 0,
              mrpPerUnit: finalRetailMrp || Number(mrpPerUnit) || 0,
              sellingPricePerUnit: finalRetailMrp || Number(sellingPricePerUnit) || 0,
              unitId: openingUnitId || finalUnits[0].id,
              quantity: Number(openingQty) || 0,
            }
          : undefined
      );
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBrand(p.brand);
    setFormMfr(p.manufacturer);
    setFormCategory(p.category || 'Medicines');
    setFormCategoryId(p.categoryId || '');
    setFormBodyPart(p.bodyPart || 'Ear');
    setFormBodyPartIcon(p.bodyPartIcon || '👂');
    setFormSubcategory(p.subcategory || '');
    setFormBarcode(p.barcode);
    setFormSku(p.sku);
    setFormProductCode(p.productCode);
    setFormDescription(p.description || '');
    if (p.images && p.images.length > 0) {
      setFormImages([...p.images]);
    } else if (p.image) {
      setFormImages([p.image]);
    } else {
      setFormImages(['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60']);
    }
    setImageUrlText('');
    setShowUrlInput(false);
    setImageUploadError(null);
    setFormRx(p.requiresPrescription || false);
    setFormGst(p.gstPercent || 12);
    const matchedGst = gstRates.find((r) => r.id === p.gstRateId || r.rate === p.gstPercent);
    setFormGstRateId(matchedGst?.id || 'gst-12');
    setFormPriceIncludesGst(true);
    setFormMinStock(String(p.minStockBaseUnits ?? 20));

    const initSelling = p.sellingPrice ?? p.units[0]?.defaultSellingPrice ?? 100;
    const initPurchase = p.purchasePrice ?? p.units[0]?.defaultPurchasePrice ?? 80;
    setFormSellingPrice(initSelling !== undefined ? String(initSelling) : '');
    setFormPurchasePrice(initPurchase !== undefined ? String(initPurchase) : '');

    setCompositions(p.compositions?.length ? p.compositions : [{ ingredient: '', strength: '' }]);
    setBaseUnitName(p.baseUnit);
    setUnits(p.units);
    const primaryMultiplier = p.units?.find((u) => !u.isBaseUnit)?.multiplierToBase || p.units?.[0]?.multiplierToBase;
    if (primaryMultiplier === 20) setPackagingPreset('strip20');
    else if (primaryMultiplier === 30) setPackagingPreset('strip30');
    else if (primaryMultiplier === 15) setPackagingPreset('strip15');
    else if (primaryMultiplier === 10) {
      if (p.units?.[0]?.name?.toLowerCase().includes('pack')) setPackagingPreset('pack10');
      else setPackagingPreset('strip10');
    }
    else if (primaryMultiplier === 4) setPackagingPreset('strip4');
    else if (p.baseUnit?.toLowerCase() === 'bottle') setPackagingPreset('bottle');
    else if (p.baseUnit?.toLowerCase() === 'piece') setPackagingPreset('single');
    else setPackagingPreset('custom');
    setIncludeOpeningStock(false);
    setShowMoreDetails(true);
    setShowAddModal(true);
  };

  // Dynamic categories extracted from context and products
  const categoryList = useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    categories.forEach((c) => {
      if (c.name) cats.add(c.name.trim());
    });
    products.forEach((p) => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [categories, products]);

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    if (!matchCat) return false;

    const matchBody =
      selectedBodyPart === 'All' ||
      (p.bodyPart || '').toLowerCase() === selectedBodyPart.toLowerCase() ||
      (p.category || '').toLowerCase().includes(selectedBodyPart.toLowerCase());
    if (!matchBody) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.bodyPart && p.bodyPart.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      p.barcode.includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.compositions?.some((c) => `${c.ingredient} ${c.strength}`.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full pb-12">
      {/* Toast Notification (Floating Fixed) */}
      {deleteSuccessToast && (
        <div className="fixed top-5 right-5 z-80 max-w-md p-3.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 mr-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{deleteSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessToast(null)}
            className="p-1 rounded-md text-emerald-100 hover:bg-emerald-700/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Single Integrated Container (No multiple separated tiles) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden max-w-full">
        {/* Top Integrated Controls */}
        <div className="p-2.5 sm:p-4 space-y-2.5 max-w-full overflow-hidden">
          {/* Row 1: Products Title + Count, View Mode Switcher, and Add Medicine Action */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">Products</h2>
              <span className="px-1.5 sm:px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] sm:text-[11px] font-bold rounded-full shrink-0">
                {filtered.length}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* View Mode Switcher */}
              <div className="flex items-center gap-0.5 border border-slate-200 rounded-xl p-0.5 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Tiles View (Compact Cards)"
                  className={`p-1 sm:p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white shadow-xs text-emerald-700 font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="List View"
                  className={`p-1 sm:p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white shadow-xs text-emerald-700 font-bold'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* AI Scan Medicine Strip Button */}
              <button
                id="ai-scan-medicine-btn"
                type="button"
                onClick={() => {
                  setAiScannerInitialImage(null);
                  setShowAiScannerModal(true);
                }}
                className="flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0 border border-emerald-500/30 whitespace-nowrap"
                title="Scan medicine strip, box or bottle to auto-extract details"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                <span className="hidden sm:inline">AI Photo Scan</span>
                <span className="sm:hidden font-semibold">Scan</span>
              </button>

              {/* Add Medicine Button */}
              <button
                id="add-medicine-btn"
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                title="Add new medicine"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Add Medicine</span>
                <span className="sm:hidden font-semibold">Add</span>
              </button>
            </div>
          </div>

          {/* Row 2: Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="products-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine, salt composition, brand, barcode..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 sm:py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Row 3: Category Chips */}
          <HorizontalSlidingChips
            id="products-category-chips"
            ariaLabel="Medicine categories"
          >
            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = cat === 'All' ? products.length : products.filter((p) => p.category === cat).length;
              const catObj = categories.find((c) => c.name.toLowerCase() === cat.toLowerCase());

              return (
                <button
                  key={cat}
                  type="button"
                  data-selected={isSelected ? 'true' : 'false'}
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-[30px] flex items-center px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {catObj?.icon && <span className="mr-1.5">{catObj.icon}</span>}
                  <span>{cat}</span>
                  <span className={`ml-1.5 text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400 font-normal'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </HorizontalSlidingChips>

          {/* Row 4: Anatomical Body Part Target Chips */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 shrink-0">
              Anatomy:
            </span>
            <HorizontalSlidingChips
              id="products-bodypart-chips"
              ariaLabel="Target body parts"
            >
              <button
                type="button"
                data-selected={selectedBodyPart === 'All' ? 'true' : 'false'}
                onClick={() => setSelectedBodyPart('All')}
                className={`h-[26px] flex items-center px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  selectedBodyPart === 'All'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Parts
              </button>
              {BODY_PARTS.map((bp) => {
                const count = products.filter(
                  (p) => (p.bodyPart || '').toLowerCase() === bp.name.toLowerCase()
                ).length;
                const isSelected = selectedBodyPart === bp.name;

                return (
                  <button
                    key={bp.id}
                    type="button"
                    data-selected={isSelected ? 'true' : 'false'}
                    onClick={() => setSelectedBodyPart(isSelected ? 'All' : bp.name)}
                    className={`h-[26px] flex items-center px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-xs'
                        : count > 0
                        ? 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-200/60 hover:bg-slate-100'
                    }`}
                  >
                    <span className="mr-1">{bp.emoji}</span>
                    <span>{bp.name}</span>
                    {count > 0 && (
                      <span className={`ml-1 text-[9px] px-1 rounded-full ${isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-900'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </HorizontalSlidingChips>
          </div>
        </div>

        {/* Integrated Divider */}
        <div className="border-t border-slate-200" />

        {/* Integrated Products Content */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Pill className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No medicines found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or category filter.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* Mobile-First Integrated List: Clean rows with Name, Price, Stock, and "i" */
          <div className="divide-y divide-slate-100">
            {filtered.map((prod) => {
              const stock = getProductTotalStock(prod.id);
              const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
              const isOutOfStock = stock <= 0;
              const primaryUnit = prod.units[0];

              return (
                <div
                  key={prod.id}
                  className="p-3 sm:p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-3"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      setInspectingProduct(prod);
                      setInspectingImageIndex(0);
                    }}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={(prod.images && prod.images[0]) || prod.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'}
                        alt={prod.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-slate-100 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                      {prod.images && prod.images.length > 1 && (
                        <span className="absolute -bottom-1 -right-1 bg-slate-900/85 text-white text-[8px] font-bold px-1 rounded-sm shadow-xs">
                          📷 {prod.images.length}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {prod.name}
                        </h3>
                        {prod.bodyPartIcon && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-50 text-slate-500 border border-slate-200/70 shrink-0"
                            title={`Target organ: ${prod.bodyPart}`}
                          >
                            <span className="text-[10px] opacity-75">{prod.bodyPartIcon}</span>
                            <span>{prod.bodyPart}</span>
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-600 shrink-0">
                            Out
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold mt-0.5 flex items-center gap-1.5">
                        <span className={isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-800'}>
                          {stock} {prod.baseUnit}s
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Stock</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-bold text-emerald-700">
                        {primaryUnit?.defaultSellingPrice
                          ? `₹${primaryUnit.defaultSellingPrice}`
                          : prod.sellingPrice
                          ? `₹${prod.sellingPrice}`
                          : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {primaryUnit?.name ? `per ${primaryUnit.name}` : 'Price'}
                      </div>
                      {(() => {
                        const singlePricing = getProductSingleTabletPricing(prod);
                        if (!singlePricing.isStripOrPack) return null;
                        return (
                          <div className="text-[9.5px] text-slate-500 font-medium">
                            {singlePricing.singleSellingFormatted}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditClick(prod)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition cursor-pointer"
                        title="Edit medicine"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductToDelete(prod);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete product from system"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Small, Compact Cards: only Name, Price, Stock, and "i" Info button */
          <div className="p-3 sm:p-4 bg-slate-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {filtered.map((prod) => {
                const stock = getProductTotalStock(prod.id);
                const isLowStock = stock > 0 && stock <= prod.minStockBaseUnits;
                const isOutOfStock = stock <= 0;
                const primaryUnit = prod.units[0];

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 flex flex-col justify-between hover:border-emerald-400 hover:shadow-xs transition relative group"
                  >
                    <div>
                      {/* Top: Thumbnail + "i" icon + optional edit */}
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <div
                          className="relative cursor-pointer shrink-0"
                          onClick={() => {
                            setInspectingProduct(prod);
                            setInspectingImageIndex(0);
                          }}
                          title="Click to view details & photos"
                        >
                          <img
                            src={(prod.images && prod.images[0]) || prod.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'}
                            alt={prod.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-100 hover:ring-2 hover:ring-emerald-500 transition shadow-2xs"
                            referrerPolicy="no-referrer"
                          />
                          {prod.images && prod.images.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-slate-900/85 text-white text-[7px] font-bold px-0.5 rounded-xs">
                              {prod.images.length}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(prod)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            title="Edit medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductToDelete(prod);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete product from system"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Body Part & Category Tag */}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {prod.bodyPartIcon && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-medium bg-slate-50 text-slate-500 border border-slate-200/70 px-1.5 py-0.5 rounded"
                            title={`Target organ: ${prod.bodyPart}`}
                          >
                            <span className="text-[10px] opacity-75">{prod.bodyPartIcon}</span>
                            <span>{prod.bodyPart}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                          {prod.category}
                        </span>
                      </div>

                      {/* 1. Name */}
                      <h3
                        className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-snug cursor-pointer hover:text-emerald-700 transition"
                        onClick={() => {
                          setInspectingProduct(prod);
                          setInspectingImageIndex(0);
                        }}
                        title={prod.name}
                      >
                        {prod.name}
                      </h3>

                      {/* 2. Stock */}
                      <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
                        <div className="text-xs font-bold">
                          <span className={isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-800'}>
                            {stock} {prod.baseUnit}s
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1">Stock</span>
                        </div>
                        {((prod.profitPercentage !== undefined && prod.profitPercentage > 0) ||
                          (primaryUnit?.profitPercentage !== undefined && primaryUnit.profitPercentage > 0)) && (
                          <div className="flex items-center">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                              +{prod.profitPercentage ?? primaryUnit?.profitPercentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Price */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px]">
                          {primaryUnit?.name ? `per ${primaryUnit.name}` : 'Price'}
                        </span>
                        {(() => {
                          const singlePricing = getProductSingleTabletPricing(prod);
                          if (!singlePricing.isStripOrPack) return null;
                          return (
                            <span className="text-[9.5px] text-slate-500 font-medium">
                              {singlePricing.singleSellingFormatted}
                            </span>
                          );
                        })()}
                      </div>
                      <span className="font-bold text-emerald-700 text-xs">
                        {prod.sellingPrice
                          ? `₹${prod.sellingPrice}`
                          : primaryUnit?.defaultSellingPrice
                          ? `₹${primaryUnit.defaultSellingPrice}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg sm:max-w-xl w-full shadow-2xl border border-slate-200/90 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header (CSS selector 2) */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100/90 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                      {editingProduct ? `Edit ${editingProduct.name}` : 'Add New Medicine / Product'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200/60 hidden sm:inline-block">
                      {editingProduct ? 'Inventory Item' : 'New Catalog Entry'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Configure clinical details, pricing, GST slab, and packaging units
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body (CSS selector 1) */}
            <form onSubmit={handleSaveProduct} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1 max-h-[82vh]">
              {/* AI Auto-Fill from Packaging Banner */}
              {!editingProduct && (
                <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-emerald-950 truncate">Auto-Fill from Medicine Photo</p>
                      <p className="text-[11px] text-emerald-700 truncate">Extracts Name, Compositions, Expiry &amp; Price with AI</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAiScannerInitialImage(formImages[0] || null);
                      setShowAiScannerModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Pack</span>
                  </button>
                </div>
              )}

              {/* Scanned Notification Alert */}
              {scannedNotification && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start justify-between gap-2 text-xs text-emerald-900 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{scannedNotification}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScannedNotification(null)}
                    className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Medicine Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medicine Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formBrand) {
                      const firstWord = e.target.value.trim().split(' ')[0];
                      if (firstWord && firstWord.length >= 2) setFormBrand(firstWord);
                    }
                  }}
                  placeholder="e.g. Augmentin 625 Duo, Dolo 650, Telma 40"
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition h-9.5 placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Category & Packaging Unit Form with MacBook-style Small Popover Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCatName('');
                        setQuickCatBodyPart('Ear');
                        setQuickCatIcon('👂');
                        setShowQuickAddCatModal(true);
                      }}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>

                  <div className="relative" ref={categoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryDropdownOpen(!categoryDropdownOpen);
                        setPackTypeDropdownOpen(false);
                        setGstDropdownOpen(false);
                      }}
                      id="product-category-dropdown-btn"
                      className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 flex items-center justify-between transition cursor-pointer h-9.5 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm shrink-0">{formBodyPartIcon || '💊'}</span>
                        <span className="truncate font-semibold text-slate-900">{formCategory || 'Select Category'}</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* MacBook Small Popover Menu - Never occupies entire screen */}
                    {categoryDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xl shadow-slate-900/10 p-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100 max-h-52 overflow-hidden flex flex-col">
                        {categories.length > 4 && (
                          <div className="p-1 pb-1.5 border-b border-slate-100">
                            <input
                              type="text"
                              placeholder="Search categories..."
                              value={categorySearch}
                              onChange={(e) => setCategorySearch(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        )}
                        <div className="overflow-y-auto space-y-0.5 pt-1 flex-1">
                          {modalFilteredCategories.map((cat) => {
                            const isSelected = formCategory.toLowerCase() === cat.name.toLowerCase();
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setFormCategory(cat.name);
                                  setFormCategoryId(cat.id);
                                  if (cat.defaultBodyPart) {
                                    setFormBodyPart(cat.defaultBodyPart);
                                    const bInfo = getBodyPartInfo(cat.defaultBodyPart);
                                    setFormBodyPartIcon(bInfo.emoji || cat.icon || '💊');
                                  }
                                  setCategoryDropdownOpen(false);
                                  setCategorySearch('');
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-100/90'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-xs">{cat.icon || '💊'}</span>
                                  <span className="truncate">{cat.name}</span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                        <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryDropdownOpen(false);
                              setQuickCatName('');
                              setQuickCatBodyPart('Ear');
                              setQuickCatIcon('👂');
                              setShowQuickAddCatModal(true);
                            }}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer py-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Create New Category</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Packaging Preset Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Packaging Type
                  </label>
                  <div className="relative" ref={packDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setPackTypeDropdownOpen(!packTypeDropdownOpen);
                        setCategoryDropdownOpen(false);
                        setGstDropdownOpen(false);
                      }}
                      id="product-pack-type-dropdown-btn"
                      className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 flex items-center justify-between transition cursor-pointer h-9.5 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <span className="font-semibold text-slate-900 truncate">
                        {PACKAGING_PRESET_OPTIONS.find((p) => p.value === packagingPreset)?.label || 'Pack of 10'}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${packTypeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* MacBook Small Popover Menu */}
                    {packTypeDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xl shadow-slate-900/10 p-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100 max-h-52 overflow-y-auto space-y-0.5">
                        {PACKAGING_PRESET_OPTIONS.map((opt) => {
                          const isSelected = packagingPreset === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                handlePresetChange(opt.value as any);
                                setPackTypeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-100/90'
                              }`}
                            >
                              <span className="truncate">{opt.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Target Body Part Slider */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Anatomical Body Part
                  </label>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
                    <span>{formBodyPartIcon}</span>
                    <span>{formBodyPart}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/90 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => slideBodyParts('left')}
                    aria-label="Previous body part"
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div
                    ref={bodyPartSliderRef}
                    id="product-body-part-slider"
                    onWheel={handleBodyPartWheel}
                    className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                  >
                    {BODY_PARTS.map((bp) => {
                      const isSelected = formBodyPart.toLowerCase() === bp.name.toLowerCase();
                      return (
                        <button
                          key={bp.id}
                          type="button"
                          data-selected={isSelected ? 'true' : 'false'}
                          onClick={() => {
                            setFormBodyPart(bp.name);
                            setFormBodyPartIcon(bp.emoji || '💊');
                          }}
                          className={`h-7 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition flex items-center gap-1.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                          }`}
                        >
                          <span>{bp.emoji}</span>
                          <span>{bp.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => slideBodyParts('right')}
                    aria-label="Next body part"
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer shrink-0"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pricing & GST Dropdown Section (Checked & Enhanced Numeric Typography) */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pricing &amp; Tax Structure
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">All figures in INR (₹)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Purchase Price */}
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                      Purchase Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">₹</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formPurchasePrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) setFormPurchasePrice(val);
                        }}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200/90 rounded-xl pl-7 pr-3 py-2 text-sm font-semibold tabular-nums text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition h-9.5 placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Wholesale intake cost</p>
                  </div>

                  {/* MRP / Selling Price */}
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                      Retail MRP (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-bold pointer-events-none">₹</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={formSellingPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) setFormSellingPrice(val);
                        }}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200/90 rounded-xl pl-7 pr-3 py-2 text-sm font-bold tabular-nums text-emerald-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition h-9.5 placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Maximum retail price</p>
                  </div>

                  {/* GST Rate Dropdown (MacBook Small Popover) */}
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1">
                      GST Tax Slab
                    </label>
                    <div className="relative" ref={gstDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setGstDropdownOpen(!gstDropdownOpen);
                          setCategoryDropdownOpen(false);
                          setPackTypeDropdownOpen(false);
                        }}
                        id="product-gst-dropdown-btn"
                        className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 flex items-center justify-between transition cursor-pointer h-9.5 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20 tabular-nums"
                      >
                        <span>{formGst}% GST</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${gstDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* MacBook Small Popover Menu */}
                      {gstDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xl shadow-slate-900/10 p-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100 max-h-52 overflow-y-auto space-y-0.5">
                          {[
                            { rate: 0, label: '0% (Tax Exempt)' },
                            { rate: 5, label: '5% (Essential Drugs)' },
                            { rate: 12, label: '12% (Standard Pharma)' },
                            { rate: 18, label: '18% (Supplements & Devices)' },
                            { rate: 28, label: '28% (Specialty / Luxury)' },
                          ].map((g) => {
                            const isSelected = formGst === g.rate;
                            return (
                              <button
                                key={g.rate}
                                type="button"
                                onClick={() => {
                                  setFormGst(g.rate);
                                  const matched = gstRates?.find((r) => r.rate === g.rate);
                                  if (matched) setFormGstRateId(matched.id);
                                  setGstDropdownOpen(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                    : 'text-slate-700 hover:bg-slate-100/90'
                                }`}
                              >
                                <span className="tabular-nums">{g.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Dual CGST + SGST split</p>
                  </div>
                </div>

                {/* Live Profit & Margin Indicator */}
                {numSellingInput > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">Gross Margin:</span>
                      <span className={`text-sm font-bold tabular-nums ${profitAmount >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {profitAmount >= 0 ? '+' : ''}₹{Number(profitAmount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                        profitMarginPercent >= 20 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        profitMarginPercent >= 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {Number(profitMarginPercent || 0).toFixed(1)}% Margin
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums hidden sm:inline">
                        ({Number(markupPercent || 0).toFixed(1)}% Markup)
                      </span>
                    </div>
                  </div>
                )}

                {/* Single Tablet / Unit Price Breakdown */}
                {(() => {
                  const primaryMult = units[0]?.multiplierToBase || 1;
                  if (primaryMult <= 1) return null;
                  const sPrice = finalRetailMrp || numSellingInput;
                  const pCost = numPurchase;
                  const singleTabSell = Number((sPrice / primaryMult).toFixed(2));
                  const singleTabCost = Number((pCost / primaryMult).toFixed(2));
                  const singleTabProfit = Math.max(0, Number((singleTabSell - singleTabCost).toFixed(2)));
                  return (
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-[11px] text-emerald-900 font-medium">
                      <span>
                        Single {baseUnitName}: <strong className="font-bold text-emerald-950">₹{singleTabSell.toFixed(2)}</strong>/{baseUnitName.toLowerCase().slice(0, 3)}
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        Cost: ₹{singleTabCost.toFixed(2)} • Profit: +₹{singleTabProfit.toFixed(2)}/{baseUnitName.toLowerCase().slice(0, 3)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Product Photo Picker */}
              <div className="pt-1 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Product Packaging Photo {formImages.length > 0 && `(${formImages.length}/4)`}
                  </label>
                  {formImages.length > 0 && formImages.length < 4 && (
                    <button
                      type="button"
                      onClick={() => handleOpenPhotoPicker('choice')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add More</span>
                    </button>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {imageUploadError && (
                  <div className="text-[11px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    {imageUploadError}
                  </div>
                )}

                {/* Empty State */}
                {formImages.length === 0 ? (
                  <div className="p-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">Add Medicine Image</p>
                        <p className="text-[11px] text-slate-500">Capture box or browse gallery</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenPhotoPicker('camera')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
                        <span>Browse</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Thumbnails list */
                  <div className="flex items-center gap-2 flex-wrap">
                    {formImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden border bg-slate-100 group shrink-0 ${
                          idx === 0 ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-200'
                        }`}
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-[8px] font-bold text-white text-center py-0.5">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer"
                          title="Remove"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}

                    {formImages.length < 4 && (
                      <button
                        type="button"
                        onClick={() => handleOpenPhotoPicker('choice')}
                        className="w-14 h-14 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 flex flex-col items-center justify-center text-slate-500 hover:text-emerald-700 text-[10px] font-medium transition cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4 text-emerald-600" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Quick Scan Current Image Action */}
                {formImages.length > 0 && !editingProduct && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAiScannerInitialImage(formImages[0]);
                        setShowAiScannerModal(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Extract Name, Compositions, Expiry &amp; Price from this photo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Opening Stock & Initial Batch */}
              {!editingProduct && (
                <div className="pt-1 border-t border-slate-100 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 text-xs">
                    <input
                      type="checkbox"
                      checked={includeOpeningStock}
                      onChange={(e) => setIncludeOpeningStock(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5"
                    />
                    <span>Add Initial Batch &amp; Inward Stock Intake</span>
                  </label>

                  {includeOpeningStock && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Batch Number</label>
                        <input
                          type="text"
                          value={batchNo}
                          onChange={(e) => setBatchNo(e.target.value)}
                          placeholder="e.g. BATCH-01"
                          className="w-full bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-9"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expiry (MM/YYYY)</label>
                        <input
                          type="month"
                          value={expiryMonthYear}
                          onChange={(e) => setExpiryMonthYear(e.target.value)}
                          className="w-full bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer h-9"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Opening Qty ({baseUnitName}s)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={openingQty}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) setOpeningQty(val);
                          }}
                          placeholder="0"
                          className="w-full bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-sm font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Additional Details */}
              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="w-full flex items-center justify-between py-2 px-3 bg-slate-50 hover:bg-slate-100/90 rounded-xl text-slate-700 font-semibold text-xs transition cursor-pointer border border-slate-200/90 h-9.5"
                >
                  <span>{showMoreDetails ? 'Hide Advanced Details' : '+ More Details (Brand, Salt Composition, Barcode)'}</span>
                  {showMoreDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                {showMoreDetails && (
                  <div className="mt-2 space-y-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/90 animate-in fade-in duration-150">
                    {/* Brand & Mfr */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Brand Name</label>
                        <input
                          type="text"
                          value={formBrand}
                          onChange={(e) => setFormBrand(e.target.value)}
                          placeholder="e.g. Calpol, Crocin"
                          className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-9 placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Manufacturer / Pharma Co.</label>
                        <input
                          type="text"
                          value={formMfr}
                          onChange={(e) => setFormMfr(e.target.value)}
                          placeholder="e.g. GSK, Cipla, Sun Pharma"
                          className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-9 placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </div>
                    </div>

                    {/* Barcode & Min Stock */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Barcode / EAN</label>
                        <input
                          type="text"
                          value={formBarcode}
                          onChange={(e) => setFormBarcode(e.target.value)}
                          placeholder="890..."
                          className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-9 placeholder:text-slate-400 placeholder:font-normal"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Low Stock Alert Threshold</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formMinStock}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) setFormMinStock(val);
                          }}
                          className="w-full bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-9"
                        />
                      </div>
                    </div>

                    {/* Salt Composition */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-slate-600">Active Salt Composition</label>
                        <button
                          type="button"
                          onClick={() => setCompositions([...compositions, { ingredient: '', strength: '' }])}
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Salt</span>
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {compositions.map((comp, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={comp.ingredient}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCompositions((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, ingredient: val } : c))
                                );
                              }}
                              placeholder="e.g. Paracetamol"
                              className="flex-1 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-9 placeholder:text-slate-400"
                            />
                            <input
                              type="text"
                              value={comp.strength}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCompositions((prev) =>
                                  prev.map((c, i) => (i === idx ? { ...c, strength: val } : c))
                                );
                              }}
                              placeholder="e.g. 500mg"
                              className="w-24 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-semibold tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-9 placeholder:text-slate-400"
                            />
                            {compositions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setCompositions((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                title="Remove salt"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Docked at Bottom */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = editingProduct;
                      setProductToDelete(prod);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/90 rounded-xl font-semibold transition cursor-pointer text-xs h-9.5 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs sm:text-sm h-9.5"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-product-btn"
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition active:scale-95 cursor-pointer text-xs sm:text-sm h-9.5 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingProduct ? 'Save Changes' : 'Save Product'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CATEGORY MODAL */}
      {showQuickAddCatModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto overflow-x-hidden">
          <div className="bg-white rounded-3xl max-w-md w-full max-w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">Create New Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddCatModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-emerald-700/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickCatName.trim()) return;
                const newCat = addCategory({
                  name: quickCatName.trim(),
                  defaultBodyPart: quickCatBodyPart,
                  icon: quickCatIcon,
                  isActive: true,
                });
                setFormCategory(newCat.name);
                setFormCategoryId(newCat.id);
                setFormBodyPart(newCat.defaultBodyPart || 'Ear');
                setFormBodyPartIcon(newCat.icon || '👂');
                setShowQuickAddCatModal(false);
                setQuickCatName('');
              }}
              className="p-3.5 space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickCatName}
                  onChange={(e) => setQuickCatName(e.target.value)}
                  placeholder="e.g. Ear Care Drops"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Default Target Body Part
                </label>
                <select
                  value={quickCatBodyPart}
                  onChange={(e) => {
                    const bpName = e.target.value;
                    setQuickCatBodyPart(bpName);
                    const bInfo = getBodyPartInfo(bpName);
                    setQuickCatIcon(bInfo.emoji);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none cursor-pointer"
                >
                  {BODY_PARTS.map((bp) => (
                    <option key={bp.id} value={bp.name}>
                      {bp.emoji} {bp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Category Icon / Emoji
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-lg shrink-0">
                    {quickCatIcon}
                  </div>
                  <input
                    type="text"
                    value={quickCatIcon}
                    onChange={(e) => setQuickCatIcon(e.target.value)}
                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs font-bold focus:bg-white focus:outline-none"
                    maxLength={4}
                  />
                  <span className="text-[10px] text-slate-500">
                    Emoji shown on products
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCatModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Create &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAME COMPOSITION BRAND ALTERNATIVES MODAL (Section 6) */}
      {altModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full max-w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-300" />
                <h3 className="font-bold text-sm">Equivalent Medicines (Same Salt)</h3>
              </div>
              <button
                onClick={() => setAltModalProduct(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs text-slate-600">
                Products sharing identical active composition with <strong className="text-slate-900">{altModalProduct.name}</strong>:
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {getAlternativeProducts(altModalProduct.id).map((alt) => {
                  const stock = getProductTotalStock(alt.id);
                  const tab = alt.units.find((u) => u.name === 'Tablet') || alt.units[0];

                  return (
                    <div key={alt.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{alt.name}</div>
                        <div className="text-[11px] text-slate-500">
                          Brand: {alt.brand} • Mfr: {alt.manufacturer}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          {tab?.defaultSellingPrice || '—'}/{tab?.name}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700">
                          {stock} {alt.baseUnit}s available
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS INSPECTION MODAL */}
      {inspectingProduct && (() => {
        const totalStock = getProductTotalStock(inspectingProduct.id);
        const alternatives = getAlternativeProducts(inspectingProduct.id);
        const batches = getProductBatches(inspectingProduct.id, true);
        const sellPrice = inspectingProduct.sellingPrice || inspectingProduct.units[0]?.defaultSellingPrice || 0;
        const buyPrice = inspectingProduct.purchasePrice || inspectingProduct.units[0]?.defaultPurchasePrice || 0;
        const isLowStock = totalStock <= (inspectingProduct.minStockBaseUnits || 0);

        const formatExpMonthYear = (d: string) => {
          if (!d) return '—';
          const parts = d.split('-');
          if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
          return d;
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden">
            <div className="bg-white rounded-2xl max-w-lg w-full max-w-full shadow-xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Clean Light Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{inspectingProduct.name}</h3>
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {inspectingProduct.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>Brand: <strong className="text-slate-700 font-semibold">{inspectingProduct.brand || 'Generic'}</strong></span>
                    {inspectingProduct.manufacturer && (
                      <>
                        <span>•</span>
                        <span>Mfr: {inspectingProduct.manufacturer}</span>
                      </>
                    )}
                    {inspectingProduct.bodyPart && (
                      <>
                        <span>•</span>
                        <span>Target: {inspectingProduct.bodyPartIcon} {inspectingProduct.bodyPart}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingProduct(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                {/* Product Images Gallery (Max 4 Images with 1st Cover Highlight) */}
                {(() => {
                  const pImages = (inspectingProduct.images && inspectingProduct.images.length > 0)
                    ? inspectingProduct.images
                    : (inspectingProduct.image ? [inspectingProduct.image] : []);
                  if (pImages.length === 0) return null;
                  const activeImg = pImages[inspectingImageIndex] || pImages[0];

                  return (
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="relative aspect-16/9 sm:aspect-2/1 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={activeImg}
                          alt={inspectingProduct.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                          {inspectingImageIndex === 0 ? (
                            <>
                              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              <span>1st (Cover Image)</span>
                            </>
                          ) : (
                            <span>Photo #{inspectingImageIndex + 1}</span>
                          )}
                        </div>
                      </div>

                      {pImages.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                          {pImages.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setInspectingImageIndex(idx)}
                              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                                inspectingImageIndex === idx
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                                  : 'border-slate-200 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={img}
                                alt={`Thumb ${idx + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              {idx === 0 && (
                                <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[8px] font-bold text-center leading-tight">
                                  1st
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Active Composition */}
                {inspectingProduct.compositions?.length > 0 && (
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-400">Salt Composition: </span>
                    <span className="font-semibold text-slate-800">
                      {inspectingProduct.compositions.map((c) => `${c.ingredient} ${c.strength}`).join(', ')}
                    </span>
                  </div>
                )}

                {/* Key Numbers Flat Row */}
                <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Selling MRP</span>
                    <span className="text-sm font-bold text-emerald-700 tabular-nums">₹{Number(sellPrice || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-x border-slate-200/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Purchase Cost</span>
                    <span className="text-sm font-semibold text-slate-700 tabular-nums">
                      {buyPrice > 0 ? `₹${Number(buyPrice || 0).toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Available Stock</span>
                    <span className={`text-sm font-bold tabular-nums ${isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                      {totalStock} {inspectingProduct.baseUnit}s
                    </span>
                  </div>
                </div>

                {/* Packaging & Codes Details */}
                <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-100 flex-wrap gap-2">
                  <div>
                    <span>Pack: </span>
                    <span className="text-slate-800 font-medium">
                      {inspectingProduct.units[0]?.name || 'Standard'} ({inspectingProduct.units[0]?.multiplierToBase || 1} {inspectingProduct.baseUnit}s)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {inspectingProduct.barcode && (
                      <span>Barcode: <span className="font-mono text-slate-700">{inspectingProduct.barcode}</span></span>
                    )}
                    {inspectingProduct.sku && (
                      <span>SKU: <span className="font-mono text-slate-700">{inspectingProduct.sku}</span></span>
                    )}
                  </div>
                </div>

                {/* Associated Batches Clean List */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 text-xs">
                      Batches ({batches.length})
                    </span>
                    <span className="text-[11px] text-slate-400">FEFO tracked</span>
                  </div>

                  {batches.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                      No stock batches available.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <th className="py-2 px-3">Batch No</th>
                            <th className="py-2 px-3">Expiry</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Sell Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {batches.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-2 px-3 font-mono font-medium text-slate-800">
                                {b.batchNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-600 tabular-nums">
                                {formatExpMonthYear(b.expiryDate)}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-900 tabular-nums">
                                {b.availableBaseQuantity} {inspectingProduct.baseUnit}s
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-emerald-700 tabular-nums">
                                ₹{Number(b.sellingPricePerBaseUnit || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Same-Salt Substitutes Link */}
                {alternatives.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAltModalProduct(inspectingProduct);
                        setInspectingProduct(null);
                      }}
                      className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1.5 cursor-pointer hover:underline"
                    >
                      <Pill className="w-3.5 h-3.5 text-teal-600" />
                      <span>View {alternatives.length} Same-Salt Substitute Brands →</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Clean Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const prod = inspectingProduct;
                    setProductToDelete(prod);
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs"
                  title="Delete product from system"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Product</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingProduct(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-medium transition cursor-pointer text-xs"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const prod = inspectingProduct;
                      setInspectingProduct(null);
                      handleEditClick(prod);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer flex items-center gap-1.5 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Product</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {productToDelete && (() => {
        const prod = productToDelete;
        const totalStock = getProductTotalStock(prod.id);
        const batches = getProductBatches(prod.id, true);
        const hasStock = totalStock > 0;

        return (
          <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shadow-2xs">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-rose-950">Delete Product from System</h3>
                    <p className="text-[11px] text-rose-700/80">Permanent catalog removal</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs">
                {/* Product Card Preview */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3">
                  <img
                    src={(prod.images && prod.images[0]) || prod.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=60'}
                    alt={prod.name}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-slate-900 text-sm truncate">{prod.name}</h4>
                    <div className="text-[11px] text-slate-500 truncate">
                      {prod.category} • {prod.brand || 'Generic'}
                    </div>
                    {prod.sku && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        SKU: {prod.sku}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Warning Box */}
                {hasStock ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-xs text-amber-950">Active Stock Detected</div>
                      <div className="text-[11px] text-amber-800 leading-relaxed">
                        This medicine currently has <strong className="font-bold text-amber-950">{totalStock} {prod.baseUnit}s</strong> in stock across <strong className="font-bold text-amber-950">{batches.length} batch(es)</strong>. Deleting will permanently remove this medicine and clear all related batch records.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-slate-600 leading-relaxed">
                      This medicine has <strong>0 units</strong> in stock. Deleting it will safely remove it from your product catalog.
                    </div>
                  </div>
                )}

                {/* Invoices & Sales Safety Guarantee */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-start gap-2.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-emerald-800 leading-relaxed">
                    <strong className="text-emerald-950 font-semibold">Invoices &amp; Sales Protected:</strong> Deleting this product will <span className="underline decoration-emerald-500 font-semibold">NOT delete</span> any past sales, customer invoices, or accounting records. All historical sales receipts remain 100% intact.
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Are you sure you want to delete <span className="font-semibold text-slate-800">"{prod.name}"</span>?
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-medium transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs hover:shadow transition cursor-pointer flex items-center gap-1.5 text-xs active:scale-98"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete Product</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Product Photo Source Picker (Camera vs Browse) */}
      <ProductPhotoPickerModal
        isOpen={showPhotoPickerModal}
        onClose={() => setShowPhotoPickerModal(false)}
        onImageSelected={handlePhotoPickerSelected}
        onTriggerBrowse={() => fileInputRef.current?.click()}
        initialMode={photoPickerInitialMode}
        onScanImage={(img) => {
          setShowPhotoPickerModal(false);
          setAiScannerInitialImage(img);
          setShowAiScannerModal(true);
        }}
      />

      {/* AI Product Packaging Vision Scanner Modal */}
      <ProductAiScannerModal
        isOpen={showAiScannerModal}
        onClose={() => {
          setShowAiScannerModal(false);
          setAiScannerInitialImage(null);
        }}
        onApplyDetails={handleApplyExtractedDetails}
        initialImage={aiScannerInitialImage}
      />
    </div>
  );
};
