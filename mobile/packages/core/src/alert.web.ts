/**
 * `Alert`, in a browser.
 *
 * React Native Web ships `Alert.alert` as an empty function. Nothing is shown
 * and no button's handler ever runs — so in the web build every error message
 * vanished, every "saved" went unsaid, and every delete that asked "are you
 * sure?" first simply did nothing, with no sign anything had been pressed.
 *
 * This gives the same call the browser's own dialogs. They are plain, but they
 * are modal, they cannot be missed, and a shopkeeper has seen one before.
 *
 * - No buttons, or one: a notice. Its handler runs once it is dismissed.
 * - Two or more: a question. OK runs the action — the last button that is not
 *   a cancel, which is where every caller here puts it — and Cancel runs the
 *   cancel button's handler, if it has one.
 */

interface AlertButton {
  text?: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
}

function alert(title: string, message?: string, buttons?: AlertButton[]): void {
  const text = [title, message].filter(Boolean).join('\n\n');

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancel = buttons.find(button => button.style === 'cancel');
  const action = [...buttons].reverse().find(button => button.style !== 'cancel');

  if (window.confirm(text)) action?.onPress?.();
  else cancel?.onPress?.();
}

export const Alert = { alert };
