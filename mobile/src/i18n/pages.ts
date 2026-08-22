import type { Language } from './strings';

/**
 * The shop's own pages: about, delivery and returns, sizes, and the questions
 * customers ask most.
 *
 * Written out here rather than fetched, because they are the same words the
 * website carries and they change about once a year. The shop's phone number,
 * address and socials are *not* here — those come from settings, so that
 * changing them in the admin panel changes them in the app.
 */

export interface Section {
  heading: string;
  body: string;
}

export interface Page {
  title: string;
  intro?: string;
  sections: Section[];
}

type Localised<T> = Record<Language, T>;

export const ABOUT: Localised<Page> = {
  ku: {
    title: 'دەربارەی ئێمە',
    intro:
      'گەلۆ کیدز فرۆشگایەکی پۆشاکی منداڵانە، دامەزراوە لەسەر یەک بیرۆکەی سادە: منداڵ شایانی جل و بەرگی نەرم، بەکوالێتی و بە نرخێکی ڕێکە.',
    sections: [
      {
        heading: 'چی دەفرۆشین',
        body: 'پۆشاکی ڕۆژانە، جلی بۆنە و جەژن، پێڵاو، جانتا و ئەکسسوارات بۆ منداڵانی تەمەنی نۆزادەوە تا قوتابخانە. هەموو پارچەکان لەبەرچاوگرتنی پێستی نازکی منداڵ هەڵدەبژێردرێن.',
      },
      {
        heading: 'کوالێتی',
        body: 'زۆربەی پارچەکانمان لۆکەی سروشتین، وا هەڵبژێردراون کە لە کەشوهەوای گەرمی عێراقدا ئارام بن و دوای چەند شۆردنێک شێوەیان لەدەست نەدەن.',
      },
      {
        heading: 'گەیاندن',
        body: 'گەیاندن بۆ هەموو پارێزگاکانی عێراق، و پارەدان لە کاتی وەرگرتندا — پێش ئەوەی پارە بدەیت، کاڵاکە دەبینیت.',
      },
    ],
  },
  ar: {
    title: 'من نحن',
    intro:
      'غالو كيدز متجر لملابس الأطفال، قام على فكرة بسيطة: الطفل يستحق ملابس ناعمة وعالية الجودة وبسعر عادل.',
    sections: [
      {
        heading: 'ماذا نبيع',
        body: 'ملابس يومية، ملابس المناسبات والأعياد، أحذية، حقائب وإكسسوارات للأطفال من حديثي الولادة حتى سن المدرسة. كل قطعة تُختار مع مراعاة بشرة الطفل الحساسة.',
      },
      {
        heading: 'الجودة',
        body: 'معظم أقمشتنا قطن طبيعي، مختارة لتكون مريحة في حرّ العراق وتحافظ على شكلها بعد الغسل.',
      },
      {
        heading: 'التوصيل',
        body: 'توصيل لكل محافظات العراق، والدفع عند الاستلام — ترى الطلب قبل أن تدفع.',
      },
    ],
  },
  en: {
    title: 'About us',
    intro:
      'Galo Kids is a children’s clothing shop built on one simple idea: children deserve soft, well-made clothes at a fair price.',
    sections: [
      {
        heading: 'What we sell',
        body: 'Everyday clothes, party and Eid outfits, shoes, bags and accessories for children from newborn to school age. Every piece is chosen with a child’s sensitive skin in mind.',
      },
      {
        heading: 'Quality',
        body: 'Most of our fabrics are natural cotton, chosen to stay comfortable in Iraq’s heat and to keep their shape after washing.',
      },
      {
        heading: 'Delivery',
        body: 'We deliver to every governorate in Iraq, and you pay on delivery — you see the order before you pay for it.',
      },
    ],
  },
};

