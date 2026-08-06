export const getColorHex = (colorName: string) => {
  const c = colorName.toLowerCase();
  switch (c) {
    case 'red': return '#ef4444';
    case 'blue': return '#3b82f6';
    case 'green': return '#22c55e';
    case 'yellow': return '#eab308';
    case 'black': return '#000000';
    case 'white': return '#ffffff';
    case 'pink': return '#ec4899';
    case 'purple': return '#a855f7';
    case 'orange': return '#f97316';
    case 'gray': return '#6b7280';
    case 'brown': return '#92400e';
    case 'navy': return '#1e3a8a';
    case 'beige': return '#fef3c7';
    default: return '#cbd5e1';
  }
};
