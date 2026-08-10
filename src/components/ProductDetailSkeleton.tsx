import React from 'react';

export const ProductDetailSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 animate-pulse">
      {/* Image Gallery Skeleton */}
      <div className="space-y-4">
        <div className="aspect-[4/5] bg-slate-200 rounded-2xl border border-slate-200" />
      </div>

      {/* Product Details Skeleton */}
      <div className="flex flex-col">
        <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
        <div className="h-10 w-3/4 bg-slate-200 rounded mb-4" />
        <div className="h-8 w-32 bg-slate-200 rounded mb-6" />
        
        <div className="space-y-2 mb-8">
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-4 bg-slate-200 rounded w-5/6" />
          <div className="h-4 bg-slate-200 rounded w-4/6" />
        </div>

        <div className="h-px bg-slate-200 mb-8 w-full" />

        {/* Color Selection Skeleton */}
        <div className="mb-8">
          <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-10 h-10 rounded-full bg-slate-200" />
            ))}
          </div>
        </div>

        {/* Size Selection Skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-200 rounded" />
          </div>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-14 h-10 rounded-lg bg-slate-200" />
            ))}
          </div>
        </div>

        {/* Actions Skeleton */}
        <div className="mt-auto pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-24 h-12 rounded-full bg-slate-200" />
            <div className="flex-1 h-12 rounded-full bg-slate-200" />
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200 space-y-4">
            <div className="h-4 w-64 bg-slate-200 rounded" />
            <div className="h-4 w-56 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
