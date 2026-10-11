import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Boxes,
  ArrowRight,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { usePharmacy } from '../context/PharmacyContext';
import { ProductCategory } from '../types';
import { BODY_PARTS, getBodyPartInfo } from '../data/bodyParts';

interface CategoriesViewProps {
  onSelectCategory?: (categoryName: string) => void;
  onNavigateToProducts?: () => void;
}

const EMOJI_PRESETS = [
  '👂', '👁️', '👃', '🗣️', '🧠', '🫀', '🫁', '🫄',
  '🧴', '🦴', '🌡️', '💪', '🩸', '💊', '🩹', '🧼',
  '🌿', '👶', '🏥', '⚕️',
];

const COLOR_PRESETS = [
  { name: 'Amber (Ear / Warm)', value: 'amber', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  { name: 'Sky (Eye / Clear)', value: 'sky', bg: 'bg-sky-100 text-sky-800 border-sky-300' },
  { name: 'Orange (Gastro / Digestion)', value: 'orange', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
  { name: 'Rose (Fever / Cardiac)', value: 'rose', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  { name: 'Cyan (Respiratory)', value: 'cyan', bg: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { name: 'Emerald (Skin / Derma)', value: 'emerald', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { name: 'Stone (Bones & Joints)', value: 'stone', bg: 'bg-stone-100 text-stone-800 border-stone-300' },
  { name: 'Purple (Neuro / Brain)', value: 'purple', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
  { name: 'Blue (Antibiotics)', value: 'blue', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
  { name: 'Lime (Vitamins)', value: 'lime', bg: 'bg-lime-100 text-lime-800 border-lime-300' },
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  onSelectCategory,
  onNavigateToProducts,
}) => {
  const { categories, addCategory, updateCategory, deleteCategory, products } = usePharmacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodyPartFilter, setSelectedBodyPartFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('👂');
  const [formDefaultBodyPart, setFormDefaultBodyPart] = useState('Ear');
  const [formColor, setFormColor] = useState('amber');

  // Count products per category
  const productCountMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const catKey = (p.category || '').trim().toLowerCase();
      map.set(catKey, (map.get(catKey) || 0) + 1);
    });
    return map;
  }, [products]);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.defaultBodyPart || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBodyPart =
        selectedBodyPartFilter === 'All' ||
        (cat.defaultBodyPart || '').toLowerCase() === selectedBodyPartFilter.toLowerCase();

      return matchesSearch && matchesBodyPart;
    });
  }, [categories, searchQuery, selectedBodyPartFilter]);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormIcon('👂');
    setFormDefaultBodyPart('Ear');
    setFormColor('amber');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: ProductCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormIcon(cat.icon || '💊');
    setFormDefaultBodyPart(cat.defaultBodyPart || 'General');
    setFormColor(cat.color || 'blue');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: formName.trim(),
        description: formDescription.trim(),
        icon: formIcon,
        defaultBodyPart: formDefaultBodyPart,
        color: formColor,
      });
    } else {
      addCategory({
        name: formName.trim(),
        description: formDescription.trim(),
        icon: formIcon,
        defaultBodyPart: formDefaultBodyPart,
        color: formColor,
        isActive: true,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    const count = productCountMap.get(name.trim().toLowerCase()) || 0;
    const confirmMsg =
      count > 0
        ? `Category "${name}" is currently assigned to ${count} product(s). Are you sure you want to delete it?`
        : `Are you sure you want to delete category "${name}"?`;

    if (window.confirm(confirmMsg)) {
      deleteCategory(id);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <FolderTree className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-emerald-300 text-xs font-semibold mb-3 border border-white/10">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Medicine Classification & Anatomical Body Parts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Category Management</span>
              <span className="text-sm font-semibold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                {categories.length} Categories
              </span>
            </h1>
            <p className="text-emerald-100/80 text-sm max-w-2xl mt-1.5 leading-relaxed">
              Create and manage medicine categories with intuitive anatomical body part tagging (e.g. 👂 Ear for Ear Drops, 👁️ Eye, 🫄 Stomach, 🫀 Heart). Selected categories and body parts appear instantly in product creation and POS billing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="add-category-btn"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Category</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-xs text-emerald-200/80">Total Categories</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">{categories.length}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-xs text-emerald-200/80">Body Part Targets</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">{BODY_PARTS.length} Organs</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-xs text-emerald-200/80">Total Active Products</div>
            <div className="text-2xl font-extrabold text-white mt-0.5">{products.length}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <div className="text-xs text-emerald-200/80">Ear &amp; ENT Products</div>
            <div className="text-2xl font-extrabold text-amber-300 mt-0.5 flex items-center gap-1.5">
              <span>👂</span>
              <span>
                {products.filter((p) => p.bodyPart === 'Ear' || (p.category || '').toLowerCase().includes('ear')).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search category, body part, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold text-slate-600">
            <span className="text-slate-400 text-xs whitespace-nowrap">Filter Body Part:</span>
            <select
              value={selectedBodyPartFilter}
              onChange={(e) => setSelectedBodyPartFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="All">All Body Parts ({categories.length})</option>
              {BODY_PARTS.map((bp) => (
                <option key={bp.id} value={bp.name}>
                  {bp.emoji} {bp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Anatomical Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedBodyPartFilter('All')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex-shrink-0 cursor-pointer ${
              selectedBodyPartFilter === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {BODY_PARTS.slice(0, 10).map((bp) => {
            const isSelected = selectedBodyPartFilter.toLowerCase() === bp.name.toLowerCase();
            return (
              <button
                key={bp.id}
                onClick={() => setSelectedBodyPartFilter(isSelected ? 'All' : bp.name)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{bp.emoji}</span>
                <span>{bp.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const count = productCountMap.get(cat.name.trim().toLowerCase()) || 0;
          const bodyPartInfo = getBodyPartInfo(cat.defaultBodyPart);

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
            >
              <div>
                {/* Header row: Icon & Actions */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                      {cat.icon || '💊'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition">
                        {cat.name}
                      </h3>
                      {cat.defaultBodyPart && (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 mt-0.5">
                          <span>Target:</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800">
                            <span>{bodyPartInfo.emoji}</span>
                            <span>{cat.defaultBodyPart}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleOpenEditModal(cat)}
                      title="Edit Category"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      title="Delete Category"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                  {cat.description || 'General medicine category for pharmacy inventory and point-of-sale.'}
                </p>
              </div>

              {/* Footer: Product count & Quick Filter */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span>
                    {count} {count === 1 ? 'Product' : 'Products'}
                  </span>
                </div>

                {onSelectCategory && (
                  <button
                    onClick={() => {
                      onSelectCategory(cat.name);
                      if (onNavigateToProducts) onNavigateToProducts();
                    }}
                    className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    <span>View Products</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-3">
              🔍
            </div>
            <h3 className="text-base font-bold text-slate-900">No Categories Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No categories match your search or body part filter. Clear the filter or add a new category.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Category Now</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto overflow-x-hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full max-w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-5 my-auto animate-in fade-in zoom-in-95 duration-150 overflow-x-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl">
                  {formIcon}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {editingCategory ? 'Edit Medicine Category' : 'Add New Medicine Category'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure category with anatomical body part emoji</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ear, Nose & Eye Care, Gastrointestinal & Antacids"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                />
              </div>

              {/* Default Body Part & Emoji */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Body Part <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formDefaultBodyPart}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setFormDefaultBodyPart(selected);
                      const info = getBodyPartInfo(selected);
                      if (info && info.emoji) {
                        setFormIcon(info.emoji);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {BODY_PARTS.map((bp) => (
                      <option key={bp.id} value={bp.name}>
                        {bp.emoji} {bp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Emoji Icon</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      className="w-16 text-center text-xl bg-slate-50 border border-slate-200 rounded-xl py-2 font-semibold text-slate-900 focus:bg-white focus:outline-none"
                    />
                    <div className="text-[11px] text-slate-500 leading-tight">
                      Click below or pick from quick presets
                    </div>
                  </div>
                </div>
              </div>

              {/* Emoji quick presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Suggested Emojis
                </label>
                <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setFormIcon(emoji)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition cursor-pointer ${
                        formIcon === emoji
                          ? 'bg-emerald-600 text-white shadow-xs scale-110'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Indications</label>
                <textarea
                  rows={2}
                  placeholder="e.g. For ear infections, otitis, earache, wax removal drops"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Color Theme */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Category Color Badge</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      type="button"
                      key={color.value}
                      onClick={() => setFormColor(color.value)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center truncate ${
                        formColor === color.value
                          ? `${color.bg} ring-2 ring-emerald-600 font-extrabold shadow-xs`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {color.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/20 cursor-pointer transition"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
