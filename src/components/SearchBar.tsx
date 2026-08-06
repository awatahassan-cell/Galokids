import React, { useState, useEffect, useRef } from 'react';
import { Search, X, History, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

interface SearchBarProps {
  isMobileModalOpen?: boolean;
  onCloseMobileModal?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ isMobileModalOpen, onCloseMobileModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
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

  const quickTags = [
    { label: t('categoryBoys') || 'کوڕان', query: 'boy' },
    { label: t('categoryGirls') || 'کچان', query: 'girl' },
    { label: t('categoryInfants') || 'ساوا', query: 'infant' },
    { label: t('categoryToys') || 'یاری', query: 'toy' },
  ];

  return (
    <>
      {/* Desktop Search Button / Field */}
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all hidden sm:flex items-center justify-center border border-transparent hover:border-slate-200"
          title={t('searchProducts') || 'Search products...'}
        >
          <Search className="w-5 h-5" />
        </button>
      ) : (
        <div ref={wrapperRef} className="relative hidden sm:block w-64 md:w-72">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchProducts') || 'گەڕان لە بەرهەمەکان...'}
              autoFocus
              className={`w-full bg-slate-100 border border-slate-200 rounded-full py-2.5 ${
                isRTL ? 'pr-10 pl-10 text-right font-arabic' : 'pl-10 pr-10 font-sans'
              } text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all shadow-inner`}
            />
            <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${
              isRTL ? 'right-3.5' : 'left-3.5'
            }`} />
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full ${
                isRTL ? 'left-2.5' : 'right-2.5'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {history.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 overflow-hidden">
              <div className={`px-4 pb-2 pt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider ${isRTL ? 'text-right font-arabic' : ''}`}>
                {t('recentSearches') || 'گەڕانەکانی پێشوو'}
              </div>
              {history.map((item, index) => (
                <div 
                  key={index}
                  onClick={(e) => handleSearch(e as any, item)}
                  className="flex items-center justify-between px-4 py-2 hover:bg-rose-50/50 cursor-pointer group transition-colors"
                >
                  <div className="flex items-center text-sm font-medium text-slate-700">
                    <History className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-slate-400 group-hover:text-rose-500 transition-colors`} />
                    <span>{item}</span>
                  </div>
                  <button 
                    onClick={(e) => removeHistoryItem(e, item)}
                    className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Search Modal Overlay */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col max-w-lg w-full mx-auto my-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className={`text-base font-black text-slate-900 flex items-center gap-2 ${isRTL ? 'font-arabic' : ''}`}>
                <Search className="w-5 h-5 text-rose-500" />
                {t('searchProducts') || 'گەڕان لە بەرهەمەکان'}
              </h3>
              <button 
                onClick={onCloseMobileModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchProducts') || 'ناوی بەرهەم، ڕەنگ، یان جۆر بنووسە...'}
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
                  className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 ${
                    isRTL ? 'left-3' : 'right-3'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Quick Search Suggestions */}
            <div>
              <p className={`text-xs font-bold text-slate-400 mb-2 flex items-center gap-1 ${isRTL ? 'font-arabic text-right' : ''}`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {t('popularSearches') || 'گەڕانە باوەکان'}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickTags.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => handleSearch(e as any, tag.query)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded-full text-xs font-extrabold transition-all border border-slate-200/60"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className={`text-xs font-bold text-slate-400 mb-2 ${isRTL ? 'font-arabic text-right' : ''}`}>
                  {t('recentSearches') || 'گەڕانەکانی پێشوو'}
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
                        className="text-slate-400 hover:text-rose-500 p-1"
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
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-200 active:scale-95 transition-all text-center"
            >
              {t('search') || 'بگه‌ڕێ'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
