import React, { useState, useMemo } from 'react';
import { FileText, Printer, Eye, Sliders, Check, LayoutGrid } from 'lucide-react';
import { Product } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { adminTr } from '../../i18n/adminDict';
import { formatIQDLabel } from '../../utils/currency';
import { escapeHtml } from '../../utils/printHelper';
import { generateBarcodeDataUrl } from '../../utils/barcode';
import { useToast } from '../ui/Feedback';

export interface AdminLabelsTabProps {
  products: Product[];
}

export const AdminLabelsTab: React.FC<AdminLabelsTabProps> = ({ products }) => {
  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const toast = useToast();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [copies, setCopies] = useState<number>(10);

  // Customization Options - Dimensions & Typography
  const [labelWidth, setLabelWidth] = useState<number>(220); // in px
  const [fontSizeName, setFontSizeName] = useState<number>(14); // in px
  const [fontSizePrice, setFontSizePrice] = useState<number>(14); // in px
  const [barcodeHeight, setBarcodeHeight] = useState<number>(45); // in px
  const [columnsCount, setColumnsCount] = useState<number>(3);

  // Element Visibility Toggles
  const [showName, setShowName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBarcodeImage, setShowBarcodeImage] = useState<boolean>(true);
  const [showBarcodeText, setShowBarcodeText] = useState<boolean>(true);
  const [showSku, setShowSku] = useState<boolean>(true);
  const [showStoreLogo, setShowStoreLogo] = useState<boolean>(true);

  const selectedProduct = useMemo(() => {
    return products.find(p => String(p.id) === String(selectedProductId)) || products[0] || null;
  }, [products, selectedProductId]);

  const barcodeValue = useMemo(() => {
    if (!selectedProduct) return '';
    return selectedProduct.barcode || selectedProduct.sku || '123456789';
  }, [selectedProduct]);

  const barcodeDataUrl = useMemo(() => {
    if (!barcodeValue) return '';
    return generateBarcodeDataUrl(barcodeValue, { height: barcodeHeight });
  }, [barcodeValue, barcodeHeight]);

  const handlePrint = () => {
    if (!selectedProduct) {
      toast('مبنعش بەرهەمێک هەڵبژێرە / Please select a product first.', 'error');
      return;
    }

    if (showBarcodeImage && !barcodeDataUrl) {
      toast('ئەم بەرهەمە کودێکی بارکۆدی نییە / Product has no barcode value.', 'error');
      return;
    }

    const labelCards = Array.from({ length: copies }).map(() => `
      <div class="label-card">
        ${showStoreLogo ? `<div class="store-name">Galo Kids 🎈</div>` : ''}
        ${showName ? `<div class="prod-name" style="font-size: ${fontSizeName}px;">${escapeHtml(selectedProduct.name)}</div>` : ''}
        ${showSku && (selectedProduct.sku || selectedProduct.barcode) ? `<div class="sku-code">SKU: ${escapeHtml(selectedProduct.sku || selectedProduct.barcode)}</div>` : ''}
        ${showPrice ? `<div class="prod-price" style="font-size: ${fontSizePrice}px;">${formatIQDLabel(Number(selectedProduct.price || 0))}</div>` : ''}
        ${showBarcodeImage && barcodeDataUrl ? `<img class="barcode-img" src="${barcodeDataUrl}" alt="${escapeHtml(barcodeValue)}" />` : ''}
        ${showBarcodeText && barcodeValue ? `<div class="barcode-val">${escapeHtml(barcodeValue)}</div>` : ''}
      </div>
    `).join('');

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      toast('تکایە شوێنی Pop-up بکەوە بۆ چاپکردن / Please allow pop-ups for printing.', 'error');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product Labels - ${escapeHtml(selectedProduct.name)}</title>
          <style>
            @page { margin: 8mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 12px; background: #fff; }
            .label-grid {
              display: grid;
              grid-template-columns: repeat(${columnsCount}, minmax(${labelWidth}px, 1fr));
              gap: 12px;
            }
            .label-card {
              border: 1.5px dashed #cbd5e1;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
              box-sizing: border-box;
              background: #fff;
              page-break-inside: avoid;
            }
            .store-name { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .prod-name { font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.2; word-break: break-word; }
            .sku-code { font-size: 10px; color: #64748b; font-family: monospace; margin-bottom: 4px; }
            .prod-price { font-weight: 900; color: #4f46e5; margin: 4px 0; }
            .barcode-img { display: block; margin: 6px auto 2px; max-width: 100%; height: ${barcodeHeight}px; object-fit: contain; }
            .barcode-val { font-family: monospace; font-size: 10px; font-weight: bold; color: #334155; }
            @media print {
              body { padding: 0; }
              .label-card { border-style: solid; border-color: #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <div class="label-grid">
            ${labelCards}
          </div>
        </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
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
              ? 'دەستکاری کردنی تەکامولی قەبارە، دەرکەوتنی ئایتمەکان و پێشاندانی زیندوی لەیبڵەکان'
              : 'Customize label dimensions, element visibility, and live print preview'}
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 relative z-10"
        >
          <Printer className="w-4 h-4" />
          <span>{language === 'ku' ? 'چاپکردنی لەیبڵەکان' : language === 'ar' ? 'طباعة الملصقات' : 'Print Labels'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Control Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Select Product & Copies Card */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 rounded-[2.5rem] shadow-[0_10px_30px_-5px_rgba(180,195,215,0.4)] space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-indigo-600" />
              {language === 'ku' ? 'دیاری کردنی بەرهەم و ژمارەی کۆپی' : 'Select Product & Print Copies'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Product")}</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- {L("Select product")} --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatIQDLabel(Number(p.price || 0))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{L("Copies")}</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value || 1)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Visibility Toggles Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Eye className="w-4 h-4 text-indigo-600" />
              {language === 'ku' ? 'دەرکەوتنی ئایتمەکان لەسەر لەیبڵ (Show/Hide)' : 'Element Visibility Toggles'}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showName ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'ناوی بەرهەم' : 'Product Name'}</span>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showPrice ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'نرخی بەرهەم' : 'Product Price'}</span>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showBarcodeImage ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showBarcodeImage} onChange={(e) => setShowBarcodeImage(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'وێنەی بارکۆد' : 'Barcode Image'}</span>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showBarcodeText ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showBarcodeText} onChange={(e) => setShowBarcodeText(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'کۆدی ژمارەیی بارکۆد' : 'Barcode Number'}</span>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showSku ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'کۆدی SKU' : 'SKU Code'}</span>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${showStoreLogo ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="checkbox" checked={showStoreLogo} onChange={(e) => setShowStoreLogo(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                <span>{language === 'ku' ? 'ناوی دوکان (Galo Kids)' : 'Store Name'}</span>
              </label>
            </div>
          </div>

          {/* Label Dimensions & Font Sizes Control */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              {language === 'ku' ? 'قەبارەکان و فۆنتەکانی لەیبڵ' : 'Dimensions & Font Sizes Settings'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">
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
                <label className="block text-xs font-bold text-slate-750 mb-1">
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

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">
                  {language === 'ku' ? 'قەبارەی فۆنتی ناو (Name Font):' : 'Name Font Size:'} <span className="font-mono text-indigo-600">{fontSizeName}px</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={24}
                  value={fontSizeName}
                  onChange={(e) => setFontSizeName(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">
                  {language === 'ku' ? 'قەبارەی فۆنتی نرخ (Price Font):' : 'Price Font Size:'} <span className="font-mono text-indigo-600">{fontSizePrice}px</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={26}
                  value={fontSizePrice}
                  onChange={(e) => setFontSizePrice(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-750 mb-1">
                  {language === 'ku' ? 'بەرزی بارکۆد (Barcode Height):' : 'Barcode Image Height:'} <span className="font-mono text-indigo-600">{barcodeHeight}px</span>
                </label>
                <input
                  type="range"
                  min={25}
                  max={80}
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                {language === 'ku' ? 'پێشاندانی زیندوی لەیبڵ' : 'Live Print Preview'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                PREVIEW
              </span>
            </h3>

            {selectedProduct ? (
              <div className="flex flex-col items-center">
                <div 
                  style={{ width: `${labelWidth}px` }} 
                  className="border-2 border-dashed border-indigo-300 rounded-xl p-4 bg-slate-50 text-center shadow-inner transition-all space-y-2"
                >
                  {showStoreLogo && (
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Galo Kids 🎈
                    </div>
                  )}

                  {showName && (
                    <div 
                      style={{ fontSize: `${fontSizeName}px` }}
                      className="font-black text-slate-900 leading-tight"
                    >
                      {selectedProduct.name}
                    </div>
                  )}

                  {showSku && (selectedProduct.sku || selectedProduct.barcode) && (
                    <div className="text-[10px] font-mono text-slate-500 font-bold">
                      SKU: {selectedProduct.sku || selectedProduct.barcode}
                    </div>
                  )}

                  {showPrice && (
                    <div 
                      style={{ fontSize: `${fontSizePrice}px` }}
                      className="font-extrabold text-indigo-600"
                    >
                      {formatIQDLabel(Number(selectedProduct.price || 0))}
                    </div>
                  )}

                  {showBarcodeImage && barcodeDataUrl && (
                    <img 
                      src={barcodeDataUrl} 
                      alt="Barcode" 
                      style={{ height: `${barcodeHeight}px` }} 
                      className="mx-auto object-contain my-1" 
                    />
                  )}

                  {showBarcodeText && barcodeValue && (
                    <div className="text-[11px] font-mono font-bold text-slate-700 tracking-wider">
                      {barcodeValue}
                    </div>
                  )}
                </div>

                <div className="mt-6 w-full pt-4 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500 mb-3">
                    {language === 'ku' ? `تەخمینکراوە لەرۆڵدا: ${copies} کۆپی` : `Total print output: ${copies} copies`}
                  </p>
                  <button
                    onClick={handlePrint}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
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
