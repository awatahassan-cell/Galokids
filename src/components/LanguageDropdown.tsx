import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Language } from '../i18n/translations';
import { KurdistanFlag, IraqFlag, UsaFlag } from './Flags';

interface LanguageDropdownProps {
  className?: string;
  /**
   * `menu` is the compact trigger-plus-panel for a toolbar. `inline` lays the
   * three languages out as a row of choices with nothing to open.
   *
   * The phone menu uses `inline`. A panel that floats out of a drawer near the
   * bottom of the screen is the one place this control cannot work: it opens
   * downwards into the drawer's own scroll edge and gets cut off, and there is
   * no room to open it upwards either. Three flags side by side always fit.
   */
  variant?: 'menu' | 'inline';
}

const LANGUAGES: { code: Language; label: string; Flag: React.FC<{ className?: string }> }[] = [
  { code: 'ku', label: 'کوردی', Flag: KurdistanFlag },
  { code: 'ar', label: 'العربية', Flag: IraqFlag },
  { code: 'en', label: 'English', Flag: UsaFlag },
];

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ className = '', variant = 'menu' }) => {
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

  if (variant === 'inline') {
    return (
      <div className={`grid grid-cols-3 gap-1.5 ${className}`}>
        {LANGUAGES.map((item) => {
          const isSelected = item.code === language;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setLanguage(item.code)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                isSelected
                  ? 'bg-white border-candy-400 ring-2 ring-candy-200 shadow-2xs'
                  : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <item.Flag className="w-6 h-6" />
              <span className={`text-[11px] font-black leading-none ${isSelected ? 'text-candy-700' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
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
        // `end-0`, not `right-0`: pinned to the physical right, the panel hung
        // off the wrong edge of the trigger in Kurdish and Arabic and ran out
        // past the side of the screen.
        <div className="absolute end-0 mt-2 p-1.5 min-w-[10.5rem] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-0.5">
          {LANGUAGES.map((item) => {
            const isSelected = item.code === language;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLanguage(item.code);
                  setIsOpen(false);
                }}
                className={`px-2.5 py-2 rounded-xl transition-all flex items-center gap-2.5 text-start cursor-pointer ${
                  isSelected ? 'bg-candy-50 text-candy-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <item.Flag className="w-5 h-5 shrink-0" />
                {/* The name, not just the flag. A column of three small flags
                    asks the reader to know which country stands for which
                    language before they can pick one. */}
                <span className="text-xs font-black flex-1 whitespace-nowrap">{item.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