export const SHIPPING: Localised<Page> = {
  ku: {
    title: 'گەیاندن و گەڕاندنەوە',
    sections: [
      {
        heading: 'ماوەی گەیاندن',
        body: 'ناو هەولێر و سلێمانی و دهۆک: ١ تا ٢ ڕۆژی کار. پارێزگاکانی تر: ٢ تا ٤ ڕۆژی کار. لە بۆنە و جەژناندا لەوانەیە کەمێک درەنگتر بێت.',
      },
      {
        heading: 'کرێی گەیاندن',
        body: 'کرێی گەیاندن بەپێی پارێزگا جیاوازە و لە کاتی تەواوکردنی داواکاریدا پیشان دەدرێت. بۆ داواکاری گەورە گەیاندن بێ بەرامبەرە — بڕەکەی لە پەڕەی سەبەتەدا دیارە.',
      },
      {
        heading: 'پارەدان',
        body: 'پارەدان لە کاتی وەرگرتندا. کاتێک گەیاندنەکە دەگات، دەتوانیت کاڵاکە ببینیت پێش ئەوەی پارە بدەیت.',
      },
      {
        heading: 'گەڕاندنەوە',
        body: 'تا ١٤ ڕۆژ لە بەروارى وەرگرتنەوە دەتوانیت کاڵاکە بگەڕێنیتەوە، بەمەرجێک بەکارنەهێنرابێت و لە پاکێجی خۆیدا بێت لەگەڵ وەسڵەکە. گۆڕینی سایز بێ بەرامبەرە.',
      },
      {
        heading: 'کاڵای شکاو یان هەڵە',
        body: 'ئەگەر کاڵاکە هەڵە بوو یان زیانی پێگەیشتبوو، هەر لە ڕۆژی وەرگرتندا پەیوەندیمان پێوە بکە — بەبێ هیچ بەرامبەرێک دەیگۆڕینەوە.',
      },
    ],
  },
  ar: {
    title: 'الشحن والإرجاع',
    sections: [
      {
        heading: 'مدة التوصيل',
        body: 'داخل أربيل والسليمانية ودهوك: يوم إلى يومي عمل. باقي المحافظات: يومان إلى أربعة أيام عمل. قد تتأخر قليلاً في المناسبات والأعياد.',
      },
      {
        heading: 'رسوم التوصيل',
        body: 'تختلف حسب المحافظة وتظهر عند إتمام الطلب. الطلبات الكبيرة توصيلها مجاني — المبلغ موضّح في صفحة السلة.',
      },
      {
        heading: 'الدفع',
        body: 'الدفع عند الاستلام. عند وصول الطلب يمكنك رؤيته قبل أن تدفع.',
      },
      {
        heading: 'الإرجاع',
        body: 'يمكنك الإرجاع خلال 14 يوماً من الاستلام، بشرط أن تكون القطعة غير مستعملة وفي عبوتها مع الفاتورة. تبديل المقاس مجاني.',
      },
      {
        heading: 'قطعة تالفة أو خاطئة',
        body: 'إذا وصلتك قطعة خاطئة أو تالفة، تواصل معنا في يوم الاستلام نفسه — نستبدلها دون أي رسوم.',
      },
    ],
  },
  en: {
    title: 'Shipping & returns',
    sections: [
      {
        heading: 'Delivery times',
        body: 'Erbil, Sulaymaniyah and Duhok: 1–2 working days. Other governorates: 2–4 working days. Expect a little longer around Eid and holidays.',
      },
      {
        heading: 'Delivery charges',
        body: 'The charge depends on the governorate and is shown at checkout. Larger orders are delivered free — the threshold is shown in your basket.',
      },
      {
        heading: 'Payment',
        body: 'Cash on delivery. You can look at the order before you pay for it.',
      },
      {
        heading: 'Returns',
        body: 'You can return within 14 days of delivery, as long as the item is unworn and in its packaging with the receipt. Size exchanges are free.',
      },
      {
        heading: 'Damaged or wrong item',
        body: 'If something arrives wrong or damaged, contact us the same day — we will replace it at no cost.',
      },
    ],
  },
};

