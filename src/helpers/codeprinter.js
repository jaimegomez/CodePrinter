export function updateTabString(cp, tabWidth, invisibleCharacters) {
  const spaceChar = invisibleCharacters ? '·' : ' ';
  cp.tabString = spaceChar.repeat(tabWidth);
}
