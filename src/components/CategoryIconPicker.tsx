import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { CategoryIcon } from './CategoryIcon';
import { CATEGORY_ICON_GROUPS } from './KidsIcons';

/**
 * Choosing the icon a category wears.
 *
 * Grouped and labelled rather than a flat grid: a shop owner is looking for
 * "the dress one", not scanning thirty glyphs. The icons appear in the colour
 * the storefront will use, so the picker doubles as the preview — the old one
 * showed flat grey shapes that looked nothing like the result.
 *
 * The same picker serves the "new category" form and the edit modal, which
 * each had their own copy of the list. Two copies of a list of icons is two
 * lists that drift.
 */
export const CategoryIconPicker: React.FC<{
  value?: string;
  onChange: (icon: string) => void;
  /** Height for the scrolling area; the modal has less room than the page. */
  maxHeight?: string;
}> = ({ value, onChange, maxHeight = 'max-h-72' }) => {
  const { language } = useLanguage();
  const L = (ku: string, ar: string, en: string) =>
    language === 'ku' ? ku : language === 'ar' ? ar : en;

  return (
    <div>
      <div className={`space-y-4 ${maxHeight} overflow-y-auto pe-1 pb-1`}>
        {CATEGORY_ICON_GROUPS.map(group => (
          <div key={group.en}>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-1.5">
              {L(group.ku, group.ar, group.en)}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {group.icons.map(choice => {
                const selected = value === choice.name;

                return (
                  <button
                    key={choice.name}
                    type="button"
                    onClick={() => onChange(choice.name)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      selected
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <CategoryIcon name={choice.name} className="w-6 h-6" />
                    <span className="text-[10px] font-bold text-slate-600 text-center leading-tight line-clamp-1">
                      {L(choice.ku, choice.ar, choice.en)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Choosing nothing is a valid answer: the storefront then reads the
          category's own name and picks something sensible for it. */}
      <div className="border-t border-slate-100 mt-2 pt-2">
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="mt-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
        >
          {L('لابردنی ئایکۆن (خۆکار)', 'إزالة الأيقونة (تلقائي)', 'Clear icon (automatic)')}
        </button>
      ) : (
        <p className="mt-2 text-xs font-bold text-slate-400">
          {L(
            'هیچ هەڵنەبژێردراوە — بەپێی ناوی بەشەکە خۆکار هەڵدەبژێردرێت.',
            'لم يتم الاختيار — تُختار تلقائياً حسب اسم القسم.',
            'Nothing chosen — one is picked automatically from the category name.'
          )}
        </p>
      )}
      </div>
    </div>
  );
};
