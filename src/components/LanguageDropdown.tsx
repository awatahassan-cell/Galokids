import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { KurdistanFlag, IraqFlag, UsaFlag } from './Flags';

interface LanguageDropdownProps {
  className?: string;
}

const LANGUAGES: { code: Language; label: string; Flag: React.FC<{ className?: string }> }[] = [
  { code: 'ku', label: 'کوردی', Flag: KurdistanFlag },
  { code: 'ar', label: 'العربية', Flag: IraqFlag },
  { code: 'en', label: 'English', Flag: UsaFlag },
];

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={currentLang.label}
      >
        <currentLang.Flag className="w-5 h-5" />
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 p-1.5 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1">
          {LANGUAGES.map((item) => {
            const isSelected = item.code === language;
            return (
              <button
                key={item.code}
                onClick={() => {
                  setLanguage(item.code);
                  setIsOpen(false);
                }}
                title={item.label}
                className={`p-1.5 rounded-full transition-all flex items-center justify-center ${
                  isSelected ? 'bg-candy-50 ring-2 ring-candy-400 scale-105' : 'opacity-65 hover:opacity-100 hover:scale-105'
                }`}
              >
                <item.Flag className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
