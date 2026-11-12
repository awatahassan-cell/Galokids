/**
 * Printing a label sheet from a browser.
 *
 * Not `expo-print`. Its web implementation ignores the HTML it is given and
 * calls `window.print()`, which prints the page on screen — so a cashier would
 * get a paper copy of the back office instead of their stickers.
 *
 * An offscreen iframe instead: the sheet is its own document, so its `@page`
 * size takes effect and the till's own styles cannot leak into it. An iframe
 * rather than `window.open` because a pop-up blocker silently stops a new
 * window, and a Print button that does nothing is worse than no button.
 */
export async function printLabelSheet(html: string): Promise<void> {
  const frame = document.createElement('iframe');

  // Offscreen rather than display:none — a hidden frame is not laid out, and
  // some browsers will not print one.
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = '420px';
  frame.style.height = '600px';
  frame.style.border = '0';

  document.body.appendChild(frame);

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;

      try {
        const view = frame.contentWindow;
        if (!view) throw new Error('بەشی چاپکردن نەکرایەوە.');

        view.focus();
        view.print();
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        // Left in place for a moment: Safari returns from print() before it
        // has finished reading the document, and removing the frame too early
        // prints a blank page.
        window.setTimeout(() => frame.remove(), 1000);
      }
    };

    frame.addEventListener('load', finish);

    // srcdoc so nothing is fetched and no blob url has to be cleaned up.
    frame.srcdoc = html;

    // If `load` never fires — it does not in every browser for srcdoc — go
    // ahead anyway rather than leaving the button dead.
    window.setTimeout(finish, 600);
  });
}

/** Browsers offer "Save as PDF" in the print dialog itself, so there is nothing to add. */
export const canPrintToPdf = false;

export async function labelSheetToPdf(): Promise<string> {
  throw new Error('لە وێبگەڕدا لە دیالۆگی چاپکردنەوە «Save as PDF» هەڵبژێرە.');
}
