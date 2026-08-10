const fs = require('fs');

let content = fs.readFileSync('src/i18n/translations.ts', 'utf8');

const enInsert = `
    // Footer
    footerDesc: 'Premium clothing and toys for little explorers. Curated with love, designed for adventure.',
    aboutUs: 'About Us',
    support: 'Support',
    sizeGuide: 'Size Guide',
    stayUpdated: 'Stay Updated',
    newsletterDesc: 'Join our newsletter for exclusive offers and fresh arrivals.',
    yourEmail: 'Your email address',
    join: 'Join',
    copyright: '© 2026 Galo Kids. Crafted with care.',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
`;

const kuInsert = `
    // Footer
    footerDesc: 'جلی نایاب و یاری بۆ گەڕیدە بچووکەکان. بە خۆشەویستییەوە هەڵبژێردراون، بۆ سەرکێشی دیزاین کراون.',
    aboutUs: 'دەربارەی ئێمە',
    support: 'پشتیوانی',
    sizeGuide: 'ڕێبەری قەبارە',
    stayUpdated: 'ئاگاداربە',
    newsletterDesc: 'بەشداری نامەنامەکەمان بکە بۆ ئۆفەری تایبەت و کاڵای نوێ.',
    yourEmail: 'ئیمەیلەکەت',
    join: 'بەشداریکردن',
    copyright: '© 2026 Galo Kids. بە گرنگی پێدانەوە دروستکراوە.',
    privacyPolicy: 'سیاسەتی تایبەتمەندی',
    termsOfService: 'مەرجەکانی خزمەتگوزاری',
`;

const arInsert = `
    // Footer
    footerDesc: 'ملابس وألعاب فاخرة للمستكشفين الصغار. تم اختيارها بحب، ومصممة للمغامرات.',
    aboutUs: 'معلومات عنا',
    support: 'الدعم',
    sizeGuide: 'دليل المقاسات',
    stayUpdated: 'ابق على اطلاع',
    newsletterDesc: 'اشترك في النشرة الإخبارية للحصول على عروض حصرية وأحدث المنتجات.',
    yourEmail: 'عنوان بريدك الإلكتروني',
    join: 'انضم',
    copyright: '© 2026 Galo Kids. صُنع بعناية.',
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'شروط الخدمة',
`;

// Insert into EN
content = content.replace(/(en: {[\s\S]*?)(faqA5:.*?\n)/, `$1$2${enInsert}`);
// Insert into KU
content = content.replace(/(ku: {[\s\S]*?)(faqA5:.*?\n)/, `$1$2${kuInsert}`);
// Insert into AR
content = content.replace(/(ar: {[\s\S]*?)(faqA5:.*?\n)/, `$1$2${arInsert}`);

fs.writeFileSync('src/i18n/translations.ts', content);
