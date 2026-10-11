import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileText, Printer, Eye, Sliders, LayoutGrid, Search, X, Package, 
  Barcode, Check, Sparkles, Layers, Tag, Palette, Ruler, Info, Settings2
} from 'lucide-react';
import { Product, ProductVariation } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel } from '../../utils/currency';
import { escapeHtml } from '../../utils/printHelper';
import { generateBarcodeDataUrl } from '../../utils/barcode';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../../utils/colors';
import { STANDARD_COLORS, STANDARD_SIZES } from '../../data';
import { useToast } from '../ui/Feedback';

export interface AdminLabelsTabProps {
  products: Product[];
}

export interface ThermalPreset {
  id: string;
  nameKu: string;
  nameAr: string;
  nameEn: string;
  width: number; // in mm
  height: number; // in mm
  badgeKu?: string;
}

const THERMAL_PRESETS: ThermalPreset[] = [
  {
    id: '50x30',
    nameKu: '50 × 30 mm',
    nameAr: '50 × 30 مم',
    nameEn: '50 × 30 mm',
    width: 50,
    height: 30,
    badgeKu: 'پێشنیازکراو / باوترین',
  },
  {
    id: '50x25',
    nameKu: '50 × 25 mm',
    nameAr: '50 × 25 مم',
    nameEn: '50 × 25 mm',
    width: 50,
    height: 25,
    badgeKu: 'کۆمپەکت',
  },
  {
    id: '40x30',
    nameKu: '40 × 30 mm',
    nameAr: '40 × 30 مم',
    nameEn: '40 × 30 mm',
    width: 40,
    height: 30,
  },
  {
    id: '40x20',
    nameKu: '40 × 20 mm',
    nameAr: '40 × 20 مم',
    nameEn: '40 × 20 mm',
    width: 40,
    height: 20,
    badgeKu: 'بچووک',
  },
  {
    id: '60x40',
    nameKu: '60 × 40 mm',
    nameAr: '60 × 40 مم',
    nameEn: '60 × 40 mm',
    width: 60,
    height: 40,
    badgeKu: 'تاگی گەورە',
  },
  {
    id: '70x50',
    nameKu: '70 × 50 mm',
    nameAr: '70 × 50 مم',
    nameEn: '70 × 50 mm',
    width: 70,
    height: 50,
  },
  {
    id: 'custom',
    nameKu: 'قەبارەی تایبەت (Custom mm)',
    nameAr: 'حجم مخصص (مم)',
    nameEn: 'Custom (mm)',
    width: 50,
    height: 30,
  },
];

