import { addClass, removeClass } from 'helpers/index';
import { updateTabString } from 'helpers/codeprinter';
import { maybeUpdateCountersWidth, updateCountersWidth } from 'helpers/document';

export function drawIndentGuides(dig) {
  (dig ? removeClass : addClass)(this.dom.mainNode, 'cp--no-indent-guides');
  return !!dig;
}

export function fontFamily(family) {
  this.dom.editor.style.fontFamily = family;
}

export function fontSize(size, oldSize) {
  if (size !== Math.max(this.getOption('minFontSize'), Math.min(size, this.getOption('maxFontSize')))) return oldSize;
  this.dom.editor.style.fontSize = size + 'px';
  var doc = this.doc;
  if (doc) {
    updateFontSizes(this, doc, extend(getFontOptions(this), { fontSize: size }));
    doc.fill();
    doc.updateView(true).call('showSelection');
    updateScroll(doc);
    doc.call('refresh');
  }
  this.emit('fontSizeChanged', size);
}

export function height(size) {
  if (size === 'auto') {
    this.dom.body.style.removeProperty('height');
    addClass(this.dom.mainNode, 'cp--auto-height');
  } else {
    this.dom.body.style.height = size + 'px';
    removeClass(this.dom.mainNode, 'cp--auto-height');
  }
}

export function invisibleCharacters(show) {
  // const tabWidth = this.getOption('tabWidth');
  // updateTabString(this, tabWidth, show);
}

export function legacyScrollbars(ls) {
  (ls ? addClass : removeClass)(this.dom.scroll, 'cp--legacy-scrollbars');
  return !!ls;
}

export function lineEndings(le, old) {
  le = le.toUpperCase();
  return lineendings[le] || old || '\n';
}

export function lineNumbers(ln) {
  (ln ? removeClass : addClass)(this.dom.counter, 'cp-hidden');
  ln ? this.dom.mainNode.parentNode && maybeUpdateCountersWidth(this.doc, true) : updateCountersWidth(this.doc, 0);
  return !!ln;
}

export function mode(mode) {
  this.doc && this.doc.setMode(mode);
}

export function tabIndex(ti) {
  this.dom.input.tabIndex = ti = Math.max(-1, ~~ti);
  return ti;
}

export function tabWidth(tw) {
  tw = Math.max(0, ~~tw);
  this.tabString = repeat(' ', tw);
  runBackgroundParser(this.doc);
  return tw;
}

export function theme(name, dontrequire) {
  typeof name === 'string' && name !== 'default' ? dontrequire != true && CodePrinter.requireStyle(name) : name = 'default';
  if (!this.getOption('disableThemeClassName')) {
    removeClass(this.dom.mainNode, 'cps-'+this.getOption('theme').replace(' ', '-').toLowerCase());
    addClass(this.dom.mainNode, 'cps-'+name.replace(' ', '-').toLowerCase());
  }
}

export function width(size) {
  if (size === 'auto') this.dom.mainNode.style.removeProperty('width');
  else this.dom.mainNode.style.width = size + 'px';
}
