const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

if (!code.includes('isAddingProduct')) {
  code = code.replace(
    /const \[activeTab, setActiveTab\] = useState/,
    `const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState`
  );
}

if (!code.includes('import { Plus, Edit, Trash2, Save, UserPlus')) {
  code = code.replace(/import \{ Plus, Edit, Trash2, Save, UserPlus([^}]*)\} from 'lucide-react';/, "import { Plus, Edit, Trash2, Save, UserPlus, Menu, X $1 } from 'lucide-react';");
}

fs.writeFileSync('src/pages/Admin.tsx', code);
