import * as Print from 'expo-print';

/**
 * Handing a label sheet to a printer, on a phone or a tablet.
 *
 * The system print service does the work: AirPrint on iOS, Android's print
 * framework. Both take HTML, so a shop with a networked label printer or any
 * ordinary printer can print from the till today, with no pairing step and no
 * driver.
 *
 * What this does NOT reach is a Bluetooth thermal printer, the little battery
 * ones. Those speak ESC/POS over a serial link rather than accepting a page to
 * render, which needs a native module and therefore a development build. The
 * screen says so plainly rather than letting a shopkeeper tap Print and wonder
 * why nothing happened.
 */
export async function printLabelSheet(html: string): Promise<void> {
  await Print.printAsync({ html });
}

/** Keep a copy, or send it somewhere. Returns the file's uri. */
export async function labelSheetToPdf(html: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html });

  return uri;
}

export const canPrintToPdf = true;
