const fs = require('fs');
let code = fs.readFileSync('src/components/ProductFilter.tsx', 'utf8');

const replacement = `              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Categories */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('categories')}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, categoryId: null }))}
                  className={\`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between \${
                    filters.categoryId === null 
                      ? 'bg-indigo-50 text-indigo-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }\`}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                      <Filter className="w-4 h-4" />
                    </span>
                    {t('all')}
                  </span>
                  {filters.categoryId === null && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  )}
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setFilters(prev => ({ ...prev, categoryId: category.id }))}
                    className={\`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between group \${
                      filters.categoryId === category.id 
                        ? 'bg-indigo-50 text-indigo-700 font-medium' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }\`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={\`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border transition-colors \${
                        filters.categoryId === category.id 
                          ? 'bg-indigo-100 border-indigo-200 text-indigo-600'
                          : 'bg-white border-slate-100 text-slate-400 group-hover:text-slate-600 group-hover:border-slate-200'
                      }\`}>
                        <CategoryIcon iconName={category.icon} />
                      </span>
                      {getCategoryName(category)}
                    </span>
                    {filters.categoryId === category.id && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('gender')}</h3>
              <div className="space-y-2">
                {['boy', 'girl', 'unisex'].map(gender => (
                  <button
                    key={gender}
                    onClick={() => setFilters(prev => ({ ...prev, gender: prev.gender === gender ? null : (gender as any) }))}
                    className={\`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between \${
                      filters.gender === gender 
                        ? 'bg-rose-50 text-rose-700 font-medium' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }\`}
                  >
                    <span className="capitalize">{t(gender)}</span>
                    {filters.gender === gender && (
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">{t('color')}</h3>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => toggleColor(color)}
                    className={\`w-8 h-8 rounded-full border-2 transition-transform \${
                      filters.colors.includes(color) 
                        ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2 scale-110' 
                        : 'border-white hover:scale-110 shadow-sm'
                    }\`}
                    style={{ backgroundColor: getColorHex(color) }}
                    title={color}
                  />
                ))}
              </div>
            </div>`;

code = code.replace(/<button\s+key=\{color\}[\s\S]*?\}\}\)\s*<\/div>\s*<\/div>/, replacement);

fs.writeFileSync('src/components/ProductFilter.tsx', code);
console.log('patched pf final');
