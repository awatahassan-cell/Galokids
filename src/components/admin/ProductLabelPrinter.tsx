import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, Eye, Sliders, LayoutGrid, Barcode, Check, Sparkles, 
  Layers, Tag, Palette, Ruler, Info, CheckCircle2, Plus, X
} from 'lucide-react';
import { Product, ProductVariation } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatIQDLabel } from '../../utils/currency';
import { escapeHtml } from '../../utils/printHelper';
import { generateBarcodeDataUrl } from '../../utils/barcode';
import { getColorHex, getLocalizedColorName, getLocalizedSizeName } from '../../utils/colors';
import { STANDARD_COLORS, STANDARD_SIZES, CLOTHING_SIZES, SHOE_SIZES } from '../../data';
import { useToast } from '../ui/Feedback';

export interface ThermalPreset {
  id: string;
  nameKu: string;
  nameAr: string;
  nameEn: string;
  width: number; // in mm
  height: number; // in mm
  badgeKu?: string;
}

export const THERMAL_PRESETS: ThermalPreset[] = [
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
    id: '44x24',
    nameKu: '44 × 24 mm',
    nameAr: '44 × 24 مم',
    nameEn: '44 × 24 mm',
    width: 44,
    height: 24,
    badgeKu: 'ستیکەری باو',
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

export interface ProductLabelPrinterProps {
  product: Product;
  onClose?: () => void;
  onAddAnother?: () => void;
  isInsideModal?: boolean;
}

export const ProductLabelPrinter: React.FC<ProductLabelPrinterProps> = ({
  product,
  onClose,
  onAddAnother,
  isInsideModal = false,
}) => {
  const { language } = useLanguage();
  const toast = useToast();

  const [selectedVariationId, setSelectedVariationId] = useState<string>('all');

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

  // Reset when product changes
  useEffect(() => {
    setSelectedVariationId('all');
    setCustomColor('');
    setCustomSize('');
    setIsManualVariantMode(false);
  }, [product?.id]);

  const getProductName = (p: Product) => {
    if (language === 'ku' && p.nameKu) return p.nameKu;
    if (language === 'ar' && p.nameAr) return p.nameAr;
    return p.name || '';
  };

  const variations = useMemo(() => {
    return product?.variations || [];
  }, [product]);

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
    if (!product) return '';
    if (activeVariation?.barcode) return activeVariation.barcode;
    return product.barcode || String(product.id);
  }, [product, activeVariation]);

  // Active price
  const activePrice = useMemo(() => {
    if (!product) return 0;
    if (activeVariation && activeVariation.priceOverride != null) {
      return Number(activeVariation.priceOverride);
    }
    return Number(product.price || 0);
  }, [product, activeVariation]);

  // Barcode image Data URL for preview
  const barcodeDataUrl = useMemo(() => {
    if (!barcodeValue) return '';
    return generateBarcodeDataUrl(barcodeValue, { 
      height: barcodeHeight,
      displayValue: false,
      width: paperType === 'thermal' ? 1.7 : 2,
      margin: 2
    });
  }, [barcodeValue, barcodeHeight, paperType]);

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
    if (!product) {
      toast(language === 'ku' ? 'تکایە بەرهەمێک هەڵبژێرە بۆ چاپکردن.' : 'Please select a product first.', 'error');
      return;
    }

    const prodName = getProductName(product);

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
      variations.forEach((v) => {
        const vBarcode = v.barcode || product.barcode || String(product.id);
        const vUrl = generateBarcodeDataUrl(vBarcode, { 
          height: barcodeHeight, 
          displayValue: false, 
          width: paperType === 'thermal' ? 1.7 : 2,
          margin: 2
        });
        const vPrice = v.priceOverride != null ? Number(v.priceOverride) : Number(product.price || 0);
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
    <div className="space-y-5 font-arabic">
      {/* Top Banner inside modal or page */}
      {isInsideModal && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white grid place-items-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-950">
                {language === 'ku' ? 'بەرهەمەکە بە سەرکەوتوویی زیادکرا! 🎉' : 'Product Added Successfully! 🎉'}
              </h4>
              <p className="text-xs text-emerald-800 font-medium">
                {language === 'ku' 
                  ? 'ئێستا دەتوانیت ڕاستەوخۆ لەیبڵی بارکۆدەکەی بۆ پرینتەری گەرمی چاپ بکەیت.' 
                  : 'You can now print barcode labels for this item immediately.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onAddAnother && (
              <button
                type="button"
                onClick={onAddAnother}
                className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'زیادکردنی دانەیەکی تر' : 'Add Another'}</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
              >
                <span>{language === 'ku' ? 'تەواو / داخستن' : 'Done'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Controls on Left, Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Settings Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product Header / Copies Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {product.images && product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover border border-indigo-200 bg-white shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200 grid place-items-center text-indigo-400 shrink-0">
                  <Tag className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                  {language === 'ku' ? 'بەرهەم:' : 'Product:'}
                </span>
                <h4 className="text-sm font-black text-slate-900 truncate">
                  {getProductName(product)}
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
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                {language === 'ku' ? 'کۆپییەکان:' : 'Copies:'}
              </label>
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

          {/* Variation Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-pink-600" />
                {language === 'ku' ? 'ڕەنگ و سایزی لەیبڵ (Variations)' : 'Color & Size Variation'}
              </h4>

              {variations.length > 0 && (
                <span className="text-[11px] font-bold text-slate-500">
                  {language === 'ku' ? `${variations.length} جۆر بەردەستە` : `${variations.length} variations`}
                </span>
              )}
            </div>

            {variations.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariationId('all');
                      setIsManualVariantMode(false);
                    }}
                    className={`p-2.5 rounded-xl border text-start flex items-center justify-between transition-all cursor-pointer ${
                      selectedVariationId === 'all' && !isManualVariantMode
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black">{language === 'ku' ? 'گشتی بەرهەم' : 'General'}</p>
                      <p className={`text-[9.5px] truncate ${selectedVariationId === 'all' && !isManualVariantMode ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {language === 'ku' ? 'بارکۆدی سەرەکی' : 'Base Barcode'}
                      </p>
                    </div>
                    {selectedVariationId === 'all' && !isManualVariantMode && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-white" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariationId('batch_all');
                      setIsManualVariantMode(false);
                    }}
                    className={`p-2.5 rounded-xl border text-start flex items-center justify-between transition-all cursor-pointer ${
                      selectedVariationId === 'batch_all' && !isManualVariantMode
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-200'
                        : 'bg-purple-50 border-purple-200 text-purple-950 hover:bg-purple-100/60'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        {language === 'ku' ? 'هەموو جۆرەکان' : 'All Variations'}
                      </p>
                      <p className={`text-[9.5px] truncate ${selectedVariationId === 'batch_all' && !isManualVariantMode ? 'text-purple-100' : 'text-purple-700'}`}>
                        {language === 'ku' ? `چاپکردنی ${variations.length} جۆر` : `Batch ${variations.length}`}
                      </p>
                    </div>
                    {selectedVariationId === 'batch_all' && !isManualVariantMode && (
                      <Check className="w-3.5 h-3.5 shrink-0 text-white" />
                    )}
                  </button>

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
                        className={`p-2.5 rounded-xl border text-start flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-400'
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-xs"
                            style={{ backgroundColor: hex }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate">
                              {colorLabel || v.color} • {sizeLabel || v.size}
                            </p>
                            <span className={`text-[9.5px] block truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              {language === 'ku' ? `ستۆک: ${v.stockQuantity}` : `Stock: ${v.stockQuantity}`}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>

                {selectedVariationId === 'batch_all' && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in text-xs">
                    <span className="font-bold text-purple-950">
                      {language === 'ku' ? 'شێوازی کۆپییەکان:' : 'Batch Copies:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchCopiesMode('fixed')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          batchCopiesMode === 'fixed'
                            ? 'bg-purple-700 text-white'
                            : 'bg-white text-purple-900 border border-purple-200'
                        }`}
                      >
                        {language === 'ku' ? `بڕی دیاریکراو (${copies} دانە)` : `Fixed (${copies})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchCopiesMode('stock')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          batchCopiesMode === 'stock'
                            ? 'bg-purple-700 text-white'
                            : 'bg-white text-purple-900 border border-purple-200'
                        }`}
                      >
                        {language === 'ku' ? 'بەپێی ژمارەی مەخزەن' : 'By Stock'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Manual Color & Size toggler */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsManualVariantMode(!isManualVariantMode)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Tag className="w-3 h-3" />
                <span>
                  {isManualVariantMode
                    ? (language === 'ku' ? 'داخستنی نووسینی دەستی' : 'Hide Custom Inputs')
                    : (language === 'ku' ? '+ دیاریکردنی دەستی ڕەنگ و سایز' : '+ Custom Color & Size')}
                </span>
              </button>

              {isManualVariantMode && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'ڕەنگ (Color):' : 'Color:'}
                    </label>
                    <select
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">{language === 'ku' ? '-- هەڵبژاردنی ڕەنگ --' : '-- Color --'}</option>
                      {STANDARD_COLORS.map((c) => (
                        <option key={c} value={c}>
                          {getLocalizedColorName(c, language)} ({c})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ku' ? 'سایز (Size):' : 'Size:'}
                    </label>
                    <input
                      type="text"
                      list="printer-sizes-datalist"
                      placeholder={language === 'ku' ? 'سایز هەڵبژێرە یان بنووسە...' : 'Select or type size...'}
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      autoComplete="off"
                    />
                    <datalist id="printer-sizes-datalist">
                      {CLOTHING_SIZES.map((s) => (
                        <option key={`c-${s}`} value={s} label={language === 'ku' ? `جلوبەرگ: ${s}` : `Clothing: ${s}`}>
                          {language === 'ku' ? `جلوبەرگ: ${s}` : `Clothing: ${s}`}
                        </option>
                      ))}
                      {SHOE_SIZES.map((s) => (
                        <option key={`s-${s}`} value={s} label={language === 'ku' ? `پێڵاو: ${s}` : `Shoe: ${s}`}>
                          {language === 'ku' ? `پێڵاو: ${s}` : `Shoe: ${s}`}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Paper Type & Presets */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-emerald-600" />
                {language === 'ku' ? 'شێوازی کاغەز و قەبارەی چاپ' : 'Paper Format & Size'}
              </h4>

              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPaperType('thermal')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    paperType === 'thermal'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer className="w-3 h-3 text-indigo-600" />
                  <span>{language === 'ku' ? 'وەرەقەی گەرمی (Thermal)' : 'Thermal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaperType('sheet')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    paperType === 'sheet'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3 text-indigo-600" />
                  <span>{language === 'ku' ? 'پەڕەی ئاسایی (A4)' : 'A4'}</span>
                </button>
              </div>
            </div>

            {paperType === 'thermal' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {THERMAL_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <p className="text-xs font-black">{preset.nameKu}</p>
                        {preset.badgeKu && (
                          <span className={`text-[9px] font-bold block mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-indigo-600'}`}>
                            {preset.badgeKu}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-slate-700">{language === 'ku' ? 'پانی (Width):' : 'Width:'}</span>
                      <span className="font-mono font-black text-indigo-600">{thermalWidth} mm</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={100}
                      value={thermalWidth}
                      onChange={(e) => {
                        setSelectedPresetId('custom');
                        setThermalWidth(Number(e.target.value));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-slate-700">{language === 'ku' ? 'بەرزی (Height):' : 'Height:'}</span>
                      <span className="font-mono font-black text-indigo-600">{thermalHeight} mm</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={80}
                      value={thermalHeight}
                      onChange={(e) => {
                        setSelectedPresetId('custom');
                        setThermalHeight(Number(e.target.value));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'پانی لەیبڵ:' : 'Width:'} <span className="font-mono text-indigo-600">{labelWidth}px</span>
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
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'ku' ? 'ستوونەکان:' : 'Columns:'} <span className="font-mono text-indigo-600">{columnsCount}</span>
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

          {/* Visibility Toggles */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              {language === 'ku' ? 'دەرکەوتنی ئایتمەکان لەسەر لەیبڵ' : 'Element Visibility'}
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showName ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'ناوی بەرهەم' : 'Name'}</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showColorSize ? 'bg-pink-50/80 border-pink-300 text-pink-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showColorSize} onChange={(e) => setShowColorSize(e.target.checked)} className="rounded text-pink-600 focus:ring-pink-500 w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'ڕەنگ و سایز' : 'Color & Size'}</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showPrice ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'نرخی بەرهەم' : 'Price'}</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showBarcodeImage ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showBarcodeImage} onChange={(e) => setShowBarcodeImage(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'وێنەی بارکۆد' : 'Barcode'}</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showBarcodeText ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showBarcodeText} onChange={(e) => setShowBarcodeText(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'کۆدی ژمارەیی' : 'Number'}</span>
              </label>

              <label className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showStoreLogo ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showStoreLogo} onChange={(e) => setShowStoreLogo(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" />
                <span>{language === 'ku' ? 'ناوی دوکان' : 'Store'}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sticky top-4">
            <h4 className="text-xs font-black text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                {language === 'ku' ? 'پێشاندانی لەیبڵ' : 'Live Preview'}
              </span>
              <span className="px-2 py-0.5 text-[9.5px] font-black bg-emerald-100 text-emerald-800 rounded-full">
                {paperType === 'thermal' ? `${thermalWidth}x${thermalHeight}mm` : 'Sheet'}
              </span>
            </h4>

            <div className="flex flex-col items-center">
              {/* Preview Card */}
              <div 
                style={{ 
                  width: paperType === 'thermal' ? `${Math.min(280, Math.max(170, thermalWidth * 4.6))}px` : `${labelWidth}px`,
                  minHeight: paperType === 'thermal' ? `${Math.min(210, Math.max(105, thermalHeight * 4.6))}px` : 'auto',
                }} 
                className="border-2 border-dashed border-indigo-400 rounded-2xl p-3.5 bg-white text-center shadow-md flex flex-col justify-between items-center relative overflow-hidden select-none"
              >
                <div className="w-full space-y-1">
                  {showStoreLogo && (
                    <div className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">
                      Galo Kids 🎈
                    </div>
                  )}

                  {showName && (
                    <div 
                      style={{ fontSize: `${fontSizeName}px` }}
                      className="font-black text-slate-900 leading-tight break-words"
                    >
                      {getProductName(product)}
                    </div>
                  )}

                  {/* Color & Size Badges on Label */}
                  {showColorSize && (activeColor || activeSize) && (
                    <div className="flex items-center justify-center gap-1.5 flex-wrap my-1">
                      {activeColor && (
                        <span 
                          style={{ fontSize: `${fontSizeVariant}px` }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 font-black text-slate-800 leading-tight"
                        >
                          <span 
                            className="w-2 h-2 rounded-full border border-black/20 shrink-0" 
                            style={{ backgroundColor: getColorHex(activeColor) }} 
                          />
                          <span>{getLocalizedColorName(activeColor, language)}</span>
                        </span>
                      )}

                      {activeSize && (
                        <span 
                          style={{ fontSize: `${fontSizeVariant}px` }}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 font-black text-indigo-900 leading-tight"
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
                <div className="w-full mt-1.5 flex flex-col items-center">
                  {showBarcodeImage && barcodeDataUrl && (
                    <img 
                      src={barcodeDataUrl} 
                      alt="Barcode" 
                      style={{ height: `${barcodeHeight}px` }} 
                      className="max-w-[96%] object-contain mx-auto" 
                    />
                  )}

                  {showBarcodeText && barcodeValue && (
                    <div className="text-[10px] font-mono font-black text-slate-800 tracking-wider mt-0.5">
                      {barcodeValue}
                    </div>
                  )}
                </div>
              </div>

              {/* Print Summary and Action Button */}
              <div className="mt-5 w-full pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-600 mb-2.5 font-bold">
                  {selectedVariationId === 'batch_all'
                    ? (language === 'ku' 
                        ? `چاپکردنی ${totalPrintCopies} لەیبڵ (${variations.length} جۆر)` 
                        : `Batch: ${totalPrintCopies} labels (${variations.length} vars)`)
                    : (language === 'ku' 
                        ? `کۆی چاپ: ${copies} لەیبڵ` 
                        : `Total: ${copies} copies`)}
                </p>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === 'ku' ? 'چاپکردنی لەیبڵ ئێستا' : 'Print Labels Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
