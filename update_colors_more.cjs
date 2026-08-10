const fs = require('fs');

const indexCssPath = 'src/index.css';
let cssContent = fs.readFileSync(indexCssPath, 'utf8');

const moreAdditions = `
  /* Sage Green (replaces emerald) */
  --color-emerald-50: #f5f6f2;
  --color-emerald-100: #e8ece1;
  --color-emerald-200: #d2d9c4;
  --color-emerald-300: #b7c2a1;
  --color-emerald-400: #98a07c;
  --color-emerald-500: #818b63;
  --color-emerald-600: #656f4a;
  --color-emerald-700: #4f573b;
  --color-emerald-800: #414732;
  --color-emerald-900: #373c2c;
  --color-emerald-950: #1d2115;

  /* Sage Green (replaces teal) */
  --color-teal-50: #f5f6f2;
  --color-teal-100: #e8ece1;
  --color-teal-200: #d2d9c4;
  --color-teal-300: #b7c2a1;
  --color-teal-400: #98a07c;
  --color-teal-500: #818b63;
  --color-teal-600: #656f4a;
  --color-teal-700: #4f573b;
  --color-teal-800: #414732;
  --color-teal-900: #373c2c;
  --color-teal-950: #1d2115;
`;

cssContent = cssContent.replace('@theme {', '@theme {' + moreAdditions);

fs.writeFileSync(indexCssPath, cssContent);
console.log('Updated index.css with MORE theme colors');
