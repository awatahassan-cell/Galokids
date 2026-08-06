const fs = require('fs');
const content = `import React, { useState } from 'react';
import { useStore } from '../store';
import { Category, Product, Expense, User } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { Plus, Trash2, X } from 'lucide-react';
import { STANDARD_COLORS, STANDARD_SIZES } from '../data';

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

const CATEGORY_ICONS = [
  'Shirt', 'Baby', 'Sparkles', 'Gamepad', 'Footprints', 'Smile', 'CloudRain', 'Flame',
  'ShoppingBag', 'Tag', 'Palette', 'Heart', 'Backpack', 'Crown', 'Car', 'Gift'
];

export const AdminEditModals: React.FC<Props> = ({
  editingCategory, setEditingCategory,
  editingProduct, setEditingProduct,
  editingExpense, setEditingExpense,
  editingUser, setEditingUser
}) => {
  const { updateCategory, updateProduct, updateExpense, updateUser, categories } = useStore();

  if (!editingCategory && !editingProduct && !editingExpense && !editingUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-xl relative">
        <button 
          onClick={() => {
            setEditingCategory(null);
            setEditingProduct(null);
            setEditingExpense(null);
            setEditingUser(null);
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Category Edit */}
        {editingCategory && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Edit Category</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateCategory(editingCategory);
              setEditingCategory(null);
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Name (EN)</label>
                  <input type="text" required value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Name (KU)</label>
                  <input type="text" value={editingCategory.nameKu || ''} onChange={e => setEditingCategory({...editingCategory, nameKu: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Name (AR)</label>
                  <input type="text" value={editingCategory.nameAr || ''} onChange={e => setEditingCategory({...editingCategory, nameAr: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Slug (Optional)</label>
                <input type="text" value={editingCategory.slug || ''} onChange={e => setEditingCategory({...editingCategory, slug: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Category Icon</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {CATEGORY_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setEditingCategory({...editingCategory, icon: iconName})}
                      className={\`flex flex-col items-center justify-center p-2 rounded-lg border transition-all \${
                        editingCategory.icon === iconName
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-600 scale-105 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }\`}
                      title={iconName}
                    >
                      <CategoryIcon name={iconName} className="w-5 h-5 mb-1" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">Save Category</button>
              </div>
            </form>
          </div>
        )}

        {/* Product Edit */}
        {editingProduct && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Edit Product</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateProduct(editingProduct);
              setEditingProduct(null);
            }} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Category</label>
                  <select 
                    value={editingProduct.categoryId} 
                    onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value})} 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Gender</label>
                  <select 
                    value={editingProduct.gender || 'unisex'} 
                    onChange={e => setEditingProduct({...editingProduct, gender: e.target.value as any})} 
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="unisex">Unisex</option>
                    <option value="boy">Boy</option>
                    <option value="girl">Girl</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Name (EN)</label>
                  <input type="text" required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Name (KU)</label>
                  <input type="text" value={editingProduct.nameKu || ''} onChange={e => setEditingProduct({...editingProduct, nameKu: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Name (AR)</label>
                  <input type="text" value={editingProduct.nameAr || ''} onChange={e => setEditingProduct({...editingProduct, nameAr: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Description (EN)</label>
                  <textarea required value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Description (KU)</label>
                  <textarea value={editingProduct.descriptionKu || ''} onChange={e => setEditingProduct({...editingProduct, descriptionKu: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Description (AR)</label>
                  <textarea value={editingProduct.descriptionAr || ''} onChange={e => setEditingProduct({...editingProduct, descriptionAr: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" rows={2} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Price ($)</label>
                  <input type="number" step="0.01" required value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Cost ($)</label>
                  <input type="number" step="0.01" value={editingProduct.cost || 0} onChange={e => setEditingProduct({...editingProduct, cost: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">SKU</label>
                  <input type="text" required value={editingProduct.sku} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Image URL</label>
                <input type="url" required value={editingProduct.imageUrl} onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Variations (Color/Size/Stock)</h3>
                  <button
                    type="button"
                    onClick={() => setEditingProduct({
                      ...editingProduct,
                      variations: [...editingProduct.variations, { id: \`v\${Date.now()}\`, productId: editingProduct.id, color: '', size: '', stockQuantity: 0 }]
                    })}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </button>
                </div>
                
                {editingProduct.variations.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No variations added.</p>
                ) : (
                  <div className="space-y-2">
                    {editingProduct.variations.map((v, index) => (
                      <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="flex-1 min-w-[100px]">
                          <select
                            value={v.color}
                            onChange={(e) => {
                              const newVars = [...editingProduct.variations];
                              newVars[index] = { ...newVars[index], color: e.target.value };
                              setEditingProduct({...editingProduct, variations: newVars});
                            }}
                            className="w-full border border-slate-300 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          >
                            <option value="">Select Color</option>
                            {STANDARD_COLORS.map(color => (
                              <option key={color} value={color}>{color}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <select
                            value={v.size}
                            onChange={(e) => {
                              const newVars = [...editingProduct.variations];
                              newVars[index] = { ...newVars[index], size: e.target.value };
                              setEditingProduct({...editingProduct, variations: newVars});
                            }}
                            className="w-full border border-slate-300 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          >
                            <option value="">Select Size</option>
                            {STANDARD_SIZES.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={v.stockQuantity}
                            onChange={(e) => {
                              const newVars = [...editingProduct.variations];
                              newVars[index] = { ...newVars[index], stockQuantity: Number(e.target.value) };
                              setEditingProduct({...editingProduct, variations: newVars});
                            }}
                            className="w-full border border-slate-300 rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              variations: editingProduct.variations.filter((_, i) => i !== index)
                            });
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">Save Product</button>
              </div>
            </form>
          </div>
        )}

        {/* Expense Edit */}
        {editingExpense && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Edit Expense</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateExpense(editingExpense);
              setEditingExpense(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Description</label>
                <input type="text" required value={editingExpense.description} onChange={e => setEditingExpense({...editingExpense, description: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Amount</label>
                <input type="number" step="0.01" required value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Category</label>
                <input type="text" required value={editingExpense.category} onChange={e => setEditingExpense({...editingExpense, category: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingExpense(null)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">Save Expense</button>
              </div>
            </form>
          </div>
        )}

        {/* User Edit */}
        {editingUser && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Edit User</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateUser(editingUser);
              setEditingUser(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Name</label>
                <input type="text" required value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Email</label>
                <input type="email" required value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Role</label>
                <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: Number(e.target.value) as 1 | 2 | 3})} className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500">
                  <option value={1}>Registered User</option>
                  <option value={2}>Staff</option>
                  <option value={3}>Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm">Save User</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
`
fs.writeFileSync('src/components/AdminEditModals.tsx', content);
console.log('patched');
