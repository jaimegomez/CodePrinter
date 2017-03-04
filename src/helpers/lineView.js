import Flags from 'Flags';
import { ZWS, STYLE_PREFIX } from 'consts';
import { webkit, macosx } from 'helpers/env';

function cpx(token) {
  return STYLE_PREFIX + token.join(' ' + STYLE_PREFIX);
}

function cspan(style, content) {
  const node = document.createElement('span');
  if (style) node.className = style;
  node.appendChild(document.createTextNode(content));
  return node;
}

function maybeSpanUpdate(node, child, className, content) {
  if (child) {
    updateSpan(child, className, content);
    return child.nextSibling;
  }
  node.appendChild(cspan(className, content));
}

function rm(parent, child) {
  const next = child.nextSibling;
  if (Flags.wheelTarget === child) child.style.display = 'none';
  else parent.removeChild(child);
  return next;
}

function updateInnerLine(node, text, tokens) {
  const length = tokens ? tokens.length : 0;
  let i = -1, j = 0, child = node.firstChild;

  while (++i < length) {
    const { from, to, token } = tokens[i];
    if (j < from) {
      child = maybeSpanUpdate(node, child, '', text.substring(j, from));
      j = from;
    }
    child = maybeSpanUpdate(node, child, cpx(token), text.substring(from, to));
    j = to;
  }
  if (j < text.length) {
    child = maybeSpanUpdate(node, child, '', text.substr(j));
  }
  return child;
}

function updateSpan(span, className, content) {
  if (webkit && macosx) span.style.cssText = '';
  span.className = className;
  span.firstChild.nodeValue = content;
}

export function updateLineView(lineView, text, tokens) {
  const pre = lineView.pre;
  if (text.length === 0) {
    let child = maybeSpanUpdate(pre, pre.firstChild, '', ZWS);
    while (child) child = rm(pre, child);
  } else {
    let child = updateInnerLine(pre, text, tokens);
    while (child) child = rm(pre, child);
  }
  lineView.change = false;
}
