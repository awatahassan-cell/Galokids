const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

code = code.replace(/import \{ Plus, Save, Package, Settings, Tags, Users, ShoppingBag, DollarSign, Star, Image as ImageIcon, AlertTriangle, BarChart3, TrendingUp, TrendingDown, Calendar, Trash2, Edit \} from 'lucide-react';/, "import { Plus, Save, Package, Settings, Tags, Users, ShoppingBag, DollarSign, Star, Image as ImageIcon, AlertTriangle, BarChart3, TrendingUp, TrendingDown, Calendar, Trash2, Edit, Menu, X, UserPlus } from 'lucide-react';");

fs.writeFileSync('src/pages/Admin.tsx', code);
