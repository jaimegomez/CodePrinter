import Flags from 'Flags';
import keyMaps from 'data/keyMaps';
import keyCodes from 'data/keyCodes';
import { macosx } from 'helpers/env';
import { KEYNAME_SEPARATOR } from 'consts';
import { arrayEnsure } from 'helpers/index';

const MODIFIER_KEYS = [16, 17, 18, 91, 92, 93, 224];
const SHIFT = keyCodes[16];
const CTRL = keyCodes[17];
const ALT = keyCodes[18];
const CMD = keyCodes[91];

export function isModifierKeyEvent(event) {
  const { ctrlKey, metaKey, keyCode } = event;
  return ctrlKey || metaKey || MODIFIER_KEYS.indexOf(keyCode) >= 0;
}

export function keyName(event, noShift) {
  const key = keyCodes[event.keyCode];
  const stack = [];
  if (key == null || event.altGraphKey) return false;
  if (!noShift && event.shiftKey && key !== SHIFT) stack.push(SHIFT);
  if (event.metaKey && key !== CMD) stack.push(CMD);
  if (event.ctrlKey && key !== CTRL) stack.push(CTRL);
  if (event.altKey && key !== ALT) stack.push(ALT);
  stack.push(key);
  return stack.join(KEYNAME_SEPARATOR);
}

export function lookupKey(key, keyMapName) {
  const map = typeof keyMapName === 'string' ? keyMaps[keyMapName] : keyMapName;
  const result = typeof map === 'function' ? map(key) : map[key];

  if (result) {
    return result;
  }

  if (map.fallthrough) {
    const array = arrayEnsure(map.fallthrough);
    for (const item of array) {
      const lookup = lookupKey(key, item);
      if (lookup) {
        return lookup;
      }
    }
  }
}

export function normalizeKeyName(keyName) {
  const keys = keyName.split(/\+(?!$)/);
  const last = keys.pop();
  const stack = [];
  let alt, ctrl, shift, cmd;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (/^(cmd|meta)$/i.test(key)) cmd = true;
    else if (/^shift$/i.test(key)) shift = true;
    else if (/^(ctrl|control)$/i.test(key)) ctrl = true;
    else if (/^alt$/i.test(key)) alt = true;
  }
  if (shift) stack.push(SHIFT);
  if (cmd) stack.push(CMD);
  if (ctrl) stack.push(CTRL);
  if (alt) stack.push(ALT);
  stack.push(last);
  return stack.join(KEYNAME_SEPARATOR);
}

export function updateFlags(event, down) {
  const code = event.keyCode;
  Flags.keyCode = down ? code : 0;
  Flags.ctrlKey = code === 18 ? down : event.ctrlKey;
  Flags.shiftKey = code === 16 ? down : event.shiftKey;
  Flags.metaKey = [91, 92, 93, 224].indexOf(code) >= 0 ? down : event.metaKey;
  Flags.altKey = code === 19 ? down : event.altKey;
  Flags.cmdKey = macosx ? Flags.metaKey : Flags.ctrlKey;
  Flags.modifierKey = Flags.ctrlKey || Flags.shiftKey || Flags.metaKey || Flags.altKey;
  Flags.isKeyDown = Flags.modifierKey || Flags.keyCode > 0;
}
