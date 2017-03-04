import { macosx } from 'helpers/env';

const keyMaps = {};

keyMaps.basic = {
  'Backspace': 'delCharLeft',
  'Delete': 'delCharRight',
  'Alt+Backspace': 'delWordLeft',
  'Alt+Delete': 'delWordRight',
  'Shift+Backspace': 'delToLeft',
  'Shift+Delete': 'delToRight',
  'Shift+Alt+Backspace': 'delLine',
  'Shift+Alt+Delete': 'delLine',
  'Tab': 'insertTab',
  'Enter': 'insertNewLine',
  'Esc': 'esc',
  'PageUp': 'pageUp',
  'PageDown': 'pageDown',
  'End': 'moveToEnd',
  'Home': 'moveToStart',
  'Left': 'moveCaretLeft',
  'Right': 'moveCaretRight',
  'Up': 'moveCaretUp',
  'Down': 'moveCaretDown',
  'Shift+Left': 'moveSelLeft',
  'Shift+Right': 'moveSelRight',
  'Shift+Up': 'moveSelUp',
  'Shift+Down': 'moveSelDown',
  'Shift+Ctrl+W': 'selectWord',
};

keyMaps.pc = {
  'Ctrl+A': 'selectAll',
  'Ctrl+Z': 'undo',
  'Ctrl+Left': 'moveToLineStart',
  'Ctrl+Right': 'moveToLineEnd',
  'Shift+Ctrl+Z': 'redo',
  fallthrough: 'basic',
};

keyMaps.mac = {
  'Cmd+A': 'selectAll',
  'Cmd+Z': 'undo',
  'Cmd+Left': 'moveToLineStart',
  'Cmd+Right': 'moveToLineEnd',
  'Shift+Cmd+Z': 'redo',
  fallthrough: 'basic',
};

keyMaps.default = macosx ? keyMaps.mac : keyMaps.pc;

export default keyMaps;
