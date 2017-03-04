import Flags from 'Flags';
import { copy } from 'helpers/index';

export * from 'loaders/modes';
export * from 'loaders/addons';

export function getFlag(flag) {
  return Flags[flag];
}

export function range(from, to) {
  return { from: copy(from), to: copy(to) };
}

export function onewayRange(a, b) {
  return a ? comparePos(a, b) < 0 ? range(a, b) : range(b, a) : range(b, b);
}

export function pos(line, column) {
  return { line: line, column: column };
}

export function comparePos(a, b) {
  return a.line - b.line || a.column - b.column;
}

export function normalizePos(doc, position) {
  if (!isPos(position)) {
    return null;
  }
  if (position.line < 0) {
    return pos(0, 0);
  }
  const size = doc.size();

  if (position.line >= size) {
    return pos(size - 1, doc.get(size - 1).text.length);
  }
  if (position.column < 0) {
    const lineLength = doc.get(position.line).text.length;
    return pos(position.line, lineLength + position.column % lineLength + 1);
  }
  return position;
}

export function isPos(pos) {
  return pos && typeof pos.line === 'number' && typeof pos.column === 'number';
}

export function keySet(arr) {
  const obj = Object.create(null);
  for (let i = 0; i < arr.length; i++) {
    obj[arr[i]] = true;
  }
  return obj;
}
