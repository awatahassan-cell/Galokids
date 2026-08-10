import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { adminTr } from '../i18n/adminDict';

export interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  meta?: {
    currentPage: number;
    lastPage: number;
    total: number;
  };
}

function getPaginationRange(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];

  if (currentPage <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    pages.push(currentPage - 1);
    pages.push(currentPage);
    pages.push(currentPage + 1);
    pages.push('...');
    pages.push(totalPages);
  }

  return pages;
}

export const Pagination: React.FC<PaginationProps> = ({ meta, currentPage, totalPages, onPageChange }) => {
  const { language } = useLanguage();
  const L = (key: string) => adminTr(key, language);
  const isRTL = language === 'ar' || language === 'ku';

  const activePage = meta ? meta.currentPage : (currentPage || 1);
  const lastPage = meta ? meta.lastPage : (totalPages || 1);
  const totalResults = meta ? meta.total : undefined;

  if (lastPage <= 1) return null;

  const pageNumbers = getPaginationRange(activePage, lastPage);

  // Next / Previous Arrows flipped for RTL:
  // In LTR: Prev = ChevronLeft (<), Next = ChevronRight (>)
  // In RTL (ku/ar): Prev = ChevronRight (>), Next = ChevronLeft (<)
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/80 bg-white/90 backdrop-blur-md px-4 py-3 sm:px-6 mt-4 rounded-3xl gap-3 font-arabic shadow-2xs">
      <div className="text-xs font-bold text-slate-500">
        {language === 'ku' ? (
          <span>پەڕەی <strong className="text-slate-900 font-black">{activePage}</strong> لە <strong className="text-slate-900 font-black">{lastPage}</strong> {totalResults ? `(${totalResults} بەرهەم)` : ''}</span>
        ) : language === 'ar' ? (
          <span>الصفحة <strong className="text-slate-900 font-black">{activePage}</strong> من <strong className="text-slate-900 font-black">{lastPage}</strong> {totalResults ? `(${totalResults} نتائج)` : ''}</span>
        ) : (
          <span>Page <strong className="text-slate-900 font-black">{activePage}</strong> of <strong className="text-slate-900 font-black">{lastPage}</strong> {totalResults ? `(${totalResults} total)` : ''}</span>
        )}
      </div>

      <nav className="inline-flex items-center gap-1 flex-wrap justify-center" aria-label="Pagination">
        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(activePage - 1)}
          disabled={activePage <= 1}
          className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 cursor-pointer shadow-2xs active:scale-95"
          title={language === 'ku' ? 'پێشوو' : language === 'ar' ? 'السابق' : 'Previous'}
        >
          <PrevIcon className="h-4 w-4" />
        </button>

        {/* Page Number Pills */}
        {pageNumbers.map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 text-xs font-bold select-none">
                ...
              </span>
            );
          }

          const isCurrent = page === activePage;
          return (
            <button
              key={`page-${page}`}
              onClick={() => onPageChange(page)}
              className={`min-w-[34px] h-[34px] px-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center ${
                isCurrent
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {page}
            </button>
          );
        })}

        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(activePage + 1)}
          disabled={activePage >= lastPage}
          className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 cursor-pointer shadow-2xs active:scale-95"
          title={language === 'ku' ? 'داهاتوو' : language === 'ar' ? 'التالي' : 'Next'}
        >
          <NextIcon className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
};
