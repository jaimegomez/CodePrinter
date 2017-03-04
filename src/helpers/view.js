import { lineNumberFor } from 'helpers/index';

export function getLineClasses(line) {
  const classes = line.classes ? ' '+line.classes.join(' ') : '';
  return 'cp-line-view' + classes;
}

export function insertLineViewNode(view, lineView, at) {
  if (!view.display) return;
  setCounter(view.doc, lineView, view.from + at, true);
  if (at < view.length) {
    view.display.insertBefore(lineView.node, view.display.children[at]);
  } else {
    view.display.appendChild(lineView.node);
  }
}

export function removeLineViewNode(view, lineView) {
  if (!view.display) return;
  view.display.removeChild(lineView.node);
}

export function setCounter(doc, lineView, index, setWidth) {
  const text = lineNumberFor(doc.editor, index);
  if (lineView.counterText !== text) {
    lineView.counter.firstChild.nodeValue = lineView.counterText = text;
  }
  if (setWidth) {
    const left = doc.getOption('fixedLineNumbers') ? doc.scrollLeft : 0;
    lineView.counter.parentNode.style.left = -doc.sizes.countersWidth + left + 'px';
    lineView.counter.style.width = doc.sizes.countersWidth + 'px';
  }
}

export function touch(line) {
  if (line.view) {
    line.view.node.className = getLineClasses(line);
  }
}
