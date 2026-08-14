import React, { useState, useRef } from 'react';
import { Upload, Trash2, Star, ChevronLeft, ChevronRight, Maximize2, Plus, X, Image as ImageIcon, Loader2, Link } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { adminTr } from '../i18n/adminDict';
import { uploadImages } from '../services/uploadService';

interface ProductImageEditorProps {
  images: string[];
  primaryImageUrl: string;
  onChange: (images: string[], primaryImageUrl: string) => void;
}

export const ProductImageEditor: React.FC<ProductImageEditorProps> = ({
  images = [],
  primaryImageUrl = '',
  onChange,
}) => {
  const { language } = useLanguage();
  const L = (s: string) => adminTr(s, language);

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Consolidate images array ensuring primaryImageUrl is present
  const allImages = React.useMemo(() => {
    const list = Array.isArray(images) ? [...images] : [];
    if (primaryImageUrl && !list.includes(primaryImageUrl)) {
      list.unshift(primaryImageUrl);
    }
    return list;
  }, [images, primaryImageUrl]);

  const activePrimary = primaryImageUrl || (allImages.length > 0 ? allImages[0] : '');

  const processFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      // Shared with the store-logo uploader: compress, POST, and fall back to
      // an inline data URL when the API cannot be reached.
      const { urls } = await uploadImages(files);

      if (urls.length > 0) {
        const updatedList = [...allImages, ...urls];
        onChange(updatedList, activePrimary || updatedList[0] || '');
      }
    } catch (err) {
      console.warn('Product images note:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    processFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files ? (Array.from(e.dataTransfer.files) as File[]) : [];
    processFiles(files);
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const url = inputUrl.trim();
    if (!url) return;
    const updatedList = [...allImages, url];
    const newPrimary = activePrimary || url;
    onChange(updatedList, newPrimary);
    setInputUrl('');
    setShowUrlInput(false);
  };

  const handleSetPrimary = (url: string) => {
    // Reorder so primary is first
    const filtered = allImages.filter((img) => img !== url);
    const updatedList = [url, ...filtered];
    onChange(updatedList, url);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const targetUrl = allImages[indexToRemove];
    const updatedList = allImages.filter((_, idx) => idx !== indexToRemove);
    let newPrimary = activePrimary;
    if (activePrimary === targetUrl) {
      newPrimary = updatedList.length > 0 ? updatedList[0] : '';
    }
    onChange(updatedList, newPrimary);
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= allImages.length) return;
    const newList = [...allImages];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, moved);
    const newPrimary = activePrimary === moved && toIndex !== 0 ? newList[0] : activePrimary;
    onChange(newList, newPrimary);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-bold text-slate-900">
            {L("Product Images")} <span className="text-slate-400 font-normal">({allImages.length})</span>
          </label>
          <p className="text-xs text-slate-500">
            {L("Upload multiple high-resolution photos. First image or starred image acts as main cover photo.")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs font-semibold text-grape-700 hover:text-indigo-700 bg-grape-50 hover:bg-grape-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <Link className="w-3.5 h-3.5" />
          {showUrlInput ? L("Hide URL Input") : L("Add Image URL")}
        </button>
      </div>

      {/* URL Input Drawer */}
      {showUrlInput && (
        <form onSubmit={handleAddUrl} className="flex gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <input
            type="url"
            placeholder="https://example.com/product-image.jpg"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-grape-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-xs"
          >
            {L("Add")}
          </button>
        </form>
      )}

      {/* Gallery Grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {allImages.map((imgUrl, index) => {
            const isPrimary = imgUrl === activePrimary;
            return (
              <div
                key={`${imgUrl}-${index}`}
                className={`relative group rounded-xl border-2 overflow-hidden bg-slate-50 transition-all duration-200 aspect-square ${
                  isPrimary
                    ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Product view ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback placeholder if image fails to load
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80';
                  }}
                />

                {/* Primary Cover Badge */}
                {isPrimary ? (
                  <span className="absolute top-2 left-2 bg-grape-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-10">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    {L("Cover Photo")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(imgUrl)}
                    className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-slate-200 flex items-center gap-1 z-10"
                    title={L("Set as main cover photo")}
                  >
                    <Star className="w-3 h-3 text-slate-400 group-hover:text-sunny-600" />
                    {L("Set Cover")}
                  </button>
                )}

                {/* Action Controls Overlay */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setLightboxImage(imgUrl)}
                      className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-white hover:text-grape-700 shadow-sm transition-colors"
                      title={L("Zoom / Full Preview")}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:bg-red-500 hover:text-white shadow-sm transition-colors"
                      title={L("Delete Image")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-white">
                    {index > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(index, index - 1)}
                        className="p-1 rounded bg-black/50 hover:bg-black/80 transition-colors"
                        title={L("Move Left")}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    ) : <div />}

                    <span className="text-[10px] font-mono bg-black/60 px-1.5 py-0.5 rounded">
                      #{index + 1}
                    </span>

                    {index < allImages.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => handleMoveImage(index, index + 1)}
                        className="p-1 rounded bg-black/50 hover:bg-black/80 transition-colors"
                        title={L("Move Right")}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : <div />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drag & Drop Upload Dropzone - Compact & Elegant */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border border-dashed rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={isUploading}
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex items-center justify-center gap-3 py-1">
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-800">{L("Compressing & Uploading Images...")}</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 py-1">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="text-center sm:text-left font-arabic">
              <p className="text-xs font-extrabold text-slate-800">
                {L("Drag & drop product images here, or")} <span className="text-indigo-600 underline cursor-pointer">{L("browse files")}</span>
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                {L("Supports JPG, PNG, WEBP up to 10MB per file.")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Full-size Lightbox Preview Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 p-2.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Full Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};
