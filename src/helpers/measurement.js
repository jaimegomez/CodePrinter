import { ZWS } from 'consts';
import { createNode } from 'helpers/index';

class Measure {
  constructor(line, sizes) {
    this.line = line;
    this.lineIndex = line.getIndex();
    this.column = this.offsetX = this.offsetY = this.width = this.charWidth = 0;
    this.height = this.charHeight = sizes.font.height;
  }

  get position() {
    return { line: this.lineIndex, column: this.column };
  }

  adjustForRect(rect) {
    if (!this.offsetX) this.offsetX = rect.left + rect.width;
    this.offsetY = rect.top;
    this.charWidth = rect.width / rect.length;
    this.charHeight = rect.height;
    this.height = rect.height;
    return this;
  }
}

function calcCharWidth(view) {
  const span = createNode(null, 'span');
  span.appendChild(document.createTextNode('A'));
  view.pre.appendChild(span);
  const width = span.offsetWidth;
  view.pre.removeChild(span);
  return width;
}

function externalMeasure(doc, line) {
  const oldView = line.view;
  const view = line.view = doc.measure;
  view.node.style.top = doc.sizes.paddingTop + line.getOffset() + 'px';
  doc.process(line);
  line.view = oldView;
  return view;
}

function getOffsetRect(doc, mainRect, node) {
  const rect = node.getBoundingClientRect();
  return {
    length: node.firstChild.nodeValue.length,
    width: rect.width,
    height: rect.height,
    left: doc.scrollLeft + rect.left - mainRect.left - doc.sizes.countersWidth,
    top: doc.scrollTop + rect.top - mainRect.top
  };
}

function isChildNodesEmpty(childNodes) {
  return childNodes.length === 1 && childNodes[0].firstChild.nodeValue === ZWS;
}

function maybeExternalMeasure(doc, line) {
  return line.view || externalMeasure(doc, line);
}

function measureWrapper(doc, line, func) {
  const childNodes = maybeExternalMeasure(doc, line).pre.childNodes;
  const mainRect = doc.dom.body.getBoundingClientRect();
  const measure = new Measure(line, doc.sizes);

  if (isChildNodesEmpty(childNodes)) {
    const rect = getOffsetRect(doc, mainRect, childNodes[0]);
    return { measure, rect };
  }
  return func(measure, childNodes, mainRect);
}

export function measurePosition(doc, x, y) {
  const line = doc.lineWithOffset(y);
  const { measure, rect } = measureWrapper(doc, line, (measure, childNodes, mainRect) => {
    let rect = null;
    for (const child of childNodes) {
      const length = child.firstChild.nodeValue.length;
      if (length === 0) continue;

      rect = getOffsetRect(doc, mainRect, child);

      if (x <= rect.left + rect.width) {
        const tmp = Math.round(Math.max(0, x - rect.left) * length / rect.width);
        measure.column += tmp;
        measure.offsetX = rect.left + tmp * rect.width / length;
        break;
      }
      measure.column += length;
    }
    return { measure, rect };
  });
  return rect ? measure.adjustForRect(rect) : measure;
}

export function measureRect(doc, line, offset, to) {
  const { measure, rect, found } = measureWrapper(doc, line, (measure, childNodes, mainRect) => {
    const childNodesLength = childNodes.length;
    let found = false;
    let tmp = 0;
    let i = -1;
    let rect;
    let child;

    while (++i < childNodesLength) {
      child = childNodes[i];

      const length = child.firstChild.nodeValue.length;
      if (length === 0) continue;

      rect = getOffsetRect(doc, mainRect, child);

      if (found) {
        if (to <= tmp + length) {
          measure.width = rect.left - measure.offsetX + (to - tmp) * rect.width / length;
          break;
        }
      } else if (offset < tmp + length) {
        measure.offsetX = rect.left + (offset - tmp) * rect.width / length;
        measure.offsetY = rect.top;
        measure.charWidth = rect.width / length;
        found = true;

        if (to < offset || typeof to !== 'number') break;
        if (to <= tmp + length) {
          measure.width = (to - offset) * rect.width / length;
          break;
        }
      }
      tmp += length;
    }
    return { measure, rect, found, child };
  });

  measure.column = offset;

  if (rect) {
    if (!found) {
      measure.charWidth = rect.width / length;
      measure.offsetX = rect.left + rect.width;
      measure.offsetY = rect.top;
    }
    measure.height = rect.top - measure.offsetY + rect.height;
    measure.charHeight = rect.height;
  }
  if (!measure.charWidth) {
    measure.charWidth = calcCharWidth(line.view || doc.measure);
  }
  return measure;
}
