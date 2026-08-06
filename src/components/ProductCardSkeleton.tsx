import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden animate-pulse h-full">
      <div className="aspect-square sm:aspect-[4/5] bg-slate-100" />
      <div className="p-2.5 sm:p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <div className="h-2 w-1/3 bg-slate-100 rounded" />
          <div className="h-3 w-1/4 bg-slate-100 rounded" />
        </div>
        <div className="h-3 w-3/4 bg-slate-100 rounded mb-2 sm:mb-3" />
        
        <div className="mt-auto flex items-center justify-between pt-1.5 sm:pt-2 border-t border-slate-50">
          <div className="flex -space-x-1 sm:-space-x-1.5">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-100 border border-white" />
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-100 border border-white" />
          </div>
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
};
