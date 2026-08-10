const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

if (!code.includes('const [isAddingProduct')) {
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

fs.writeFileSync('src/pages/Admin.tsx', code);
