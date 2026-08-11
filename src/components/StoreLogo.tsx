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
 * Order of preference: the logo uploaded in the admin panel, then the shop's
 * bundled mark, then a lettered tile. The last of those only appears if both
 * images fail to load, so a broken-image icon never ends up in the header of
 * every page.
 */
export const StoreLogo: React.FC<StoreLogoProps> = ({
  className = 'w-[42px] h-[42px]',
  markClassName = '',
}) => {
  const { storeSettings } = useStore();
  const { language } = useLanguage();

  /** The bundled mark, used when nothing has been uploaded. */
  const BUNDLED = '/assets/galo-logo.png';

  const src: string = storeSettings?.store_logo || BUNDLED;
  const name =
    storeSettings?.store_name ||
    (language === 'ku' ? 'گەلۆ کیدز' : language === 'ar' ? 'غالو كيدز' : 'Galo Kids');

  const [failed, setFailed] = useState(false);
  // A new logo saved in settings deserves another attempt.
  useEffect(() => { setFailed(false); }, [src]);

  if (!failed) {
    return (
      <img
        src={src}
        alt={name}
        onError={(e) => {
          // An uploaded logo that will not load falls back to the bundled one
          // before giving up on images entirely.
          const img = e.currentTarget;
          if (img.getAttribute('src') !== BUNDLED) img.setAttribute('src', BUNDLED);
          else setFailed(true);
        }}
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
