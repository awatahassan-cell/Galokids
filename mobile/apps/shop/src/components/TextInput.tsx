import { forwardRef } from 'react';
import { TextInput as NativeTextInput, type TextInputProps } from 'react-native';

/**
 * A text box for a right-to-left app.
 *
 * Left alone, a browser works out the direction of each box from what is typed
 * in it — so a phone number, a price or an English product name is laid out
 * left to right and sits against the left edge of a box in a right-to-left
 * form, while the Kurdish beside it sits on the right. Fixing the direction
 * puts every field's text, caret and placeholder on the same side.
 */
// Numbers, phone numbers and addresses are read left to right even in a
// right-to-left form. Laid out as RTL, "0750 123 4567" is shuffled into
// "4567 123 0750" — each group stays in order but the groups swap places.
const LATIN_KEYBOARDS = new Set(['phone-pad', 'number-pad', 'numeric', 'decimal-pad', 'email-address', 'url', 'numbers-and-punctuation']);

export const TextInput = forwardRef<NativeTextInput, TextInputProps>((props, ref) => {
  const latin = LATIN_KEYBOARDS.has(String(props.keyboardType));

  return (
    <NativeTextInput
      ref={ref}
      textAlign="right"
      // `dir` is accepted by the web build and ignored on the phone, where the
      // app is already laid out right to left.
      {...({ dir: latin ? 'ltr' : 'rtl' } as object)}
      {...props}
      // A left-to-right box would otherwise start at its left edge; `end` puts
      // the digits against the right edge like every other field in the form.
      style={latin ? [props.style, { textAlign: 'end' as never }] : props.style}
    />
  );
});

TextInput.displayName = 'TextInput';
