import React from 'react';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { FAQ } from '../../src/i18n/pages';
import { InfoPage } from '../../src/components/InfoPage';

export default function FaqScreen() {
  const { language } = useLanguage();
  return <InfoPage page={FAQ[language]} />;
}
