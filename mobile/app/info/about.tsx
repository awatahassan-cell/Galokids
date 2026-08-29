import React from 'react';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { ABOUT } from '../../src/i18n/pages';
import { InfoPage } from '../../src/components/InfoPage';

export default function AboutScreen() {
  const { language } = useLanguage();
  return <InfoPage page={ABOUT[language]} />;
}
