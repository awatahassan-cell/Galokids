const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

content = content.replace(/const \[productPrice, setProductPrice\] = useState\(''\);/, 
  "const [productPrice, setProductPrice] = useState('');\n  const [productDiscountPrice, setProductDiscountPrice] = useState('');");

content = content.replace(/price: parseFloat\(productPrice\),/, 
  "price: parseFloat(productPrice),\n      discountPrice: productDiscountPrice ? parseFloat(productDiscountPrice) : undefined,");

// Update editProduct fill
const handleEditProductRegex = /const handleEditProduct = \(product: any\) => \{[\s\S]*?setProductPrice\(product\.price\.toString\(\)\);/;
content = content.replace(handleEditProductRegex, (match) => {
  return match + "\n    setProductDiscountPrice(product.discountPrice ? product.discountPrice.toString() : '');";
});

// Update handleClearProductForm
const handleClearFormRegex = /setProductPrice\(''\);/;
content = content.replace(handleClearFormRegex, "setProductPrice('');\n    setProductDiscountPrice('');");

fs.writeFileSync('src/pages/Admin.tsx', content);
