import React, { useState, useEffect, useRef } from 'react';
import { Search, X, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

interface SearchBarProps {
  isMobileModalOpen?: boolean;
  onCloseMobileModal?: () => void;
  onOpenMobileModal?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ isMobileModalOpen, onCloseMobileModal, onOpenMobileModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t, dir, language } = useLanguage();
  const isRTL = dir === 'rtl';

  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        setHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSearch = (e: React.FormEvent, searchQuery?: string) => {
    e.preventDefault();
    const finalQuery = (searchQuery || query).trim();
    if (finalQuery) {
      const newHistory = [finalQuery, ...history.filter(item => item !== finalQuery)].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      navigate(`/products?q=${encodeURIComponent(finalQuery)}`);
      setIsOpen(false);
      if (onCloseMobileModal) onCloseMobileModal();
      setQuery('');
    }
  };

  const removeHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item !== itemToRemove);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  return (
    <>
      {/* Desktop Vastraa Inline Pill Search Bar */}
      <div ref={wrapperRef} className="relative hidden sm:block w-56 md:w-64 lg:w-72 font-arabic">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={language === 'ku' ? 'گەڕان بۆ پۆشاک، یاری...' : language === 'ar' ? 'البحث عن الملابس والألعاب...' : 'Search clothes, toys...'}
            className="w-full bg-slate-100/90 text-slate-800 text-xs font-bold rounded-full pl-4 rtl:pl-10 pr-10 rtl:pr-4 py-2.5 transition-all border border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white placeholder:text-slate-400 shadow-2xs"
          />
          <button type="submit" className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {isOpen && history.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="text-[10px] font-black uppercase text-slate-400 px-3 py-1 flex items-center gap-1">
              <History className="w-3 h-3" />
              <span>Recent Searches</span>
            </div>
            {history.map((item, idx) => (
              <div 
                key={idx} 
                onClick={(e) => handleSearch(e as any, item)}
                className="px-3 py-1.5 rounded-xl hover:bg-rose-50 text-xs font-bold text-slate-700 flex items-center justify-between cursor-pointer group"
              >
                <span>{item}</span>
                <button onClick={(e) => removeHistoryItem(e, item)} className="text-slate-300 hover:text-rose-500 p-0.5 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Search Modal Overlay */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col max-w-lg w-full mx-auto my-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className={`text-base font-black text-slate-900 flex items-center gap-2 ${isRTL ? 'font-arabic' : ''}`}>
                <Search className="w-5 h-5 text-rose-500" />
                {t('search')}
              </h3>
              <button 
                onClick={onCloseMobileModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                autoFocus
                className={`w-full bg-slate-100 border border-slate-200 rounded-2xl py-3.5 ${
                  isRTL ? 'pr-12 pl-12 text-right font-arabic' : 'pl-12 pr-12 font-sans'
                } text-base font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white shadow-inner`}
              />
              <Search className={`w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${
                isRTL ? 'right-4' : 'left-4'
              }`} />
              {query && (
                <button 
                  type="button"
                  onClick={() => setQuery('')}
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer ${
                    isRTL ? 'left-3' : 'right-3'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* History */}
            {history.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className={`text-xs font-bold text-slate-400 mb-2 ${isRTL ? 'font-arabic text-right' : ''}`}>
                  {t('recentSearches')}
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {history.map((item, index) => (
                    <div 
                      key={index}
                      onClick={(e) => handleSearch(e as any, item)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-rose-50/60 cursor-pointer text-sm font-semibold text-slate-700 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        {item}
                      </span>
                      <button 
                        onClick={(e) => removeHistoryItem(e, item)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => handleSearch(e as any)}
              className={`w-full py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all text-center cursor-pointer ${
                isRTL ? 'font-arabic' : ''
              }`}
            >
              {t('search')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