export const FAQ: Localised<Page> = {
  ku: {
    title: 'پرسیارە باوەکان',
    sections: [
      { heading: 'چۆن داواکاری بکەم؟', body: 'کاڵاکە هەڵبژێرە، ڕەنگ و سایز دیاری بکە، بیخە سەبەتەوە و دوگمەی تەواوکردنی داواکاری دابگرە. ژمارەی مۆبایل و ناونیشانت دەخوازین، ئەوەندە.' },
      { heading: 'دەبێت هەژمارم هەبێت؟', body: 'بەڵێ، بەڵام تەنها بە ژمارەی مۆبایل. کۆدێکت بۆ دەنێرین و ئەوە بەسە — هیچ وشەی نهێنییەک نییە.' },
      { heading: 'چۆن بزانم سایزەکە دەبێت؟', body: 'ڕێنمایی سایز لە پەڕەی هەژماردا هەیە، بەپێی تەمەن و درێژی. ئەگەر دڵنیا نەبوویت، سایزێکی گەورەتر هەڵبژێرە — گۆڕینی سایز بێ بەرامبەرە.' },
      { heading: 'ئەگەر سایزەکە نەگونجا؟', body: 'تا ١٤ ڕۆژ دەتوانیت بیگۆڕیت یان بیگەڕێنیتەوە، بەمەرجێک بەکارنەهێنرابێت.' },
      { heading: 'دەتوانم داواکارییەکەم هەڵبوەشێنمەوە؟', body: 'بەڵێ، پێش ئەوەی بنێردرێت. پەیوەندیمان پێوە بکە بە هەمان ژمارەی مۆبایلەی داواکارییەکەت پێی کردووە.' },
      { heading: 'کرێی گەیاندن چەندە؟', body: 'بەپێی پارێزگاکەت جیاوازە و پێش ناردنی داواکارییەکە بە ڕوونی پیشانت دەدرێت.' },
    ],
  },
  ar: {
    title: 'الأسئلة الشائعة',
    sections: [
      { heading: 'كيف أطلب؟', body: 'اختر القطعة، حدّد اللون والمقاس، أضفها إلى السلة ثم اضغط إتمام الطلب. نحتاج رقم هاتفك وعنوانك فقط.' },
      { heading: 'هل أحتاج حساباً؟', body: 'نعم، لكن برقم الهاتف فقط. نرسل لك رمزاً وهذا كل شيء — لا توجد كلمة مرور.' },
      { heading: 'كيف أعرف المقاس المناسب؟', body: 'دليل المقاسات موجود في صفحة الحساب، حسب العمر والطول. إذا لم تكن متأكداً اختر مقاساً أكبر — تبديل المقاس مجاني.' },
      { heading: 'ماذا لو لم يناسب المقاس؟', body: 'يمكنك التبديل أو الإرجاع خلال 14 يوماً بشرط ألا تكون القطعة مستعملة.' },
      { heading: 'هل يمكنني إلغاء الطلب؟', body: 'نعم، قبل الشحن. تواصل معنا من نفس رقم الهاتف الذي طلبت به.' },
      { heading: 'كم رسوم التوصيل؟', body: 'تختلف حسب المحافظة وتظهر بوضوح قبل تأكيد الطلب.' },
    ],
  },
  en: {
    title: 'Frequently asked questions',
    sections: [
      { heading: 'How do I order?', body: 'Pick an item, choose colour and size, add it to your basket and tap checkout. We only need your phone number and address.' },
      { heading: 'Do I need an account?', body: 'Yes, but only a phone number. We send you a code and that is all — there is no password.' },
      { heading: 'How do I know which size to pick?', body: 'The size guide is in the account section, by age and height. If you are between sizes, take the larger one — size exchanges are free.' },
      { heading: 'What if the size is wrong?', body: 'You can exchange or return within 14 days, as long as the item is unworn.' },
      { heading: 'Can I cancel an order?', body: 'Yes, before it ships. Contact us from the same phone number you ordered with.' },
      { heading: 'How much is delivery?', body: 'It depends on your governorate, and it is shown clearly before you confirm the order.' },
    ],
  },
};

/** Age, height and the size that usually fits it. */
export const SIZE_ROWS: { size: string; age: Localised<string>; height: string }[] = [
  { size: 'Newborn', age: { ku: '٠–٣ مانگ', ar: '٠–٣ أشهر', en: '0–3 months' }, height: '50–62 cm' },
  { size: '3-6', age: { ku: '٣–٦ مانگ', ar: '٣–٦ أشهر', en: '3–6 months' }, height: '62–68 cm' },
  { size: '6-12', age: { ku: '٦–١٢ مانگ', ar: '٦–١٢ شهر', en: '6–12 months' }, height: '68–80 cm' },
  { size: '1-2', age: { ku: '١–٢ ساڵ', ar: '١–٢ سنة', en: '1–2 years' }, height: '80–92 cm' },
  { size: '2-3', age: { ku: '٢–٣ ساڵ', ar: '٢–٣ سنوات', en: '2–3 years' }, height: '92–98 cm' },
  { size: '4-5', age: { ku: '٤–٥ ساڵ', ar: '٤–٥ سنوات', en: '4–5 years' }, height: '104–110 cm' },
  { size: '6-7', age: { ku: '٦–٧ ساڵ', ar: '٦–٧ سنوات', en: '6–7 years' }, height: '116–122 cm' },
  { size: '8-9', age: { ku: '٨–٩ ساڵ', ar: '٨–٩ سنوات', en: '8–9 years' }, height: '128–134 cm' },
  { size: '10-11', age: { ku: '١٠–١١ ساڵ', ar: '١٠–١١ سنة', en: '10–11 years' }, height: '140–146 cm' },
  { size: '12-13', age: { ku: '١٢–١٣ ساڵ', ar: '١٢–١٣ سنة', en: '12–13 years' }, height: '152–158 cm' },
];

export const SIZE_GUIDE_NOTE: Localised<string> = {
  ku: 'ئەم خشتەیە ڕێنماییە. ئەگەر منداڵەکەت لە نێوان دوو سایزدایە، سایزە گەورەکە هەڵبژێرە — گۆڕینی سایز بێ بەرامبەرە.',
  ar: 'هذا الجدول إرشادي. إذا كان طفلك بين مقاسين، اختر الأكبر — تبديل المقاس مجاني.',
  en: 'This table is a guide. If your child is between two sizes, take the larger one — size exchanges are free.',
};
