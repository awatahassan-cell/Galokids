const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `import { Plus, Save, Package, Settings, Tags, Users, ShoppingBag, DollarSign, Star, Image as ImageIcon, AlertTriangle, BarChart3, TrendingUp, TrendingDown, Calendar, Trash2, Edit, Menu, X, UserPlus, ChevronLeft, ChevronRight, ShoppingCart, FileText, Languages, Search } from 'lucide-react';`;
const replacement = `import { Plus, Save, Package, Settings, Tags, Users, ShoppingBag, DollarSign, Star, Image as ImageIcon, AlertTriangle, BarChart3, TrendingUp, TrendingDown, Calendar, Trash2, Edit, Menu, X, UserPlus, ChevronLeft, ChevronRight, ShoppingCart, FileText, Languages, Search, Ticket, Pencil } from 'lucide-react';`;

content = content.replace(target, replacement);

// We should also add 'coupons' to the activeTab type
const tabTarget = `const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'orders' | 'users' | 'expenses' | 'reviews' | 'banner' | 'calendar' | 'translations' | 'labels' | 'barcode-stickers'>(() => {`;
const tabReplacement = `const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'orders' | 'users' | 'expenses' | 'reviews' | 'banner' | 'calendar' | 'translations' | 'labels' | 'barcode-stickers' | 'coupons'>(() => {`;

content = content.replace(tabTarget, tabReplacement);

fs.writeFileSync('src/pages/Admin.tsx', content);
