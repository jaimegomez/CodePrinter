import elements from 'data/elements';
import { SCHEDULE_MESSAGE_NAME } from 'consts';

export function addClass(node, ...args) {
  node.classList.add(...args);
  return node;
}

export function arrayAdd(arr, toAdd) {
  const array = arrayEnsure(toAdd);
  for (const item of array) {
    if (arr.indexOf(item) === -1) {
      arr.push(item);
    }
  }
  return arr;
}

export function arrayEnsure(item) {
  return isArray(item) ? item : [item];
}

export function arrayRemove(arr, toRemove) {
  const array = arrayEnsure(toRemove);
  for (const item of array) {
    const index = arr.indexOf(item);
    if (index >= 0) {
      arr.splice(index, 1);
    }
  }
  return arr;
}

export function camelize(str) {
  return str.replace(/\W+(\w)/g, (match, group) => {
    return group.toUpperCase();
  });
}

export function classArray(base, classes) {
  const arr = [base];
  if (typeof classes === 'string') {
    return arr.concat(classes.split(/\s+/g));
  }
  if (isArray(classes)) {
    return arr.concat(classes);
  }
  return arr;
}

export function clearLine(line) {
  line.tokens = line.state = null;
  if (line.view) line.view.change = true;
}

export function computeCodeReserve(doc) {
  const { code, scroll } = doc.dom;
  return code.offsetHeight - scroll.offsetHeight - 2 * doc.sizes.paddingTop;
}

export function copy(obj) {
  const result = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    result[key] = typeof obj[key] === 'object' ? copy(obj[key]) : obj[key];
  }
  return result;
}

export function createNode(parent, tag, className) {
  const d = document.createElement(tag);
  className && (d.className = Array.isArray(className) ? className.join(' ') : className);
  parent && parent.appendChild(d);
  return d;
}

export function defaultFormatter(i) {
  return i;
}

export function each(arr, func, owner, start) {
  for (let i = start | 0; i < arr.length; i++) {
    if (func.call(owner, arr[i], i, owner) === false) {
      break;
    }
  }
}

export function eachRight(arr, func, owner, start = 0) {
  for (let i = arr.length - 1; i >= start; i--) {
    if (func.call(owner, arr[i], i, owner) === false) {
      break;
    }
  }
}

export function eventCancel(e, propagate) {
  e.preventDefault();
  propagate || e.stopPropagation();
  return e.returnValue = false;
}

export function getFontDims(cp, font) {
  const options = font || getFontOptions(cp);
  const pre = createNode(null, 'pre');
  pre.style.cssText = 'position:fixed;font:normal normal '+options.fontSize+'px/'+options.lineHeight+' '+options.fontFamily+';';
  pre.appendChild(document.createTextNode('CP'));
  document.body.appendChild(pre);
  const rect = pre.getBoundingClientRect();
  document.body.removeChild(pre);
  return { width: rect.width / 2, height: rect.height };
}

export function getFontOptions(cp) {
  return cp.getOptions(['fontFamily', 'fontSize', 'lineHeight']);
}

export function isArray(arr) {
  return arr instanceof Array;
}

export function last(arr) {
  return arr[arr.length - 1];
}

export function lineNumberFor(cp, index) {
  const formatter = cp.getOption('lineNumberFormatter') || defaultFormatter;
  return String(formatter(cp.getOption('firstLineNumber') + index));
}

export function load(path) {
  const isCSS = /\.css/.test(path);
  const src = CodePrinter.src.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  const [tag, attr, type] = isCSS ? ['link', 'href', 'text/css'] : ['script', 'src', 'text/javascript'];
  const selector = `${tag}[${attr}="${src}"]`;

  if (!document.querySelector(selector)) {
    const node = document.createElement(tag);
    if (isCSS) {
      node.rel = 'stylesheet';
    } else {
      node.async = true;
    }
    node.type = type;
    node[attr] = src;
    document.head.appendChild(node);
    return node;
  }
}

export function off(node, eventName, listener) {
  node.removeEventListener(eventName, listener);
}

export function on(node, eventName, listener, options = { capture: false, passive: false }) {
  node.addEventListener(eventName, listener, options);
}

export function passive(node, eventName, listener, capture = false) {
  on(node, eventName, listener, { passive: true, capture });
}

export function patchLineHeight(doc, dl, height) {
  var diff = height - dl.height;
  if (diff) {
    if (doc.view.length > 0 && dl === doc.view[0].line && doc.view.from !== 0) scrollBy(doc, -diff);
    for (; dl; dl = dl.parent) dl.height += diff;
  }
}

export function removeClass(node, ...args) {
  node.classList.remove(...args);
  return node;
}

export function resolve(value, thisArg, ...args) {
  if (typeof value === 'function') {
    return value.apply(thisArg, args);
  }
  return value;
}

export function updateFontSizes(cp, doc, fontOptions) {
  var oldHeight = doc.sizes.font.height, font = doc.sizes.font = getFontDims(cp, fontOptions);
  doc.each(function(line) {
    line.height === oldHeight ? patchLineHeight(doc, line, font.height) : updateLineHeight(doc, line);
  });
}

export function updateLineHeight(doc, dl) {
  if (dl) {
    var height, node = maybeExternalMeasure(doc, dl).pre;
    if (height = node.getBoundingClientRect().height) {
      patchLineHeight(doc, dl, height);
    }
  }
}

const tasks = [];
export function schedule(callback) {
  return new Promise((resolve, reject) => {
    if (typeof callback !== 'function') {
      return reject('Schedule callback is not a function!');
    }
    tasks.push(() => Promise.resolve(callback()).then(resolve));
    window.postMessage(SCHEDULE_MESSAGE_NAME, '*');
  });
}

export function setNodeStyle(node, style, value) {
  const str = styleString(value);
  if (node.style[style] !== str) {
    node.style[style] = str;
  }
}

export function setNodeStyles(node, styles) {
  const keys = Object.keys(styles);
  for (const key of keys) {
    setNodeStyle(node, key, styles[key]);
  }
}

export function styleString(value) {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  return value ? String(value) : '';
}

export function throttle() {
  let promise = null;
  let task = null;

  return action => {
    task = action;

    if (!promise) {
      promise = new Promise(requestAnimationFrame).then(() => {
        promise = null;
        return typeof task === 'function' ? task() : null;
      });
    }
    return promise;
  };
}

export function truthy(value) {
  return !!value;
}

export function valueOf(source) {
  if (source && source.nodeType) {
    return source.value || source.textContent || '';
  }
  return 'string' === typeof source ? source : '';
}

passive(window, 'message', event => {
  if (event.source == window && event.data == SCHEDULE_MESSAGE_NAME) {
    event.stopPropagation();
    if (tasks.length > 0) {
      tasks.shift()();
    }
  }
}, true);
