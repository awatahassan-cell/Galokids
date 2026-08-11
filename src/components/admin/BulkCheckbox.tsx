import React from 'react';
import { Check, Minus } from 'lucide-react';

interface Props {
  checked: boolean;
  /** Some but not all rows ticked — only used by the header checkbox. */
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}

/**
 * The tick box on a table row.
 *
 * It stops click propagation because the rows around it are themselves
 * clickable (opening a preview), and ticking a row should never navigate.
 */
export const BulkCheckbox: React.FC<Props> = ({ checked, indeterminate, onChange, label }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={indeterminate ? 'mixed' : checked}
    aria-label={label}
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-5 h-5 rounded-md border-2 grid place-items-center shrink-0 transition-colors cursor-pointer ${
      checked || indeterminate
        ? 'bg-indigo-600 border-indigo-600 text-white'
        : 'bg-white border-slate-300 hover:border-indigo-400'
    }`}
  >
    {indeterminate ? <Minus className="w-3 h-3" strokeWidth={4} /> : checked ? <Check className="w-3 h-3" strokeWidth={4} /> : null}
  </button>
);
