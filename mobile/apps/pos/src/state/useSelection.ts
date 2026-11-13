import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Selection } from '@/components/Table';

/**
 * Which rows are ticked.
 *
 * Kept by key rather than by position, and trimmed to what is on screen: a row
 * that has been deleted or filtered away must not stay selected, or the bulk
 * bar would go on to act on something the person can no longer see.
 */
export function useSelection(keys: string[]): Selection & { clear: () => void; count: number; ids: string[] } {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const signature = keys.join('|');

  useEffect(() => {
    setSelected(current => {
      const present = new Set(keys);
      const next = new Set([...current].filter(key => present.has(key)));
      return next.size === current.size ? current : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const onToggle = useCallback((key: string) => {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const allSelected = keys.length > 0 && keys.every(key => selected.has(key));

  const onToggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(keys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSelected, signature]);

  const clear = useCallback(() => setSelected(new Set()), []);
  const ids = useMemo(() => [...selected], [selected]);

  return { selected, onToggle, onToggleAll, allSelected, clear, count: selected.size, ids };
}
