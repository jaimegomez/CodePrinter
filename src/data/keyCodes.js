const keyCodes = {
  3: 'Enter',
  8: 'Backspace',
  9: 'Tab',
  12: 'NumLock',
  13: 'Enter',
  16: 'Shift',
  17: 'Ctrl',
  18: 'Alt',
  19: 'Pause',
  20: 'CapsLock',
  27: 'Esc',
  32: 'Space',
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',
  44: 'PrintScrn',
  45: 'Insert',
  46: 'Delete',
  59: ';',
  61: '=',
  91: 'Cmd',
  92: 'Cmd',
  93: 'Cmd',
  106: 'Multiply',
  107: 'Add',
  109: 'Subtract',
  110: 'Point',
  111: 'Divide',
  127: 'Delete',
  144: 'NumLock',
  145: 'ScrollLock',
  186: ';',
  187: '=',
  188: ',',
  189: '-',
  190: '.',
  191: '/',
  192: '`',
  219: '[',
  220: '\\',
  221: ']',
  222: '\'',
  224: 'Cmd',
  229: '/',
  63232: 'Up',
  63233: 'Down',
  63234: 'Left',
  63235: 'Right',
  63272: 'Delete',
  63273: 'Home',
  63275: 'End',
  63276: 'PageUp',
  63277: 'PageDown',
  63302: 'Insert',
}

// Numeric keys: 0-9, Num0-Num9
for (let i = 0; i < 10; i++) {
  keyCodes[i+96] = 'Num'+i;
  keyCodes[i+48] = String(i);
}

// Alphabetic keys: A-Z
for (let i = 65; i < 91; i++) {
  keyCodes[i] = String.fromCharCode(i);
}

// Function keys: F1-F19
for (let i = 1; i < 20; i++) {
  keyCodes[i+111] = keyCodes[i+63235] = 'F'+i;
}

export default keyCodes;
