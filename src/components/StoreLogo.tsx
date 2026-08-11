import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useLanguage } from '../i18n/LanguageContext';

interface StoreLogoProps {
  className?: string;
  /** Rendered when there is no usable image. */
  markClassName?: string;
}

/**
 * The shop's logo, as configured in the admin panel.
 *
 * If no logo is set — or the one that is set fails to load — this falls back
 * to the lettered mark rather than leaving a broken-image icon in the header
 * of every page. (The repository's bundled `assets/galo-logo.png` is not a
 * valid image, so it is deliberately not used as a fallback.)
 */
export const StoreLogo: React.FC<StoreLogoProps> = ({
  className = 'w-[42px] h-[42px]',
  markClassName = '',
}) => {
  const { storeSettings } = useStore();
  const { language } = useLanguage();

  const src: string | undefined = storeSettings?.store_logo || undefined;
  const name =
    storeSettings?.store_name ||
    (language === 'ku' ? 'گەلۆ کیدز' : language === 'ar' ? 'غالو كيدز' : 'Galo Kids');

  const [failed, setFailed] = useState(false);
  // A new logo saved in settings deserves another attempt.
  useEffect(() => { setFailed(false); }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className={`${className} rounded-2xl object-contain bg-white shrink-0`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${className} ${markClassName} rounded-2xl grid place-items-center shrink-0
        bg-gradient-to-br from-candy-500 to-sunny-500 text-[#52182C] font-black text-[19px]`}
    >
      {(name.trim()[0] || 'G').toUpperCase()}
    </span>
  );
};
