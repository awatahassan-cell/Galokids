/**
 * Every word the app says, in the three languages the shop serves.
 *
 * Kept as one flat object rather than pulled from the website's dictionary:
 * that one carries the admin panel and the till with it, and neither belongs
 * in a shopping app. Only the storefront's language is here.
 */
export type Language = 'ku' | 'ar' | 'en';

export const LANGUAGES: { code: Language; label: string; flag: string; rtl: boolean }[] = [
  { code: 'ku', label: 'کوردی', flag: '🇮🇶', rtl: true },
  { code: 'ar', label: 'العربية', flag: '🇮🇶', rtl: true },
  { code: 'en', label: 'English', flag: '🇺🇸', rtl: false },
];

type Entry = { ku: string; ar: string; en: string };

export const strings = {
  // Tabs & navigation
  home: { ku: 'سەرەتا', ar: 'الرئيسية', en: 'Home' },
  shop: { ku: 'بەرهەم', ar: 'المنتجات', en: 'Shop' },
  cart: { ku: 'سەبەتە', ar: 'السلة', en: 'Basket' },
  wishlist: { ku: 'دڵخواز', ar: 'المفضلة', en: 'Saved' },
  account: { ku: 'هەژمار', ar: 'حسابي', en: 'Account' },

  // Home
  welcome: { ku: 'بەخێربێیت بۆ گەلۆ کیدز', ar: 'أهلاً بك في غالو كيدز', en: 'Welcome to Galo Kids' },
  searchPlaceholder: { ku: 'گەڕان بۆ پۆشاک، جانتا…', ar: 'ابحث عن ملابس، حقائب…', en: 'Search clothes, bags…' },
  categories: { ku: 'بەشەکان', ar: 'الأقسام', en: 'Categories' },
  seeAll: { ku: 'هەموو', ar: 'الكل', en: 'See all' },
  dealsToday: { ku: 'کڕینی ئەمڕۆ', ar: 'عروض اليوم', en: 'Deals today' },
  popular: { ku: 'بەربڵاوترین', ar: 'الأكثر رواجاً', en: 'Popular' },
  newArrivals: { ku: 'نوێترینەکان', ar: 'وصل حديثاً', en: 'New arrivals' },
  forBoys: { ku: 'پۆشاکی کوڕان', ar: 'ملابس أولاد', en: 'For boys' },
  forGirls: { ku: 'پۆشاکی کچان', ar: 'ملابس بنات', en: 'For girls' },
  recentlyViewed: { ku: 'دواترین بینراوەکان', ar: 'شاهدتها مؤخراً', en: 'Recently viewed' },

  // Product
  addToCart: { ku: 'زیادکردن بۆ سەبەتە', ar: 'إضافة إلى السلة', en: 'Add to basket' },
  added: { ku: 'زیادکرا!', ar: 'تمت الإضافة!', en: 'Added!' },
  outOfStock: { ku: 'لە کۆگا نەماوە', ar: 'غير متوفر', en: 'Out of stock' },
  inStock: { ku: 'بەردەستە', ar: 'متوفر', en: 'In stock' },
  onlyLeft: { ku: 'تەنها {n} دانە ماوە', ar: 'بقي {n} فقط', en: 'Only {n} left' },
  selectColor: { ku: 'ڕەنگ هەڵبژێرە', ar: 'اختر اللون', en: 'Select colour' },
  selectSize: { ku: 'سایز هەڵبژێرە', ar: 'اختر المقاس', en: 'Select size' },
  quantity: { ku: 'بڕ', ar: 'الكمية', en: 'Quantity' },
  description: { ku: 'وەسف', ar: 'الوصف', en: 'Description' },
  reviews: { ku: 'پێداچوونەوەکان', ar: 'التقييمات', en: 'Reviews' },
  noReviews: { ku: 'هێشتا هیچ پێداچوونەوەیەک نییە', ar: 'لا توجد تقييمات بعد', en: 'No reviews yet' },
  relatedProducts: { ku: 'بەرهەمی هاوشێوە', ar: 'منتجات مشابهة', en: 'You may also like' },
  share: { ku: 'هاوبەشکردن', ar: 'مشاركة', en: 'Share' },

  // Trust badges
  deliveryNationwide: { ku: 'گەیاندن بۆ هەموو پارێزگاکان', ar: 'توصيل لكل المحافظات', en: 'Delivery nationwide' },
  cashOnDelivery: { ku: 'پارەدان لە کاتی وەرگرتن', ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
  returns14: { ku: 'گەڕاندنەوە تا ١٤ ڕۆژ', ar: 'إرجاع خلال 14 يوم', en: 'Returns within 14 days' },
  naturalFabric: { ku: 'پارچەی سروشتی و پێستپارێز', ar: 'أقمشة طبيعية آمنة', en: 'Natural, skin-safe fabric' },

  // Catalog
  filters: { ku: 'فلتەر', ar: 'تصفية', en: 'Filters' },
  sortBy: { ku: 'ڕیزکردن', ar: 'ترتيب حسب', en: 'Sort by' },
  newest: { ku: 'نوێترین', ar: 'الأحدث', en: 'Newest' },
  priceLowHigh: { ku: 'نرخ: کەم بۆ زۆر', ar: 'السعر: من الأقل', en: 'Price: low to high' },
  priceHighLow: { ku: 'نرخ: زۆر بۆ کەم', ar: 'السعر: من الأعلى', en: 'Price: high to low' },
  allCategories: { ku: 'هەموو بەشەکان', ar: 'كل الأقسام', en: 'All categories' },
  priceRange: { ku: 'مەودای نرخ', ar: 'نطاق السعر', en: 'Price range' },
  apply: { ku: 'جێبەجێکردن', ar: 'تطبيق', en: 'Apply' },
  clear: { ku: 'پاککردنەوە', ar: 'مسح', en: 'Clear' },
  noResults: { ku: 'هیچ بەرهەمێک نەدۆزرایەوە', ar: 'لا توجد نتائج', en: 'Nothing found' },
  noResultsHint: { ku: 'وشەیەکی تر تاقی بکەرەوە یان فلتەرەکان پاک بکەرەوە', ar: 'جرّب كلمة أخرى أو امسح التصفية', en: 'Try another word, or clear the filters' },
  productsCount: { ku: '{n} بەرهەم', ar: '{n} منتج', en: '{n} products' },

  // Cart & checkout
  cartEmpty: { ku: 'سەبەتەکەت بەتاڵە', ar: 'سلتك فارغة', en: 'Your basket is empty' },
  cartEmptyHint: { ku: 'بەرهەمەکان بگەڕێ و ئەوەی دەتەوێت زیادی بکە', ar: 'تصفح المنتجات وأضف ما يعجبك', en: 'Browse the shop and add what you like' },
  startShopping: { ku: 'دەستپێکردنی کڕین', ar: 'ابدأ التسوق', en: 'Start shopping' },
  subtotal: { ku: 'کۆی بەرهەمەکان', ar: 'المجموع الفرعي', en: 'Subtotal' },
  delivery: { ku: 'کرێی گەیاندن', ar: 'التوصيل', en: 'Delivery' },
  discount: { ku: 'داشکاندن', ar: 'الخصم', en: 'Discount' },
  total: { ku: 'کۆی گشتی', ar: 'الإجمالي', en: 'Total' },
  checkout: { ku: 'تەواوکردنی داواکاری', ar: 'إتمام الطلب', en: 'Checkout' },
  freeDelivery: { ku: 'خۆڕایی', ar: 'مجاني', en: 'Free' },
  freeOver: { ku: 'گەیاندنی بێ بەرامبەر بۆ سەرووی {amount}', ar: 'توصيل مجاني للطلبات فوق {amount}', en: 'Free delivery over {amount}' },
  couponCode: { ku: 'کۆدی داشکاندن', ar: 'كود الخصم', en: 'Discount code' },
  couponApply: { ku: 'بەکارهێنان', ar: 'تطبيق', en: 'Apply' },
  couponInvalid: { ku: 'کۆدەکە دروست نییە', ar: 'الكود غير صالح', en: 'That code is not valid' },
  couponApplied: { ku: 'کۆدەکە بەکارهێنرا', ar: 'تم تطبيق الكود', en: 'Code applied' },
  remove: { ku: 'سڕینەوە', ar: 'حذف', en: 'Remove' },

  fullName: { ku: 'ناوی تەواو', ar: 'الاسم الكامل', en: 'Full name' },
  phone: { ku: 'ژمارەی مۆبایل', ar: 'رقم الهاتف', en: 'Phone number' },
  governorate: { ku: 'پارێزگا', ar: 'المحافظة', en: 'Governorate' },
  city: { ku: 'شار / قەزا', ar: 'المدينة / القضاء', en: 'City / district' },
  subdistrict: { ku: 'ناحیە', ar: 'الناحية', en: 'Subdistrict' },
  addressDetail: { ku: 'ناونیشانی وردتر (گەڕەک، کۆڵان، ژمارەی ماڵ)', ar: 'العنوان التفصيلي', en: 'Street, area, house number' },
  orderNotes: { ku: 'تێبینی (ئارەزوومەندانە)', ar: 'ملاحظات (اختياري)', en: 'Notes (optional)' },
  paymentMethod: { ku: 'شێوازی پارەدان', ar: 'طريقة الدفع', en: 'Payment method' },
  codOnly: { ku: 'پارەدان لە کاتی وەرگرتن', ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
  placeOrder: { ku: 'ناردنی داواکاری', ar: 'تأكيد الطلب', en: 'Place order' },
  orderPlaced: { ku: 'داواکارییەکەت نێردرا!', ar: 'تم إرسال طلبك!', en: 'Your order is in!' },
  orderPlacedHint: { ku: 'بەم زووانە پەیوەندیت پێوە دەکەین بۆ پشتڕاستکردنەوە.', ar: 'سنتصل بك قريباً للتأكيد.', en: 'We will call you shortly to confirm.' },
  orderNumber: { ku: 'ژمارەی داواکاری', ar: 'رقم الطلب', en: 'Order number' },
  continueShopping: { ku: 'بەردەوامبوون لە کڕین', ar: 'متابعة التسوق', en: 'Keep shopping' },

  // Auth
  signIn: { ku: 'چوونە ژوورەوە', ar: 'تسجيل الدخول', en: 'Sign in' },
  signOut: { ku: 'دەرچوون', ar: 'تسجيل الخروج', en: 'Sign out' },
  signInHint: { ku: 'ژمارەی مۆبایلەکەت بنووسە، کۆدێکت بۆ دەنێرین', ar: 'أدخل رقم هاتفك وسنرسل لك رمزاً', en: 'Enter your phone number and we will send you a code' },
  sendCode: { ku: 'ناردنی کۆد', ar: 'إرسال الرمز', en: 'Send code' },
  enterCode: { ku: 'کۆدەکە بنووسە', ar: 'أدخل الرمز', en: 'Enter the code' },
  codeSentTo: { ku: 'کۆدێک نێردرا بۆ {phone}', ar: 'أرسلنا رمزاً إلى {phone}', en: 'We sent a code to {phone}' },
  verify: { ku: 'پشتڕاستکردنەوە', ar: 'تحقق', en: 'Verify' },
  resendCode: { ku: 'ناردنەوەی کۆد', ar: 'إعادة إرسال', en: 'Resend code' },
  resendIn: { ku: 'ناردنەوە لە {n} چرکەدا', ar: 'إعادة الإرسال خلال {n} ثانية', en: 'Resend in {n}s' },
  changeNumber: { ku: 'گۆڕینی ژمارە', ar: 'تغيير الرقم', en: 'Change number' },
  yourName: { ku: 'ناوت چییە؟', ar: 'ما اسمك؟', en: 'What is your name?' },
  yourNameHint: { ku: 'بۆ ئەوەی بزانین لە داواکارییەکاندا بە چی بانگت بکەین', ar: 'حتى نعرف كيف ننادیك في طلباتك', en: 'So we know what to call you on your orders' },
  finish: { ku: 'تەواوکردن', ar: 'إنهاء', en: 'Finish' },
  signInToContinue: { ku: 'بۆ بەردەوامبوون بچۆ ژوورەوە', ar: 'سجّل الدخول للمتابعة', en: 'Sign in to continue' },

  // Account
  myOrders: { ku: 'داواکارییەکانم', ar: 'طلباتي', en: 'My orders' },
  noOrders: { ku: 'هێشتا هیچ داواکارییەکت نییە', ar: 'لا توجد طلبات بعد', en: 'No orders yet' },
  orderDetails: { ku: 'وردەکاری داواکاری', ar: 'تفاصيل الطلب', en: 'Order details' },
  trackOrder: { ku: 'بەدواداچوونی داواکاری', ar: 'تتبع الطلب', en: 'Track order' },
  trackHint: { ku: 'ژمارەی داواکاری و ژمارەی مۆبایلەکەت بنووسە', ar: 'أدخل رقم الطلب ورقم هاتفك', en: 'Enter your order number and phone' },
  profile: { ku: 'پرۆفایل', ar: 'الملف الشخصي', en: 'Profile' },
  editProfile: { ku: 'دەستکاریکردنی پرۆفایل', ar: 'تعديل الملف', en: 'Edit profile' },
  saveChanges: { ku: 'پاشەکەوتکردن', ar: 'حفظ', en: 'Save changes' },
  saved: { ku: 'پاشەکەوتکرا', ar: 'تم الحفظ', en: 'Saved' },
  language: { ku: 'زمان', ar: 'اللغة', en: 'Language' },
  aboutUs: { ku: 'دەربارەی ئێمە', ar: 'من نحن', en: 'About us' },
  contactUs: { ku: 'پەیوەندی', ar: 'اتصل بنا', en: 'Contact us' },
  faq: { ku: 'پرسیارە باوەکان', ar: 'الأسئلة الشائعة', en: 'FAQ' },
  shippingReturns: { ku: 'گەیاندن و گەڕاندنەوە', ar: 'الشحن والإرجاع', en: 'Shipping & returns' },
  sizeGuide: { ku: 'ڕێنمایی سایز', ar: 'دليل المقاسات', en: 'Size guide' },
  whatsapp: { ku: 'واتساپ', ar: 'واتساب', en: 'WhatsApp' },

  // Order status
  statusPending: { ku: 'چاوەڕوانە', ar: 'قيد الانتظار', en: 'Pending' },
  statusProcessing: { ku: 'لە ئامادەکردندایە', ar: 'قيد التجهيز', en: 'Processing' },
  statusShipped: { ku: 'نێردراوە', ar: 'تم الشحن', en: 'Shipped' },
  statusDelivered: { ku: 'گەیشتووە', ar: 'تم التسليم', en: 'Delivered' },
  statusCancelled: { ku: 'هەڵوەشێنراوەتەوە', ar: 'ملغى', en: 'Cancelled' },
  statusReturned: { ku: 'گەڕێنراوەتەوە', ar: 'مُرجع', en: 'Returned' },

  // Wishlist
  wishlistEmpty: { ku: 'هیچ بەرهەمێکت پاشەکەوت نەکردووە', ar: 'لم تحفظ أي منتج', en: 'Nothing saved yet' },
  wishlistEmptyHint: { ku: 'دڵەکە دابگرە لەسەر هەر بەرهەمێک بۆ پاشەکەوتکردنی', ar: 'اضغط القلب على أي منتج لحفظه', en: 'Tap the heart on any product to save it' },

  // Errors & states
  loading: { ku: 'چاوەڕێ بکە…', ar: 'جارٍ التحميل…', en: 'Loading…' },
  retry: { ku: 'دووبارە هەوڵ بدەرەوە', ar: 'أعد المحاولة', en: 'Try again' },
  offline: { ku: 'پەیوەندی بە ئینتەرنێتەوە نییە', ar: 'لا يوجد اتصال بالإنترنت', en: 'No internet connection' },
  somethingWrong: { ku: 'هەڵەیەک ڕوویدا', ar: 'حدث خطأ', en: 'Something went wrong' },
  required: { ku: 'ئەمە پێویستە', ar: 'هذا الحقل مطلوب', en: 'This is required' },
  invalidPhone: { ku: 'ژمارەی مۆبایلەکە دروست نییە', ar: 'رقم الهاتف غير صحيح', en: 'That phone number is not valid' },
  notFound: { ku: 'نەدۆزرایەوە', ar: 'غير موجود', en: 'Not found' },
  back: { ku: 'گەڕانەوە', ar: 'رجوع', en: 'Back' },
  close: { ku: 'داخستن', ar: 'إغلاق', en: 'Close' },
  cancel: { ku: 'پاشگەزبوونەوە', ar: 'إلغاء', en: 'Cancel' },
  confirm: { ku: 'دڵنیام', ar: 'تأكيد', en: 'Confirm' },
} satisfies Record<string, Entry>;

export type StringKey = keyof typeof strings;
