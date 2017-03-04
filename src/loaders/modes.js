import Mode from 'Mode';
import aliases from 'data/aliases';
import { defineModule, requireModule } from 'helpers/loader';

const modes = new Map();
// Map { [modeName] => Mode }

modes.set('plaintext', new Mode);

export function requireMode(modeName) {
  const name = (aliases[modeName] || modeName || 'plaintext').toLowerCase();
  return requireModule(name, modes, `mode/${name}.js`);
}

export function defineMode(...args) {
  return defineModule(modes, CodePrinter.requireMode, Mode.resolve, args);
}

export function getMode(name) {
  const mode = modes.get(name);
  return mode instanceof Mode ? mode : null;
}

export function hasMode(name) {
  return modes.get(name) instanceof Mode;
}
