import React from 'react';

/**
 * The shop's decorative vocabulary: pastel fills with a darker stroke of the
 * same hue. They carry the brand on sections that have no photography, and
 * they are the reason the storefront reads as "for children" without needing
 * a single extra image request.
 *
 * Everything here is `aria-hidden` — it is decoration, never content.
 */

export type DecorShape =
  | 'star' | 'balloon' | 'butterfly' | 'bow'
  | 'rocket' | 'heart' | 'rainbow' | 'flower';

const SHAPES: Record<DecorShape, { w: number; h: number; box: string; body: React.ReactNode }> = {
  star: {
    w: 52, h: 52, box: '0 0 24 24',
    body: <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" fill="#FFD166" stroke="#FFB347" strokeWidth="1" />,
  },
  balloon: {
    w: 46, h: 62, box: '0 0 34 44',
    body: (
      <>
        <ellipse cx="17" cy="16" rx="13" ry="15" fill="#FF8FAB" stroke="#E0607A" strokeWidth="1.2" />
        <path d="M17 31 Q15 36 17 40 Q19 36 17 31" stroke="#E0607A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <ellipse cx="13" cy="12" rx="3" ry="4" fill="rgba(255,255,255,.35)" />
      </>
    ),
  },
  butterfly: {
    w: 54, h: 44, box: '0 0 40 32',
    body: (
      <>
        <path d="M20 16 C14 8 2 4 2 12 C2 20 14 22 20 16Z" fill="#D4A5FF" stroke="#B07FD4" strokeWidth="1" />
        <path d="M20 16 C26 8 38 4 38 12 C38 20 26 22 20 16Z" fill="#9EE5FF" stroke="#5DB8D4" strokeWidth="1" />
        <path d="M20 16 C14 20 4 22 6 28 C8 32 16 28 20 16Z" fill="#FFB3D9" stroke="#E0607A" strokeWidth="1" />
        <path d="M20 16 C26 20 36 22 34 28 C32 32 24 28 20 16Z" fill="#FFD166" stroke="#E0A020" strokeWidth="1" />
        <line x1="20" y1="10" x2="20" y2="28" stroke="#2B2D42" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M18 10 Q20 6 22 10" stroke="#2B2D42" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  bow: {
    w: 56, h: 40, box: '0 0 44 28',
    body: (
      <>
        <path d="M22 14 C16 8 4 2 4 10 C4 18 16 18 22 14Z" fill="#FF8FAB" stroke="#C0506A" strokeWidth="1" />
        <path d="M22 14 C28 8 40 2 40 10 C40 18 28 18 22 14Z" fill="#FF8FAB" stroke="#C0506A" strokeWidth="1" />
        <path d="M22 14 C16 18 4 24 6 26 C10 28 18 22 22 14Z" fill="#FFB3D9" stroke="#C0506A" strokeWidth="1" />
        <path d="M22 14 C28 18 40 24 38 26 C34 28 26 22 22 14Z" fill="#FFB3D9" stroke="#C0506A" strokeWidth="1" />
        <circle cx="22" cy="14" r="3.5" fill="#C0506A" />
      </>
    ),
  },
  rocket: {
    w: 44, h: 58, box: '0 0 30 44',
    body: (
      <>
        <path d="M15 2 C15 2 6 10 6 22 L15 26 L24 22 C24 10 15 2 15 2Z" fill="#9EE5FF" stroke="#5DB8D4" strokeWidth="1.2" />
        <circle cx="15" cy="18" r="4" fill="#fff" stroke="#5DB8D4" strokeWidth="1" />
        <path d="M6 22 L2 30 L10 27Z" fill="#FF8FAB" stroke="#C0506A" strokeWidth="1" />
        <path d="M24 22 L28 30 L20 27Z" fill="#FF8FAB" stroke="#C0506A" strokeWidth="1" />
        <path d="M11 26 Q15 32 19 26" fill="#FFD166" stroke="#E0A020" strokeWidth="1" />
        <path d="M13 30 Q15 38 17 30" fill="#FFB347" stroke="#E0A020" strokeWidth="1" />
      </>
    ),
  },
  heart: {
    w: 48, h: 44, box: '0 0 36 32',
    body: (
      <>
        <path d="M18 28 C18 28 2 18 2 9 C2 4.5 5.5 2 9 2 C12 2 15 4 18 7 C21 4 24 2 27 2 C30.5 2 34 4.5 34 9 C34 18 18 28 18 28Z" fill="#FF8FAB" stroke="#C0506A" strokeWidth="1.2" />
        <path d="M10 8 Q12 6 14 9" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  rainbow: {
    w: 60, h: 40, box: '0 0 48 28',
    body: (
      <>
        <path d="M4 26 Q4 4 24 4 Q44 4 44 26" stroke="#FF8FAB" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M8 26 Q8 9 24 9 Q40 9 40 26" stroke="#FFD166" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M12 26 Q12 14 24 14 Q36 14 36 26" stroke="#06D6A0" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M16 26 Q16 18 24 18 Q32 18 32 26" stroke="#9EE5FF" strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    ),
  },
  flower: {
    w: 48, h: 48, box: '0 0 38 38',
    body: (
      <>
        <ellipse cx="19" cy="10" rx="5" ry="8" fill="#FFB3D9" stroke="#E0607A" strokeWidth="1" />
        <ellipse cx="19" cy="28" rx="5" ry="8" fill="#FFB3D9" stroke="#E0607A" strokeWidth="1" />
        <ellipse cx="10" cy="19" rx="8" ry="5" fill="#D4A5FF" stroke="#B07FD4" strokeWidth="1" />
        <ellipse cx="28" cy="19" rx="8" ry="5" fill="#D4A5FF" stroke="#B07FD4" strokeWidth="1" />
        <circle cx="19" cy="19" r="4.5" fill="#FFD166" stroke="#E0A020" strokeWidth="1" />
      </>
    ),
  },
};

export const KidsShape: React.FC<{ shape: DecorShape; size?: number; className?: string }> = ({
  shape, size, className,
}) => {
  const s = SHAPES[shape];
  const scale = size ? size / Math.max(s.w, s.h) : 1;
  return (
    <svg
      width={s.w * scale}
      height={s.h * scale}
      viewBox={s.box}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {s.body}
    </svg>
  );
};

/**
 * A scattered set of shapes positioned inside the nearest positioned
 * ancestor. Positions are given as CSS so they follow the writing direction.
 */
export const FloatingDecor: React.FC<{
  items: { shape: DecorShape; size?: number; style: React.CSSProperties }[];
}> = ({ items }) => (
  <>
    {items.map((it, i) => (
      <span key={i} className="vk-float" style={it.style} aria-hidden="true">
        <KidsShape shape={it.shape} size={it.size} />
      </span>
    ))}
  </>
);