export const AdminLabelsTab: React.FC<AdminLabelsTabProps> = ({ products }) => {
  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const toast = useToast();

  // Search & Selection
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariationId, setSelectedVariationId] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Manual Custom Color & Size (for products without variations or overriding)
  const [customColor, setCustomColor] = useState<string>('');
  const [customSize, setCustomSize] = useState<string>('');
  const [isManualVariantMode, setIsManualVariantMode] = useState<boolean>(false);

  // Print Mode & Paper Type
  const [paperType, setPaperType] = useState<'thermal' | 'sheet'>('thermal');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('50x30');
  const [thermalWidth, setThermalWidth] = useState<number>(50); // mm
  const [thermalHeight, setThermalHeight] = useState<number>(30); // mm

  // Copies & Batch Mode
  const [copies, setCopies] = useState<number>(10);
  const [batchCopiesMode, setBatchCopiesMode] = useState<'fixed' | 'stock'>('fixed');

  // Customization Options - Dimensions & Typography
  const [labelWidth, setLabelWidth] = useState<number>(220); // in px (for sheet mode)
  const [columnsCount, setColumnsCount] = useState<number>(3); // for sheet mode
  const [fontSizeName, setFontSizeName] = useState<number>(13); // in px
  const [fontSizePrice, setFontSizePrice] = useState<number>(14); // in px
  const [fontSizeVariant, setFontSizeVariant] = useState<number>(11); // in px
  const [barcodeHeight, setBarcodeHeight] = useState<number>(38); // in px

  // Element Visibility Toggles
  const [showName, setShowName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showColorSize, setShowColorSize] = useState<boolean>(true);
  const [showBarcodeImage, setShowBarcodeImage] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);
  const [showStoreLogo, setShowStoreLogo] = useState<boolean>(true);

  // Auto-select first product if none selected
  useEffect(() => {
    if (!selectedProductId && products && products.length > 0) {
      setSelectedProductId(String(products[0].id));
    }
  }, [products, selectedProductId]);

  // When selected product changes, reset variation selection to 'all' or first variation
  useEffect(() => {
    setSelectedVariationId('all');
    setCustomColor('');
    setCustomSize('');
    setIsManualVariantMode(false);
  }, [selectedProductId]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProductName = (p: Product) => {
    if (language === 'ku' && p.nameKu) return p.nameKu;
    if (language === 'ar' && p.nameAr) return p.nameAr;
    return p.name || '';
  };

  // Filter products by search query (name, Kurdish name, Arabic name, barcode, SKU, or ID)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 30);

    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const nameKu = (p.nameKu || '').toLowerCase();
      const nameAr = (p.nameAr || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const id = String(p.id || '').toLowerCase();

      // Check variations barcodes too
      const hasMatchingVariant = (p.variations || []).some(
        (v) => (v.barcode || '').toLowerCase().includes(q) || (v.sku || '').toLowerCase().includes(q)
      );

      return (
        name.includes(q) ||
        nameKu.includes(q) ||
        nameAr.includes(q) ||
        barcode.includes(q) ||
        sku.includes(q) ||
        id === q ||
        hasMatchingVariant
      );
    }).slice(0, 50);
  }, [products, searchQuery]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(selectedProductId)) || products[0] || null;
  }, [products, selectedProductId]);

  const variations = useMemo(() => {
    return selectedProduct?.variations || [];
  }, [selectedProduct]);

  // Selected specific variation (if not 'all' and not 'batch_all')
  const activeVariation = useMemo(() => {
    if (!variations.length || selectedVariationId === 'all' || selectedVariationId === 'batch_all') {
      return null;
    }
    return variations.find((v) => String(v.id) === String(selectedVariationId)) || null;
  }, [variations, selectedVariationId]);

  // Active color to show on current preview
  const activeColor = useMemo(() => {
    if (isManualVariantMode && customColor) return customColor;
    if (activeVariation?.color) return activeVariation.color;
    if (variations.length === 1) return variations[0].color;
    return '';
  }, [isManualVariantMode, customColor, activeVariation, variations]);

  // Active size to show on current preview
  const activeSize = useMemo(() => {
    if (isManualVariantMode && customSize) return customSize;
    if (activeVariation?.size) return activeVariation.size;
    if (variations.length === 1) return variations[0].size;
    return '';
  }, [isManualVariantMode, customSize, activeVariation, variations]);

  // Active barcode
  const barcodeValue = useMemo(() => {
    if (!selectedProduct) return '';
    if (activeVariation?.barcode) return activeVariation.barcode;
    return selectedProduct.barcode || String(selectedProduct.id);
  }, [selectedProduct, activeVariation]);

  // Active price
  const activePrice = useMemo(() => {
    if (!selectedProduct) return 0;
    if (activeVariation && activeVariation.priceOverride != null) {
      return Number(activeVariation.priceOverride);
    }
    return Number(selectedProduct.price || 0);
  }, [selectedProduct, activeVariation]);

  // Barcode image Data URL for preview
  const barcodeDataUrl = useMemo(() => {
    if (!barcodeValue) return '';
    return generateBarcodeDataUrl(barcodeValue, { 
      height: barcodeHeight,
      displayValue: false, // clean barcode lines without embedded text
      width: paperType === 'thermal' ? 1.7 : 2,
      margin: 2
    });
  }, [barcodeValue, barcodeHeight, paperType]);

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(String(product.id));
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handlePresetSelect = (preset: ThermalPreset) => {
    setSelectedPresetId(preset.id);
    if (preset.id !== 'custom') {
      setThermalWidth(preset.width);
      setThermalHeight(preset.height);
    }
  };

  // Calculate total labels for print
  const totalPrintCopies = useMemo(() => {
    if (selectedVariationId === 'batch_all' && variations.length > 0) {
      if (batchCopiesMode === 'stock') {
        return variations.reduce((acc, v) => acc + Math.max(1, v.stockQuantity || 0), 0);
      }
      return variations.length * copies;
    }
    return copies;
  }, [selectedVariationId, variations, batchCopiesMode, copies]);

  // Printing execution
  const handlePrint = () => {
    if (!selectedProduct) {
      toast(language === 'ku' ? 'تکایە بەرهەمێک هەڵبژێرە بۆ چاپکردن.' : 'Please select a product first.', 'error');
      return;
    }

    const prodName = getProductName(selectedProduct);

    // Build the list of labels to print
    interface LabelItemData {
      name: string;
      price: number;
      barcode: string;
      barcodeUrl: string | null;
      color: string;
      size: string;
    }

    const labelsToRender: LabelItemData[] = [];

    if (selectedVariationId === 'batch_all' && variations.length > 0) {
      // Batch mode: print every variation
      variations.forEach((v) => {
        const vBarcode = v.barcode || selectedProduct.barcode || String(selectedProduct.id);
        const vUrl = generateBarcodeDataUrl(vBarcode, { 
          height: barcodeHeight, 
          displayValue: false, 
          width: paperType === 'thermal' ? 1.7 : 2,
          margin: 2
        });
        const vPrice = v.priceOverride != null ? Number(v.priceOverride) : Number(selectedProduct.price || 0);
        const count = batchCopiesMode === 'stock' ? Math.max(1, v.stockQuantity || 1) : copies;

        for (let i = 0; i < count; i++) {
          labelsToRender.push({
            name: prodName,
            price: vPrice,
            barcode: vBarcode,
            barcodeUrl: vUrl,
            color: v.color || '',
            size: v.size || '',
          });
        }
      });
    } else {
      // Single variation or general product
      const itemBarcode = barcodeValue;
      const count = copies;
      for (let i = 0; i < count; i++) {
        labelsToRender.push({
          name: prodName,
          price: activePrice,
          barcode: itemBarcode,
          barcodeUrl: barcodeDataUrl,
          color: activeColor,
          size: activeSize,
        });
      }
    }

    if (labelsToRender.length === 0) {
      toast(language === 'ku' ? 'هیچ لەیبڵێک بۆ چاپکردن ئامادە نییە.' : 'No labels to print.', 'error');
      return;
    }

    // Generate HTML for each label card
    const labelCardsHtml = labelsToRender.map((item) => {
      const colorLocalized = item.color ? getLocalizedColorName(item.color, language) : '';
      const sizeLocalized = item.size ? getLocalizedSizeName(item.size, language) : '';

      const hasVariant = Boolean(colorLocalized || sizeLocalized);

      return `
        <div class="label-card">
          ${showStoreLogo ? `<div class="store-name">Galo Kids 🎈</div>` : ''}
          ${showName ? `<div class="prod-name" style="font-size: ${fontSizeName}px;">${escapeHtml(item.name)}</div>` : ''}
          
          ${showColorSize && hasVariant ? `
            <div class="variant-badges" style="font-size: ${fontSizeVariant}px;">
              ${colorLocalized ? `<span class="var-badge color-badge">${escapeHtml(colorLocalized)}</span>` : ''}
              ${sizeLocalized ? `<span class="var-badge size-badge">${escapeHtml(sizeLocalized)}</span>` : ''}
            </div>
          ` : ''}

          ${showPrice ? `<div class="prod-price" style="font-size: ${fontSizePrice}px;">${formatIQDLabel(item.price)}</div>` : ''}
          
          <div class="barcode-wrapper">
            ${showBarcodeImage && item.barcodeUrl ? `<img class="barcode-img" src="${item.barcodeUrl}" alt="${escapeHtml(item.barcode)}" />` : ''}
            ${showBarcodeText && item.barcode ? `<div class="barcode-val">${escapeHtml(item.barcode)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const isThermal = paperType === 'thermal';

    const printWin = window.open('', '_blank', 'width=950,height=750');
    if (!printWin) {
      toast(language === 'ku' ? 'تکایە ڕێگە بە پەنجەرەی Pop-up بدە لە وێبگەڕەکەتدا.' : 'Please allow pop-ups for printing.', 'error');
      return;
    }

    // CSS tailored for Thermal roll vs A4 sheets
    const thermalCss = `
      @page {
        size: ${thermalWidth}mm ${thermalHeight}mm;
        margin: 0mm;
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      html, body {
        width: ${thermalWidth}mm;
        margin: 0;
        padding: 0;
        background: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }
      .labels-container {
        width: ${thermalWidth}mm;
        margin: 0;
        padding: 0;
      }
      .label-card {
        width: ${thermalWidth}mm;
        height: ${thermalHeight}mm;
        max-height: ${thermalHeight}mm;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        padding: 1.5mm 2.2mm;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        align-items: center;
        text-align: center;
        overflow: hidden;
        background: #fff;
        border: none !important;
      }
      .store-name {
        font-size: 8.5px;
        font-weight: 900;
        color: #334155;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1;
      }
      .prod-name {
        font-weight: 900;
        color: #000;
        line-height: 1.15;
        word-break: break-word;
        max-height: ${fontSizeName * 2.3}px;
        overflow: hidden;
      }
      .variant-badges {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        flex-wrap: wrap;
        margin: 1px 0;
        line-height: 1;
      }
      .var-badge {
        display: inline-block;
        font-weight: 800;
        padding: 1px 4.5px;
        border-radius: 3px;
        border: 1px solid #000;
        color: #000;
        background: #fff;
      }
      .prod-price {
        font-weight: 900;
        color: #000;
        line-height: 1.1;
      }
      .barcode-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        line-height: 1;
      }
      .barcode-img {
        display: block;
        max-width: 96%;
        height: ${barcodeHeight}px;
        object-fit: contain;
      }
      .barcode-val {
        font-family: 'Courier New', Courier, monospace;
        font-size: 9.5px;
        font-weight: 900;
        color: #000;
        letter-spacing: 1px;
        margin-top: 1px;
      }
      @media screen {
        body { padding: 20px; background: #f8fafc; }
        .label-card {
          margin: 8px auto;
          border: 1px dashed #cbd5e1 !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
      }
    `;

    const sheetCss = `
      @page {
        margin: 8mm;
        size: auto;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 12px;
        background: #fff;
      }
      .labels-container {
        display: grid;
        grid-template-columns: repeat(${columnsCount}, minmax(${labelWidth}px, 1fr));
        gap: 12px;
      }
      .label-card {
        border: 1.5px dashed #94a3b8;
        border-radius: 8px;
        padding: 8px;
        text-align: center;
        box-sizing: border-box;
        background: #fff;
        page-break-inside: avoid;
        break-inside: avoid;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
      }
      .store-name { font-size: 9.5px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
      .prod-name { font-weight: 900; color: #0f172a; margin-bottom: 3px; line-height: 1.2; word-break: break-word; }
      .variant-badges { display: flex; align-items: center; justify-content: center; gap: 4px; margin: 3px 0; flex-wrap: wrap; }
      .var-badge { display: inline-block; font-weight: 800; padding: 1.5px 6px; border-radius: 4px; border: 1px solid #334155; color: #0f172a; background: #f8fafc; }
      .prod-price { font-weight: 900; color: #4f46e5; margin: 3px 0; }
      .barcode-wrapper { width: 100%; display: flex; flex-direction: column; align-items: center; margin-top: 3px; }
      .barcode-img { display: block; margin: 0 auto; max-width: 95%; height: ${barcodeHeight}px; object-fit: contain; }
      .barcode-val { font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: bold; color: #1e293b; margin-top: 2px; }
      @media print {
        body { padding: 0; }
        .label-card { border-style: solid; border-color: #cbd5e1; }
      }
    `;

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'en' ? 'ltr' : 'rtl'}">
        <head>
          <meta charset="utf-8">
          <title>Labels - ${escapeHtml(prodName)} (${isThermal ? `${thermalWidth}x${thermalHeight}mm` : 'Sheet'})</title>
          <style>
            ${isThermal ? thermalCss : sheetCss}
          </style>
        </head>
        <body>
          <div class="labels-container">
            ${labelCardsHtml}
          </div>
        </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 450);
  };

  return (
    <div className="space-y-6 font-arabic">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 md:p-7 rounded-[2.5rem] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-black flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            {language === 'ku' ? 'دروستکردن و چاپکردنی لەیبڵی بەرهەم' : language === 'ar' ? 'إنشاء وطباعة ملصقات المنتجات' : 'Product Labels Generator'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            {language === 'ku'
              ? 'چاپکردنی لەیبڵ بۆ ڕەنگ و سایزی دیاریکراو لەسەر وەرەقەی گەرمی (Thermal) یان کاغەزی ئاسایی'
              : language === 'ar'
              ? 'طباعة الملصقات للون ومقاس محدد على الورق الحراري (Thermal) أو الورق العادي'
              : 'Print barcode labels for specific sizes and colors on thermal rolls or standard sheets'}
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 relative z-10"
        >
          <Printer className="w-4 h-4" />
          <span>{language === 'ku' ? `چاپکردن (${totalPrintCopies} لەیبڵ)` : `Print (${totalPrintCopies} Labels)`}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Control Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Search & Select Product Card */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.3)] space-y-5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Search className="w-4 h-4 text-indigo-600" />
              {language === 'ku' ? '١. گەڕان و هەڵبژاردنی بەرهەم' : '1. Search & Select Product'}
            </h3>

            {/* Live Search Input with Dropdown */}
            <div ref={searchContainerRef} className="relative">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'ku' ? 'گەڕان بەپێی ناو یان بارکۆد:' : 'Search by Name or Barcode:'}
              </label>
              
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  placeholder={language === 'ku' ? 'ناوی بەرهەم یان کۆدی بارکۆد بنووسە یان سکان بکە...' : 'Type product name or scan barcode...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 ps-10 pe-10 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-xs transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {isSearchOpen && (
                <div className="absolute z-50 start-0 end-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const isSelected = String(p.id) === String(selectedProductId);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className={`p-3 flex items-center justify-between gap-3 hover:bg-indigo-50/60 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50 text-indigo-900' : 'text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {p.images && p.images[0] ? (
                              <img
                                src={p.images[0]}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center text-slate-400 shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-black truncate">{getProductName(p)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {p.barcode && (
                                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                    <Barcode className="w-3 h-3 text-slate-400" />
                                    {p.barcode}
                                  </span>
                                )}
                                <span className="text-[11px] font-bold text-indigo-600">
                                  {formatIQDLabel(Number(p.price || 0))}
                                </span>
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white grid place-items-center shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs font-bold text-slate-400">
                      {language === 'ku' ? 'هیچ بەرهەمێک نەدۆزرایەوە بەو ناوە یان بارکۆدە.' : 'No products found matching your search.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Currently Selected Product Details & Copies */}
            {selectedProduct && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {selectedProduct.images && selectedProduct.images[0] ? (
                    <img
                      src={selectedProduct.images[0]}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-indigo-200 bg-white shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200 grid place-items-center text-indigo-400 shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                      {language === 'ku' ? 'بەرهەمی دیاریکراو:' : 'Selected Product:'}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 truncate">
                      {getProductName(selectedProduct)}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-black text-indigo-700 font-mono">
                        {formatIQDLabel(activePrice)}
                      </span>
                      {barcodeValue && (
                        <span className="text-[10.5px] font-mono text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
                          {barcodeValue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 whitespace-nowrap">{L("Copies")}:</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, Number(e.target.value || 1)))}
                    className="w-20 bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-center shadow-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Color & Size Variation Selector Card */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-pink-600" />
                {language === 'ku' ? '٢. دیاریکردنی ڕەنگ و سایزی لەیبڵ (Variations)' : '2. Select Color & Size (Variation)'}
              </h3>

              {variations.length > 0 && (
                <span className="text-[11px] font-bold text-slate-500">
                  {language === 'ku' ? `${variations.length} جۆر بەردەستە` : `${variations.length} variations`}
                </span>
              )}
            </div>

            {/* If product has variations in DB */}
            {variations.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {/* General / Base product option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariationId('all');
                      setIsManualVariantMode(false);
                    }}
                    className={`p-3 rounded-2xl border text-start flex items-center justify-between transition-all cursor-pointer ${
                      selectedVariationId === 'all' && !isManualVariantMode
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200/80 text-slate-800 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black">
                        {language === 'ku' ? 'گشتی بەرهەم' : 'General Product'}
                      </p>
                      <p className={`text-[10px] truncate ${selectedVariationId === 'all' && !isManualVariantMode ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {language === 'ku' ? 'بێ دیاریکردنی ڤاریانت' : 'Base Product Barcode'}
                      </p>
                    </div>
                    {selectedVariationId === 'all' && !isManualVariantMode && (
                      <Check className="w-4 h-4 shrink-0 text-white" />
                    )}
                  </button>

                  {/* Batch print all variations option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariationId('batch_all');
                      setIsManualVariantMode(false);
                    }}
                    className={`p-3 rounded-2xl border text-start flex items-center justify-between transition-all cursor-pointer ${
                      selectedVariationId === 'batch_all' && !isManualVariantMode
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
                        : 'bg-purple-50/60 border-purple-200/80 text-purple-950 hover:bg-purple-100/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {language === 'ku' ? 'هەموو جۆرەکان پێکەوە' : 'All Variations'}
                      </p>
                      <p className={`text-[10px] truncate ${selectedVariationId === 'batch_all' && !isManualVariantMode ? 'text-purple-100' : 'text-purple-700'}`}>
                        {language === 'ku' ? `چاپکردنی ${variations.length} جۆر لە یەک کاتدا` : `Batch print all ${variations.length}`}
                      </p>
                    </div>
                    {selectedVariationId === 'batch_all' && !isManualVariantMode && (
                      <Check className="w-4 h-4 shrink-0 text-white" />
                    )}
                  </button>

                  {/* List of specific variations */}
                  {variations.map((v) => {
                    const isSelected = selectedVariationId === String(v.id) && !isManualVariantMode;
                    const hex = getColorHex(v.color);
                    const colorLabel = getLocalizedColorName(v.color, language);
                    const sizeLabel = getLocalizedSizeName(v.size, language);

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariationId(String(v.id));
                          setIsManualVariantMode(false);
                        }}
                        className={`p-3 rounded-2xl border text-start flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400'
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-xs"
                            style={{ backgroundColor: hex }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate">
                              {colorLabel || v.color} • {sizeLabel || v.size}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] mt-0.5 font-medium">
                              <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                                {language === 'ku' ? `ستۆک: ${v.stockQuantity}` : `Stock: ${v.stockQuantity}`}
                              </span>
                              {v.barcode && (
                                <span className={`font-mono text-[9.5px] px-1 rounded ${isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
                                  {v.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Batch Mode options if "All Variations" chosen */}
                {selectedVariationId === 'batch_all' && (
                  <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-700 shrink-0" />
                      <span className="text-xs font-bold text-purple-950">
                        {language === 'ku' ? 'شێوازی ژمارەی کۆپییەکان:' : 'Batch Copies Strategy:'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchCopiesMode('fixed')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          batchCopiesMode === 'fixed'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-white text-purple-900 border border-purple-200'
                        }`}
                      >
                        {language === 'ku' ? `بڕی دیاریکراو (${copies} دانە بۆ هەر جۆرێک)` : `Fixed (${copies} each)`}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBatchCopiesMode('stock')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          batchCopiesMode === 'stock'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-white text-purple-900 border border-purple-200'
                        }`}
                      >
                        {language === 'ku' ? 'بەپێی ژمارەی مەخزەنی هەر جۆرێک' : 'Match Inventory Stock'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Manual Color & Size input mode (for custom override or products without variations) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsManualVariantMode(!isManualVariantMode)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>
                  {isManualVariantMode
                    ? (language === 'ku' ? 'داخستنی نووسینی دەستی ڕەنگ و سایز' : 'Hide Custom Color/Size Inputs')
                    : (language === 'ku' ? '+ دیاریکردنی دەستی یان تایبەت بۆ ڕەنگ و سایز' : '+ Custom/Manual Color & Size')}
                </span>
              </button>

              {isManualVariantMode && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'ڕەنگ (Color):' : 'Color:'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">{language === 'ku' ? '-- هەڵبژاردنی ڕەنگ --' : '-- Select Color --'}</option>
                        {STANDARD_COLORS.map((c) => (
                          <option key={c} value={c}>
                            {getLocalizedColorName(c, language)} ({c})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder={language === 'ku' ? 'یان بنووسە...' : 'or type...'}
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'سایز / قەبارە (Size):' : 'Size:'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={customSize}
                        onChange={(e) => setCustomSize(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">{language === 'ku' ? '-- هەڵبژاردنی سایز --' : '-- Select Size --'}</option>
                        {STANDARD_SIZES.map((s) => (
                          <option key={s} value={s}>
                            {getLocalizedSizeName(s, language)} ({s})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder={language === 'ku' ? 'یان بنووسە...' : 'or type...'}
                        value={customSize}
                        onChange={(e) => setCustomSize(e.target.value)}
                        className="w-1/2 bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Paper Type & Thermal Roll Dimensions Card */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.3)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-emerald-600" />
                {language === 'ku' ? '٣. شێوازی کاغەز و قەبارەی چاپ (Thermal / Sheet)' : '3. Paper Format & Label Size'}
              </h3>

              {/* Toggle: Thermal Roll vs A4 Sheet */}
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPaperType('thermal')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    paperType === 'thermal'
                      ? 'bg-white text-indigo-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{language === 'ku' ? 'وەرەقەی گەرمی (Thermal)' : 'Thermal Roll'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperType('sheet')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    paperType === 'sheet'
                      ? 'bg-white text-indigo-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{language === 'ku' ? 'پەڕەی ئاسایی (A4)' : 'A4 Sheets'}</span>
                </button>
              </div>
            </div>

            {/* Thermal Mode: Presets & Custom Dimensions */}
            {paperType === 'thermal' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {language === 'ku' ? 'قەبارەی لەیبڵی گەرمی (Thermal Presets):' : 'Thermal Label Size Presets:'}
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {THERMAL_PRESETS.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetSelect(preset)}
                          className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <p className="text-xs font-black">{preset.nameKu}</p>
                          {preset.badgeKu && (
                            <span className={`text-[9.5px] font-bold block mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`}>
                              {preset.badgeKu}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Dimensions mm inputs (if custom or tweaking) */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        {language === 'ku' ? 'پانی لەیبڵ (Width):' : 'Width:'}
                      </label>
                      <span className="font-mono text-xs font-black text-indigo-600">{thermalWidth} mm</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={100}
                      step={1}
                      value={thermalWidth}
                      onChange={(e) => {
                        setSelectedPresetId('custom');
                        setThermalWidth(Number(e.target.value));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        {language === 'ku' ? 'بەرزی لەیبڵ (Height):' : 'Height:'}
                      </label>
                      <span className="font-mono text-xs font-black text-indigo-600">{thermalHeight} mm</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={80}
                      step={1}
                      value={thermalHeight}
                      onChange={(e) => {
                        setSelectedPresetId('custom');
                        setThermalHeight(Number(e.target.value));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Helpful note for thermal printing */}
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {language === 'ku'
                      ? 'ڕێنمایی چاپ: لە پەنجەرەی Print ـی وێبگەڕەکەتدا، پرینتەری Thermal هەڵبژێرە و لە بەشی Margins بژاردەی None دابنێ بۆ ئەوەی ڕێک لە ناوەڕاستی وەرەقەکە بوەستێت.'
                      : 'Thermal Tip: In browser print dialog, select your thermal printer and set Margins to None for pixel-perfect sticker alignment.'}
                  </p>
                </div>
              </div>
            ) : (
              /* A4 Sheet Mode: Width in px & Columns */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'پانی لەیبڵ (Label Width):' : 'Label Width:'} <span className="font-mono text-indigo-600">{labelWidth}px</span>
                  </label>
                  <input
                    type="range"
                    min={140}
                    max={350}
                    step={5}
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'ژمارەی ستونەکانی ڕیزبەندی (Columns):' : 'Print Columns:'} <span className="font-mono text-indigo-600">{columnsCount}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={columnsCount}
                    onChange={(e) => setColumnsCount(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Element Visibility Toggles Card */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.3)] space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Eye className="w-4 h-4 text-indigo-600" />
              {language === 'ku' ? '٤. دەرکەوتنی ئایتمەکان لەسەر لەیبڵ (Show/Hide)' : '4. Element Visibility Toggles'}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Product Name */}
              <label className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${showName ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'ناوی بەرهەم' : 'Product Name'}</span>
              </label>

              {/* Color & Size Toggle */}
              <label className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${showColorSize ? 'bg-pink-50/80 border-pink-300 text-pink-950 font-black ring-1 ring-pink-200' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showColorSize} onChange={(e) => setShowColorSize(e.target.checked)} className="rounded text-pink-600 focus:ring-pink-500 w-4 h-4" />
                <span>{language === 'ku' ? 'ڕەنگ و سایز' : 'Color & Size'}</span>
              </label>

              {/* Product Price */}
              <label className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${showPrice ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'نرخی بەرهەم' : 'Product Price'}</span>
              </label>

              {/* Barcode Image */}
              <label className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${showBarcodeImage ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showBarcodeImage} onChange={(e) => setShowBarcodeImage(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'وێنەی بارکۆد' : 'Barcode Image'}</span>
              </label>

              {/* Barcode Text */}
              <label className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${showBarcodeText ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showBarcodeText} onChange={(e) => setShowBarcodeText(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'کۆدی ژمارەیی بارکۆد' : 'Barcode Number'}</span>
              </label>

              {/* Store Name / Logo */}
              <label className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all ${showStoreLogo ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showStoreLogo} onChange={(e) => setShowStoreLogo(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'ناوی دوکان (Galo Kids)' : 'Store Name'}</span>
              </label>
            </div>
          </div>

          {/* 5. Font Sizes & Barcode Height Sliders */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.3)] space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-indigo-600" />
              {language === 'ku' ? '٥. قەبارەی فۆنت و هێڵەکانی بارکۆد' : '5. Typography & Barcode Height'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'فۆنتی ناو:' : 'Name Font:'} <span className="font-mono text-indigo-600">{fontSizeName}px</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={22}
                  value={fontSizeName}
                  onChange={(e) => setFontSizeName(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'فۆنتی ڕەنگ و سایز:' : 'Variant Font:'} <span className="font-mono text-pink-600">{fontSizeVariant}px</span>
                </label>
                <input
                  type="range"
                  min={9}
                  max={18}
                  value={fontSizeVariant}
                  onChange={(e) => setFontSizeVariant(Number(e.target.value))}
                  className="w-full accent-pink-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'فۆنتی نرخ:' : 'Price Font:'} <span className="font-mono text-indigo-600">{fontSizePrice}px</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={24}
                  value={fontSizePrice}
                  onChange={(e) => setFontSizePrice(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'ku' ? 'بەرزی بارکۆد:' : 'Barcode Height:'} <span className="font-mono text-indigo-600">{barcodeHeight}px</span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={65}
                  value={barcodeHeight}
                  onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Print Preview Sidebar */}
        <div className="space-y-4">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 p-6 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.3)] sticky top-6">
            <h3 className="text-sm font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                {language === 'ku' ? 'پێشاندانی زیندووی لەیبڵ' : 'Live Print Preview'}
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800 rounded-full">
                PREVIEW
              </span>
            </h3>

            {selectedProduct ? (
              <div className="flex flex-col items-center">
                {/* Paper format badge above preview */}
                <div className="mb-3 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Printer className="w-3 h-3 text-slate-400" />
                  {paperType === 'thermal' 
                    ? `${language === 'ku' ? 'وەرەقەی گەرمی' : 'Thermal'}: ${thermalWidth}mm × ${thermalHeight}mm`
                    : `${language === 'ku' ? 'پەڕەی ئاسایی' : 'A4 Sheet'}: ${labelWidth}px (${columnsCount} Columns)`}
                </div>

                {/* The Label Card Mockup */}
                <div 
                  style={{ 
                    width: paperType === 'thermal' ? `${Math.min(300, Math.max(180, thermalWidth * 4.8))}px` : `${labelWidth}px`,
                    minHeight: paperType === 'thermal' ? `${Math.min(220, Math.max(110, thermalHeight * 4.8))}px` : 'auto',
                  }} 
                  className="border-2 border-dashed border-indigo-400 rounded-2xl p-4 bg-white text-center shadow-lg transition-all flex flex-col justify-between items-center relative overflow-hidden select-none"
                >
                  <div className="w-full space-y-1">
                    {showStoreLogo && (
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Galo Kids 🎈
                      </div>
                    )}

                    {showName && (
                      <div 
                        style={{ fontSize: `${fontSizeName}px` }}
                        className="font-black text-slate-900 leading-tight break-words"
                      >
                        {getProductName(selectedProduct)}
                      </div>
                    )}

                    {/* Color & Size Badges on Label */}
                    {showColorSize && (activeColor || activeSize) && (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap my-1.5">
                        {activeColor && (
                          <span 
                            style={{ fontSize: `${fontSizeVariant}px` }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-black text-slate-800 leading-tight"
                          >
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" 
                              style={{ backgroundColor: getColorHex(activeColor) }} 
                            />
                            <span>{getLocalizedColorName(activeColor, language)}</span>
                          </span>
                        )}

                        {activeSize && (
                          <span 
                            style={{ fontSize: `${fontSizeVariant}px` }}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 font-black text-indigo-900 leading-tight"
                          >
                            <span className="text-[9px] text-indigo-500 me-0.5 font-bold">
                              {language === 'ku' ? 'سایز:' : 'Size:'}
                            </span>
                            <span>{getLocalizedSizeName(activeSize, language)}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {showPrice && (
                      <div 
                        style={{ fontSize: `${fontSizePrice}px` }}
                        className="font-black text-indigo-600 leading-tight"
                      >
                        {formatIQDLabel(activePrice)}
                      </div>
                    )}
                  </div>

                  {/* Barcode & Number */}
                  <div className="w-full mt-2 flex flex-col items-center">
                    {showBarcodeImage && barcodeDataUrl && (
                      <img 
                        src={barcodeDataUrl} 
                        alt="Barcode" 
                        style={{ height: `${barcodeHeight}px` }} 
                        className="max-w-[96%] object-contain mx-auto" 
                      />
                    )}

                    {showBarcodeText && barcodeValue && (
                      <div className="text-[10.5px] font-mono font-black text-slate-800 tracking-wider mt-0.5">
                        {barcodeValue}
                      </div>
                    )}
                  </div>
                </div>

                {/* Print Summary and Action Button */}
                <div className="mt-6 w-full pt-4 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-600 mb-3 font-bold">
                    {selectedVariationId === 'batch_all'
                      ? (language === 'ku' 
                          ? `چاپکردنی هەموو جۆرەکان: ${totalPrintCopies} لەیبڵ (${variations.length} جۆر)` 
                          : `Batch: ${totalPrintCopies} labels (${variations.length} variations)`)
                      : (language === 'ku' 
                          ? `کۆی لەیبڵەکانی چاپ: ${copies} دانە` 
                          : `Total labels: ${copies} copies`)}
                  </p>

                  <button
                    onClick={handlePrint}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{language === 'ku' ? 'چاپکردن ئێستا' : 'Print Now'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                {language === 'ku' ? 'تکایە بەرهەمێک هەڵبژێرە لە چەپدا' : 'Select a product to view preview'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
