import React from 'react';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { SHIPPING } from '../../src/i18n/pages';
import { InfoPage } from '../../src/components/InfoPage';

export default function ShippingScreen() {
  const { language } = useLanguage();
  return <InfoPage page={SHIPPING[language]} />;
}
