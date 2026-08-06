import React, { useState, useEffect, useRef } from 'react';
import { Search, X, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

export const SearchBar: React.FC = () => {
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
      setQuery('');
    }
  };

  const removeHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item !== itemToRemove);
    setHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-500 hover:text-slate-900 transition-colors hidden sm:block"
        title={t('searchProducts') || 'Search products...'}
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div ref={wrapperRef} className="relative hidden sm:block w-64">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchProducts') || 'Search products...'}
          autoFocus
          className={`w-full bg-slate-100 border border-slate-200 rounded-full py-2 ${
            isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10'
          } text-sm focus:outline-none focus:ring-2 focus:ring-amber-800 focus:bg-white transition-all`}
        />
        <Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${
          isRTL ? 'right-3' : 'left-3'
        }`} />
        <button 
          type="button"
          onClick={() => setIsOpen(false)}
          className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${
            isRTL ? 'left-3' : 'right-3'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </form>

      {history.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 overflow-hidden">
          <div className={`px-3 pb-2 pt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider ${isRTL ? 'text-right' : ''}`}>
            {t('recentSearches') || 'Recent Searches'}
          </div>
          {history.map((item, index) => (
            <div 
              key={index}
              onClick={(e) => handleSearch(e as any, item)}
              className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 cursor-pointer group"
            >
              <div className="flex items-center text-sm text-slate-700">
                <History className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} text-slate-400 group-hover:text-amber-800 transition-colors`} />
                <span>{item}</span>
              </div>
              <button 
                onClick={(e) => removeHistoryItem(e, item)}
                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
