import React from 'react';

export const KurdistanFlag: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={`${className} rounded-full overflow-hidden border border-slate-200/80 shadow-2xs inline-block shrink-0 object-cover`} viewBox="0 0 600 400" aria-label="Kurdistan Flag">
    <rect width="600" height="133.33" fill="#E41E26"/>
    <rect y="133.33" width="600" height="133.33" fill="#FFFFFF"/>
    <rect y="266.66" width="600" height="133.34" fill="#1E9B4B"/>
    <circle cx="300" cy="200" r="45" fill="#FECE00"/>
  </svg>
);

export const IraqFlag: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={`${className} rounded-full overflow-hidden border border-slate-200/80 shadow-2xs inline-block shrink-0 object-cover`} viewBox="0 0 900 600" aria-label="Iraq Flag">
    <rect width="900" height="200" fill="#CE1126"/>
    <rect y="200" width="900" height="200" fill="#FFFFFF"/>
    <rect y="400" width="900" height="200" fill="#000000"/>
    <text x="450" y="325" fill="#007A3D" fontSize="70" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">الله أكبر</text>
  </svg>
);

export const UsaFlag: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={`${className} rounded-full overflow-hidden border border-slate-200/80 shadow-2xs inline-block shrink-0 object-cover`} viewBox="0 0 741 390" aria-label="USA Flag">
    <rect width="741" height="390" fill="#b22234"/>
    <path d="M0,30H741M0,90H741M0,150H741M0,210H741M0,270H741M0,330H741" stroke="#fff" strokeWidth="30"/>
    <rect width="296.4" height="210" fill="#3c3b6e"/>
    <circle cx="148" cy="105" r="50" fill="#fff" opacity="0.8"/>
  </svg>
);
