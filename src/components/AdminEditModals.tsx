import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';
import { Category, Product, Expense, User } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { CategoryIconPicker } from './CategoryIconPicker';
import { Plus, Trash2, X } from 'lucide-react';
import { STANDARD_COLORS, STANDARD_SIZES } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { adminTr } from '../i18n/adminDict';
import { ProductImageEditor } from './ProductImageEditor';

interface Props {
  editingCategory: Category | null;
  setEditingCategory: (c: Category | null) => void;
  editingProduct: Product | null;
  setEditingProduct: (p: Product | null) => void;
  editingExpense: Expense | null;
  setEditingExpense: (e: Expense | null) => void;
  editingUser: User | null;
  setEditingUser: (u: User | null) => void;
}



export const AdminEditModals: React.FC<Props> = ({
  editingCategory, setEditingCategory,
  editingProduct, setEditingProduct,
  editingExpense, setEditingExpense,
  editingUser, setEditingUser
}) => {
  const { updateCategory, addProduct, updateProduct, updateExpense, updateUser, categories } = useStore();
  const { language } = useLanguage();
  const L = (s: string) => adminTr(s, language);

  const normalizeGender = (value: any): 0 | 1 | 2 => {
    if (value === 'boy' || value === 1 || value === '1') return 1;
    if (value === 'girl' || value === 2 || value === '2') return 2;
    return 0;
  };

  const hasModal = Boolean(editingCategory || editingProduct || editingExpense || editingUser);

  return (
    <AnimatePresence>
      {hasModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
            className={`bg-white rounded-3xl w-full ${editingProduct ? 'max-w-3xl sm:max-w-4xl' : 'max-w-2xl sm:max-w-3xl'} max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-slate-100`}
          >
            <button 
              onClick={() => {
                setEditingCategory(null);
                setEditingProduct(null);
                setEditingExpense(null);
                setEditingUser(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

        {/* Category Edit */}
        {editingCategory && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">{L("Edit Category")}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateCategory(editingCategory);
              setEditingCategory(null);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">{L("Name (EN)")}</label>
                  <input type="text" required value={editingCategory.name || ""} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">{L("Name (KU)")}</label>
                  <input type="text" value={editingCategory.nameKu || ''} onChange={e => setEditingCategory({...editingCategory, nameKu: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">{L("Name (AR)")}</label>
                  <input type="text" value={editingCategory.nameAr || ''} onChange={e => setEditingCategory({...editingCategory, nameAr: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">{L("Slug (Optional)")}</label>
                <input type="text" value={editingCategory.slug || ''} onChange={e => setEditingCategory({...editingCategory, slug: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">{L("Category Icon")}</label>
                <CategoryIconPicker
                  value={editingCategory.icon}
                  onChange={icon => setEditingCategory({ ...editingCategory, icon })}
                  maxHeight="max-h-64"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">{L("Cancel")}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">{L("Save Category")}</button>
              </div>
            </form>
          </div>
        )}

        {/* Product Edit */}
        {/* Product Edit / Create Modal */}
        {editingProduct && (
          <div className="font-arabic">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200/80">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {editingProduct.id ? (language === 'ku' ? 'دەستکاریکردنی بەرهەم' : language === 'ar' ? 'تعديل المنتج' : 'Edit Product') : (language === 'ku' ? 'دروستکردنی بەرهەمی نوێ' : language === 'ar' ? 'إضافة منتج جديد' : 'Create New Product')}
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  {language === 'ku' ? 'دیاریکردنی ناو، نرخ، کۆگا، و بارکۆدی تایبەت بە هەر ڕەنگ و سایزێک' : 'Set product details, prices, stock, and barcodes per variation'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* This modal both creates and edits — its own heading says which.
                Submitting always called updateProduct, so "create new product"
                sent PUT /api/products/undefined: no product was ever created,
                the failure was swallowed, and the modal closed as if it had
                worked. Create when there is no id yet, update when there is. */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (editingProduct.id) {
                  await updateProduct(editingProduct);
                } else {
                  await addProduct({ ...editingProduct, id: `p${Date.now()}` });
                }
                setEditingProduct(null);
              } catch {
                // The store has already shown the server's reason. Leave the
                // modal open with everything still typed in it.
              }
            }} className="space-y-6">
              
              {/* Category & Gender */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">{L("Category & Target Group")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Category")}</label>
                    <select 
                      value={editingProduct.categoryId} 
                      onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value})} 
                      className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                      required
                    >
                      <option value="">{L("Select Category")}</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Gender")}</label>
                    <select 
                      value={normalizeGender(editingProduct.gender)} 
                      onChange={e => setEditingProduct({...editingProduct, gender: Number(e.target.value) as 0 | 1 | 2})} 
                      className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value={0}>{L("Both")}</option>
                      <option value={1}>{L("Boy")}</option>
                      <option value={2}>{L("Girl")}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Names in 3 languages */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">{language === 'ku' ? 'ناوی بەرهەم بە سێ زمان' : 'Product Names'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Name (EN)")}</label>
                    <input type="text" required value={editingProduct.name || ""} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Name (KU)")}</label>
                    <input type="text" value={editingProduct.nameKu || ''} onChange={e => setEditingProduct({...editingProduct, nameKu: e.target.value})} className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white" dir="rtl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Name (AR)")}</label>
                    <input type="text" value={editingProduct.nameAr || ''} onChange={e => setEditingProduct({...editingProduct, nameAr: e.target.value})} className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white" dir="rtl" />
                  </div>
                </div>
              </div>

              {/* Pricing & Main Barcode */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">{language === 'ku' ? 'نرخ، تێچوو و بارکۆدی سەرەکی' : 'Pricing & Base Barcode'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Price")} (IQD)</label>
                    <input type="number" step="0.01" required value={editingProduct.price ?? ""} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Cost")} (IQD)</label>
                    <input type="number" step="0.01" value={editingProduct.cost ?? 0} onChange={e => setEditingProduct({...editingProduct, cost: Number(e.target.value)})} className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">
                      {L("Barcode")} <span className="text-slate-400 font-normal">({language === 'ku' ? 'ئارەزوومەندانە' : 'optional'})</span>
                    </label>
                    {/* Not `required`. Nothing else asks for a barcode — not the
                        form's own check, not the API — but the browser refused
                        to submit without one and said so in English, in a small
                        bubble on a Kurdish right-to-left form. Pressing "create
                        product" simply did nothing. It also made every product
                        without a barcode impossible to edit at all. */}
                    <input type="text" value={editingProduct.barcode || editingProduct.sku || ""} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value, sku: e.target.value})} className="w-full border border-slate-300 rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="869000123456" />
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">{language === 'ku' ? 'وەسفی بەرهەم' : 'Descriptions'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">
                      {L("Description (EN)")} <span className="text-slate-400 font-normal">({language === 'ku' ? 'ئارەزوومەندانە' : 'optional'})</span>
                    </label>
                    {/* Also not `required`, for the same reason as the barcode:
                        a shop writing only the Kurdish description was stopped
                        by the English one, with no visible explanation. */}
                    <textarea value={editingProduct.description || ""} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border border-slate-300 rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Description (KU)")}</label>
                    <textarea value={editingProduct.descriptionKu || ''} onChange={e => setEditingProduct({...editingProduct, descriptionKu: e.target.value})} className="w-full border border-slate-300 rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white" rows={2} dir="rtl" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700">{L("Description (AR)")}</label>
                    <textarea value={editingProduct.descriptionAr || ''} onChange={e => setEditingProduct({...editingProduct, descriptionAr: e.target.value})} className="w-full border border-slate-300 rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-white" rows={2} dir="rtl" />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="pt-2">
                <ProductImageEditor
                  images={editingProduct.images || (editingProduct.imageUrl ? [editingProduct.imageUrl] : [])}
                  primaryImageUrl={editingProduct.imageUrl || ''}
                  onChange={(newImages, newPrimaryUrl) => {
                    setEditingProduct({
                      ...editingProduct,
                      images: newImages,
                      imageUrl: newPrimaryUrl || (newImages.length > 0 ? newImages[0] : ''),
                    });
                  }}
                />
              </div>

              {/* Per-Variation Setup (Color, Size, Stock & Variation Barcode) */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{language === 'ku' ? 'جۆرەکانی بەرهەم (ڕەنگ، سایز، عەمبار و بارکۆد)' : 'Product Variations (Color, Size, Stock & Barcode)'}</h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {language === 'ku' ? 'تکایە بارکۆدی تایبەت بنووسە بۆ سکێنکردنی فەوری لە POS بۆ هەر ڕەنگ یان سایزێک' : 'Assign custom barcodes to each color & size for instant POS scanning'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingProduct({
                      ...editingProduct,
                      variations: [...(editingProduct.variations || []), { id: `v${Date.now()}`, productId: editingProduct.id, color: '', size: '', stockQuantity: 0, barcode: '', sku: '' }]
                    })}
                    className="text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center shrink-0 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 mr-1" /> {language === 'ku' ? 'زیادکردنی جۆر' : 'Add Variation'}
                  </button>
                </div>
                
                {(!editingProduct.variations || editingProduct.variations.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-indigo-200 rounded-xl bg-white/60">
                    <p className="text-xs text-slate-500 font-bold">{language === 'ku' ? 'هیچ جۆرێک زیاد نەکراوە. بۆ ئەوەی ڕەنگ و سایزەکان دیاری بکەیت دوگمەی "زیادکردنی جۆر" داگرە.' : 'No variations added yet. Click "Add Variation" to specify color, size, stock & barcode.'}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {editingProduct.variations.map((v, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_1fr_auto] items-center gap-2 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                        {/* Color */}
                        <div>
                          <label className="block sm:hidden text-[10px] font-bold text-slate-500 mb-1">{L("Color")}</label>
                          <select
                            value={v.color || ""}
                            onChange={(e) => {
                              const newVars = [...(editingProduct.variations || [])];
                              newVars[index] = { ...newVars[index], color: e.target.value };
                              setEditingProduct({...editingProduct, variations: newVars});
                            }}
                            className="w-full border border-slate-300 rounded-lg py-2 px-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                          >
                            <option value="">{L("Select Color")}</option>
                            {STANDARD_COLORS.map(color => (
                              <option key={color} value={color}>{color}</option>
                            ))}
                          </select>
                        </div>

                        {/* Size */}
                        <div>
                          <label className="block sm:hidden text-[10px] font-bold text-slate-500 mb-1">{L("Size")}</label>
                          <select
                            value={v.size || ""}
                            onChange={(e) => {
                              const newVars = [...(editingProduct.variations || [])];
                              newVars[index] = { ...newVars[index], size: e.target.value };
                              setEditingProduct({...editingProduct, variations: newVars});
                            }}
                            className="w-full border border-slate-300 rounded-lg py-2 px-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                          >
                            <option value="">{L("Select Size")}</option>
                            {STANDARD_SIZES.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>

                        {/* Stock Quantity */}
                        <div>
                          <label className="block sm:hidden text-[10px] font-bold text-slate-500 mb-1">{L("Qty")}</label>
                          <input
                            type="number"
                            min="0"
                            placeholder={L("Qty")}
                            value={v.stockQuantity ?? ""}
                            onChange={(e) => {
                              const newVars = [...(editingProduct.variations || [])];
                              newVars[index] = { ...newVars[index], stockQuantity: Number(e.target.value) };
                              setEditingProduct({...editingProduct, variations: newVars});
                            }}
                            className="w-full border border-slate-300 rounded-lg py-2 px-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-center"
                          />
                        </div>

                        {/* Variation Barcode */}
                        <div>
                          <label className="block sm:hidden text-[10px] font-bold text-slate-500 mb-1">{language === 'ku' ? 'بارکۆدی جۆرەکە' : 'Variation Barcode'}</label>
                          <input
                            type="text"
                            placeholder={language === 'ku' ? 'بارکۆدی ڕەنگ/سایز' : 'Variation Barcode'}
                            value={v.barcode || v.sku || ""}
                            onChange={(e) => {
                              const newVars = [...(editingProduct.variations || [])];
                              newVars[index] = { ...newVars[index], barcode: e.target.value, sku: e.target.value };
                              setEditingProduct({...editingProduct, variations: newVars});
                            }}
                            className="w-full border border-slate-300 rounded-lg py-2 px-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                          />
                        </div>

                        {/* Remove */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct({
                                ...editingProduct,
                                variations: (editingProduct.variations || []).filter((_, i) => i !== index)
                              });
                            }}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title={L("Delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 sticky bottom-0 bg-white py-3 z-10">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-5 py-2.5 text-xs font-extrabold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">{L("Cancel")}</button>
                <button type="submit" className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer active:scale-95">
                  {editingProduct.id ? (language === 'ku' ? 'پاشەکەوتکردنی بەرهەم' : 'Save Product') : (language === 'ku' ? 'دروستکردنی بەرهەم' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expense Edit */}
        {editingExpense && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">{L("Edit Expense")}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateExpense(editingExpense);
              setEditingExpense(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">{L("Description")}</label>
                <input type="text" required value={editingExpense.description || ""} onChange={e => setEditingExpense({...editingExpense, description: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">{L("Amount")}</label>
                <input type="number" step="0.01" required value={editingExpense.amount ?? ""} onChange={e => setEditingExpense({...editingExpense, amount: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">{L("Category")}</label>
                <input type="text" required value={editingExpense.category || ""} onChange={e => setEditingExpense({...editingExpense, category: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingExpense(null)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">{L("Cancel")}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">{L("Save Expense")}</button>
              </div>
            </form>
          </div>
        )}

        {/* User Edit */}
        {editingUser && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">{L("Edit User")}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateUser(editingUser);
              setEditingUser(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">{L("Full Name")}</label>
                <input type="text" required value={editingUser.name || ""} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">{L("Email")}</label>
                <input type="email" value={editingUser.email && !editingUser.email.includes('@phone.user') ? editingUser.email : ""} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">
                  {language === 'ku' ? 'ژمارەی مۆبایل' : language === 'ar' ? 'رقم الهاتف' : 'Mobile number'}
                </label>
                <input type="tel" placeholder="07501234567" value={editingUser.phone || ""} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">{L("Role")}</label>
                <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: Number(e.target.value) as 0 | 1 | 2 | 3})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500">
                  <option value={1}>{language === 'ku' ? '1 - بەڕێوەبەر (Admin)' : '1 - Admin'}</option>
                  <option value={2}>{language === 'ku' ? '2 - کاشێر (Cashier)' : '2 - Cashier'}</option>
                  <option value={3}>{language === 'ku' ? '3 - کارمەند (Staff)' : '3 - Staff'}</option>
                  <option value={0}>{language === 'ku' ? '0 - کڕیار (Customer)' : '0 - Customer'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">{L("Cancel")}</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">{L("Save User")}</button>
              </div>
            </form>
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
