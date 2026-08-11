import { useCallback, useMemo, useState } from 'react';

export type RowId = string | number;

/**
 * Tracks which rows are ticked in a table.
 *
 * Ids are held as strings so a numeric `12` from one refresh and the string
 * `"12"` from another are the same row. `prune` drops ids that are no longer
 * on screen, which matters after a page change or a filter — otherwise the bar
 * would claim a count the operator can no longer see.
 */
export function useBulkSelection(visibleIds: RowId[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => visibleIds.filter(Boolean).map(String), [visibleIds]);

  // Only count rows that are actually on screen right now.
  const effective = useMemo(
    () => visible.filter(id => selected.has(id)),
    [visible, selected]
  );

  const toggle = useCallback((id: RowId) => {
    const key = String(id);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isSelected = useCallback((id: RowId) => selected.has(String(id)), [selected]);

  const selectAllVisible = useCallback(() => {
    setSelected(prev => {
      const next = new Set(prev);
      visible.forEach(id => next.add(id));
      return next;
    });
  }, [visible]);

  const clear = useCallback(() => setSelected(new Set()), []);

  /** Every visible row is ticked — drives the header checkbox. */
  const allVisibleSelected = visible.length > 0 && effective.length === visible.length;

  const toggleAllVisible = useCallback(() => {
    if (allVisibleSelected) clear();
    else selectAllVisible();
  }, [allVisibleSelected, clear, selectAllVisible]);

  return {
    ids: effective,
    count: effective.length,
    totalVisible: visible.length,
    isSelected,
    toggle,
    selectAllVisible,
    toggleAllVisible,
    allVisibleSelected,
    clear,
  };
}
