const fs = require('fs');

let content = fs.readFileSync('src/types.ts', 'utf8');

const productUpdate = `
  cost?: number;
  discountPrice?: number;
`;
content = content.replace(/cost\?: number;/, productUpdate);

const couponType = `
export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number; // 0-100
  isActive: boolean;
}
`;

content += '\n' + couponType;

fs.writeFileSync('src/types.ts', content);
