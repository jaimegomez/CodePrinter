export const lines = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod',
  'tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,',
  'quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu',
  'fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa',
  'qui officia deserunt mollit anim id est laborum.'
];

export const codeprinter = new CodePrinter({ shortcuts: false, height: 1000 });
export const doc = codeprinter.doc;

export function checkSymbols(positions, symbols) {
  for (let i = 0; i < positions.length; i++) {
    expect(codeprinter.doc.hasSymbolAt(symbols, positions[i])).toBe(true);
  }
}

export function generatePosition() {
  const line = Math.floor(Math.random() * (lines.length - 1));
  const column = Math.floor(Math.random() * (lines[line].length - 1));
  return { line, column };
}

export function reset() {
  codeprinter.setDocument(doc);
  codeprinter.useSource(lines.join('\n'));
}
