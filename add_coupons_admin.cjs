const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const useStoreMatch = /const \{[\s\S]*?\} = useStore\(\);/;
content = content.replace(useStoreMatch, (match) => {
  return match.replace('} = useStore();', '  coupons, addCoupon, updateCoupon, deleteCoupon\n  } = useStore();');
});

const couponState = `
  const [couponCode, setAdminCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponIsActive, setCouponIsActive] = useState(true);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponDiscount) return;
    
    if (editingCouponId) {
      updateCoupon({
        id: editingCouponId,
        code: couponCode,
        discountPercentage: Number(couponDiscount),
        isActive: couponIsActive
      });
      setEditingCouponId(null);
    } else {
      addCoupon({
        id: Math.random().toString(36).substr(2, 9),
        code: couponCode,
        discountPercentage: Number(couponDiscount),
        isActive: couponIsActive
      });
    }
    setAdminCouponCode('');
    setCouponDiscount('');
    setCouponIsActive(true);
  };
  
  const handleEditCoupon = (coupon: any) => {
    setEditingCouponId(coupon.id);
    setAdminCouponCode(coupon.code);
    setCouponDiscount(coupon.discountPercentage.toString());
    setCouponIsActive(coupon.isActive);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
`;

content = content.replace(/const \[activeTab, setActiveTab\] = useState\('overview'\);/, `const [activeTab, setActiveTab] = useState('overview');\n${couponState}`);

const mobileNavTarget = `            <button 
              onClick={() => { setActiveTab('banner'); setIsMobileMenuOpen(false); }}`;
const mobileNavReplacement = `            <button 
              onClick={() => { setActiveTab('coupons'); setIsMobileMenuOpen(false); }}
              className={\`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all \${activeTab === 'coupons' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}\`}
            >
              <Ticket className="w-4 h-4 mr-3" /> Coupons
            </button>
            <button 
              onClick={() => { setActiveTab('banner'); setIsMobileMenuOpen(false); }}`;
content = content.replace(mobileNavTarget, mobileNavReplacement);

const desktopNavTarget = `            <button 
              onClick={() => setActiveTab('banner')}`;
const desktopNavReplacement = `            <button 
              onClick={() => setActiveTab('coupons')}
              className={\`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all \${activeTab === 'coupons' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}\`}
            >
              <Ticket className="w-4 h-4 mr-3" /> Coupons
            </button>
            <button 
              onClick={() => setActiveTab('banner')}`;
content = content.replace(desktopNavTarget, desktopNavReplacement);

const ticketImport = `import { Package, Users, ShoppingCart, DollarSign, LayoutDashboard, Plus, Pencil, Trash2, Search, Filter, Camera, X, Menu, Ticket, Tags, AlertCircle, ChevronDown, ChevronRight, LogOut, ArrowUpRight, ArrowDownRight, Settings, Image as ImageIcon, CheckCircle, Smartphone, MapPin, Search as SearchIcon, ScanBarcode, Printer, Save, Check, Type, Languages, Calendar as CalendarIcon, Clock, Link as LinkIcon, Download, DownloadCloud, Upload } from 'lucide-react';`;
content = content.replace(/import \{ Package.*? \} from 'lucide-react';/, ticketImport);

const couponsView = `
        {activeTab === 'coupons' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6">{editingCouponId ? 'Edit Coupon' : 'Create New Coupon'}</h2>
              <form onSubmit={handleAddCoupon} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Coupon Code *</label>
                    <input
                      required
                      type="text"
                      value={couponCode}
                      onChange={(e) => setAdminCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SUMMER20"
                      className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Discount Percentage (%) *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="100"
                      value={couponDiscount}
                      onChange={(e) => setCouponDiscount(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center mt-4">
                    <input
                      type="checkbox"
                      id="couponIsActive"
                      checked={couponIsActive}
                      onChange={(e) => setCouponIsActive(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="couponIsActive" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  {editingCouponId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCouponId(null);
                        setAdminCouponCode('');
                        setCouponDiscount('');
                        setCouponIsActive(true);
                      }}
                      className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> {editingCouponId ? 'Update Coupon' : 'Save Coupon'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Existing Coupons</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{coupon.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{coupon.discountPercentage}%</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={\`inline-flex px-2 py-1 text-xs font-semibold rounded-full \${coupon.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}\`}>
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleEditCoupon(coupon)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteCoupon(coupon.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                          No coupons found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
`;

content = content.replace(/\{activeTab === 'banner' && \(/, couponsView + "\n        {activeTab === 'banner' && (");

fs.writeFileSync('src/pages/Admin.tsx', content);
