var CodePrinter =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 51);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_data_elements__ = __webpack_require__(33);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_consts__ = __webpack_require__(2);
/* harmony export (immutable) */ __webpack_exports__["j"] = addClass;
/* harmony export (immutable) */ __webpack_exports__["x"] = arrayAdd;
/* harmony export (immutable) */ __webpack_exports__["D"] = arrayEnsure;
/* harmony export (immutable) */ __webpack_exports__["y"] = arrayRemove;
/* harmony export (immutable) */ __webpack_exports__["g"] = camelize;
/* harmony export (immutable) */ __webpack_exports__["i"] = classArray;
/* harmony export (immutable) */ __webpack_exports__["s"] = clearLine;
/* harmony export (immutable) */ __webpack_exports__["q"] = computeCodeReserve;
/* harmony export (immutable) */ __webpack_exports__["a"] = copy;
/* harmony export (immutable) */ __webpack_exports__["d"] = createNode;
/* harmony export (immutable) */ __webpack_exports__["o"] = defaultFormatter;
/* harmony export (immutable) */ __webpack_exports__["v"] = each;
/* harmony export (immutable) */ __webpack_exports__["p"] = eachRight;
/* harmony export (immutable) */ __webpack_exports__["B"] = eventCancel;
/* harmony export (immutable) */ __webpack_exports__["c"] = getFontDims;
/* unused harmony export getFontOptions */
/* harmony export (immutable) */ __webpack_exports__["h"] = isArray;
/* harmony export (immutable) */ __webpack_exports__["u"] = last;
/* harmony export (immutable) */ __webpack_exports__["t"] = lineNumberFor;
/* harmony export (immutable) */ __webpack_exports__["e"] = load;
/* harmony export (immutable) */ __webpack_exports__["C"] = off;
/* harmony export (immutable) */ __webpack_exports__["A"] = on;
/* harmony export (immutable) */ __webpack_exports__["z"] = passive;
/* unused harmony export patchLineHeight */
/* harmony export (immutable) */ __webpack_exports__["k"] = removeClass;
/* harmony export (immutable) */ __webpack_exports__["f"] = resolve;
/* harmony export (immutable) */ __webpack_exports__["n"] = updateFontSizes;
/* unused harmony export updateLineHeight */
/* harmony export (immutable) */ __webpack_exports__["r"] = schedule;
/* unused harmony export setNodeStyle */
/* harmony export (immutable) */ __webpack_exports__["m"] = setNodeStyles;
/* unused harmony export styleString */
/* harmony export (immutable) */ __webpack_exports__["l"] = throttle;
/* harmony export (immutable) */ __webpack_exports__["w"] = truthy;
/* harmony export (immutable) */ __webpack_exports__["b"] = valueOf;





function addClass(node, ...args) {
  node.classList.add(...args);
  return node;
}

function arrayAdd(arr, toAdd) {
  const array = arrayEnsure(toAdd);
  for (const item of array) {
    if (arr.indexOf(item) === -1) {
      arr.push(item);
    }
  }
  return arr;
}

function arrayEnsure(item) {
  return isArray(item) ? item : [item];
}

function arrayRemove(arr, toRemove) {
  const array = arrayEnsure(toRemove);
  for (const item of array) {
    const index = arr.indexOf(item);
    if (index >= 0) {
      arr.splice(index, 1);
    }
  }
  return arr;
}

function camelize(str) {
  return str.replace(/\W+(\w)/g, (match, group) => {
    return group.toUpperCase();
  });
}

function classArray(base, classes) {
  const arr = [base];
  if (typeof classes === 'string') {
    return arr.concat(classes.split(/\s+/g));
  }
  if (isArray(classes)) {
    return arr.concat(classes);
  }
  return arr;
}

function clearLine(dl) {
  dl.cache = dl.state = null;
  if (dl.view) dl.view.change = true;
}

function computeCodeReserve(doc) {
  const { code, scroll } = doc.dom;
  return code.offsetHeight - scroll.offsetHeight - 2 * doc.sizes.paddingTop;
}

function copy(obj) {
  const result = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    result[key] = typeof obj[key] === 'object' ? copy(obj[key]) : obj[key];
  }
  return result;
}

function createNode(parent, tag, className) {
  const d = document.createElement(tag);
  className && (d.className = Array.isArray(className) ? className.join(' ') : className);
  parent && parent.appendChild(d);
  return d;
}

function defaultFormatter(i) {
  return i;
}

function each(arr, func, owner, start) {
  for (let i = start | 0; i < arr.length; i++) {
    if (func.call(owner, arr[i], i) === false) {
      break;
    }
  }
}

function eachRight(arr, func, owner, start = 0) {
  for (let i = arr.length - 1; i >= start; i--) {
    if (func.call(owner, arr[i], i) === false) {
      break;
    }
  }
}

function eventCancel(e, propagate) {
  e.preventDefault();
  propagate || e.stopPropagation();
  return e.returnValue = false;
}

function getFontDims(cp, font) {
  const options = font || getFontOptions(cp);
  const pre = createNode(null, 'pre');
  pre.style.cssText = 'position:fixed;font:normal normal ' + options.fontSize + 'px/' + options.lineHeight + ' ' + options.fontFamily + ';';
  pre.appendChild(document.createTextNode('CP'));
  document.body.appendChild(pre);
  const rect = pre.getBoundingClientRect();
  document.body.removeChild(pre);
  return { width: rect.width / 2, height: rect.height };
}

function getFontOptions(cp) {
  return cp.getOptions(['fontFamily', 'fontSize', 'lineHeight']);
}

function isArray(arr) {
  return arr instanceof Array;
}

function last(arr) {
  return arr[arr.length - 1];
}

function lineNumberFor(cp, index) {
  const formatter = cp.getOption('lineNumberFormatter') || defaultFormatter;
  return String(formatter(cp.getOption('firstLineNumber') + index));
}

function load(path) {
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

function off(node, eventName, listener) {
  node.removeEventListener(eventName, listener);
}

function on(node, eventName, listener, options = { capture: false, passive: false }) {
  node.addEventListener(eventName, listener, options);
}

function passive(node, eventName, listener, capture = false) {
  on(node, eventName, listener, { passive: true, capture });
}

function patchLineHeight(doc, dl, height) {
  var diff = height - dl.height;
  if (diff) {
    if (doc.view.length > 0 && dl === doc.view[0].line && doc.view.from !== 0) scrollBy(doc, -diff);
    for (; dl; dl = dl.parent) dl.height += diff;
  }
}

function removeClass(node, ...args) {
  node.classList.remove(...args);
  return node;
}

function resolve(value, thisArg, ...args) {
  if (typeof value === 'function') {
    return value.apply(thisArg, args);
  }
  return value;
}

function updateFontSizes(cp, doc, fontOptions) {
  var oldHeight = doc.sizes.font.height,
      font = doc.sizes.font = getFontDims(cp, fontOptions);
  doc.each(function (line) {
    line.height === oldHeight ? patchLineHeight(doc, line, font.height) : updateLineHeight(doc, line);
  });
}

function updateLineHeight(doc, dl) {
  if (dl) {
    var height,
        node = maybeExternalMeasure(doc, dl).pre;
    if (height = node.getBoundingClientRect().height) {
      patchLineHeight(doc, dl, height);
    }
  }
}

const tasks = [];
function schedule(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Schedule callback is not a function!');
  }
  tasks.push(callback);
  window.postMessage(__WEBPACK_IMPORTED_MODULE_1_consts__["a" /* SCHEDULE_MESSAGE_NAME */], '*');
}

function setNodeStyle(node, style, value) {
  const str = styleString(value);
  if (node.style[style] !== str) {
    node.style[style] = str;
  }
}

function setNodeStyles(node, styles) {
  const keys = Object.keys(styles);
  for (const key of keys) {
    setNodeStyle(node, key, styles[key]);
  }
}

function styleString(value) {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  return value ? String(value) : '';
}

function throttle() {
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

function truthy(value) {
  return !!value;
}

function valueOf(source) {
  if (source && source.nodeType) {
    return source.value || source.textContent || '';
  }
  return 'string' === typeof source ? source : '';
}

passive(window, 'message', event => {
  if (event.source == window && event.data == __WEBPACK_IMPORTED_MODULE_1_consts__["a" /* SCHEDULE_MESSAGE_NAME */]) {
    event.stopPropagation();
    if (tasks.length > 0) {
      tasks.shift()();
    }
  }
}, true);

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Flags__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_index__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_loaders_modes__ = __webpack_require__(44);
/* harmony namespace reexport (by provided) */ __webpack_require__.d(__webpack_exports__, "requireMode", function() { return __WEBPACK_IMPORTED_MODULE_2_loaders_modes__["a"]; });
/* harmony namespace reexport (by provided) */ __webpack_require__.d(__webpack_exports__, "defineMode", function() { return __WEBPACK_IMPORTED_MODULE_2_loaders_modes__["b"]; });
/* harmony namespace reexport (by provided) */ __webpack_require__.d(__webpack_exports__, "getMode", function() { return __WEBPACK_IMPORTED_MODULE_2_loaders_modes__["c"]; });
/* harmony namespace reexport (by provided) */ __webpack_require__.d(__webpack_exports__, "hasMode", function() { return __WEBPACK_IMPORTED_MODULE_2_loaders_modes__["d"]; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_loaders_addons__ = __webpack_require__(43);
/* harmony namespace reexport (by provided) */ __webpack_require__.d(__webpack_exports__, "requireAddon", function() { return __WEBPACK_IMPORTED_MODULE_3_loaders_addons__["a"]; });
/* harmony namespace reexport (by provided) */ __webpack_require__.d(__webpack_exports__, "defineAddon", function() { return __WEBPACK_IMPORTED_MODULE_3_loaders_addons__["b"]; });
/* harmony export (immutable) */ __webpack_exports__["getFlag"] = getFlag;
/* harmony export (immutable) */ __webpack_exports__["range"] = range;
/* harmony export (immutable) */ __webpack_exports__["pos"] = pos;
/* harmony export (immutable) */ __webpack_exports__["comparePos"] = comparePos;
/* harmony export (immutable) */ __webpack_exports__["normalizePos"] = normalizePos;
/* harmony export (immutable) */ __webpack_exports__["isPos"] = isPos;








function getFlag(flag) {
  return __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */][flag];
}

function range(from, to) {
  return { from: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["a" /* copy */])(from), to: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["a" /* copy */])(to) };
}

function pos(line, column) {
  return { line: line, column: column };
}

function comparePos(a, b) {
  return a.line - b.line || a.column - b.column;
}

function normalizePos(doc, line, column) {
  var pos = Array.isArray(line) ? pos(line[0], line[1]) : column !== undefined ? pos(line, column) : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["a" /* copy */])(line),
      size = doc.size();
  if (!pos) return null;
  if (pos.line < 0) pos.line = pos.column = 0;else if (pos.line >= size) {
    pos.line = size - 1;
    pos.column = doc.get(size - 1).text.length;
  } else if (pos.column < 0) {
    var l = doc.get(pos.line).text.length;
    pos.column = l ? l + pos.column % l + 1 : 0;
  }
  return isPos(pos) ? pos : null;
}

function isPos(pos) {
  return pos && typeof pos.line === 'number' && typeof pos.column === 'number';
}

/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


// Branch sizes
const BRANCH_MAX_SIZE = 50;
/* harmony export (immutable) */ __webpack_exports__["d"] = BRANCH_MAX_SIZE;

const BRANCH_OPTIMAL_SIZE = 25;
/* harmony export (immutable) */ __webpack_exports__["e"] = BRANCH_OPTIMAL_SIZE;


// Zero width space
const ZWS = '\u200b';
/* harmony export (immutable) */ __webpack_exports__["c"] = ZWS;


// End of line
const EOL = /\r\n?|\n/;
/* harmony export (immutable) */ __webpack_exports__["b"] = EOL;


// Message used by scheduler
const SCHEDULE_MESSAGE_NAME = 'CodePrinter-schedule';
/* harmony export (immutable) */ __webpack_exports__["a"] = SCHEDULE_MESSAGE_NAME;


// Separator used in key names
const KEYNAME_SEPARATOR = '+';
/* harmony export (immutable) */ __webpack_exports__["f"] = KEYNAME_SEPARATOR;


/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


/* harmony default export */ __webpack_exports__["a"] = {
  isKeyDown: false,
  isMouseDown: false,
  mouseScrolling: false,
  shiftKey: false
};

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


class EventEmitter {
  static extend(obj) {
    obj._events = new Map();
    Object.getOwnPropertyNames(this.prototype).forEach(name => {
      Object.defineProperty(obj, name, {
        value: this.prototype[name]
      });
    });
  }

  constructor() {
    this._events = new Map();
  }

  emit(eventName, ...args) {
    const listeners = this.getListeners(eventName);
    for (let i = 0; i < listeners.length; i++) {
      listeners[i].apply(this, args);
    }
    if (this._owner) {
      this._owner.emit.apply(this._owner, [eventName, this].concat(args));
    }
    return this;
  }

  getListeners(eventName) {
    return this._events.get(eventName) || [];
  }

  on(eventName, listener) {
    const listeners = this.getListeners(eventName);
    if (typeof listener === 'function') {
      listeners.push(listener);
      if (listeners.length === 1) {
        this._events.set(eventName, listeners);
      }
    }
    return this;
  }

  once(eventName, listener) {
    const callback = (...args) => {
      this.off(eventName, callback);
      listener.apply(this, args);
    };
    return this.on(eventName, callback);
  }

  off(eventName, listener) {
    if (typeof eventName === 'string') {
      const listeners = this.getListeners(eventName);
      if (listener) {
        const i = listeners.indexOf(listener);
        if (i >= 0) {
          listeners.splice(i, 1);
        }
      }
      if (!listener || !listeners.length) {
        this._events.delete(eventName);
      }
    } else {
      this._events.clear();
    }
    return this;
  }

  propagateTo(owner) {
    this._owner = owner;
    return this;
  }
}

EventEmitter.extend(EventEmitter);

/* harmony default export */ __webpack_exports__["a"] = EventEmitter;

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


const { platform, userAgent } = navigator;

const macosx = /Mac/.test(platform);
/* harmony export (immutable) */ __webpack_exports__["b"] = macosx;

const webkit = /WebKit\//.test(userAgent);
/* harmony export (immutable) */ __webpack_exports__["a"] = webkit;

const gecko = /gecko\/\d/i.test(userAgent);
/* harmony export (immutable) */ __webpack_exports__["c"] = gecko;

const ie = /(MSIE \d|Trident\/)/.test(userAgent);
/* unused harmony export ie */

const presto = /Opera\//.test(userAgent);
/* unused harmony export presto */

const wheelUnit = webkit ? -1 / 3 : gecko ? 5 : ie ? -0.53 : presto ? -0.05 : -1;
/* unused harmony export wheelUnit */


/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Stream__ = __webpack_require__(30);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_consts__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_ParsingTask__ = __webpack_require__(29);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_helpers_index__ = __webpack_require__(0);







function executeTask(task, { end }) {
  const { stream, state, cache } = task;
  const l = end != null ? end : stream.length;
  task.mode.onEntry.call(task, stream, state);
  while (stream.pos < l) iteration(task, stream, state, cache);
  task.mode.onExit.call(task, stream, state);
  return task;
}

function getStateIterator(state) {
  const iterators = state && state.iterators;
  return iterators && iterators.iterator;
}

function getTaskIterator(task) {
  return getStateIterator(task.state) || task.mode.iterator;
}

function resolveIteratorResult(task, result) {
  const type = typeof result;
  if (type === 'string') {
    return result;
  } else if (type === 'function') {
    task.push(result);
  } else if (result === -1) {
    task.pop();
  } else if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_index__["h" /* isArray */])(result)) {
    return result.join(' ');
  } else if (result) {
    throw new Error(`Unrecognized output: ${result}`);
  }
}

function getNextSymbol(task, stream, state) {
  if (task.mode.skipSpaces && /\s/.test(stream.peek())) {
    stream.take(/^\s*/);
    return null;
  }
  const result = getTaskIterator(task).call(task, stream, state);
  const resolved = resolveIteratorResult(task, result);
  if (resolved) {
    return resolved;
  }
  if (result && resolved === undefined) {
    return getNextSymbol(task, stream, state);
  }
  return null;
}

function iteration(task, stream, state, cache) {
  stream.proceed();
  return task.indent ? readIteration(task, stream, state, cache) : readIndentation(task, task.options);
}

function readIndentation(task, { tabWidth, tabString }) {
  const { stream, cache } = task;
  let char;
  let spaces = 0;
  let level = 0;

  function eatTab() {
    spaces = 0;
    level++;
    stream.transform(tabString);
    cachePush(cache, stream.start, stream.pos, 'tab');
    stream.proceed();
  }

  while (char = stream.eatChar()) {
    if (char === ' ') {
      if (++spaces === tabWidth) {
        eatTab();
      }
    } else if (char === '\t') {
      eatTab();
    } else {
      stream.undo();
      break;
    }
  }
  task.indent = { level, spaces };
}

function readIteration(task, stream, state, cache) {
  for (let i = 0; i < 3; i++) {
    const symbol = getNextSymbol(task, stream, state);
    if (stream.pos > stream.start) {
      if (symbol) {
        stream.lastSymbol = symbol;
        stream.lastValue = stream.from(stream.start);
        cachePush(cache, stream.start, stream.pos, symbol);
      }
      return symbol;
    }
  }
  throw new Error('Too many inefficient iterations!');
}

function cachePush(cache, from, to, symbol) {
  const length = cache.length;
  const last = cache[length - 1];
  if (last && last.symbol === symbol && last.to === from) last.to = to;else cache[length] = { from: from, to: to, symbol: symbol };
}

const DEFAULT_OPTIONS = { tabWidth: 2, tabString: '  ' };
function parse(text, previousState, options = DEFAULT_OPTIONS) {
  const stream = new __WEBPACK_IMPORTED_MODULE_0_Stream__["a" /* default */](text);
  const task = new __WEBPACK_IMPORTED_MODULE_2_ParsingTask__["a" /* default */](stream, previousState, options);
  return executeTask(task, options);
}

function stateChanged(stateA, stateB) {
  if (stateA && stateB) {
    if (stateA.context !== stateB.context || stateA.mode !== stateB.mode) {
      return true;
    }
    const iteratorA = getStateIterator(stateA);
    const iteratorB = getStateIterator(stateB);
    return !iteratorA !== !iteratorB || iteratorA && iteratorA.toString() !== iteratorB.toString();
  }
  return false;
}

/* harmony default export */ __webpack_exports__["a"] = {
  getStateIterator,
  getTaskIterator,
  parse,
  stateChanged
};

/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Flags__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_Parser__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_consts__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_LineView__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_statics__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_helpers_index__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["k"] = changeEnd;
/* harmony export (immutable) */ __webpack_exports__["j"] = cacheHasFontStyle;
/* unused harmony export eachCaret */
/* harmony export (immutable) */ __webpack_exports__["a"] = handleCaretMoved;
/* harmony export (immutable) */ __webpack_exports__["b"] = handleCaretUpdated;
/* harmony export (immutable) */ __webpack_exports__["f"] = replaceRange;
/* harmony export (immutable) */ __webpack_exports__["l"] = removeRange;
/* unused harmony export insertText */
/* harmony export (immutable) */ __webpack_exports__["e"] = findLineAndState;
/* harmony export (immutable) */ __webpack_exports__["d"] = getParseDefaults;
/* harmony export (immutable) */ __webpack_exports__["i"] = maybeAppendLineViews;
/* harmony export (immutable) */ __webpack_exports__["g"] = realignHorizontally;
/* harmony export (immutable) */ __webpack_exports__["h"] = rewind;
/* harmony export (immutable) */ __webpack_exports__["c"] = scrollCodeTopMargin;
/* unused harmony export scrollDocument */


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };








function adjustPositions(doc, change) {
  eachCaret(doc, caret => {
    const anchor = adjustPosForChange(caret.anchor(), change, true);
    const head = adjustPosForChange(caret.head(true), change);
    caret.setSelection(anchor, head);
  });
  // if (doc.markers) {
  //   var markers = doc.markers.items;
  //   for (var i = markers.length - 1; i >= 0; i--) {
  //     var marker = markers[i];
  //     if (marker.options.weak) marker.clear();
  //     else marker.update(adjustPosForChange(marker.from, change, true), adjustPosForChange(marker.to, change, true));
  //   }
  // }
}

function adjustPosForChange(pos, change, anchor) {
  if (!pos) {
    return null;
  }
  const cmp = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(pos, change.from);
  if (anchor ? cmp <= 0 : cmp < 0) {
    return pos;
  }
  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(pos, change.to) <= 0) {
    return changeEnd(change);
  }
  const line = pos.line - change.to.line + change.from.line + change.text.length - 1;
  const column = pos.column + (pos.line === change.to.line ? changeEnd(change).column - change.to.column : 0);
  return { line, column };
}

function changeEnd(change) {
  if (change.end) return change.end;
  if (!change.text) return change.from;
  const line = change.from.line + change.text.length - 1;
  const column = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["u" /* last */])(change.text).length + (change.text.length === 1 ? change.from.column : 0);
  return { line, column };
}

function cacheHasFontStyle(cache) {
  for (let j = 0, cl = cache ? cache.length : 0; j < cl; j++) {
    if (cache[j].symbol.indexOf('font-') >= 0) {
      return true;
    }
  }
  return false;
}

function eachCaret(doc, func, start) {
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["v" /* each */])(doc.carets, func, doc, start);
}

function handleCaretMoved(caret, head, anchor) {
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["p" /* eachRight */])(this.carets, cc => {
    if (cc !== caret && (cc.inSelection(head) || cc.inSelection(anchor))) {
      mergeCarets(caret, cc);
      removeCaret(this, cc);
      return false;
    }
  });
}

function handleCaretUpdated(caret) {
  if (!__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].mouseScrolling && this.isFocused && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["u" /* last */])(this.carets) === caret && this.getOption('autoScroll')) {
    const { left, top } = findProperScrollsForCaret(this, caret);
    this.scrollTo(left, top);
  }
  // if (this.getOption('matching')) {
  //   var matches = getMatches(this, caret, caret.getParserState().parser.matching);
  //   if (matches) {
  //     for (var i = 0; i < matches.length; i++) {
  //       this.markText(matches[i].from, matches[i].to, {
  //         className: 'cp-highlight',
  //         weak: true
  //       });
  //     }
  //   }
  // }
}

function findProperScroll(current, point, size, containerSize) {
  if (point < current + size) {
    return point - (point < current ? containerSize / 2 : size);
  }
  if (point + 2 * size >= current + containerSize) {
    return point - (point >= current + containerSize ? containerSize / 2 : containerSize - 2 * size);
  }
  return current;
}

function findProperScrollsForCaret(doc, caret) {
  const scroll = doc.dom.scroll;
  const height = caret.line().height;
  return {
    left: findProperScroll(scroll.scrollLeft, caret.x, 0, scroll.offsetWidth - doc.sizes.countersWidth),
    top: findProperScroll(scroll.scrollTop, caret.y, height, scroll.offsetHeight)
  };
}

function replaceRange(doc, txt, posFrom, posTo) {
  const from = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["normalizePos"])(doc, posFrom);
  const to = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["normalizePos"])(doc, posTo) || from;

  const text = typeof txt === 'string' ? txt.split(__WEBPACK_IMPORTED_MODULE_2_consts__["b" /* EOL */]) : Array.isArray(txt) ? txt : [''];

  if (!from) {
    return;
  }
  const removed = [];
  const first = doc.get(from.line);
  const delta = to.line - from.line;
  const after = delta ? doc.get(to.line).text.substr(to.column) : first.text.substr(to.column);

  let dl = first;
  let i = 0;

  removed[0] = delta ? first.text.substr(from.column) : first.text.substring(from.column, to.column);
  first.setText(first.text.substring(0, from.column) + text[0]);

  while (++i < delta && i < text.length && (dl = dl.next())) {
    removed[i] = dl.text;
    dl.setText(text[i]);
  }

  if (i < delta || i === delta && i === text.length) {
    const removedLines = doc.remove(from.line + i, delta - i + 1);
    for (let j = 0; j < removedLines.length - 1; j++) {
      removed[removed.length] = removedLines[j].text;
    }
    removed[removed.length] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["u" /* last */])(removedLines).text.substring(0, to.column);
  } else if (i < text.length) {
    if (delta) {
      removed[removed.length] = (dl = dl.next()).text.substring(0, to.column);
      const inserted = doc.insert(from.line + i, text.slice(i, -1));
      dl.setText(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["u" /* last */])(text));
    } else {
      const inserted = doc.insert(from.line + i, text.slice(i));
      dl = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["u" /* last */])(inserted) || dl;
    }
  }
  dl.setText(dl.text + after);
  parseForward(doc, first);
  const change = { type: 'replace', text, removed, from, to };
  adjustPositions(doc, change);
  return change;
}

function removeRange(doc, from, to) {
  return replaceRange(doc, '', from, to);
}

function insertText(doc, text, at) {
  return replaceRange(doc, text, at, at);
}

function findLineAndState(mode, line) {
  let tmp = line.prev(),
      prev = line;
  while (tmp) {
    if (tmp.state) {
      return { line: tmp.next(), state: tmp.state };
    }
    [prev, tmp] = [tmp, tmp.prev()];
  }
  return { line: prev, state: mode.initialState() };
}

function getParseDefaults(doc, rest = {}) {
  return _extends({
    mode: doc.mode,
    tabString: doc.editor.tabString,
    tabWidth: doc.getOption('tabWidth')
  }, rest);
}

function maybeAppendLineViews(doc, bottom, margin) {
  const view = doc.view;
  let line = view.lastLine().next();

  while (line && bottom < margin) {
    const lineView = view.push(new __WEBPACK_IMPORTED_MODULE_3_LineView__["a" /* default */]());
    view.link(lineView, line);
    bottom += line.height;
    line = line.next(true);
  }
}

function mergeCarets(first, second) {
  const [h1, h2] = [first.head(), second.head()];
  const [a1, a2] = [first.anchor(), second.anchor()];
  const positions = [h1, h2, a1, a2].filter(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["w" /* truthy */]).sort(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"]);

  if (positions[0] === h1 || positions[0] === h2) {
    first.setSelection(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["u" /* last */])(positions), positions[0]);
  } else {
    first.setSelection(positions[0], __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["u" /* last */])(positions));
  }
}

function realignHorizontally(doc) {
  const sl = doc.dom.scroll.scrollLeft;

  if (doc.editor.getOption('fixedLineNumbers')) {
    const cW = doc.sizes.countersWidth;
    const left = -cW + sl + 'px';
    const width = cW + 'px';

    doc.view.each(lineView => {
      const counter = lineView.counter;
      counter.parentNode.style.left = left;
      counter.style.width = width;
    });
  } else {
    doc.dom.counter.style.left = -sl + 'px';
  }
}

function removeCaret(doc, caret) {
  const index = doc.carets.indexOf(caret);
  doc.carets.splice(index, 1);
  doc.dom.caretsContainer.removeChild(caret.node);
  caret.clearSelection();
}

function rewind(doc, st) {
  const line = doc.lineWithOffset(st - doc.editor.getOption('viewportMargin'));
  const lineIndex = line.getIndex();
  const view = doc.view;
  let codeScrollDelta = line.getOffset() - doc.sizes.scrollTop;
  let tmpLine = line;
  let i = -1;
  let popped;

  if (view.from <= lineIndex && lineIndex <= view.to) return false;

  while (tmpLine && ++i < view.children.length) {
    view.replaceLineInLineView(view.children[i], tmpLine, lineIndex + i);
    tmpLine = tmpLine.next(true);
  }
  view.from = lineIndex;
  view.to = view.from + i;
  if (i + 1 < view.length) {
    while (++i < view.length && (popped = view.scrollUp())) {
      codeScrollDelta -= popped.line.height;
    }
    while (i < view.length && (popped = view.pop())) {
      codeScrollDelta -= popped.line.height;
    }
  }
  view.to = view.from + view.length - 1;
  doc.dom.scroll.scrollTop = doc.scrollTop = st;
  scrollCodeTopMargin(doc, codeScrollDelta);
  doc.fill();
  return true;
}

function scrollCodeTopMargin(doc, delta) {
  if (!delta) return;
  doc.sizes.scrollTop += delta;
  doc.dom.code.style.top = doc.sizes.scrollTop + 'px';
}

function scrollDocument(doc, delta) {
  doc.scrollTop += delta;
  doc.dom.scroll.scrollTop += delta;
}

function parseForward(doc, line) {
  let stateBefore = line.state;
  let task = doc.parse(line);
  let tmp = line;

  while ((tmp = tmp.next()) && tmp.view && (tmp.cache === null || __WEBPACK_IMPORTED_MODULE_1_Parser__["a" /* default */].stateChanged(stateBefore, task.state))) {
    tmp.cache = undefined;
    stateBefore = tmp.state;
    task = doc.parse(line, task.state);
  }
  // if (line) {
  //   doc.parse(line, task.state);
  // }
  return tmp;
}

/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_index__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_lineView__ = __webpack_require__(41);





const lineViewNode = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["d" /* createNode */])(null, 'div', 'cp-line-view');
const lineNumberWrapper = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["d" /* createNode */])(lineViewNode, 'div', 'cp-line-number-wrapper');
const lineNumberNode = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["d" /* createNode */])(lineNumberWrapper, 'div', 'cp-line-number');
const linePreNode = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["d" /* createNode */])(lineViewNode, 'pre', 'cp-line');

lineNumberNode.appendChild(document.createTextNode(''));

class LineView {
  constructor() {
    this.node = lineViewNode.cloneNode(true);
    this.counter = this.node.firstChild.firstChild;
    this.pre = this.node.lastChild;
    this.change = 0;
  }

  tail() {
    return this.line; // TODO: merged lines
  }

  update(text, symbols) {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_lineView__["a" /* updateLineView */])(this, text, symbols);
  }
}

/* harmony default export */ __webpack_exports__["a"] = LineView;

/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_index__ = __webpack_require__(0);




class Mode {
  static resolve(item) {
    const resolvedItem = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["f" /* resolve */])(item, this);
    if (typeof resolvedItem !== 'object') {
      throw new TypeError('Mode must be an object.');
    }
    return resolvedItem instanceof Mode ? resolvedItem : new Mode(resolvedItem);
  }

  constructor(extension = {}) {
    this.name = 'plaintext';
    this.keyMap = {};
    this.onLeftRemoval = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'" };
    this.onRightRemoval = { '}': '{', ')': '(', ']': '[', '"': '"', "'": "'" };
    this.selectionWrappers = { '(': ['(', ')'], '[': ['[', ']'], '{': ['{', '}'], '"': '"', "'": "'" };
    Object.assign(this, extension);
    this.init();
  }

  init() {}
  onEntry() {}
  onExit() {}

  initialState() {
    return {};
  }

  iterator(stream) {
    stream.skip();
    return '';
  }

  indent(stream) {
    return stream.indent;
  }

  isIndentTrigger(char) {
    return this.indentTriggers instanceof RegExp && this.indentTriggers.test(char);
  }

  isAutoCompleteTrigger(char) {
    return this.autoCompleteTriggers instanceof RegExp && this.autoCompleteTriggers.test(char);
  }
}

/* harmony default export */ __webpack_exports__["a"] = Mode;

/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


/* harmony default export */ __webpack_exports__["a"] = {
  'adb': 'ada',
  'c++': 'cpp',
  'coffee': 'coffeescript',
  'h': 'cpp',
  'htm': 'html',
  'js': 'javascript',
  'less': 'css',
  'md': 'markdown',
  'pl': 'perl',
  'plist': 'xml',
  'rb': 'ruby',
  'sh': 'bash',
  'svg': 'xml',
  'yml': 'yaml'
};

/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


/* harmony default export */ __webpack_exports__["a"] = {
  abortSelectionOnBlur: false,
  autoFocus: true,
  autoIndent: true,
  autoIndentBlankLines: true,
  autoScroll: true,
  blinkCaret: true,
  caretBlinkRate: 600,
  caretHeight: 1,
  caretStyle: 'vertical',
  disableThemeClassName: false,
  drawIndentGuides: true,
  firstLineNumber: 1,
  fixedLineNumbers: true,
  fontFamily: 'Menlo, Monaco, Consolas, Courier, monospace',
  fontSize: 12,
  height: 300,
  highlightCurrentLine: true,
  // hints: false,
  hintsDelay: 200,
  history: true,
  indentByTabs: false,
  insertClosingBrackets: true,
  insertClosingQuotes: true,
  invisibleCharacters: false,
  keyMap: 'default',
  keyupInactivityTimeout: 200,
  legacyScrollbars: false,
  lineEndings: '\n',
  lineHeight: 'normal',
  lineNumberFormatter: null,
  lineNumbers: true,
  matching: true,
  maxFontSize: 60,
  minFontSize: 6,
  mode: 'plaintext',
  // placeholder: '',
  readOnly: false,
  require: null,
  // rulers: null,
  // rulersStyle: 'solid',
  scrollSpeed: 1,
  searchOnDblClick: true,
  shortcuts: true,
  tabIndex: -1,
  tabTriggers: true,
  tabWidth: 2,
  theme: 'default',
  trimTrailingSpaces: false,
  useParserKeyMap: true,
  viewportMargin: 50,
  width: 'auto'
};

/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_historyActions__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_index__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["e"] = checkSupport;
/* harmony export (immutable) */ __webpack_exports__["c"] = copyState;
/* harmony export (immutable) */ __webpack_exports__["a"] = getHistoryAction;
/* harmony export (immutable) */ __webpack_exports__["d"] = historyMove;
/* harmony export (immutable) */ __webpack_exports__["b"] = historyPush;
/* unused harmony export maybeSplitChanges */
/* unused harmony export reverseChange */
/* unused harmony export reverseChanges */
/* unused harmony export splitChange */





function checkSupport(stack) {
  for (const change of stack) {
    if (!change.type || !change.make || !change.reverse) {
      throw new Error('Some of the changes in the history are incorrect');
    }
    if (!__WEBPACK_IMPORTED_MODULE_0_historyActions__["a" /* default */][change.type]) {
      throw new Error('Some of the changes in the history contain unsupported actions (like "' + change.type + '" ).');
    }
  }
}

let historyStateId = 0;
function copyState(state) {
  const newState = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["a" /* copy */])(state);
  newState.id = ++historyStateId;
  return newState;
}

function getHistoryAction(type) {
  return __WEBPACK_IMPORTED_MODULE_0_historyActions__["a" /* default */][type];
}

function historyMove(hist, from, into) {
  if (!hist.lock && from.length) {
    const lastChange = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["u" /* last */])(from);
    const splitted = maybeSplitChanges(lastChange);
    const reversed = reverseChanges(splitted);

    if (lastChange === splitted || lastChange.length === 0) {
      from.pop();
    }
    historyPush(hist, into, reversed);
    return reversed;
  }
}

function historyPush(hist, into, state) {
  const lastItem = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["u" /* last */])(into);
  if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["h" /* isArray */])(lastItem)) {
    if (!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["h" /* isArray */])(state)) state = [state];
    var codes = [],
        min = Math.min(lastItem.length, state.length);
    for (var i = 0; i < min; i++) {
      var ch = lastItem[i],
          cur = state[i],
          hist = __WEBPACK_IMPORTED_MODULE_0_historyActions__["a" /* default */][ch.type];
      if (ch.type === cur.type && hist.merge && hist.canBeMerged) codes[i] = hist.canBeMerged(ch, cur);
      if (!codes[i]) break;
    }
    if (i === min) {
      for (var i = 0; i < min; i++) {
        var hist = __WEBPACK_IMPORTED_MODULE_0_historyActions__["a" /* default */][lastItem[i].type];
        hist.merge(lastItem[i], state[i], codes[i]);
      }
      for (; i < state.length; i++) lastItem.push(state[i]);
      return true;
    }
  }
  into.push(state);
}

function maybeSplitChanges(state) {
  if (!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["h" /* isArray */])(state)) return splitChange(state) || state;
  var split = [];
  for (var i = 0; i < state.length; i++) {
    var s = splitChange(state[i]);
    if (s === state[i]) split.push(state.splice(i--, 1)[0]);else if (s) split.push(s);
  }
  return split.length ? split : state;
}

function reverseChange(change) {
  return __WEBPACK_IMPORTED_MODULE_0_historyActions__["a" /* default */][change.type].reverse(change);
}

function reverseChanges(state) {
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["h" /* isArray */])(state) ? state.map(reverseChange) : reverseChange(state);
}

function splitChange(change) {
  const act = __WEBPACK_IMPORTED_MODULE_0_historyActions__["a" /* default */][change.type];
  return act && act.split && act.split(change);
}

/***/ }),
/* 13 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Layer__ = __webpack_require__(24);
/* harmony export (immutable) */ __webpack_exports__["a"] = addLayer;
/* harmony export (immutable) */ __webpack_exports__["b"] = createLayer;
/* unused harmony export mountLayer */
/* harmony export (immutable) */ __webpack_exports__["d"] = mountLayers;
/* harmony export (immutable) */ __webpack_exports__["c"] = removeLayer;
/* unused harmony export unmountLayer */
/* harmony export (immutable) */ __webpack_exports__["e"] = unmountLayers;




function checkLayer(layer) {
  if (!(layer instanceof __WEBPACK_IMPORTED_MODULE_0_Layer__["a" /* default */])) {
    throw new TypeError('Given layer is not an instance of Layer!');
  }
}

function addLayer(parent, layers, layer) {
  checkLayer(layer);
  layers.add(layer);
  layer.parent = parent;
  parent.dom && mountLayer(parent.dom.screen, layer);
  layer.emit('added', parent);
  return parent;
}

function createLayer(parent, args) {
  const layer = new __WEBPACK_IMPORTED_MODULE_0_Layer__["a" /* default */](...args);
  parent.addLayer(layer);
  return layer;
}

function mountLayer(screen, layer) {
  screen.appendChild(layer.node);
  layer.emit('mounted');
}

function mountLayers(parent, layers) {
  const { screen } = parent.dom;
  for (const layer of layers) {
    mountLayer(screen, layer);
  }
}

function removeLayer(parent, layers, layer) {
  checkLayer(layer);
  layers.delete(layer);
  parent.dom && unmountLayer(parent.dom.screen, layer);
  layer.emit('removed', parent);
  return parent;
}

function unmountLayer(screen, layer) {
  if (screen && layer.node.parentNode === screen) {
    screen.removeChild(layer.node);
    layer.emit('unmounted');
  }
}

function unmountLayers(parent, layers) {
  const { screen } = parent.dom;
  for (const layer of layers) {
    unmountLayer(screen, layer);
  }
}

/***/ }),
/* 14 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Deferred__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_data_defaults__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_helpers_index__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["b"] = defineModule;
/* harmony export (immutable) */ __webpack_exports__["a"] = requireModule;






function identity(a) {
  return a;
}

function defineModule(map, requirer, moduleResolve, args) {
  const [modName, requires, resolver] = args.length === 2 ? [args[0], [], args[1]] : args;
  const name = modName.toLowerCase();

  return Promise.all(requires.map(requirer)).then(deps => resolver.apply(CodePrinter, deps)).then(moduleResolve || identity).then(mod => {
    const deferr = map.get(name);
    deferr && deferr.resolve(mod);
    map.set(name, mod);
    return mod;
  }).catch(error => console.error(error));
}

function requireModule(name, map, path) {
  const mod = map.get(name);

  if (mod) {
    return Promise.resolve(mod);
  }
  const deferr = new __WEBPACK_IMPORTED_MODULE_0_Deferred__["a" /* default */]();
  map.set(name, deferr);
  (__WEBPACK_IMPORTED_MODULE_1_data_defaults__["a" /* default */].require || __WEBPACK_IMPORTED_MODULE_2_helpers_index__["e" /* load */])(path);

  return Promise.resolve(deferr);
}

/***/ }),
/* 15 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_index__ = __webpack_require__(0);
/* unused harmony export getLineClasses */
/* harmony export (immutable) */ __webpack_exports__["b"] = insertLineViewNode;
/* harmony export (immutable) */ __webpack_exports__["c"] = removeLineViewNode;
/* harmony export (immutable) */ __webpack_exports__["d"] = setCounter;
/* harmony export (immutable) */ __webpack_exports__["a"] = touch;




function getLineClasses(line) {
  const classes = line.classes ? ' ' + line.classes.join(' ') : '';
  return 'cp-line-view' + classes;
}

function insertLineViewNode(view, lineView, at) {
  if (!view.display) return;
  setCounter(view.doc, lineView, view.from + at, true);
  if (at < view.length) {
    view.display.insertBefore(lineView.node, view.display.children[at]);
  } else {
    view.display.appendChild(lineView.node);
  }
}

function removeLineViewNode(view, lineView) {
  if (!view.display) return;
  view.display.removeChild(lineView.node);
}

function setCounter(doc, lineView, index, setWidth) {
  const text = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["t" /* lineNumberFor */])(doc.editor, index);
  if (lineView.counterText !== text) {
    lineView.counter.firstChild.nodeValue = lineView.counterText = text;
  }
  if (setWidth) {
    const left = doc.getOption('fixedLineNumbers') ? doc.scrollLeft : 0;
    lineView.counter.parentNode.style.left = -doc.sizes.countersWidth + left + 'px';
    lineView.counter.style.width = doc.sizes.countersWidth + 'px';
  }
}

function touch(line) {
  if (line.view) {
    line.view.node.className = getLineClasses(line);
  }
}

/***/ }),
/* 16 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_statics__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_document__ = __webpack_require__(7);





function mergeStringArrays(a, b) {
  a[a.length - 1] += b.shift();
  return a.concat(b);
}

/* harmony default export */ __webpack_exports__["a"] = {
  'replace': {
    make(caret, change) {
      caret.setSelection(change.from, change.to).insert(change.text).clearSelection();
    },
    reverse(change) {
      return { type: 'replace', text: change.removed, removed: change.text, from: change.from, to: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_document__["k" /* changeEnd */])(change) };
    },
    canBeMerged(a, b) {
      if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["comparePos"])(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_document__["k" /* changeEnd */])(a), b.from) === 0) {
        return 1;
      }
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["comparePos"])(a.from, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_document__["k" /* changeEnd */])({ text: b.removed, from: b.from })) === 0 ? 2 : 0;
    },
    merge(a, b, code) {
      var x = a,
          y = b;
      if (code === 2) {
        x = b;y = a;
        a.from = b.from;
      }
      a.text = mergeStringArrays(x.text, y.text);
      a.removed = mergeStringArrays(x.removed, y.removed);
      a.to = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_document__["k" /* changeEnd */])({ text: x.removed, from: x.from });
    }
  },
  'indent': {
    make(caret, change) {
      caret.setSelectionRange(change.range);
      (change.offset > 0 ? indent : outdent).call(this, caret);
    },
    reverse(change) {
      return extend(change, { offset: -change.offset });
    },
    canBeMerged(a, b) {
      return a.offset + b.offset && a.range.from.line === b.range.from.line && a.range.to.line === b.range.to.line;
    },
    merge(a, b) {
      a.offset += b.offset;
      a.range = b.range;
    },
    split(a) {
      if (a.offset === 1 || a.offset === -1) return a;
      a.offset > 1 ? --a.offset : ++a.offset;
      return { type: 'indent', range: a.range, offset: a.offset > 0 ? 1 : -1 };
    }
  },
  'setIndent': {
    make(change) {
      this.setIndent(change.line, change.after);
    },
    reverse(change) {
      return extend(change, { before: change.after, after: change.before });
    }
  },
  'wrap': {
    make(caret, change) {
      var method = change.wrap ? 'wrapSelection' : 'unwrapSelection';
      caret.setSelection(change.range.from, change.range.to)[method](change.before, change.after);
    },
    reverse(change) {
      if (change.wrap) {
        var ch = { text: [change.before], from: change.range.from, to: change.range.from };
      } else {
        var ch = { text: [''], from: moveRangeBy(copy(change.range), 0, -change.before.length).from, to: change.range.from };
      }
      change.range = r(adjustPosForChange(change.range.from, ch), adjustPosForChange(change.range.to, ch));
      return extend(change, { wrap: !change.wrap });
    }
  },
  'moveSelection': {
    make(caret, change) {
      caret.setSelection(change.from, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_document__["k" /* changeEnd */])(change)).moveSelectionTo(change.into);
    },
    reverse(change) {
      return extend(change, { from: change.into, into: change.from });
    }
  },
  'swap': {
    make(caret, change) {
      caret.setSelectionRange(change.range);
      swap(this, caret, change.offset < 0);
    },
    reverse(change) {
      moveRangeBy(change.range, change.offset);
      return extend(change, { offset: -change.offset });
    },
    canBeMerged(a, b) {
      var off = a.offset;
      return a.range.from.column === b.range.from.column && a.range.to.column === b.range.to.column && a.range.from.line + off === b.range.from.line && a.range.to.line + off === b.range.to.line;
    },
    merge(a, b) {
      a.offset += b.offset;
    },
    split(a) {
      if (a.offset === 1 || a.offset === -1) return a;
      var r = copy(a.range);
      moveRangeBy(r, a.offset > 1 ? a.offset-- : a.offset++);
      return { type: 'swap', range: r, offset: a.offset > 0 ? -1 : 1 };
    }
  }
};

/***/ }),
/* 17 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Parser__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_commands__ = __webpack_require__(32);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_Document__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_data_tokens__ = __webpack_require__(36);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_statics__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_data_defaults__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_EventEmitter__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_optionSetters__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_helpers_attachEvents__ = __webpack_require__(37);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_helpers_layers__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_helpers_index__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__CodePrinter_css__ = __webpack_require__(49);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__CodePrinter_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_11__CodePrinter_css__);


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };















const instances = new Set();
// Set for all CodePrinter instances

const storage = new WeakMap();
// WeakMap { [codeprinter] => { options }}
// storage for private data for each CodePrinter instance

class CodePrinter extends __WEBPACK_IMPORTED_MODULE_6_EventEmitter__["a" /* default */] {
  static getDefaults() {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["a" /* copy */])(__WEBPACK_IMPORTED_MODULE_5_data_defaults__["a" /* default */]);
  }

  static setDefault(optionName, value) {
    const oldValue = __WEBPACK_IMPORTED_MODULE_5_data_defaults__["a" /* default */][optionName];
    if (__WEBPACK_IMPORTED_MODULE_7_optionSetters__[optionName]) {
      this.each(cp => {
        cp.hasOwnOption(optionName) || __WEBPACK_IMPORTED_MODULE_7_optionSetters__[optionName].call(cp, value, oldValue);
      });
    }
    __WEBPACK_IMPORTED_MODULE_5_data_defaults__["a" /* default */][optionName] = value;
  }

  static setDefaults(extend = {}) {
    for (const optionName in extend) {
      this.setDefault(optionName, extend[optionName]);
    }
  }

  static defineOption(optionName, defaultValue, setter) {
    if (optionName in __WEBPACK_IMPORTED_MODULE_5_data_defaults__["a" /* default */]) {
      throw new Error(`CodePrinter: option "${optionName}" is already registered!`);
    }
    if (typeof setter === 'function') {
      __WEBPACK_IMPORTED_MODULE_7_optionSetters__[optionName] = setter;
    }
    __WEBPACK_IMPORTED_MODULE_5_data_defaults__["a" /* default */][optionName] = defaultValue;
  }

  static each(func) {
    if ('function' !== typeof func) {
      throw new TypeError('CodePrinter.each requires function as the first argument');
    }
    for (const cp of instances) {
      func.call(this, cp);
    }
  }

  constructor(options = {}) {
    super();
    buildDOM(this);

    storage.set(this, {
      options: {},
      layers: new Set()
    });

    this.tabString = '  ';
    this.setOptions(options);
    // this.keypressBindings = new keypressBindings;
    // setOptions(this, options);

    this.setDocument(this.createDocument('', this.getOption('mode')));
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_8_helpers_attachEvents__["a" /* attachEvents */])(this);
    instances.add(this);
  }

  addLayer(layer) {
    const { layers } = storage.get(this);
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_9_helpers_layers__["a" /* addLayer */])(this, layers, layer);
  }

  createDocument(source, mode) {
    return new __WEBPACK_IMPORTED_MODULE_2_Document__["a" /* default */](__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["b" /* valueOf */])(source), mode, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["c" /* getFontDims */])(this));
  }

  createLayer(...args) {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_9_helpers_layers__["b" /* createLayer */])(this, args);
  }

  execute(command, ...args) {
    const fn = __WEBPACK_IMPORTED_MODULE_1_commands__["a" /* default */][command];
    if (!fn) {
      throw new Error(`Cannot find command with name "${command}".`);
    }
    return fn.apply(this, args);
  }

  setDocument(doc = this.createDocument()) {
    if (!(doc instanceof __WEBPACK_IMPORTED_MODULE_2_Document__["a" /* default */])) {
      throw new TypeError(`setDocument: passed argument is not a CodePrinter Document`);
    }
    const old = this.doc;
    if (old !== doc) {
      const wasFocused = old ? old.isFocused : this.getOption('autoFocus');
      if (old) __WEBPACK_IMPORTED_MODULE_2_Document__["a" /* default */].detach(this, old);
      __WEBPACK_IMPORTED_MODULE_2_Document__["a" /* default */].attach(this, doc, wasFocused);
      this.emit('documentChanged', old, doc);
      if (this.dom.mainNode.parentNode) doc.print();
    }
    return old;
  }

  getOption(optionName) {
    const { options } = storage.get(this);
    const option = options[optionName];
    return option !== undefined ? option : __WEBPACK_IMPORTED_MODULE_5_data_defaults__["a" /* default */][optionName];
  }

  getOptions(pick) {
    if (Array.isArray(pick)) {
      const opts = {};
      for (const optionName of pick) {
        opts[optionName] = this.getOption(optionName);
      }
      return opts;
    }
    const { options } = storage.get(this);
    return _extends({}, __WEBPACK_IMPORTED_MODULE_5_data_defaults__["a" /* default */], options);
  }

  setOption(optionName, value) {
    const oldValue = this.getOption(optionName);
    if (optionName && value !== oldValue) {
      const setter = __WEBPACK_IMPORTED_MODULE_7_optionSetters__[optionName];
      const setterResult = setter && setter.call(this, value, oldValue);

      if (setterResult === oldValue && oldValue !== undefined) {
        return this;
      }
      const { options } = storage.get(this);
      options[optionName] = setterResult !== undefined ? setterResult : value;
      this.emit('optionChanged', optionName, value, oldValue);
    }
    return this;
  }

  setOptions(extend) {
    for (const optionName in extend) {
      this.setOption(optionName, extend[optionName]);
    }
    return this;
  }

  hasOwnOption(optionName) {
    const { options } = storage.get(this);
    return options[optionName] !== undefined;
  }

  initAddon(addon, options) {
    return CodePrinter.requireAddon(addon, construct => {
      return new construct(this, options);
    });
  }

  focus() {
    return this.dom.input.focus();
  }

  getTabString() {
    return this.getOption('indentByTabs') ? '\t' : ' '.repeat(this.getOption('tabWidth'));
  }

  getSnippets() {
    return Object.assign({}, this.getOption('snippets'), this.doc.parser && this.doc.parser.snippets);
  }

  // TODO: uglify
  findSnippet(snippetName, head) {
    var s = this.getOption('snippets'),
        b;
    if (!(b = s && s.hasOwnProperty(snippetName))) {
      s = this.doc.parser && this.doc.parser.snippets;
      b = s && s.hasOwnProperty(snippetName);
    }
    s = b && s[snippetName];
    if ('function' === typeof s) s = functionSnippet(this.doc, head, s);
    if (s) return 'string' === typeof s ? { content: s } : s;
  }

  // TODO: uglify
  registerSnippet() {
    var snippets = this.getOption('snippets');
    if (!snippets) snippets = [];
    for (var i = 0; i < arguments.length; i++) {
      var snippet = arguments[i];
      if (snippet.content && snippet.trigger) snippets.push(snippet);
    }
    this.setOption('snippets', snippets);
  }

  registerKey(keySequence, binding) {
    this.keyMap[keySequence] = binding;
    return this;
  }

  removeLayer(layer) {
    const { layers } = storage.get(this);
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_9_helpers_layers__["c" /* removeLayer */])(this, layers, layer);
  }

  unregisterKey(keySequence) {
    delete this.keyMap[keySequence];
    return this;
  }

  exec(commandName, ...args) {
    const command = __WEBPACK_IMPORTED_MODULE_1_commands__["a" /* default */][commandName];
    command.apply(this, args);
    return this;
  }

  call(keySequence) {
    if (keySequence) {
      const c = this.keyMap[keySequence];
      if (c) return c.call(this, keySequence);
    }
  }

  enterFullscreen() {
    if (!this.isFullscreen) {
      var main = this.dom.mainNode,
          b = document.body;
      this._ = document.createTextNode('');
      addClass(main, 'cp-fullscreen');
      main.style.margin = [-b.style.paddingTop, -b.style.paddingRight, -b.style.paddingBottom, -b.style.paddingLeft, ''].join('px ');
      main.style.width = "";
      main.parentNode.insertBefore(this._, main);
      document.body.appendChild(main);
      this.isFullscreen = true;
      this.doc.fill();
      this.input.focus();
      this.emit('fullscreenEntered');
    }
  }

  exitFullscreen() {
    if (this.isFullscreen && this._) {
      var tmp = this._;
      removeClass(this.dom.mainNode, 'cp-fullscreen').style.removeProperty('margin');
      tmp.parentNode.insertBefore(this.dom.mainNode, tmp);
      tmp.parentNode.removeChild(tmp);
      delete this._;
      this.isFullscreen = false;
      __WEBPACK_IMPORTED_MODULE_7_optionSetters__["width"].call(this, this.getOption('width'), undefined);
      this.doc.fill();
      this.input.focus();
      this.emit('fullscreenLeaved');
    }
  }

  getDOMNode() {
    return this.dom.mainNode;
  }

  destroy() {
    const parent = this.dom.mainNode.parentNode;
    if (parent) {
      parent.removeChild(this.dom.mainNode);
    }
    instances.delete(this);
  }

  useSource(source) {
    if (source && source.parentNode) {
      source.parentNode.insertBefore(this.dom.mainNode, source);
      source.style.display = 'none';
      this.doc.init(source.value || source.textContent);
    }
    return this;
  }
}

function buildDOM(cp) {
  const dom = cp.dom = {};
  dom.mainNode = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(null, 'div', 'codeprinter cps-default');
  dom.body = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.mainNode, 'div', 'cp-body');
  dom.container = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.body, 'div', 'cp-container');
  dom.input = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.container, 'textarea', 'cp-input');
  dom.editor = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.container, 'div', 'cp-editor');
  dom.scroll = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.editor, 'div', 'cp-scroll');
  dom.counter = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.scroll, 'div', 'cp-counter');
  dom.counterChild = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.counter, 'div', 'cp-counter-child');
  dom.wrapper = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.scroll, 'div', 'cp-wrapper');
  dom.relative = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.wrapper, 'div', 'cp-relative');
  dom.caretsContainer = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.relative, 'div', 'cp-carets');
  dom.screen = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.relative, 'div', 'cp-screen');
  dom.code = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.screen, 'div', 'cp-code');
  dom.measure = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_10_helpers_index__["d" /* createNode */])(dom.screen, 'div', 'cp-measure');
}

CodePrinter.version = '0.9.0';
CodePrinter.src = '';
CodePrinter.Parser = __WEBPACK_IMPORTED_MODULE_0_Parser__["a" /* default */];
CodePrinter.tokens = __WEBPACK_IMPORTED_MODULE_3_data_tokens__["a" /* default */];
Object.assign(CodePrinter, __WEBPACK_IMPORTED_MODULE_4_statics__);

if (window) window.CodePrinter = CodePrinter;else if (global) global.CodePrinter = CodePrinter;

/* harmony default export */ __webpack_exports__["default"] = CodePrinter;
/* WEBPACK VAR INJECTION */}.call(__webpack_exports__, __webpack_require__(50)))

/***/ }),
/* 18 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_index__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_consts__ = __webpack_require__(2);





const { splice, push, pop, shift, unshift } = Array.prototype;

class Branch {
  constructor(leaf, children) {
    this.isLeaf = leaf == null || leaf;
    this.children = children;
    this.size = this.height = 0;
    this.parent = null;

    for (var i = 0; i < children.length; i++) {
      var ch = children[i];
      this.height += ch.height;
      this.size += ch.size;
      ch.parent = this;
    }
    if (this.isLeaf) {
      this.size = children.length;
    }
  }

  indexOf(node, offset) {
    var children = this.children;
    for (var i = offset || 0, l = children.length; i < l; i++) {
      if (children[i] === node) {
        return i;
      }
    }
    return -1;
  }

  get(line) {
    if (this.isLeaf) return this.children[line] || null;
    var children = this.children,
        child,
        i = -1;
    while (++i < children.length && (child = children[i])) {
      if (child.size > line) return child.get(line);
      line -= child.size;
    }
    return null;
  }

  insert(at, lines) {
    const { children } = this;
    this.size += lines.length;
    this.height += lines.reduce((height, line) => height + line.height, 0);

    if (this.isLeaf) {
      for (let i = 0; i < lines.length; i++) {
        lines[i].parent = this;
      }
      this.children = children.slice(0, at).concat(lines, children.slice(at));
      return;
    }
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const size = child.size;

      if (at <= size) {
        child.insert(at, lines);
        if (child.isLeaf && child.size > __WEBPACK_IMPORTED_MODULE_1_consts__["d" /* BRANCH_MAX_SIZE */]) {
          const space = child.size % __WEBPACK_IMPORTED_MODULE_1_consts__["e" /* BRANCH_OPTIMAL_SIZE */] + __WEBPACK_IMPORTED_MODULE_1_consts__["e" /* BRANCH_OPTIMAL_SIZE */];
          for (let p = space; p < child.size;) {
            const leaf = new Branch(true, child.children.slice(p, p += __WEBPACK_IMPORTED_MODULE_1_consts__["e" /* BRANCH_OPTIMAL_SIZE */]));
            leaf.parent = this;
            child.height -= leaf.height;
            children.splice(++i, 0, leaf);
          }
          child.children = child.children.slice(0, space);
          child.size = space;
          this.split();
        }
        break;
      }
      at -= size;
    }
  }

  remove(at, n) {
    var children = this.children;
    this.size -= n;
    if (this.isLeaf) {
      var spliced = splice.call(children, at, n);
      for (var i = 0; i < spliced.length; i++) {
        var child = spliced[i];
        this.height -= child.height;
        child.parent = null;
      }
      return spliced;
    }
    var r = [];
    for (var i = 0; i < children.length; i++) {
      var ch = children[i],
          s = ch.size;
      if (at < s) {
        var min = Math.min(n, s - at),
            oh = ch.height;
        push.apply(r, ch.remove(at, min));
        this.height -= oh - ch.height;
        if (s === min) {
          children.splice(i--, 1);
          ch.parent = null;
        }
        if ((n -= min) === 0) break;
        at = 0;
      } else {
        at -= s;
      }
    }
    if (this.size - n < __WEBPACK_IMPORTED_MODULE_1_consts__["e" /* BRANCH_OPTIMAL_SIZE */] && (children.length > 1 || !children[0] || !children[0].isLeaf)) {
      var leaf = new Branch(true, this.collapse([]));
      this.children = [leaf];
      leaf.parent = this;
    }
    return r;
  }

  collapse(children) {
    if (this.isLeaf) {
      children.push.apply(children, this.children);
    } else {
      for (var i = 0; i < this.children.length; i++) {
        this.children[i].collapse(children);
      }
    }
    return children;
  }

  split() {
    if (this.children.length <= 10) return;
    var branch = this;
    do {
      var spliced = branch.children.splice(branch.children.length - 5, 5);
      var sibling = new Branch(false, spliced);
      if (branch.parent) {
        branch.size -= sibling.size;
        branch.height -= sibling.height;
        var index = branch.parent.children.indexOf(branch);
        branch.parent.children.splice(index + 1, 0, sibling);
      } else {
        var clone = new Branch(false, branch.children);
        clone.parent = branch;
        branch.children = [clone, sibling];
        branch = clone;
      }
      sibling.parent = branch.parent;
    } while (branch.children.length > 10);
    branch.parent.split();
  }

  getLineWithOffset(offset) {
    var children = this.children,
        child,
        i = -1;
    while (++i < children.length && (child = children[i])) {
      if (child.height > offset) return this.isLeaf ? child : child.getLineWithOffset(offset);
      offset -= child.height;
    }
    return child.get(child.size - 1);
  }

  next() {
    var i,
        siblings = this.parent && this.parent.children;
    if (siblings && (i = siblings.indexOf(this)) >= 0) {
      if (i + 1 < siblings.length) return siblings[i + 1];
      var next = this.parent.next();
      while (next && !next.isLeaf) next = next.children[0];
      if (next) return next;
    }
    return null;
  }

  prev() {
    var i,
        siblings = this.parent && this.parent.children;
    if (siblings && (i = siblings.indexOf(this)) >= 0) {
      if (i > 0) return siblings[i - 1];
      var prev = this.parent.prev();
      while (prev && !prev.isLeaf) prev = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["u" /* last */])(prev.children);
      if (prev) return prev;
    }
    return null;
  }

  foreach(f, tmp) {
    var children = this.children;
    tmp = tmp || 0;
    if (this.isLeaf) for (var i = 0; i < children.length; i++) f(children[i], tmp + i);else for (var i = 0; i < children.length; i++) {
      var child = children[i];
      child.foreach(f, tmp);
      tmp += child.size;
    }
    return this;
  }
}

/* harmony default export */ __webpack_exports__["a"] = Branch;

/***/ }),
/* 19 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_CaretStyles__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_EventEmitter__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_helpers_index__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_helpers_document__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_statics__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_helpers_caret__ = __webpack_require__(38);









let caretId = 0;
const activeClassName = 'cp-active-line';

const storage = new WeakMap();
// [caret] => {
//   doc, head, anchor, currentLine, lastMeasure, parserState
// }
// storage for caret's private data

class Caret extends __WEBPACK_IMPORTED_MODULE_1_EventEmitter__["a" /* default */] {
  constructor(doc) {
    super();
    this.propagateTo(doc);

    this.x = this.y = 0;
    this.node = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["d" /* createNode */])(null, 'div', 'cp-caret');
    Object.defineProperty(this, 'id', { value: caretId++ });

    storage.set(this, {
      doc,
      head: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["pos"])(0, 0),
      anchor: null,
      currentLine: null,
      lastMeasure: null,
      parserState: null
    });
  }

  anchor(real) {
    const { anchor } = storage.get(this);
    if (anchor && (real || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(anchor, this.head()))) {
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["a" /* copy */])(anchor);
    }
    return null;
  }

  beginSelection() {
    const store = storage.get(this);
    this.clearSelection();
    store.anchor = this.head();
  }

  blur() {
    const { currentLine } = storage.get(this);
    unselect(this, currentLine);
  }

  clearSelection() {
    const store = storage.get(this);
    if (store.anchor) {
      store.doc.selectionLayer.clear(this.id);
      store.anchor = null;
      select(store.doc, this, store.currentLine);
      this.emit('selectionCleared');
    }
    return this;
  }

  column() {
    const { currentLine, head } = storage.get(this);
    return currentLine ? Math.min(head.column, currentLine.text.length) : 0;
  }

  dispatch(measure) {
    const store = storage.get(this);
    const { currentLine, doc, head, anchor } = store;
    const { line, lineIndex, column } = measure;
    let b = !doc.isFocused;

    if (currentLine !== line) {
      unselect(this, currentLine);
      select(doc, this, store.currentLine = line);
    }
    if (head.line !== lineIndex) {
      // if (!line.text && doc.getOption('autoIndentBlankLines')) {
      //   quietChange(doc, line, nextLineIndent(doc, line));
      //   doc.parse(line);
      //   column = line.text.length;
      //   measure.offsetX += column * doc.sizes.font.width;
      // }
      this.emit('lineChange', line, lineIndex, column);
      head.line = lineIndex;
      b = true;
    }
    if (head.column !== column) {
      this.emit('columnChange', line, lineIndex, column);
      head.column = column;
      b = true;
    }
    this.showSelection();

    b && this.emit('caretWillMove', head, anchor);
    store.lastMeasure = measure;
    store.parserState = undefined;
    setPixelPosition(doc, this, measure);
    doc.editor && doc.editor.focus();

    b && this.emit('caretMoved', head, anchor);
    this.emit('caretUpdated');
    return this;
  }

  eachLine(fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('caret.eachLine(fn): fn must be a function!');
    }
    const { doc } = storage.get(this);
    const { from, to } = this.getRange();
    for (let i = from.line; i <= to.line; i++) {
      fn.call(this, doc.get(i), i, i - from.line);
    }
    return { from, to };
  }

  focus() {
    const store = storage.get(this);
    this.setHead(store.head);
    if (!this.hasSelection()) {
      select(store.doc, this, store.currentLine);
    }
  }

  getParserState() {
    const store = storage.get(this);
    return store.parserState = store.parserState || store.doc.getState(store.head);
  }

  getRange() {
    const { head } = storage.get(this);
    return this.getSelectionRange() || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["range"])(head, head);
  }

  getSelection() {
    const { doc } = storage.get(this);
    const range = this.getSelectionRange();
    return range ? doc.substring(range.from, range.to) : '';
  }

  getSelectionRange() {
    if (this.hasSelection()) {
      const { anchor, head } = storage.get(this);
      return getRangeOf(anchor, head);
    }
  }

  hasSelection() {
    const { anchor } = storage.get(this);
    return !!anchor && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(anchor, this.head()) !== 0;
  }

  head(real) {
    const { head } = storage.get(this);
    return real ? __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["a" /* copy */])(head) : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["pos"])(head.line, this.column());
  }

  insert(text, movement) {
    const range = this.getRange();
    const { doc } = storage.get(this);
    doc.replaceRange(text, range.from, range.to);
    typeof movement === 'number' && this.moveX(movement);
    this.clearSelection();
    return this;
  }

  inSelection(position, boundary = false) {
    if (!position) return false;
    const { anchor, head } = storage.get(this);

    if (boundary) {
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(anchor || head, position) * __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(position, head) >= 0;
    }
    return anchor && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(anchor, position) * __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(position, head) > 0;
  }

  isCurrentLine(line) {
    const { currentLine } = storage.get(this);
    return currentLine === line;
  }

  line() {
    return storage.get(this).currentLine;
  }

  lineNumber() {
    const { head } = storage.get(this);
    return head.line;
  }

  match(pattern, dir, select = true) {
    const find = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_caret__["a" /* findWord */])(this.head(), this.textAtCurrentLine(), pattern, dir);
    if (select) {
      this.setSelection(find.from, find.to);
    }
    return find.word;
  }

  moveAnchor(move) {
    if (typeof move !== 'number') {
      throw new TypeError('caret.moveAnchor(move): move should be a number!');
    }
    const store = storage.get(this);
    store.anchor = positionAfterMove(doc, store.anchor, move);
    this.showSelection();
  }

  moveSelectionTo(pos) {
    const range = this.getSelectionRange();
    const { doc, head } = storage.get(this);

    if (!pos || !range || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(range.from, pos) <= 0 && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(pos, range.to) <= 0) {
      return false;
    }
    this.position(pos);
    const { removed } = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_document__["l" /* removeRange */])(doc, range.from, range.to);
    const anchor = this.head();
    insertText(doc, removed, head);
    this.setSelection(anchor, this.head());
    doc.pushChange({ type: 'moveSelection', text: removed, from: range.from, into: this.anchor() });
  }

  moveX(move, dontReverse = false) {
    if (typeof move !== 'number') {
      throw new TypeError('caret.moveX(move): move should be a number!');
    }
    const { doc, anchor, head } = storage.get(this);
    const mv = dontReverse ? mv : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_caret__["b" /* maybeReverseSelection */])(this, anchor, head, move);
    const position = positionAfterMove(doc, this.head(), mv);
    return this.setHead(position);
  }

  moveY(move) {
    if (typeof move !== 'number') {
      throw new TypeError('caret.moveY(move): move should be a number!');
    }
    const { doc, anchor, head } = storage.get(this);
    const size = doc.size();
    let mv = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_caret__["b" /* maybeReverseSelection */])(this, anchor, head, move);

    mv = head.line + mv;
    if (mv < 0) {
      mv = head.column = 0;
    } else if (mv >= size) {
      head.column = -1;
      mv = size - 1;
    }
    return this.setHead(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["pos"])(mv, head.column));
  }

  offsets() {
    const store = storage.get(this);
    const measure = store.lastMeasure || { offsetX: 0, offsetY: 0, charHeight: 0 };

    return {
      offsetX: measure.offsetX,
      offsetY: measure.offsetY,
      totalOffsetY: measure.offsetY + measure.charHeight
    };
  }

  position(line, column) {
    const { doc } = storage.get(this);
    const position = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["normalizePos"])(doc, line, column);
    return this.clearSelection().setHead(__WEBPACK_IMPORTED_MODULE_4_statics__["pos"]);
  }

  removeSelection() {
    const range = this.getSelectionRange();
    if (range) {
      const { doc } = storage.get(this);
      this.clearSelection();
      doc.removeRange(range.from, range.to);
    }
  }

  reverse() {
    const store = storage.get(this);
    const oldAnchor = store.anchor;
    if (oldAnchor) {
      store.anchor = head;
      this.setHead(oldAnchor);
    }
    return this;
  }

  setHead(pos) {
    const { doc } = storage.get(this);
    const newHead = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["normalizePos"])(doc, pos);
    if (newHead) {
      const rect = doc.measureRect(doc.get(newHead.line), newHead.column);
      this.dispatch(rect);
    }
    return this;
  }

  setSelection(posA, posB) {
    const store = storage.get(this);
    const newAnchor = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["normalizePos"])(store.doc, posA);
    const newHead = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["normalizePos"])(store.doc, posB);

    if (newHead) {
      store.anchor = newAnchor && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(newAnchor, newHead) ? newAnchor : null;
      this.setHead(newHead);
    }
    return this;
  }

  setSelectionRange(range) {
    return range && this.setSelection(range.from, range.to);
  }

  showSelection() {
    const range = this.getSelectionRange();
    const { currentLine, doc } = storage.get(this);

    if (range) {
      doc.selectionLayer.mark(this.id, range);
      unselect(this, currentLine);
    } else {
      doc.selectionLayer.clear(this.id);
      select(doc, this, currentLine);
    }
  }

  textAtCurrentLine() {
    const { currentLine } = storage.get(this);
    return currentLine && currentLine.text;
  }

  textAfter(length) {
    const { currentLine, head } = storage.get(this);
    return currentLine && currentLine.text.substr(head.column, length);
  }

  textBefore(length) {
    const { currentLine, head } = storage.get(this);
    return currentLine && currentLine.text.substring(length ? head.column - length : 0, head.column);
  }

  unwrapSelection(before, after) {
    const { doc } = storage.get(this);
    const range = this.getRange();
    const from = positionAfterMove(doc, range.from, -before.length);
    const to = positionAfterMove(doc, range.to, after.length);

    if (doc.substring(from, range.from) !== before || doc.substring(range.to, to) !== after) {
      return false;
    }
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_document__["l" /* removeRange */])(doc, range.to, to);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_document__["l" /* removeRange */])(doc, from, range.from);
    doc.pushChange({ type: 'wrap', range, before, after, wrap: false });
  }

  updateStyle() {
    const { doc } = storage.get(this);
    this.style = doc.getOption('caretStyle') || 'vertical';
    this.node.className = `cp-caret cp-caret-${this.style}`;
  }

  wordBefore(rgx) {
    return this.match(rgx || /\w/, -1, false);
  }

  wordAfter(rgx) {
    return this.match(rgx || /\w/, 1, false);
  }

  wordAround(rgx) {
    return this.match(rgx || /\w/, 0, false);
  }

  wrapSelection(before, after) {
    const range = this.getRange();
    const { doc, anchor, head } = storage.get(this);

    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_document__["f" /* replaceRange */])(doc, after, range.to, range.to);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_document__["f" /* replaceRange */])(doc, before, range.from, range.from);

    if (anchor && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(anchor, head) < 0) {
      this.moveX(-after.length, true) && this.moveAnchor(before.length);
    }
    doc.pushChange({ type: 'wrap', range, before, after, wrap: true });
  }
}

function setPixelPosition(doc, caret, measure) {
  if (!caret.isDisabled) {
    const css = Object.create(null);
    const { offsetX, offsetY } = measure;
    const options = doc.getOptions();

    if (offsetX >= 0) css.left = caret.x = offsetX;
    if (offsetY >= 0) css.top = caret.y = offsetY;

    caret.updateStyle(options.caretStyle);
    (__WEBPACK_IMPORTED_MODULE_0_CaretStyles__["a" /* default */][caret.style] || __WEBPACK_IMPORTED_MODULE_0_CaretStyles__["a" /* default */]['vertical']).call(caret, css, measure, options);

    for (const key in css) {
      caret.node.style[key] = css[key] + (typeof css[key] === 'number' ? 'px' : '');
    }
  }
  return caret;
}

function select(doc, caret, line) {
  if (line && !line.active && doc.isFocused) {
    if (doc.getOption('highlightCurrentLine')) {
      line.addClass(activeClassName);
    }
    line.active = true;
  }
}

function unselect(caret, line) {
  if (line && line.active) {
    line.removeClass(activeClassName);
    line.active = undefined;
  }
}

function positionAfterMove(doc, position, move) {
  const p = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["a" /* copy */])(position);
  let dl = doc.get(p.line);
  let mv = move;

  if (mv <= 0) {
    while (dl) {
      if (-mv <= p.column) {
        p.column += mv;
        return p;
      }
      mv += p.column + 1;
      if (dl = dl.prev()) {
        p.column = dl.text.length;
        --p.line;
      }
    }
  } else {
    while (dl) {
      if (p.column + mv <= dl.text.length) {
        p.column += mv;
        return p;
      }
      mv -= dl.text.length - p.column + 1;
      if (dl = dl.next()) {
        p.column = 0;
        ++p.line;
      }
    }
  }
  return p;
}

function getRangeOf(a, b) {
  return a ? __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["comparePos"])(a, b) < 0 ? __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["range"])(a, b) : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["range"])(b, a) : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_statics__["range"])(b, b);
}

/* harmony default export */ __webpack_exports__["a"] = Caret;

/***/ }),
/* 20 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


/* harmony default export */ __webpack_exports__["a"] = {
  vertical(css, measure, options) {
    css.width = 1;
    css.height = options.caretHeight * measure.charHeight;
  },
  underline(css, measure) {
    css.width = measure.charWidth || measure.dl.height / 2;
    css.height = 1;
    css.top += measure.dl.height - 1;
  },
  block(css, measure, options) {
    css.width = measure.charWidth || measure.dl.height / 2;
    css.height = options.caretHeight * measure.charHeight;
  }
};

/***/ }),
/* 21 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


class Deferred {
  constructor() {
    const promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    this.then = promise.then.bind(promise);
    this.catch = promise.catch.bind(promise);
  }
}

/* harmony default export */ __webpack_exports__["a"] = Deferred;

/***/ }),
/* 22 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_View__ = __webpack_require__(31);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_Line__ = __webpack_require__(25);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_Mode__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_Caret__ = __webpack_require__(19);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_Flags__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_Parser__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6_History__ = __webpack_require__(23);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_Overlay__ = __webpack_require__(28);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_LineView__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9_consts__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10_LinesTree__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11_data_aliases__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12_EventEmitter__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13_helpers_history__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14_statics__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15_helpers_measurement__ = __webpack_require__(42);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16_helpers_layers__ = __webpack_require__(13);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_17_helpers_index__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_18_helpers_document__ = __webpack_require__(7);
/* unused harmony export prepareSelNode */
























const storage = new WeakMap();
// WeakMap { [document] => { data, history }}
// storage for document's private data

class Document extends __WEBPACK_IMPORTED_MODULE_12_EventEmitter__["a" /* default */] {
  static attach(editor, doc, focus) {
    const dom = doc.dom = editor.dom;
    const { layers } = storage.get(doc);

    doc.editor = editor;
    editor.doc = doc;
    doc.propagateTo(editor);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["n" /* updateFontSizes */])(editor, doc);
    dom.measure.appendChild(doc.measure.node);
    doc.view.mount(dom.code, dom.counter);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16_helpers_layers__["d" /* mountLayers */])(doc, layers);
    doc.scrollTo(doc.scrollLeft | 0, doc.scrollTop | 0);
    doc.fill();
    updateScroll(doc);
    applySizes(doc);
    if (focus) doc.focus();
    doc.emit('attached');
  }

  static detach(editor, doc) {
    const dom = doc.dom;
    const { layers } = storage.get(doc);

    doc.scrollTop = dom.scroll.scrollTop;
    doc.scrollLeft = dom.scroll.scrollLeft;
    doc.view.unmount();
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16_helpers_layers__["e" /* unmountLayers */])(doc, layers);
    dom.measure.removeChild(doc.measure.node);
    doc.blur();
    editor.doc = doc.editor = null;
    doc.emit('detached');
    doc.propagateTo(null);
  }

  constructor(source, mode, font) {
    super();

    storage.set(this, {
      history: new __WEBPACK_IMPORTED_MODULE_6_History__["a" /* default */](this),
      layers: new Set(),
      selectionLayer: null
    });

    this.sizes = {
      scrollTop: 0,
      font: font || {},
      paddingTop: 5,
      paddingLeft: 10,
      countersWidth: 30,
      lastLineNumberLength: 1
    };
    this.from = 0;
    this.to = -1;
    this.view = new __WEBPACK_IMPORTED_MODULE_0_View__["a" /* default */](this);
    this.measure = new __WEBPACK_IMPORTED_MODULE_8_LineView__["a" /* default */]();
    this.carets = [new __WEBPACK_IMPORTED_MODULE_3_Caret__["a" /* default */](this)];
    this.scrollTop = this.scrollLeft = 0;
    this.mode = CodePrinter.getMode(mode) || CodePrinter.getMode('plaintext');
    this.linkedDocs = [];

    this.on('caretMoved', __WEBPACK_IMPORTED_MODULE_18_helpers_document__["a" /* handleCaretMoved */]);
    this.on('caretUpdated', __WEBPACK_IMPORTED_MODULE_18_helpers_document__["b" /* handleCaretUpdated */]);

    return this.init(source, mode);
  }

  get selectionLayer() {
    const store = storage.get(this);
    if (!store.selectionLayer) {
      store.selectionLayer = this.createLayer('cp-selection-layer');
    }
    return store.selectionLayer;
  }

  addLayer(layer) {
    const { layers } = storage.get(this);
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16_helpers_layers__["a" /* addLayer */])(this, layers, layer);
  }

  blur() {
    if (this.isFocused) {
      clearInterval(this.caretsBlinkingInterval);
      this.isFocused = false;
      this.eachCaret(caret => {
        caret.blur();
        this.dom.caretsContainer.removeChild(caret.node);
      });
      this.emit('blur');
    }
  }

  call(method, ...args) {
    this.eachCaret(caret => {
      const func = caret[method];
      if (typeof func === 'function') {
        func.apply(caret, args);
      }
    });
    return this;
  }

  clear() {
    const { data } = storage.get(this);
    data.size = data.height = 0;
    data.children.length = 0;
  }

  createCaret() {
    const caret = new __WEBPACK_IMPORTED_MODULE_3_Caret__["a" /* default */](this);
    this.carets.push(caret);
    if (this.isFocused) {
      this.dom.caretsContainer.appendChild(caret.node);
    }
    return caret;
  }

  createLayer(...args) {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16_helpers_layers__["b" /* createLayer */])(this, args);
  }

  createReadStream() {
    const transform = this.getOption('trimTrailingSpaces') ? rightTrim : __WEBPACK_IMPORTED_MODULE_17_helpers_index__["o" /* defaultFormatter */];
    return new ReadStream(this, transform);
  }

  each(func) {
    const { data } = storage.get(this);
    data.foreach(func);
  }

  eachCaret(func, startIndex) {
    const { history } = storage.get(this);
    history.stage();
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["p" /* eachRight */])(this.carets, func, this, startIndex);
    history.commit();
    return this;
  }

  eachLinkedDoc(func) {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["p" /* eachRight */])(this.linkedDocs, func, this);
  }

  eachVisibleLines(func) {
    const { view } = this;
    for (let i = 0; i < view.length; i++) {
      func.call(this, view[i].line, view.from + i);
    }
  }

  fill() {
    const { view, editor } = this;

    if (!editor) {
      return null;
    }

    let dl = view.length ? view.lastLine().next() : this.get(0);
    let topMargin = this.scrollTop - this.sizes.scrollTop;
    let bottomMargin = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["q" /* computeCodeReserve */])(this) - topMargin;
    const margin = editor.getOption('viewportMargin');
    const oldTopMargin = topMargin;

    if (bottomMargin < margin) {
      while (dl && bottomMargin < margin) {
        const lv = view.push(new __WEBPACK_IMPORTED_MODULE_8_LineView__["a" /* default */]());
        view.link(lv, dl);
        bottomMargin += dl.height;
        dl = lv.tail().next(true);
      }
    } else {
      while (bottomMargin - this.sizes.font.height > margin) {
        const popped = view.pop();
        bottomMargin -= popped.line.height;
      }
    }
    if (dl && topMargin < margin) {
      dl = view.firstLine().prev(true);
      while (dl && topMargin < margin) {
        const lv = view.unshift(new __WEBPACK_IMPORTED_MODULE_8_LineView__["a" /* default */]());
        view.link(lv, dl);
        topMargin += dl.height;
        dl = dl.prev(true);
      }
    } else {
      while (topMargin - this.sizes.font.height > margin) {
        const shifted = view.shift();
        topMargin -= shifted.line.height;
      }
    }
    if (oldTopMargin !== topMargin) {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["c" /* scrollCodeTopMargin */])(this, oldTopMargin - topMargin);
    }
    return this;
  }

  findCaretAt({ line, column }, boundary = true) {
    for (const caret of this.carets) {
      if (caret.inSelection({ line, column }, boundary)) {
        return caret;
      }
    }
  }

  focus() {
    if (!this.isFocused) {
      this.isFocused = true;
      startBlinking(this, this.getOptions());
      this.eachCaret(caret => {
        this.dom.caretsContainer.appendChild(caret.node);
        caret.focus();
      });
      this.emit('focus');
    }
  }

  get(i) {
    const { data } = storage.get(this);
    return data.get(i);
  }

  getOption(key) {
    return this.editor && this.editor.getOption(key);
  }

  getOptions(pick) {
    return this.editor && this.editor.getOptions(pick);
  }

  getSelection() {
    const parts = [];
    const carets = [...this.carets];
    carets.map(caret => caret.head()).sort(__WEBPACK_IMPORTED_MODULE_14_statics__["comparePos"]);
    for (const caret of carets) {
      const selection = caret.getSelection();
      if (selection) {
        parts.push(selection);
      }
    }
    return parts.join('');
  }

  getState(pos) {
    const line = pos && this.get(pos.line);

    if (!line || !this.editor) {
      return null;
    }

    const previousLine = line.prev();
    const state = previousLine ? previousLine.state : this.mode.initialState();
    const options = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["d" /* getParseDefaults */])(this, {
      lineIndex: pos.line,
      end: pos.column
    });
    return __WEBPACK_IMPORTED_MODULE_5_Parser__["a" /* default */].parse(line.text, state, options);
  }

  getValue(lineEnding) {
    const r = [];
    const transform = this.getOption('trimTrailingSpaces') ? rightTrim : __WEBPACK_IMPORTED_MODULE_17_helpers_index__["o" /* defaultFormatter */];
    const joiner = lineEnding || this.getOption('lineEnding') || '\n';
    this.each((line, index) => r[index] = transform(line.text));
    return r.join(joiner);
  }

  height() {
    const { data } = storage.get(this);
    return data.height;
  }

  init(source, mode) {
    const store = storage.get(this);
    const data = new __WEBPACK_IMPORTED_MODULE_10_LinesTree__["a" /* default */]();
    // if (this.view.to !== -1) clearDoc(this);
    if (store.data) {
      this.scrollTo(0, 0);
    }

    store.data = data;
    this.insert(0, source);
    mode && this.setMode(mode);
    return this;
  }

  insert(at, text = '') {
    const store = storage.get(this);
    const textLines = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["h" /* isArray */])(text) ? text : text.split(__WEBPACK_IMPORTED_MODULE_9_consts__["b" /* EOL */]);
    const fontHeight = this.sizes.font.height;
    const lines = textLines.map(textLine => {
      const line = new __WEBPACK_IMPORTED_MODULE_1_Line__["a" /* default */](textLine, fontHeight);
      if (textLine.length > store.maxLineLength) {
        store.maxLine = line;
        store.maxLineLength = textLine.length;
        store.maxLineChanged = true;
      }
      return line;
    });

    store.data.insert(at, lines);

    if (this.editor) {
      const view = this.view;
      let scrollDelta;

      if (at < view.from) {
        view.from += lines.length;
        view.to += lines.length;
        scrollDelta = this.sizes.font.height * lines.length;
      } else if (at <= view.to + 1) {
        scrollDelta = view.render(lines[0], at - view.from);
      }
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["c" /* scrollCodeTopMargin */])(this, scrollDelta);
      this.fill();
      this.updateView();
    }
    return lines;
  }

  insertText(...args) {
    return this.replaceRange(...args);
  }

  isEmpty() {
    return this.size() === 1 && !this.get(0).text;
  }

  isLineVisible(dl) {
    const { view } = this;
    const line = typeof dl === 'number' ? this.get(dl) : dl;
    return view.indexOf(line) >= 0;
  }

  lineWithOffset(offset) {
    const { data } = storage.get(this);
    return data.getLineWithOffset(Math.max(0, Math.min(offset, data.height)));
  }

  makeCarets(n) {
    if (typeof n !== 'number') {
      throw new TypeError('makeCarets: first argument should be a number!');
    }
    if (n > this.carets.length) this.carets.length = n;else for (; this.carets.length < n;) this.createCaret();
  }

  makeChange(change, reverse) {
    if (this.pushingChanges) {
      return;
    }
    const arr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["h" /* isArray */])(change) ? change : [change];
    this.resetCarets();
    for (let i = arr.length - 1, j = 0; i >= 0; i--) {
      if (reverse) {
        arr[i] = reverseChange(arr[i]);
      }
      const action = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_13_helpers_history__["a" /* getHistoryAction */])(arr[i].type);
      if (action) {
        if (action.make.length > 1) {
          action.make.call(this, j ? this.createCaret() : this.carets[j++], arr[i]);
        } else {
          action.make.call(this, arr[i]);
        }
      }
    }
    return this;
  }

  measurePosition(x, y) {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15_helpers_measurement__["a" /* measurePosition */])(this, x, y);
  }

  measureRect(line, offset, to) {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_15_helpers_measurement__["b" /* measureRect */])(this, line, offset, to);
  }

  parse(line, state) {
    const start = state ? { line, state } : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["e" /* findLineAndState */])(this.mode, line);
    let tmp = start.line,
        tmpState = start.state;

    for (; tmp; tmp = tmp.next()) {
      const opts = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["d" /* getParseDefaults */])(this, {
        lineIndex: tmp.getIndex()
      });
      const task = __WEBPACK_IMPORTED_MODULE_5_Parser__["a" /* default */].parse(tmp.text, tmpState, opts);

      tmp.state = tmpState = task.state;
      tmp.cache = task.cache;
      tmp.text = task.stream.value; // use transformed text
      tmp.updateView();

      if (tmp === line) {
        return task;
      }
    }
    return null;
  }

  print() {
    const { sizes, dom } = this;
    this.fill();
    this.updateView();
    runBackgroundParser(this, true);
    sizes.paddingTop = parseInt(dom.screen.style.paddingTop, 10) || 5;
    sizes.paddingLeft = parseInt(dom.screen.style.paddingLeft, 10) || 10;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["r" /* schedule */])(() => cp && cp.emit('ready'));
  }

  process(line) {
    line.cache ? line.updateView() : this.parse(line);
  }

  pushChange(change) {
    if (!change || this.pushingChanges) {
      return;
    }
    const { history } = storage.get(this);
    this.pushingChanges = true;
    history.push(change);
    runBackgroundParser(this);
    this.emit('changed', change);
    this.eachLinkedDoc(doc => doc.makeChange(change));
    this.pushingChanges = false;
    return change;
  }

  redo() {
    const { history } = storage.get(this);
    return history.redo();
  }

  redoAll() {
    while (this.redo());
  }

  remove(at, n) {
    const { data } = storage.get(this);

    if (typeof n !== 'number' || n <= 0 || at < 0 || at + n > data.size) {
      return;
    }
    const view = this.view;
    const h = data.height;
    const rm = data.remove(at, n);
    let sd = 0;

    if (at + n < view.from) {
      // handle change above the viewport
      sd = data.height - h;
      view.from -= n;
      view.to -= n;
    } else if (at <= view.to) {
      // handle change within the viewport
      const max = Math.max(view.from, at);
      const m = max - at;
      const firstLineView = rm[m].view;
      const i = view.indexOf(firstLineView);
      const next = data.get(at);

      for (let j = 0; j < m; j++) {
        sd -= rm[j].height;
      }
      view.from -= m;
      view.to -= m;
      sd += view.render(next, i);
    }
    if (sd) {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["c" /* scrollCodeTopMargin */])(this, sd);
      this.scroll(0, sd);
    }
    this.updateView();
    return rm;
  }

  removeLayer(layer) {
    const { layers } = storage.get(this);
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_16_helpers_layers__["c" /* removeLayer */])(this, layers, layer);
  }

  removeRange(from, to) {
    return this.replaceRange('', from, to);
  }

  replaceRange(text, from, to) {
    const change = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["f" /* replaceRange */])(this, text, from, to);
    if (change) {
      this.pushChange(change);
      return change.removed;
    }
  }

  reset() {
    let line = this.get(0);
    if (line) {
      do {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["s" /* clearLine */])(line);
      } while (line = line.next());
    }
  }

  resetCarets(all) {
    const startIndex = all ? 0 : 1;
    this.eachCaret(caret => {
      caret.clearSelection();
      caret.blur();
      this.dom.caretsContainer.removeChild(caret.node);
    }, startIndex);
    this.carets.length = startIndex;
    return this.carets[0];
  }

  scheduledEach(onEach, onFinished) {
    const queue = 1000;
    let line = this.get(0);
    let index = 0;

    const fn = () => {
      let j = 0;
      while (line && j++ < queue) {
        line = onEach.call(this, line, index++) === false ? false : line.next();
      }
      if (!line) {
        typeof onFinished === 'function' && onFinished.call(this, index, line);
        return false;
      }
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["r" /* schedule */])(fn);
    };

    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["r" /* schedule */])(fn);
  }

  scroll(deltaX, deltaY) {
    const scroll = this.dom.scroll;

    if (deltaX) {
      const sl = Math.max(0, Math.min(this.scrollLeft + deltaX, scroll.scrollWidth - scroll.offsetWidth));

      if (this.scrollLeft !== sl) {
        this._lockedScrolling = true;
        this.dom.scroll.scrollLeft = this.scrollLeft = sl;
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["g" /* realignHorizontally */])(this);
      }
    }
    if (deltaY) {
      const st = Math.max(0, Math.min(this.scrollTop + deltaY, scroll.scrollHeight - scroll.offsetHeight));

      if (this.scrollTop !== st) {
        this._lockedScrolling = true;

        let top = this.scrollTop + deltaY - this.sizes.scrollTop;
        const margin = this.editor.getOption('viewportMargin');
        const view = this.view;
        const oldTop = top;

        if ((deltaY < -200 || 200 < deltaY) && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["h" /* rewind */])(this, st) !== false) {
          return;
        }

        if (deltaY > 0) {
          if (top < margin) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["i" /* maybeAppendLineViews */])(this, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["q" /* computeCodeReserve */])(this) - top, margin);
          } else {
            let shifted;
            while (top > margin && (shifted = view.scrollDown())) {
              top -= shifted.line.height;
            }
          }
        } else if (deltaY < 0) {
          const bottom = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["q" /* computeCodeReserve */])(this) - top;
          if (top > margin) {
            __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["i" /* maybeAppendLineViews */])(this, bottom, margin);
          } else {
            let popped;
            while (top < margin && (popped = view.scrollUp())) {
              top += popped.line.height;
            }
          }
        }
        scroll.scrollTop = this.scrollTop = st;
        if (oldTop !== top) {
          __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["c" /* scrollCodeTopMargin */])(this, oldTop - top);
        }
      }
    }
  }

  scrollTo(sl, st) {
    return this.scroll(Math.round(sl - this.scrollLeft), Math.round(st - this.scrollTop));
  }

  search(search, scroll = false) {
    // TODO
  }

  setMode(modeName) {
    return CodePrinter.requireMode(modeName).then(mode => {
      const newMode = mode instanceof __WEBPACK_IMPORTED_MODULE_2_Mode__["a" /* default */] ? mode : CodePrinter.getMode('plaintext');
      if (this.mode !== newMode) {
        this.reset();
        this.mode = newMode;
        this.emit('modeChanged', newMode);
        this.editor && this.print();
        return newMode;
      }
      return null;
    }).catch(error => {
      console.error(error.stack);
      return null;
    });
  }

  size() {
    const { data } = storage.get(this);
    return data.size;
  }

  somethingSelected() {
    for (const caret of this.carets) if (caret.hasSelection()) return true;
    return false;
  }

  substring(a, b) {
    const from = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14_statics__["normalizePos"])(this, a);
    const to = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14_statics__["normalizePos"])(this, b);
    if (!from || !to || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_14_statics__["comparePos"])(from, to) > 0) {
      return '';
    }

    const line = this.get(from.line);
    if (from.line === to.line) {
      return line.text.substring(from.column, to.column);
    }
    const parts = [line.text.substr(from.column)];
    let i = from.line;
    let tmp = line;
    while ((tmp = tmp.next()) && ++i < to.line) {
      parts.push(tmp.text);
    }
    if (tmp) {
      parts.push(tmp.text.substring(0, to.column));
    }
    return parts.join(this.getOption('lineEnding') || '\n');
  }

  textAt(line) {
    const dl = this.get(line);
    return dl ? dl.text : null;
  }

  updateView(forceCountersWidth) {
    if (!this.dom.mainNode.parentNode) {
      return;
    }
    const view = this.view;
    const lines = view.children;
    const cw = maybeUpdateCountersWidth(this, forceCountersWidth);

    for (let i = 0, lv = lines[i]; i < view.length; lv = lines[++i]) {
      view.setCounter(lv, view.from + i, cw);
      if (lv.change) {
        this.process(lv.line);
      }
      if (this.sizes.font.height !== lv.line.height || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_18_helpers_document__["j" /* cacheHasFontStyle */])(lv.line.cache)) {
        updateLineHeight(this, lv.line);
      }
    }
    const store = storage.get(this);
    if (store.maxLineChanged) {
      if (!store.maxLine) {
        const dl = data.get(0);
        store.maxLine = dl;
        store.maxLineLength = dl.text.length;

        while (dl = dl.next()) {
          if (dl.text.length > store.maxLineLength) {
            store.maxLine = dl;
            store.maxLineLength = dl.text.length;
          }
        }
      }
      store.maxLineChanged = false;
      const minWidth = externalMeasure(this, maxLine).pre.offsetWidth;
      if (this.sizes.minWidth !== minWidth) {
        this.dom.screen.style.minWidth = (this.sizes.minWidth = minWidth) + 'px';
      }
    }
    updateHeight(this);
    return this.emit('viewUpdated');
  }

  undo() {
    const { history } = storage.get(this);
    return history.undo();
  }

  undoAll() {
    while (this.undo());
  }
}

function applySizes(doc) {
  const { dom, sizes } = doc;
  if (!sizes.minHeight) {
    updateHeight(doc);
  } else {
    dom.wrapper.style.minHeight = sizes.minHeight + 'px';
  }
  updateCountersWidth(doc, doc.sizes.countersWidth);
  dom.screen.style.minWidth = sizes.minWidth + 'px';
  dom.scroll.scrollTop = doc.scrollTop | 0;
  dom.scroll.scrollLeft = doc.scrollLeft | 0;
}

function maybeUpdateCountersWidth(doc, force) {
  const last = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["t" /* lineNumberFor */])(doc.editor, doc.size() - 1);
  if (force || doc.editor.getOption('lineNumbers') && last.length !== doc.sizes.lastLineNumberLength) {
    const measure = doc.measure.node.firstChild;
    measure.firstChild.innerHTML = last;
    const width = measure.firstChild.offsetWidth;
    doc.sizes.lastLineNumberLength = last.length;
    updateCountersWidth(doc, width);
    return width;
  }
}

function prepareSelNode(overlay, node, top, left, width, height, right) {
  const div = node || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["d" /* createNode */])(null, 'div');
  let style = 'top:' + top + 'px;left:' + left + 'px;height:' + height + 'px;';
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_17_helpers_index__["j" /* addClass */])(div, 'cp-selection');
  if (typeof width === 'number') style += 'width:' + width + 'px;';
  if (typeof right === 'number') style += 'right:' + right + 'px;';
  div.setAttribute('style', style);
  div.parentNode || overlay.node.appendChild(div);
  return div;
}

function runBackgroundParser(doc, whole) {
  if (doc.parsing === true) {
    return;
  }
  console.time('parse');
  let state = doc.mode.initialState();
  const to = whole ? doc.size() - 1 : doc.view.to;
  const onEach = (line, index) => {
    if (index > to) return false;
    doc.parse(line, state);
    state = line.state;
  };
  const onFinished = () => {
    doc.parsing = false;
    console.timeEnd('parse');
  };

  doc.parsing = true;
  doc.scheduledEach(onEach, onFinished);
}

function startBlinking(doc, options) {
  clearInterval(doc.caretsBlinkingInterval);

  if (options.blinkCaret) {
    const container = doc.dom.caretsContainer;
    let v = true;

    if (options.caretBlinkRate > 0) {
      container.style.visibility = '';
      doc.caretsBlinkingInterval = setInterval(() => {
        let tick = (v = !v) ? '' : 'hidden';
        if (__WEBPACK_IMPORTED_MODULE_4_Flags__["a" /* default */].isKeyDown || __WEBPACK_IMPORTED_MODULE_4_Flags__["a" /* default */].isMouseDown) {
          tick = '';
          v = true;
        }
        container.style.visibility = tick;
      }, options.caretBlinkRate);
    } else if (options.caretBlinkRate < 0) {
      container.style.visibility = 'hidden';
    }
  }
}

function updateCountersWidth(doc, width) {
  if (!doc) return;
  doc.sizes.countersWidth = width;
  doc.dom.counter.style.width = width + 'px';
  doc.dom.wrapper.style.marginLeft = width + 'px';
}

function updateHeight(doc) {
  const minHeight = doc.height() + 2 * doc.sizes.paddingTop;
  const dom = doc.dom;
  if (dom && doc.sizes.minHeight !== minHeight) {
    dom.wrapper.style.minHeight = minHeight + 'px';
    doc.sizes.minHeight = minHeight;
  }
}

function updateScroll(doc) {
  if (doc.view.length) {
    const o = doc.view.firstLine().getOffset();
    doc.dom.code.style.top = (doc.sizes.scrollTop = o) + 'px';
  }
}

/* harmony default export */ __webpack_exports__["a"] = Document;

/***/ }),
/* 23 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_index__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_historyActions__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_helpers_history__ = __webpack_require__(12);






class History {
  constructor(doc) {
    this.doc = doc;
    this.lock = false;
    this.done = [];
    this.undone = [];
    this.staged = undefined;
  }

  commit() {
    if (this.staged && this.staged.length) {
      if (this.undone.length) this.undone.length = 0;
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_history__["b" /* historyPush */])(this, this.done, this.staged);
    }
    this.staged = undefined;
  }

  getChanges(stringify) {
    const obj = { done: this.done, undone: this.undone, staged: this.staged };
    return stringify ? JSON.stringify(obj) : __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["a" /* copy */])(obj);
  }

  perform(change) {
    if (change) {
      this.lock = true;
      this.doc.makeChange(change);
      this.lock = false;
    }
    return !!change;
  }

  push(state) {
    if (!this.lock && state && __WEBPACK_IMPORTED_MODULE_1_historyActions__["a" /* default */][state.type]) {
      const copiedState = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_history__["c" /* copyState */])(state);
      if (this.staged) return this.staged.push(copiedState);
      if (this.undone.length) this.undone.length = 0;
      return this.done.push(copiedState);
    }
  }

  redo() {
    return this.perform(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_history__["d" /* historyMove */])(this, this.undone, this.done));
  }

  setChanges(data) {
    if (data && data.done && data.undone) {
      try {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_history__["e" /* checkSupport */])(data.done);
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_history__["e" /* checkSupport */])(data.undone);
        data.staged && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_history__["e" /* checkSupport */])(data.staged);
      } catch (e) {
        throw e;
      }
      this.done = data.done;
      this.undone = data.undone;
      this.staged = data.staged;
    }
  }

  stage() {
    this.staged = [];
  }

  undo() {
    return this.perform(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_history__["d" /* historyMove */])(this, this.done, this.undone));
  }
}

/* harmony default export */ __webpack_exports__["a"] = History;

/***/ }),
/* 24 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Marker__ = __webpack_require__(27);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_EventEmitter__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_helpers_index__ = __webpack_require__(0);






class Layer extends __WEBPACK_IMPORTED_MODULE_1_EventEmitter__["a" /* default */] {
  constructor(classes) {
    super();
    this.parent = null;
    this.node = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["d" /* createNode */])(null, 'div', __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["i" /* classArray */])('cp-layer', classes));
    this.markers = new Map();
    return this;
  }

  get doc() {
    return this.parent && this.parent.doc || this.parent;
  }

  mark(markerId, range) {
    const marker = this.markers.get(markerId) || new __WEBPACK_IMPORTED_MODULE_0_Marker__["a" /* default */](this);
    marker.mark(range);
    this.markers.set(markerId, marker);
    this.node.appendChild(marker.node);
    this.show();
  }

  clear(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      this.node.removeChild(marker.node);
      this.markers.delete(markerId);
    }
  }

  clearAll() {
    for (const [, marker] of this.markers) {
      this.node.removeChild(marker.node);
    }
    this.markers.clear();
  }

  hide() {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["j" /* addClass */])(this.node, 'cp-hidden');
  }

  show() {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["k" /* removeClass */])(this.node, 'cp-hidden');
  }
}

function getDocument(parent) {
  return parent.doc || parent;
}

function deleteLayerNode(layer, nodeId, node) {
  if (layer.nodes.delete(nodeId) && node.parentNode) {
    node.parentNode.removeChild(node);
    return true;
  }
  return false;
}

function prepareLayerNode(layer, nodeId, tagName) {
  const node = layer.get(nodeId);
  if (!node || node.tagName.toLowerCase() !== tagName.toLowerCase()) {
    node && deleteLayerNode(layer, nodeId, node);
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_index__["d" /* createNode */])(null, tagName);
  }
  return node;
}

function updateLayerNode(node, { className, style }) {
  node.className = className;

  if (style) {
    const keys = Object.keys(style);
    for (const key of keys) {
      const value = style[key];
      node.style[key] = typeof value === 'number' ? `${value}px` : value || '';
    }
  } else {
    node.setAttribute('style', '');
  }
}

/* harmony default export */ __webpack_exports__["a"] = Layer;

/***/ }),
/* 25 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_view__ = __webpack_require__(15);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_index__ = __webpack_require__(0);





class Line {
  constructor(text, height) {
    this.text = text;
    this.height = height;
    this.parent = this.view = null;
    this.cache = this.state = null;
    return this;
  }

  setText(str) {
    if (this.text !== str) {
      this.text = str;
      this.cache = null;
      if (this.view) this.view.change = true;
    }
  }

  getOffset() {
    if (!this.parent) return 0;
    var child = this,
        parent = this.parent,
        total = 0,
        i;
    do {
      i = parent.children.indexOf(child);
      while (--i >= 0) total += parent.children[i].height | 0;
      child = parent;
      parent = parent.parent;
    } while (parent);
    return total;
  }

  getIndex() {
    if (!this.parent) return -1;
    var child = this,
        parent = this.parent,
        total = 0,
        i;
    do {
      i = parent.children.indexOf(child);
      if (parent.isLeaf) total += i;
      while (--i >= 0) total += parent.children[i].size | 0;
      child = parent;
      parent = parent.parent;
    } while (parent);
    return total;
  }

  addClass(className) {
    if (!this.classes) this.classes = [];
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["x" /* arrayAdd */])(this.classes, className);
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_view__["a" /* touch */])(this);
  }

  removeClass(className) {
    if (this.classes) {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["y" /* arrayRemove */])(this.classes, className);
      if (this.classes.length === 0) this.classes = undefined;
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_view__["a" /* touch */])(this);
    }
  }

  next(skipMerged) {
    if (!this.parent) return;
    if (skipMerged && this.merged) return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["u" /* last */])(this.merged).next();
    var siblings = this.parent.children,
        i = siblings.indexOf(this);
    if (i + 1 < siblings.length) return siblings[i + 1];else {
      var next = this.parent.next();
      return next && next.children[0];
    }
  }

  prev(skipMerged) {
    if (!this.parent) return;
    var siblings = this.parent.children,
        i = siblings.indexOf(this),
        dl;
    if (i > 0) dl = siblings[i - 1];else {
      var prev = this.parent.prev();
      dl = prev && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["u" /* last */])(prev.children);
    }
    return dl && skipMerged && dl.mergedWith || dl;
  }

  updateView() {
    if (this.view) {
      this.view.update(this.text, this.cache);
    }
  }
}

/* harmony default export */ __webpack_exports__["a"] = Line;

/***/ }),
/* 26 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Branch__ = __webpack_require__(18);




class LinesTree extends __WEBPACK_IMPORTED_MODULE_0_Branch__["a" /* default */] {
  constructor() {
    const branch = new __WEBPACK_IMPORTED_MODULE_0_Branch__["a" /* default */](true, []);
    super(false, [branch]);
    branch.parent = this;
  }
}

/* harmony default export */ __webpack_exports__["a"] = LinesTree;

/***/ }),
/* 27 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_statics__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_index__ = __webpack_require__(0);





class Marker {
  constructor(layer) {
    this.layer = layer;
    this.range = { from: null, to: null };
    this.node = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["d" /* createNode */])(null, 'div', 'cp-marker');
    this.throttle = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["l" /* throttle */])();
  }

  mark({ from, to }) {
    return this.throttle(() => {
      const doc = this.layer.doc;
      const firstLine = doc.get(from.line);
      const lastLine = doc.get(to.line);
      const fromMeasure = doc.measureRect(firstLine, from.column);
      const toMeasure = doc.measureRect(lastLine, to.column);
      const pl = doc.sizes.paddingLeft;
      const equal = from.line === to.line;

      if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["comparePos"])(from, to) > 0) {
        return;
      }

      this.top = markerNode(this, this.top, fromMeasure.offsetY, fromMeasure.offsetX, equal && fromMeasure.offsetY === toMeasure.offsetY ? 0 : null, fromMeasure.height, pl);

      this.middle = markerNode(this, this.middle, fromMeasure.offsetY + fromMeasure.height, pl, null, toMeasure.offsetY - fromMeasure.offsetY - fromMeasure.height, pl);

      if (equal && fromMeasure.offsetY === toMeasure.offsetY) {
        this.bottom = markerNode(this, this.bottom, toMeasure.offsetY, fromMeasure.offsetX, toMeasure.offsetX - fromMeasure.offsetX, fromMeasure.height, null);
      } else {
        this.bottom = markerNode(this, this.bottom, toMeasure.offsetY, pl, toMeasure.offsetX - pl, toMeasure.charHeight, null);
      }
    });
  }
}

function markerNode(marker, node, top, left, width, height, right) {
  const div = node || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["d" /* createNode */])(null, 'div', 'cp-marker-piece');
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["m" /* setNodeStyles */])(div, { top, left, width, height, right });
  div.parentNode || marker.node.appendChild(div);
  return div;
}

/* harmony default export */ __webpack_exports__["a"] = Marker;

/***/ }),
/* 28 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_EventEmitter__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_index__ = __webpack_require__(0);





class Overlay extends __WEBPACK_IMPORTED_MODULE_0_EventEmitter__["a" /* default */] {
  constructor(classes) {
    super();
    this.node = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["d" /* createNode */])(null, 'div', __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["i" /* classArray */])('cp-overlay', classes));
    return this;
  }

  show() {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["k" /* removeClass */])(this.node, 'cp-hidden');
  }

  hide() {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["j" /* addClass */])(this.node, 'cp-hidden');
  }
}

/* unused harmony default export */ var _unused_webpack_default_export = Overlay;

/***/ }),
/* 29 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_statics__ = __webpack_require__(1);


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };



class ParsingTask {
  constructor(stream, state, options) {
    this.options = options || {};
    this.state = state ? copyState(this.initialMode, state) : this.initialMode.initialState();
    this.stream = stream;
    this.cache = [];
    this.indent = null;
  }

  get mode() {
    const state = this.state;
    return this.state.mode || this.options.mode;
  }

  get initialMode() {
    return this.options.mode;
  }

  get currentIterator() {
    const state = this.state;
    return state.iterators && state.iterators.iterator || this.mode.iterator;
  }

  get range() {
    const { options, stream } = this;
    const lineIndex = options.lineIndex;
    return {
      from: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(lineIndex, stream.start),
      to: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(lineIndex, stream.pos)
    };
  }

  passthrough(mode, beforeIteration) {
    if (!mode || typeof beforeIteration !== 'function') {
      throw new Error('Received incompatible arguments!');
    }

    const state = this.state;
    const oldMode = state.mode;
    const oldContext = state.context;
    const iterator = (stream, state) => {
      if (beforeIteration(stream, state) !== false) {
        return mode.iterator(stream, state);
      }
      state.mode = oldMode;
      state.context = oldContext;
      this.pop();
    };

    if (this.mode.initialState !== mode.initialState) {
      const initial = mode.initialState();
      for (const key in initial) {
        if (state[key] == null) {
          state[key] = initial[key];
        }
      }
      if (initial.context && oldContext) {
        state.context = initial.context;
        state.context.indent = oldContext.indent;
        state.context.prev = oldContext;
      }
    }
    state.mode = mode;
    this.push(iterator);
  }

  push(iterator) {
    const state = this.state;
    state.iterators = { prev: state.iterators, iterator: iterator };
    return iterator;
  }

  pop() {
    const state = this.state;
    if (state.iterators) {
      const iterator = state.iterators.iterator;
      state.iterators = state.iterators.prev;
      return iterator;
    }
  }

  replace(iterator) {
    const state = this.state;
    if (state.iterators) {
      state.iterators.iterator = iterator;
    }
  }

  use(iterator) {
    return this.push(iterator).call(this, this.stream, this.state);
  }

  hasIterator(iterator) {
    let tmp = this.state.iterators;
    while (tmp) {
      if (tmp.iterator === iterator) return true;
      tmp = tmp.prev;
    }
    return false;
  }

  pushContext(type, extend = {}) {
    const prev = this.state.context;
    const indent = this.state.indent + 1;
    const start = this.range;
    this.state.context = _extends({ type, prev, indent, start }, extend);
  }

  popContext() {
    const state = this.state;
    const context = state.context;

    if (context && context.prev) {
      context.end = this.range;
      state.indent = context.indent - 1;
      state.context = context.prev;
    }
  }
}

function copyState(mode, state) {
  if (mode.copyState) {
    return mode.copyState(state);
  }
  const st = Object.create(null);
  const keys = state ? Object.keys(state) : [];
  for (const key of keys) {
    if (state[key] != null) {
      st[key] = state[key];
    }
  }
  return st;
}

/* harmony default export */ __webpack_exports__["a"] = ParsingTask;

/***/ }),
/* 30 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

class Stream {
  constructor(value) {
    this.pos = 0;
    this.value = value;
    this.length = value.length;
  }

  next() {
    if (this.pos < this.value.length) {
      return this.value.charAt(this.pos++);
    }
  }

  at(offset) {
    return this.value.charAt(this.pos + (offset | 0));
  }

  peek() {
    return this.at(0);
  }

  from(pos) {
    return this.value.substring(pos, this.pos);
  }

  rest(length) {
    return this.value.substr(this.pos, length);
  }

  sol() {
    return this.pos === 0;
  }

  eol() {
    return this.pos >= this.value.length;
  }

  eat(match) {
    var type = typeof match,
        ch = this.at(0),
        eaten;
    if ('string' === type) eaten = ch === match;else eaten = ch && ('function' === type ? match(ch) : match.test(ch));
    if (eaten) {
      ++this.pos;return ch;
    }
  }

  eatChar() {
    const char = this.at(0);
    if (char) ++this.pos;
    return char;
  }

  eatChain(chain) {
    const eaten = this.value.startsWith(chain, this.pos);
    if (eaten) this.pos += chain.length;
    return eaten;
  }

  eatWhile(match) {
    var pos = this.pos,
        type = typeof match;
    if ('function' === type) for (var v = this.value; this.pos < v.length && match(v[this.pos]); this.pos++);else while (this.eat(match));
    return this.from(pos);
  }

  eatUntil(match, noLeftContext) {
    var pos = this.pos;
    if (match instanceof RegExp) {
      if (match.test(this.value.substr(this.pos))) {
        var lc = RegExp.leftContext.length;
        if (!noLeftContext || lc === 0) {
          this.pos += lc + RegExp.lastMatch.length;
        }
      }
    }
    return this.from(pos);
  }

  match(match, eat, caseSensitive) {
    var type = typeof match;
    if ('string' === type) {
      var cs = function (str) {
        return caseSensitive ? str.toLowerCase() : str;
      };
      var substr = this.value.substr(this.pos, match.length);
      if (cs(substr) === cs(match)) {
        if (eat) this.pos += match.length;
        return true;
      }
    } else {
      var ex = match.exec(this.value.substr(this.pos));
      if (ex && ex.index > 0) return null;
      if (ex && eat) this.pos += ex[0].length;
      return ex;
    }
  }

  proceed() {
    this.start = this.pos;
  }

  take(match) {
    var v = this.value.substr(this.pos),
        lm = '';
    if (match.test(v) && !RegExp.leftContext) this.pos += (lm = RegExp.lastMatch).length;
    return lm;
  }

  transform(to) {
    const current = this.from(this.start);
    this.value = this.value.substring(0, this.start) + to + this.value.substr(this.pos);
    this.pos = this.start + to.length;
    this.length = this.value.length;
  }

  capture(match, index) {
    if (match instanceof RegExp) {
      var m = match.exec(this.value.substr(this.pos));
      if (m) return m[index || 0];
    }
  }

  isAfter(match) {
    var str = this.value.substr(this.pos);
    return typeof match === 'string' ? str.startsWith(match) : match.test ? match.test(str) : match(str);
  }

  isBefore(match, offset) {
    var str = this.value.substring(0, this.pos + (offset || 0));
    return typeof match === 'string' ? str.startsWith(match, str.length - match.length) : match.test ? match.test(str) : match(str);
  }

  skip(ch) {
    if (ch) {
      var i = this.value.indexOf(ch, this.pos);
      if (i === -1) return false;
      this.pos = i + ch.length;
    } else this.pos = this.value.length;
    return true;
  }

  skipTo(str) {
    const i = this.value.indexOf(str, this.pos);
    if (i === -1) {
      this.pos = this.value.length;
      return false;
    }
    this.pos = i + str.length;
    return true;
  }

  undo(n) {
    const m = n == null ? 1 : n;
    this.pos = Math.max(0, this.pos - m);
  }

  undoLastSymbol(symbol) {
    if (!symbol || this.lastSymbol === symbol) {
      this.cache.pop();
    }
  }

  markDefinition(defObject) {
    this.definition = _extends({ pos: this.offset + this.start }, defObject);
  }
}

/* harmony default export */ __webpack_exports__["a"] = Stream;

/***/ }),
/* 31 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_EventEmitter__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_view__ = __webpack_require__(15);





class View extends __WEBPACK_IMPORTED_MODULE_0_EventEmitter__["a" /* default */] {
  constructor(doc) {
    super();
    this.propagateTo(doc);
    this.doc = doc;
    this.from = 0;
    this.to = -1;
    this.display = null;
    this.children = [];
  }

  get length() {
    return this.children.length;
  }

  scrollDown() {
    const next = this.lastLine().next();
    if (!next) return;
    const shifted = this.children.shift();
    ++this.from;
    this.push(shifted);
    return this.link(shifted, next);
  }

  scrollUp() {
    const prev = this.firstLine().prev();
    if (!prev) return;
    const popped = this.children.pop();
    --this.to;
    this.unshift(popped);
    return this.link(popped, prev);
  }

  each(func) {
    for (const child of this.children) {
      func.call(this, child);
    }
  }

  get(index) {
    return this.children[index];
  }

  getLine(index) {
    const lineView = this.children[index];
    return lineView && lineView.line;
  }

  indexOf(...args) {
    return this.children.indexOf(...args);
  }

  push(lineView) {
    ++this.to;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["b" /* insertLineViewNode */])(this, lineView, this.length);
    this.children.push(lineView);
    return lineView;
  }

  pop() {
    --this.to;
    const popped = this.children.pop();
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["c" /* removeLineViewNode */])(this, popped);
    return popped;
  }

  shift() {
    ++this.from;
    const shifted = this.children.shift();
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["c" /* removeLineViewNode */])(this, shifted);
    return shifted;
  }

  unshift(lineView) {
    --this.from;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["b" /* insertLineViewNode */])(this, lineView, 0);
    this.children.unshift(lineView);
    return lineView;
  }

  insert(index, lineView) {
    ++this.to;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["b" /* insertLineViewNode */])(this, lineView, index);
    this.children.splice(index, 0, lineView);
  }

  mount(display) {
    this.display = display;
    this.each(child => __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["b" /* insertLineViewNode */])(this, child, this.children.length));
  }

  unmount() {
    this.each(child => __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["c" /* removeLineViewNode */])(this, child));
    this.display = null;
  }

  height() {
    return this.children.reduce((acc, child) => {
      return acc + child.line.height;
    });
  }

  firstLine() {
    const { children } = this;
    return children.length ? children[0].line : null;
  }

  lastLine() {
    const { children } = this;
    const { length } = children;
    return length ? children[length - 1].tail() : null;
  }

  replaceLineInLineView(lineView, newLine, newLineIndex) {
    const doc = this.doc;
    this.setCounter(lineView, newLineIndex);
    this.link(lineView, newLine);
  }

  unlink(lineView) {
    const line = lineView.line;
    if (!line) {
      return;
    }
    if (lineView.line.view === lineView) {
      line.view = undefined;
      this.doc.emit('unlink', line);
    }
    lineView.line = undefined;
  }

  link(lineView, line) {
    this.unlink(lineView);
    lineView.change = true;
    lineView.line = line;
    lineView.size = 1;
    lineView.counterText = null;
    line.view = lineView;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["a" /* touch */])(line);
    this.doc.process(line);
    this.doc.emit('link', line);
    return lineView;
  }

  setCounter(lineView, lineIndex, width) {
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_view__["d" /* setCounter */])(this.doc, lineView, lineIndex, width);
  }

  render(startLine, startIndex) {
    let i = startIndex - 1;
    let next = startLine;
    let sd = 0;
    let scrolled;

    while (next && ++i < this.length) {
      this.replaceLineInLineView(this.children[i], next, this.from + i);
      next = next.next(true);
    }
    if (i + 1 < this.length) {
      while (i++ < this.length && (scrolled = this.scrollUp())) {
        sd -= scrolled.line.height;
      }
      while (i < this.length && this.pop());
    }
    return sd;
  }
}

/* harmony default export */ __webpack_exports__["a"] = View;

/***/ }),
/* 32 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_statics__ = __webpack_require__(1);


var _this = this;



function moveCaret(fn, mv) {
  return function () {
    this.doc.call('clearSelection').call(fn, mv);
  };
}

function moveSelection(fn, mv) {
  return function () {
    this.doc.eachCaret(caret => {
      caret.hasSelection() || caret.beginSelection();
    });
    this.doc.call(fn, mv);
  };
}

function caretCmd(fn) {
  return function () {
    this.doc.eachCaret(fn);
  };
}

function moveWord(dir) {
  return caretCmd(caret => {
    const match = caret.match(/\w/, dir, false);
    caret.moveX(dir * Math.max(1, match.length));
  });
}

function posNegativeCols(doc, { line, column }) {
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(line, column - doc.textAt(line).length - 1);
}

function rangeNegativeCols(doc, { from, to }) {
  return range(posNegativeCols(doc, from), posNegativeCols(doc, to));
}

function indent(caret) {
  const tabString = this.editor.getTabString();
  caret.eachLine((line, index) => singleInsert(this, line, index, tabString, 0));
  doc.pushChange({
    type: 'indent',
    range: rangeNegativeCols(doc, caret.getRange()),
    offset: 1
  });
}

function outdent(caret) {
  const tw = this.getOption('tabWidth');
  let success = false;
  caret.eachLine((line, index) => {
    const text = line.text;
    const min = Math.min(tw, text.length);
    let i = 0;
    for (; i < min && text.charAt(i) === ' '; i++);
    if (i === 0 && text.charAt(0) === '\t') i++;
    if (i > 0) {
      success = singleRemove(doc, line, index, 0, i) | true;
    }
  });
  if (success) {
    doc.pushChange({
      type: 'indent',
      range: rangeNegativeCols(doc, caret.getRange()),
      offset: -1
    });
  }
}

/* harmony default export */ __webpack_exports__["a"] = {
  moveCaretLeft: moveCaret('moveX', -1),
  moveCaretRight: moveCaret('moveX', 1),
  moveCaretUp: moveCaret('moveY', -1),
  moveCaretDown: moveCaret('moveY', 1),
  moveSelLeft: moveSelection('moveX', -1),
  moveSelRight: moveSelection('moveX', 1),
  moveSelUp: moveSelection('moveY', -1),
  moveSelDown: moveSelection('moveY', 1),
  moveToStart() {
    this.doc.resetCarets().setHead(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(0, 0));
  },
  moveToEnd() {
    this.doc.resetCarets().setHead(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(this.doc.size() - 1, -1));
  },
  moveToLineStart: caretCmd(caret => {
    caret.setHead(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(caret.line(), 0));
  }),
  moveToLineEnd: caretCmd(caret => {
    caret.setHead(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(caret.line(), -1));
  }),
  moveWordLeft: moveWord(-1),
  moveWordRight: moveWord(1),
  selectWord() {
    this.doc.call('match', /\w/);
  },
  selectLine: caretCmd(caret => {
    const head = caret.head();
    caret.setSelection(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(head.line, 0), __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(head.line + 1, 0));
  }),
  selectAll() {
    const from = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(this.doc.size(), -1);
    const to = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(0, 0);
    this.doc.resetCarets().setSelection(from, to);
  },
  pageUp() {
    this.doc.call('moveY', -50);
  },
  pageDown() {
    this.doc.call('moveY', 50);
  },
  scrollToTop() {
    this.dom.scroll.scrollTop = 0;
  },
  scrollToBottom() {
    this.dom.scroll.scrollTop = this.dom.scroll.scrollHeight;
  },
  scrollToLeft() {
    this.dom.scroll.scrollLeft = 0;
  },
  scrollToRight() {
    this.dom.scroll.scrollLeft = this.dom.scroll.scrollWidth;
  },
  removeSelection() {
    this.doc.call('removeSelection');
  },
  indent: caretCmd(indent),
  outdent: caretCmd(outdent),
  reindent() {
    this.doc.reindent();
  },
  undo() {
    this.doc.undo();
  },
  redo() {
    this.doc.redo();
  },
  toNextDef() {},
  toPrevDef() {},
  swapUp: caretCmd(caret => {
    swap(_this, caret, true);
  }),
  swapDown: caretCmd(caret => {
    swap(_this, caret, false);
  }),
  duplicate: caretCmd(caret => {
    const range = caret.getRange();
    const text = _this.substring(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(range.from.line, 0), __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(range.to.line, -1));
    caret.position(range.to.line, -1).insert('\n' + text);
  }),
  toggleLineNumbers() {
    this.setOption('lineNumbers', !this.getOption('lineNumbers'));
  },
  toggleIndentGuides() {
    this.setOption('drawIndentGuides', !this.getOption('drawIndentGuides'));
  },
  toggleMark: caretCmd(caret => {
    const dl = caret.dl();
    dl && dl.classes && dl.classes.indexOf('cp-marked') >= 0 ? dl.removeClass('cp-marked') : dl.addClass('cp-marked');
  }),
  toggleComment: caretCmd(caret => {
    var comment = _this.parser.lineComment,
        add = leftTrim(caret.textAtCurrentLine()).indexOf(comment) !== 0;
    add ? caret.eachLine(addComment(_this, comment)) : caret.eachLine(removeComment(_this, comment));
  }),
  toggleBlockComment: caretCmd(caret => {
    var commentBegin = _this.parser.blockCommentStart || '',
        commentEnd = _this.parser.blockCommentEnd || '',
        range = caret.getRange();
    if ((commentBegin || commentEnd) && range) {
      var first = _this.get(range.from.line),
          last = _this.get(range.to.line),
          firstTrimmed = leftTrim(first.text),
          lastTrimmed = rightTrim(last.text),
          fcol = first.text.length - firstTrimmed.length,
          i = firstTrimmed.indexOf(commentBegin),
          li = lastTrimmed.lastIndexOf(commentEnd);

      if (i >= 0 && li >= 0) {
        _this.removeRange(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(range.to.line, li), __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(range.to.line, li + commentEnd.length));
        _this.removeRange(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(range.from.line, fcol + i), __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(range.from.line, fcol + i + commentBegin.length));
      } else if (i === -1 && li === -1) {
        _this.insertText(commentEnd, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(range.to.line, lastTrimmed.length));
        _this.insertText(commentBegin, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(range.from.line, fcol));
      }
    }
  }),
  markSelection: caretCmd(caret => {
    const range = caret.getSelectionRange();
    range && _this.markText(range.from, range.to, {
      strong: true
    });
  }),
  increaseFontSize() {
    this.setOption('fontSize', this.getOption('fontSize') + 1);
  },
  decreaseFontSize() {
    this.setOption('fontSize', this.getOption('fontSize') - 1);
  },
  prevSearchResult() {
    this.doc.searchPrevious();
  },
  nextSearchResult() {
    this.doc.searchNext();
  },
  searchEnd() {
    this.doc.searchEnd();
  },
  toNextDefinition() {
    var caret = this.doc.resetCarets(),
        dl = caret.dl().next();
    for (; dl; dl = dl.next()) {
      if (dl.definition) {
        caret.position(dl.getIndex(), dl.definition.pos);
        return;
      }
    }
  },
  toPrevDefinition() {
    var caret = this.doc.resetCarets(),
        dl = caret.dl().prev();
    for (; dl; dl = dl.prev()) {
      if (dl.definition) {
        caret.position(dl.getIndex(), dl.definition.pos);
        return;
      }
    }
  },
  delCharLeft() {
    var tw = this.getOption('tabWidth');
    this.doc.eachCaret(function (caret) {
      if (caret.hasSelection()) return caret.removeSelection();
      var bf = caret.textBefore(),
          m = bf.match(/^ +$/),
          r = m && m[0] && m[0].length % tw === 0 ? tw : 1;
      caret.removeBefore(r);
    });
  },
  delCharRight() {
    var tw = this.getOption('tabWidth');
    this.doc.eachCaret(function (caret) {
      if (caret.hasSelection()) return caret.removeSelection();
      var af = caret.textAfter(),
          m = af.match(/^ +$/),
          r = m && m[0] && m[0].length % tw === 0 ? tw : 1;
      caret.removeAfter(r);
    });
  },
  delWordLeft() {
    this.doc.call('match', /\w/, -1);
    this.doc.call('removeSelection');
  },
  delWordRight() {
    this.doc.call('match', /\w/, 1);
    this.doc.call('removeSelection');
  },
  delToLeft: caretCmd(caret => {
    caret.removeBefore(caret.column());
  }),
  delToRight: caretCmd(caret => {
    caret.removeAfter(caret.dl().text.length - caret.column());
  }),
  delLine: caretCmd(caret => {
    caret.removeLine();
  }),
  insertNewLine: caretCmd(caret => {
    var options = _this.editor.getOptions(['autoIndent', 'tabWidth', 'indentByTabs']);
    if (options.autoIndent) {
      var head = caret.head(),
          ps = caret.getParserState(),
          indent = _this.getIndent(head),
          tw = options.tabWidth,
          tab = options.indentByTabs ? '\t' : repeat(' ', tw),
          rest = '',
          mv = 0,
          tmp;

      if (ps.parser && ps.parser.indent) {
        var nextIndent = _this.getNextLineIndent(head, true);
        if (nextIndent instanceof Array) {
          indent = nextIndent.shift();
          while (nextIndent.length) rest += '\n' + repeat(tab, indent + nextIndent.shift());
        } else if ('number' === typeof nextIndent) {
          indent = Math.max(0, nextIndent);
        }
      }
      tmp = parseIndentation(caret.textAfter(), tw);
      tab = repeat(tab, indent);
      if (tmp.indentText && tab.indexOf(tmp.indentText, tab.length - tmp.indentText.length) >= 0) tab = tab.slice(0, mv = -tmp.length);
      caret.insert('\n' + tab + rest, -rest.length - mv);
    } else {
      caret.insert('\n');
    }
  }),
  insertTab() {
    if (this.doc.somethingSelected()) {
      this.exec('indent');
    } else {
      var options = this.getOptions(['tabTriggers', 'indentByTabs', 'tabWidth']);
      this.doc.eachCaret(caret => {
        if (options.tabTriggers) {
          var head = caret.head(),
              bf = caret.match(/\S+/, -1, false),
              af = caret.match(/\S+/, 1, false),
              snippet;
          if (!af && (snippet = this.editor.findSnippet(bf, head))) {
            this.replaceRange(snippet.content, __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_statics__["pos"])(head.line, head.column - bf.length), head);
            if ('number' === typeof snippet.cursorMove) caret.moveX(snippet.cursorMove);
            return false;
          }
        }
        caret.insert(options.indentByTabs ? '\t' : repeat(' ', options.tabWidth - caret.column() % options.tabWidth));
      });
    }
  },
  esc() {
    this.isFullscreen ? this.exitFullscreen() : this.doc.searchEnd();
  }
};

/***/ }),
/* 33 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


const div = document.createElement('div');
const li = document.createElement('li');
const pre = document.createElement('pre');
const span = document.createElement('span');
const preLine = pre.cloneNode(false);

preLine.className = 'cp-line';

/* unused harmony default export */ var _unused_webpack_default_export = { div, li, pre, span, preLine };

/***/ }),
/* 34 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";


const keyCodes = {
  3: 'Enter',
  8: 'Backspace',
  9: 'Tab',
  12: 'NumLock',
  13: 'Enter',
  16: 'Shift',
  17: 'Ctrl',
  18: 'Alt',
  19: 'Pause',
  20: 'CapsLock',
  27: 'Esc',
  32: 'Space',
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',
  44: 'PrintScrn',
  45: 'Insert',
  46: 'Delete',
  59: ';',
  61: '=',
  91: 'Cmd',
  92: 'Cmd',
  93: 'Cmd',
  106: 'Multiply',
  107: 'Add',
  109: 'Subtract',
  110: 'Point',
  111: 'Divide',
  127: 'Delete',
  144: 'NumLock',
  145: 'ScrollLock',
  186: ';',
  187: '=',
  188: ',',
  189: '-',
  190: '.',
  191: '/',
  192: '`',
  219: '[',
  220: '\\',
  221: ']',
  222: '\'',
  224: 'Cmd',
  229: '/',
  63232: 'Up',
  63233: 'Down',
  63234: 'Left',
  63235: 'Right',
  63272: 'Delete',
  63273: 'Home',
  63275: 'End',
  63276: 'PageUp',
  63277: 'PageDown',
  63302: 'Insert'
};

// Numeric keys: 0-9, Num0-Num9
for (let i = 0; i < 10; i++) {
  keyCodes[i + 96] = 'Num' + i;
  keyCodes[i + 48] = String(i);
}

// Alphabetic keys: A-Z
for (let i = 65; i < 91; i++) {
  keyCodes[i] = String.fromCharCode(i);
}

// Function keys: F1-F19
for (let i = 1; i < 20; i++) {
  keyCodes[i + 111] = keyCodes[i + 63235] = 'F' + i;
}

/* harmony default export */ __webpack_exports__["a"] = keyCodes;

/***/ }),
/* 35 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_env__ = __webpack_require__(5);




const keyMaps = {};

keyMaps.basic = {
  'Backspace': 'delCharLeft',
  'Delete': 'delCharRight',
  'Alt+Backspace': 'delWordLeft',
  'Alt+Delete': 'delWordRight',
  'Shift+Backspace': 'delToLeft',
  'Shift+Delete': 'delToRight',
  'Shift+Alt+Backspace': 'delLine',
  'Shift+Alt+Delete': 'delLine',
  'Tab': 'insertTab',
  'Enter': 'insertNewLine',
  'Esc': 'esc',
  'PageUp': 'pageUp',
  'PageDown': 'pageDown',
  'End': 'moveToEnd',
  'Home': 'moveToStart',
  'Left': 'moveCaretLeft',
  'Right': 'moveCaretRight',
  'Up': 'moveCaretUp',
  'Down': 'moveCaretDown',
  'Shift+Left': 'moveSelLeft',
  'Shift+Right': 'moveSelRight',
  'Shift+Up': 'moveSelUp',
  'Shift+Down': 'moveSelDown',
  'Shift+Ctrl+W': 'selectWord'
};

keyMaps.pc = {
  'Ctrl+A': 'selectAll',
  'Ctrl+Z': 'undo',
  'Shift+Ctrl+Z': 'redo',
  fallthrough: 'basic'
};

keyMaps.mac = {
  'Cmd+A': 'selectAll',
  'Cmd+Z': 'undo',
  'Shift+Cmd+Z': 'redo',
  fallthrough: 'basic'
};

keyMaps.default = __WEBPACK_IMPORTED_MODULE_0_helpers_env__["b" /* macosx */] ? keyMaps.mac : keyMaps.pc;

/* harmony default export */ __webpack_exports__["a"] = keyMaps;

/***/ }),
/* 36 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_index__ = __webpack_require__(0);




const tokens = Object.create(null);
const tokensArray = ['bold', 'boolean', 'bracket', 'builtin', 'comment', 'constant', 'control', 'directive', 'escaped', 'external', 'function', 'hex', 'invalid', 'italic', 'keyword', 'namespace', 'numeric', 'operator', 'parameter', 'property', 'punctuation', 'regexp', 'special', 'strike', 'string', 'tab', 'underline', 'variable', 'word', 'open-tag', 'close-tag'];

for (const token of tokensArray) {
  tokens[__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_index__["g" /* camelize */])(token)] = token;
}

/* harmony default export */ __webpack_exports__["a"] = Object.freeze(tokens);

/***/ }),
/* 37 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Flags__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_statics__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_helpers_env__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_helpers_keyboard__ = __webpack_require__(40);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_helpers_index__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["a"] = attachEvents;








function attachScrollEvents(cp) {
  const { scroll, mainNode } = cp.dom;
  let isScrolling = false;
  let scrollTimeout;

  if ('ontouchstart' in window || navigator.msMaxTouchPoints > 0) {
    let x, y;
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["z" /* passive */])(scroll, 'touchstart', event => {
      y = event.touches[0].screenY;
      x = event.touches[0].screenX;
    });
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(scroll, 'touchmove', event => {
      if (x != null && y != null) {
        const touch = event.touches[0];
        const scrollSpeed = cp.getOption('scrollSpeed');
        scroll.scrollLeft += scrollSpeed * (x - (x = touch.screenX));
        cp.doc.scrollTo(scroll.scrollTop + scrollSpeed * (y - (y = touch.screenY)));
        return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["B" /* eventCancel */])(event);
      }
    });
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["z" /* passive */])(scroll, 'touchend', () => {
      x = y = null;
    });
  } else if ('onwheel' in window) {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(scroll, 'wheel', event => {
      const scrollSpeed = cp.getOption('scrollSpeed');
      return wheel(cp.doc, event, scrollSpeed, event.deltaX, event.deltaY);
    });
  } else {
    const onMouseWheel = event => {
      const d = wheelDelta(event);
      const scrollSpeed = cp.getOption('scrollSpeed');
      return wheel(cp.doc, event, wheelUnit * scrollSpeed, d.x, d.y);
    };
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(scroll, 'mousewheel', onMouseWheel);
    __WEBPACK_IMPORTED_MODULE_2_helpers_env__["c" /* gecko */] && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["z" /* passive */])(scroll, 'DOMMouseScroll', mousewheel);
  }

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["z" /* passive */])(scroll, 'scroll', () => {
    if (!cp.doc._lockedScrolling) {
      cp.doc.scroll(scroll.scrollLeft - cp.doc.scrollLeft, scroll.scrollTop - cp.doc.scrollTop);
    } else {
      if (!isScrolling) {
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["j" /* addClass */])(scroll, 'cp--scrolling');
      }
      isScrolling = true;
      cp.emit('scroll');
      scrollTimeout = clearTimeout(scrollTimeout) || setTimeout(() => {
        isScrolling = false;
        __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["k" /* removeClass */])(scroll, 'cp--scrolling');
        wheelTarget(cp.doc, null);
        cp.emit('scrollend');
      }, 200);
    }
    cp.doc._lockedScrolling = false;
  });
}

function attachInputEvents(cp) {
  const input = cp.dom.input;

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["z" /* passive */])(input, 'focus', () => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["k" /* removeClass */])(cp.dom.mainNode, 'inactive');
    cp.doc.focus();
  });

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["z" /* passive */])(input, 'blur', () => {
    if (__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].isMouseDown) {
      input.focus();
    } else {
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["j" /* addClass */])(cp.dom.mainNode, 'inactive');
      if (cp.getOption('abortSelectionOnBlur')) {
        cp.doc.call('clearSelection');
      }
      cp.doc.blur();
    }
  });

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(input, 'keydown', event => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_keyboard__["a" /* updateFlags */])(event, true);
    const code = event.keyCode;
    const key = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_keyboard__["b" /* keyName */])(event);

    if (key === (__WEBPACK_IMPORTED_MODULE_2_helpers_env__["b" /* macosx */] ? 'Cmd' : 'Ctrl')) {
      input.value = cp.doc.getSelection();
      input.setSelectionRange(0, input.value.length);
      return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["B" /* eventCancel */])(event, true);
    }
    if (__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].cmdKey) {
      if (code === 86 || code === 88) {
        cp.doc.call('removeSelection');
      }
      if (code === 67 || code === 88) {
        return;
      }
      input.value = '';
    }
    if (cp.getOption('readOnly') && (code < 37 || code > 40)) {
      return;
    }
    cp.emit(`[${key}]`, event);
    cp.emit('keydown', key, event);

    if (!event.defaultPrevented) {
      const keyMap = cp.getOption('keyMap');
      if (keyMap) {
        const cmd = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_keyboard__["c" /* lookupKey */])(key, keyMap) || event.shiftKey && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_keyboard__["c" /* lookupKey */])(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_keyboard__["b" /* keyName */])(event, true), keyMap);
        if (cmd) {
          cp.execute(cmd);
          return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["B" /* eventCancel */])(event, true);
        }
      }

      // if (!cp.keyMap[seq] && event.shiftKey) seq = keySequence(event, true);
      // if (seq.length > 1 && cp.keyMap[seq] && callKeyBinding(cp, cp.keyMap, seq)) {
      //   if ([8, 46, 127, 63272].indexOf(code) >= 0) cp.emit('keypress', '', event);
      //   return eventCancel(event, 1);
      // }
    }
  });

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(input, 'keypress', event => {
    const { readOnly, useParserKeyMap, autoIndent } = cp.getOptions();
    const ch = String.fromCharCode(event.charCode || event.keyCode);

    if (readOnly || event.ctrlKey || event.metaKey || !ch) {
      return;
    }

    cp.doc.eachCaret(caret => {
      const { mode, state, stream } = caret.getParserState();
      const head = caret.head();

      if (caret.hasSelection() && mode.selectionWrappers[ch]) {
        const wrapper = mode.selectionWrappers[ch];
        const arr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["h" /* isArray */])(wrapper) ? wrapper : [wrapper, wrapper];
        caret.wrapSelection(...arr);
      } else if (useParserKeyMap && mode.keyMap[ch]) {
        const str = mode.keyMap[ch].call(cp, stream, state, caret);
        caret.insert(str == null ? ch : str);
      } // else if (cp.keypressBindings[ch]) {
      //  cp.keypressBindings[ch].call(cp, s, caret, ch);
      //}
      else {
          caret.insert(ch);
        }

      if (autoIndent && mode.isIndentTrigger(ch)) {
        reindentAt(cp, head.line);
      }
    });
    cp.emit('keypress', ch, event);
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["B" /* eventCancel */])(event);
  });

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["z" /* passive */])(input, 'keyup', event => {
    __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_keyboard__["a" /* updateFlags */])(event, false);

    if (cp.getOption('readOnly')) {
      return;
    }
    if (input.value.length && !__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_3_helpers_keyboard__["d" /* isModifierKeyEvent */])(event)) {
      cp.doc.call('insert', input.value);
    }
    input.value = '';
    cp.emit('keyup', event);
  });

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["z" /* passive */])(input, 'input', () => {
    if (!cp.getOption('readOnly') && input.value.length) {
      const autoIndent = cp.getOption('autoIndent');
      cp.doc.call('insert', input.value, 0, autoIndent && cp.doc.mode.name !== 'plaintext');
      input.value = '';
    }
  });
}

function attachMouseEvents(cp) {
  const { scroll, wrapper } = cp.dom;
  const counterSelection = [];
  let caret;
  let moveEvent;
  let dblClickTimeout;

  function counterSelDispatch(line, selIndex) {
    counterSelection[selIndex] = line;
    const lastItem = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["u" /* last */])(counterSelection);
    const caret = cp.doc.resetCarets();
    caret.setSelection(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_statics__["pos"])(counterSelection[0], 0), __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_statics__["pos"])(lastItem + (counterSelection[0] <= lastItem ? 1 : 0), 0));
    return caret;
  }
  function tripleclick(event) {
    const head = caret.head();
    caret.setSelection(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_statics__["pos"])(head.line, 0), __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_statics__["pos"])(head.line + 1, 0));
    __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].waitForTripleClick = __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].isMouseDown = false;
    dblClickTimeout = clearTimeout(dblClickTimeout);
    return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["B" /* eventCancel */])(event);
  }
  function onMouse(e) {
    if (e.defaultPrevented || e.which === 3) return false;

    const doc = cp.doc;
    const sizes = doc.sizes;
    const rect = wrapper.getBoundingClientRect();
    const offsetHeight = wrapper.offsetHeight;
    const x = e.pageX - rect.left;
    const y = e.pageY < rect.top ? 0 : e.pageY <= rect.top + offsetHeight ? e.pageY - rect.top : scroll.scrollHeight;
    const measure = doc.measurePosition(Math.max(0, x), y - sizes.paddingTop);

    if (e.type === 'mousedown') {
      __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].isMouseDown = true;

      if (x < 0) {
        caret = counterSelDispatch(measure.lineIndex, 0);
      } else {
        if (__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].waitForTripleClick) {
          caret = doc.resetCarets();
          return tripleclick(e);
        }
        if (caret = doc.findCaretAt(measure.position)) {
          __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].movingSelection = true;
        } else {
          caret = __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].cmdKey ? doc.createCaret() : doc.resetCarets();
          caret.dispatch(measure);

          if (!__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].shiftKey || !caret.hasSelection()) {
            caret.beginSelection();
          }
        }
      }
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(window, 'mousemove', onMouse);
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(window, 'mouseup', onMouse);
    } else if (e.type === 'mousemove') {
      if (__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].movingSelection) {
        ++__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].movingSelection;
      } else if (counterSelection.length && x < 0) {
        counterSelDispatch(measure.lineIndex, 1);
      } else if (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_statics__["comparePos"])(caret.head(), measure.position) !== 0) {
        caret.dispatch(measure);
      }

      moveEvent = e;
      var top = e.pageY - rect.top,
          bottom = rect.top + offsetHeight - e.pageY,
          i,
          t;

      if (top <= 40) {
        i = -sizes.font.height;
        t = Math.round(top);
      } else if (bottom <= 40) {
        i = sizes.font.height;
        t = Math.round(bottom);
      }
      if (i) {
        __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].mouseScrolling = true;
        setTimeout(() => {
          if (i && __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].isMouseDown && moveEvent === e) {
            doc.scroll(0, i);
            onMouse.call(scroll, moveEvent);
          } else {
            __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].mouseScrolling = false;
          }
        }, Math.max(10, Math.min(t + 10, 50)));
      }
    } else if (e.type === 'mouseup') {
      if (__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].movingSelection > 1) {
        caret.moveSelectionTo(measure.position);
      } else {
        if (__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].movingSelection === true) caret.clearSelection();
        maybeClearSelection(caret);
      }
      __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].isMouseDown = __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].movingSelection = false;
      counterSelection.length = 0;

      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["C" /* off */])(window, 'mousemove', onMouse);
      __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["C" /* off */])(window, 'mouseup', onMouse);
    }
  }

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(wrapper, 'mousedown', onMouse);
  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(scroll, 'selectstart', __WEBPACK_IMPORTED_MODULE_4_helpers_index__["B" /* eventCancel */]);

  __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["A" /* on */])(scroll, 'dblclick', () => {
    if (!cp.getOption('searchOnDblClick')) {
      return;
    }
    if (!caret) {
      caret = doc.resetCarets();
    }
    const word = caret.match(/\w/);
    __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].waitForTripleClick = true;

    clearTimeout(dblClickTimeout);
    dblClickTimeout = setTimeout(() => {
      __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].waitForTripleClick = false;
      const { from } = caret.getRange();

      cp.doc.search(word, false, results => {
        const node = results.get(from.line, from.column);
        results.setActive(null);
        if (node) {
          node.span.classList.add('cp-hidden');
        }
        caret.once('selectionCleared', () => cp.doc.searchEnd());
      });
    }, 250);
  });
}

function maybeClearSelection(caret) {
  const anchor = caret.anchor(true);
  if (anchor && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_statics__["comparePos"])(anchor, caret.head(true)) === 0) {
    caret.clearSelection();
  }
}

function wheelDelta(event) {
  const x = event.wheelDeltaX;
  const y = event.wheelDeltaY;
  return {
    x: x == null && event.axis === event.HORIZONTAL_AXIS ? event.detail : x,
    y: y == null ? event.axis === event.VERTICAL_AXIS ? event.detail : event.wheelDelta : y
  };
}

function wheel(doc, event, speed, x, y) {
  if (__WEBPACK_IMPORTED_MODULE_2_helpers_env__["a" /* webkit */] && __WEBPACK_IMPORTED_MODULE_2_helpers_env__["b" /* macosx */]) wheelTarget(doc, event.target);
  doc.scroll(speed * x, speed * y);
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_4_helpers_index__["B" /* eventCancel */])(event);
}

function wheelTarget(doc, wt) {
  if (doc.wheelTarget !== wt && doc.dom.scroll !== wt) {
    if (wt && wt.style.display === 'none') {
      wt.parentNode.removeChild(wt);
    }
    doc.wheelTarget = wt;
  }
}

function attachEvents(cp) {
  attachScrollEvents(cp);
  attachInputEvents(cp);
  attachMouseEvents(cp);
}

/***/ }),
/* 38 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Flags__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_statics__ = __webpack_require__(1);
/* harmony export (immutable) */ __webpack_exports__["a"] = findWord;
/* harmony export (immutable) */ __webpack_exports__["b"] = maybeReverseSelection;





function findWordTest(pattern) {
  return function (ch) {
    return typeof pattern === 'function' ? pattern(ch) : pattern.test ? pattern.test(ch) : false;
  };
}

function findWord(at, text, pattern = /\w/, dir = 0) {
  const test = findWordTest(pattern);
  let left = at.column;
  let right = at.column;
  let ch;

  if (dir >= 0) {
    for (; (ch = text.charAt(right)) && test(ch); ++right);
  }
  if (dir <= 0) {
    for (; (ch = text.charAt(left - 1)) && test(ch); --left);
  }
  return {
    word: text.substring(left, right),
    before: text.substring(0, left),
    after: text.substr(right),
    from: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_statics__["pos"])(at.line, left),
    to: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_statics__["pos"])(at.line, right),
    target: at
  };
}

function maybeReverseSelection(caret, anchor, head, move) {
  if (!caret.hasSelection() || __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].shiftKey) {
    return move;
  }
  const cmp = comparePos(anchor, head);
  if (cmp < 0 && move < 0 || cmp > 0 && move > 0) {
    caret.reverse();
    return move - cmp;
  }
  return move;
}

/***/ }),
/* 39 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export updateTabString */


function updateTabString(cp, tabWidth, invisibleCharacters) {
  const spaceChar = invisibleCharacters ? '·' : ' ';
  cp.tabString = spaceChar.repeat(tabWidth);
}

/***/ }),
/* 40 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Flags__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_data_keyMaps__ = __webpack_require__(35);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_data_keyCodes__ = __webpack_require__(34);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_helpers_env__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4_consts__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_helpers_index__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["d"] = isModifierKeyEvent;
/* harmony export (immutable) */ __webpack_exports__["b"] = keyName;
/* harmony export (immutable) */ __webpack_exports__["c"] = lookupKey;
/* unused harmony export normalizeKeyName */
/* harmony export (immutable) */ __webpack_exports__["a"] = updateFlags;









const MODIFIER_KEYS = [16, 17, 18, 91, 92, 93, 224];
const SHIFT = __WEBPACK_IMPORTED_MODULE_2_data_keyCodes__["a" /* default */][16];
const CTRL = __WEBPACK_IMPORTED_MODULE_2_data_keyCodes__["a" /* default */][17];
const ALT = __WEBPACK_IMPORTED_MODULE_2_data_keyCodes__["a" /* default */][18];
const CMD = __WEBPACK_IMPORTED_MODULE_2_data_keyCodes__["a" /* default */][91];

function isModifierKeyEvent(event) {
  const { ctrlKey, metaKey, keyCode } = event;
  return ctrlKey || metaKey || MODIFIER_KEYS.indexOf(keyCode) >= 0;
}

function keyName(event, noShift) {
  const key = __WEBPACK_IMPORTED_MODULE_2_data_keyCodes__["a" /* default */][event.keyCode];
  const stack = [];
  if (key == null || event.altGraphKey) return false;
  if (!noShift && event.shiftKey && key !== SHIFT) stack.push(SHIFT);
  if (event.metaKey && key !== CMD) stack.push(CMD);
  if (event.ctrlKey && key !== CTRL) stack.push(CTRL);
  if (event.altKey && key !== ALT) stack.push(ALT);
  stack.push(key);
  return stack.join(__WEBPACK_IMPORTED_MODULE_4_consts__["f" /* KEYNAME_SEPARATOR */]);
}

function lookupKey(key, keyMapName) {
  const map = typeof keyMapName === 'string' ? __WEBPACK_IMPORTED_MODULE_1_data_keyMaps__["a" /* default */][keyMapName] : keyMapName;
  const result = typeof map === 'function' ? map(key) : map[key];

  if (result) {
    return result;
  }

  if (map.fallthrough) {
    const array = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_5_helpers_index__["D" /* arrayEnsure */])(map.fallthrough);
    for (const item of array) {
      const lookup = lookupKey(key, item);
      if (lookup) {
        return lookup;
      }
    }
  }
}

function normalizeKeyName(keyName) {
  const keys = keyName.split(/\+(?!$)/);
  const last = keys.pop();
  const stack = [];
  let alt, ctrl, shift, cmd;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (/^(cmd|meta)$/i.test(key)) cmd = true;else if (/^shift$/i.test(key)) shift = true;else if (/^(ctrl|control)$/i.test(key)) ctrl = true;else if (/^alt$/i.test(key)) alt = true;
  }
  if (shift) stack.push(SHIFT);
  if (cmd) stack.push(CMD);
  if (ctrl) stack.push(CTRL);
  if (alt) stack.push(ALT);
  stack.push(last);
  return stack.join(__WEBPACK_IMPORTED_MODULE_4_consts__["f" /* KEYNAME_SEPARATOR */]);
}

function updateFlags(event, down) {
  const code = event.keyCode;
  __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].keyCode = down ? code : 0;
  __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].ctrlKey = code === 18 ? down : event.ctrlKey;
  __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].shiftKey = code === 16 ? down : event.shiftKey;
  __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].metaKey = [91, 92, 93, 224].indexOf(code) >= 0 ? down : event.metaKey;
  __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].altKey = code === 19 ? down : event.altKey;
  __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].cmdKey = __WEBPACK_IMPORTED_MODULE_3_helpers_env__["b" /* macosx */] ? __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].metaKey : __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].ctrlKey;
  __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].modifierKey = __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].ctrlKey || __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].shiftKey || __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].metaKey || __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].altKey;
  __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].isKeyDown = __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].modifierKey || __WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].keyCode > 0;
}

/***/ }),
/* 41 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Flags__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_consts__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_helpers_env__ = __webpack_require__(5);
/* harmony export (immutable) */ __webpack_exports__["a"] = updateLineView;






function cpx(style) {
  return style.replace(/\S+/g, 'cpx-$&');
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
  if (__WEBPACK_IMPORTED_MODULE_0_Flags__["a" /* default */].wheelTarget === child) child.style.display = 'none';else parent.removeChild(child);
  return next;
}

function updateInnerLine(node, text, symbols) {
  const length = symbols ? symbols.length : 0;
  let i = -1,
      j = 0,
      child = node.firstChild;

  while (++i < length) {
    const { from, to, symbol } = symbols[i];
    if (j < from) {
      child = maybeSpanUpdate(node, child, '', text.substring(j, from));
      j = from;
    }
    child = maybeSpanUpdate(node, child, cpx(symbol), text.substring(from, to));
    j = to;
  }
  if (j < text.length) {
    child = maybeSpanUpdate(node, child, '', text.substr(j));
  }
  return child;
}

function updateSpan(span, className, content) {
  if (__WEBPACK_IMPORTED_MODULE_2_helpers_env__["a" /* webkit */] && __WEBPACK_IMPORTED_MODULE_2_helpers_env__["b" /* macosx */]) span.style.cssText = '';
  span.className = className;
  span.firstChild.nodeValue = content;
}

function updateLineView(lineView, text, symbols) {
  const pre = lineView.pre;
  if (text.length === 0) {
    let child = maybeSpanUpdate(pre, pre.firstChild, '', __WEBPACK_IMPORTED_MODULE_1_consts__["c" /* ZWS */]);
    while (child) child = rm(pre, child);
  } else {
    let child = updateInnerLine(pre, text, symbols);
    while (child) child = rm(pre, child);
  }
  lineView.change = false;
}

/***/ }),
/* 42 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_consts__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_helpers_index__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["a"] = measurePosition;
/* harmony export (immutable) */ __webpack_exports__["b"] = measureRect;





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
  const span = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1_helpers_index__["d" /* createNode */])(null, 'span');
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
  return childNodes.length === 1 && childNodes[0].firstChild.nodeValue === __WEBPACK_IMPORTED_MODULE_0_consts__["c" /* ZWS */];
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

function measurePosition(doc, x, y) {
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

function measureRect(doc, line, offset, to) {
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

/***/ }),
/* 43 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_loader__ = __webpack_require__(14);
/* harmony export (immutable) */ __webpack_exports__["a"] = requireAddon;
/* harmony export (immutable) */ __webpack_exports__["b"] = defineAddon;




const addons = new Map();
// Map { [addonName] => Addon }

function requireAddon(addonName) {
  const name = addonName.toLowerCase();
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_loader__["a" /* requireModule */])(name, addons, `addons/${name}.js`);
}

function defineAddon(...args) {
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0_helpers_loader__["b" /* defineModule */])(addons, CodePrinter.requireAddon, null, args);
}

// export function getAddon(name) {
//   const addon = addons.get(name);
//   return addon instanceof Addon ? addon : null;
// }

// export function hasAddon(name) {
//   return addons.get(name) instanceof Addon;
// }

/***/ }),
/* 44 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_Mode__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_data_aliases__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_helpers_loader__ = __webpack_require__(14);
/* harmony export (immutable) */ __webpack_exports__["a"] = requireMode;
/* harmony export (immutable) */ __webpack_exports__["b"] = defineMode;
/* harmony export (immutable) */ __webpack_exports__["c"] = getMode;
/* harmony export (immutable) */ __webpack_exports__["d"] = hasMode;






const modes = new Map();
// Map { [modeName] => Mode }

modes.set('plaintext', new __WEBPACK_IMPORTED_MODULE_0_Mode__["a" /* default */]());

function requireMode(modeName) {
  const name = (__WEBPACK_IMPORTED_MODULE_1_data_aliases__["a" /* default */][modeName] || modeName || 'plaintext').toLowerCase();
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_loader__["a" /* requireModule */])(name, modes, `mode/${name}.js`);
}

function defineMode(...args) {
  return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_helpers_loader__["b" /* defineModule */])(modes, CodePrinter.requireMode, __WEBPACK_IMPORTED_MODULE_0_Mode__["a" /* default */].resolve, args);
}

function getMode(name) {
  const mode = modes.get(name);
  return mode instanceof __WEBPACK_IMPORTED_MODULE_0_Mode__["a" /* default */] ? mode : null;
}

function hasMode(name) {
  return modes.get(name) instanceof __WEBPACK_IMPORTED_MODULE_0_Mode__["a" /* default */];
}

/***/ }),
/* 45 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_helpers_codeprinter__ = __webpack_require__(39);
/* harmony export (immutable) */ __webpack_exports__["drawIndentGuides"] = drawIndentGuides;
/* harmony export (immutable) */ __webpack_exports__["fontFamily"] = fontFamily;
/* harmony export (immutable) */ __webpack_exports__["fontSize"] = fontSize;
/* harmony export (immutable) */ __webpack_exports__["height"] = height;
/* harmony export (immutable) */ __webpack_exports__["invisibleCharacters"] = invisibleCharacters;
/* harmony export (immutable) */ __webpack_exports__["legacyScrollbars"] = legacyScrollbars;
/* harmony export (immutable) */ __webpack_exports__["lineEndings"] = lineEndings;
/* harmony export (immutable) */ __webpack_exports__["lineNumbers"] = lineNumbers;
/* harmony export (immutable) */ __webpack_exports__["mode"] = mode;
/* harmony export (immutable) */ __webpack_exports__["tabIndex"] = tabIndex;
/* harmony export (immutable) */ __webpack_exports__["tabWidth"] = tabWidth;
/* harmony export (immutable) */ __webpack_exports__["theme"] = theme;
/* harmony export (immutable) */ __webpack_exports__["width"] = width;




function drawIndentGuides(dig) {
  (dig ? removeClass : addClass)(this.dom.mainNode, 'cp--no-indent-guides');
  return !!dig;
}

function fontFamily(family) {
  this.dom.editor.style.fontFamily = family;
}

function fontSize(size, oldSize) {
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

function height(size) {
  if (size === 'auto') {
    this.dom.body.style.removeProperty('height');
    addClass(this.dom.mainNode, 'cp--auto-height');
  } else {
    this.dom.body.style.height = size + 'px';
    removeClass(this.dom.mainNode, 'cp--auto-height');
  }
}

function invisibleCharacters(show) {
  // const tabWidth = this.getOption('tabWidth');
  // updateTabString(this, tabWidth, show);
}

function legacyScrollbars(ls) {
  (ls ? addClass : removeClass)(this.dom.scroll, 'cp--legacy-scrollbars');
  return !!ls;
}

function lineEndings(le, old) {
  le = le.toUpperCase();
  return lineendings[le] || old || '\n';
}

function lineNumbers(ln) {
  (ln ? removeClass : addClass)(this.dom.counter, 'cp-hidden');
  ln ? this.dom.mainNode.parentNode && maybeUpdateCountersWidth(this.doc, true) : updateCountersWidth(this.doc, 0);
  return !!ln;
}

function mode(mode) {
  this.doc && this.doc.setMode(mode);
}

function tabIndex(ti) {
  this.dom.input.tabIndex = ti = Math.max(-1, ~~ti);
  return ti;
}

function tabWidth(tw) {
  tw = Math.max(0, ~~tw);
  this.tabString = repeat(' ', tw);
  runBackgroundParser(this.doc);
  return tw;
}

function theme(name, dontrequire) {
  typeof name === 'string' && name !== 'default' ? dontrequire != true && CodePrinter.requireStyle(name) : name = 'default';
  if (!this.getOption('disableThemeClassName')) {
    removeClass(this.dom.mainNode, 'cps-' + this.getOption('theme').replace(' ', '-').toLowerCase());
    addClass(this.dom.mainNode, 'cps-' + name.replace(' ', '-').toLowerCase());
  }
}

function width(size) {
  if (size === 'auto') this.dom.mainNode.style.removeProperty('width');else this.dom.mainNode.style.width = size + 'px';
}

/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(47)();
// imports


// module
exports.push([module.i, ".codeprinter{margin:0;padding:0;min-width:50px;min-height:13px;background:#fff;border:1px solid #d4d4d4;color:#555;overflow:hidden;position:relative;text-align:left}.codeprinter.cp--auto-height .cp-body{height:auto}.codeprinter.cp--auto-height .cp-container{-moz-flex:none;-ms-flex:none;-webkit-box-flex:0;flex:none;min-height:0}.codeprinter.cp--no-indent-guides .cpx-tab{border-color:transparent!important}.codeprinter .cp--scrolling .cp-scroll{will-change:scroll-position}.codeprinter .cp--scrolling *{pointer-events:none!important}.codeprinter .cp-body{display:-moz-flex;display:-ms-flexbox;display:-ms-flex;display:-webkit-box;display:flex;-ms-flex-flow:column nowrap;-webkit-box-orient:vertical;-webkit-box-direction:normal;flex-flow:column nowrap;-moz-flex:1;-ms-flex:1;-webkit-box-flex:1;flex:1;height:300px;position:relative;overflow:hidden}.codeprinter .cp-container{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-o-user-select:none;user-select:none;font-family:Menlo,Monaco,Consolas,Courier,monospace;font-size:12px;overflow:hidden}.codeprinter .cp-container,.codeprinter .cp-editor{display:-moz-flex;display:-ms-flexbox;display:-ms-flex;display:-webkit-box;display:flex;-ms-flex-flow:row nowrap;-webkit-box-orient:horizontal;-webkit-box-direction:normal;flex-flow:row nowrap;-moz-flex:1;-ms-flex:1;-webkit-box-flex:1;flex:1;position:relative}.codeprinter .cp-editor{width:0}.codeprinter .cp-scroll{display:-moz-flex;display:-ms-flexbox;display:-ms-flex;display:-webkit-box;display:flex;-ms-flex-flow:row nowrap;-webkit-box-orient:horizontal;-webkit-box-direction:normal;flex-flow:row nowrap;-moz-flex:1;-ms-flex:1;-webkit-box-flex:1;flex:1;max-height:100%;box-sizing:border-box;overflow:hidden}.codeprinter .cp-scroll.cp--legacy-scrollbars{overflow:auto}.codeprinter .cp-wrapper{-moz-flex:1;-ms-flex:1;-webkit-box-flex:1;flex:1;min-width:50px;min-height:100%;margin-left:30px;cursor:text}.codeprinter .cp-relative,.codeprinter .cp-wrapper{position:relative;overflow:visible}.codeprinter .cp-input{display:inline-block;vertical-align:top;width:1px;height:1px;margin:0;background:none;border:none;color:transparent;resize:none;outline:none;opacity:0;position:absolute;top:50%;left:50%;pointer-events:none}.codeprinter .cp-screen{min-height:100%;padding:5px 0;box-sizing:border-box;color:inherit;overflow:visible;white-space:pre;position:relative;-moz-tab-size:2;-o-tab-size:2;tab-size:2}.codeprinter .cp-code{display:inline-block;vertical-align:top;min-width:100%;position:relative}.codeprinter .cp-measure{display:inline-block;visibility:hidden;opacity:0;position:absolute;top:0;left:0;bottom:0;overflow:hidden}.codeprinter .cp-counter{width:30px;height:100%;background:#fff;box-sizing:border-box;overflow:hidden;white-space:nowrap;position:absolute;top:0;z-index:20}.codeprinter .cp-line-view{position:relative}.codeprinter .cp-line-number-wrapper{position:absolute;top:0;bottom:0;left:-30px;z-index:30}.codeprinter .cp-line-number{min-width:30px;height:100%;padding:0 5px 0 7px;box-sizing:border-box;color:#888;text-align:right;white-space:nowrap;position:absolute;left:0}.codeprinter pre{margin:0;padding:0 10px;font:inherit;word-wrap:inherit;white-space:inherit;line-height:normal;position:relative}.codeprinter pre span{position:relative;z-index:2}.codeprinter .cp-scrollbar{-webkit-transition:all .4s ease 2s;transition:all .4s ease 2s;padding:2px;background:none;position:absolute;opacity:0;text-align:left;pointer-events:none;z-index:10}.codeprinter .cp-scrollbar.visible{-webkit-transition-delay:0s;transition-delay:0s;opacity:1}.codeprinter .cp-scrollbar-slider{display:inline-block;width:inherit;height:inherit;background:rgba(0,0,0,.5);border-radius:50px;position:relative;vertical-align:top}.codeprinter .cp-scrollbar-horizontal{height:7px;right:7px;bottom:0;left:0}.codeprinter .cp-scrollbar-vertical{width:7px;top:0;right:0;bottom:7px}.codeprinter .cp-findbar{background:#fff;border-top:1px solid #d4d4d4;color:#555}.codeprinter .cp-findbar input{margin:0;padding:.4em;border:none;outline:none}.codeprinter .cp-findbar button{margin:0;padding:.4em 1.5em;background:none;border:none;outline:none}.codeprinter .cp-findbar button,.codeprinter .cp-findbar input{border-right:1px solid #d4d4d4}.codeprinter .cp-findbar span{display:inline-block;padding:0 .5em}.codeprinter .cp-layer{background:none!important;white-space:pre;position:absolute;top:0;right:0;bottom:0;left:0}.codeprinter .cp-marker-piece{margin:0;padding:0;background:rgba(100,255,0,.4);color:transparent;position:absolute;box-sizing:content-box;z-index:1}.codeprinter .cp-selection-layer .cp-marker-piece{background:#c8dcff;color:transparent;cursor:text}.codeprinter .cp-highlight{background:#fffd82;border-bottom:1px solid #000;z-index:auto}.codeprinter .cp-search-overlay{pointer-events:none}.codeprinter .cp-search-occurrence{margin:-1px -1px 0;padding:0;background:none;border:1px solid #aaa;border-radius:3px;color:transparent;position:absolute;top:0;left:0;z-index:4;pointer-events:all}.codeprinter .cp-search-occurrence.active{z-index:5}.codeprinter .cp-hint-overlay{pointer-events:none;z-index:20}.codeprinter .cp-hint-container{max-width:300px;max-height:100px;background:#fff;border:1px solid #d4d4d4;pointer-events:all;position:absolute;overflow:scroll;box-shadow:0 0 5px rgba(0,0,0,.15)}.codeprinter .cp-hint-container ul{display:block;list-style-type:none;margin:0;padding:0;pointer-events:all}.codeprinter .cp-hint-container li{display:block;padding:2px 6px 2px 3px;pointer-events:all}.codeprinter .cp-hint-container .active{background-color:#454545;color:#fafafa}.codeprinter .cp-placeholder{height:0;overflow:visible;color:#999;font-style:italic}.codeprinter .cp-rulers{overflow:visible}.codeprinter .cp-rulers--dotted .cp-ruler{border-right-style:dotted}.codeprinter .cp-rulers--dashed .cp-ruler{border-right-style:dashed}.codeprinter .cp-ruler{width:0;border-right:1px solid #eaeaea;position:absolute;top:0;bottom:0;z-index:5}.codeprinter .cp-carets{position:absolute;top:0;left:0;z-index:10;pointer-events:none}.codeprinter .cp-caret{width:1px;height:13px;background:#000;position:absolute;top:-50px;left:-50px;will-change:top,left}.codeprinter .cp-caret-block{-webkit-transition:all 0 ease-in-out;transition:all 0 ease-in-out;z-index:6!important}.codeprinter .cp-overlay span,.codeprinter .cp-screen span{font-family:inherit;word-wrap:inherit}.codeprinter .cp-marked{background:#f0f0f0}.codeprinter li.cp-mark-warning:before{margin-right:4px;color:orange;content:\"\\F071\"}.codeprinter li.cp-mark-error:before{margin-right:4px;color:red;content:\"\\F06A\"}.codeprinter .cp-active-line .cp-line,.codeprinter .cp-active-line .cp-line-number{background:rgba(230,239,255,.5)}.codeprinter.cp-fullscreen{display:-moz-flex;display:-ms-flexbox;display:-ms-flex;display:-webkit-box;display:flex;-ms-flex-flow:column nowrap;-webkit-box-orient:vertical;-webkit-box-direction:normal;flex-flow:column nowrap;height:auto;border:none;position:absolute;top:0;right:0;bottom:0;left:0;z-index:50}.codeprinter.cp-fullscreen .cp-container{-moz-flex:1;-ms-flex:1;-webkit-box-flex:1;flex:1}.cp-hidden{display:none;pointer-events:none}.cpx-tab{padding:0;border-color:transparent;border-left:1px dashed #c8c8c8}.cpx-bracket{color:#000}.cpx-operator{color:#0487fa}.cpx-variable{color:#529ed4}.cpx-parameter{color:#f5871f}.cpx-keyword{color:#004eac}.cpx-control{color:#025bb9}.cpx-builtin{color:#004eac}.cpx-boolean{color:#8959a8}.cpx-constant{color:#885d3b}.cpx-special{color:#c93800}.cpx-directive{color:#74482e}.cpx-namespace{color:#885d3b}.cpx-numeric{color:#f5871f}.cpx-hex{color:#531b93}.cpx-function{color:#049}.cpx-property{color:#028ec4}.cpx-regexp{color:#6f9d00}.cpx-escaped{color:#436300}.cpx-external{color:red}.cpx-string{color:#6f9d00}.cpx-comment{color:#999}.cpx-invalid{background:#e63b00;color:#f9f9f2}.cpx-italic{font-style:italic}.cpx-bold{font-weight:700}.cpx-underline{text-decoration:underline}.cpx-strike{text-decoration:line-through}.cpx-font-40{font-size:40%}.cpx-font-50{font-size:50%}.cpx-font-60{font-size:60%}.cpx-font-70{font-size:70%}.cpx-font-80{font-size:80%}.cpx-font-90{font-size:90%}.cpx-font-110{font-size:110%}.cpx-font-120{font-size:120%}.cpx-font-130{font-size:130%}.cpx-font-140{font-size:140%}.cpx-font-150{font-size:150%}.cpx-font-160{font-size:160%}.cps-default.inactive .cp-selection{background:#d0d0d0}.cps-default .cp-counter{box-shadow:0 0 5px rgba(0,0,0,.15)}.cps-default .cp-caret{box-shadow:0 0 2px rgba(0,0,0,.5)}.cps-default .cpx-control,.cps-default .cpx-external{font-weight:700}.cps-default .cpx-comment,.cps-default .cpx-hex,.cps-default .cpx-special,.cps-default .cpx-variable{font-style:italic}.cps-default .cpx-broket{color:#025bb9}.cps-default .cp-search-occurrence.active{background:#aef;color:#444;box-shadow:0 0 4px rgba(0,0,0,.2)}", ""]);

// exports


/***/ }),
/* 47 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function() {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		var result = [];
		for(var i = 0; i < this.length; i++) {
			var item = this[i];
			if(item[2]) {
				result.push("@media " + item[2] + "{" + item[1] + "}");
			} else {
				result.push(item[1]);
			}
		}
		return result.join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};


/***/ }),
/* 48 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		return /msie [6-9]\b/.test(self.navigator.userAgent.toLowerCase());
	}),
	getHeadElement = memoize(function () {
		return document.head || document.getElementsByTagName("head")[0];
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [];

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the bottom of <head>.
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
}

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var head = getHeadElement();
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			head.insertBefore(styleElement, head.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			head.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		head.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	styleElement.type = "text/css";
	insertStyleElement(options, styleElement);
	return styleElement;
}

function createLinkElement(options) {
	var linkElement = document.createElement("link");
	linkElement.rel = "stylesheet";
	insertStyleElement(options, linkElement);
	return linkElement;
}

function addStyle(obj, options) {
	var styleElement, update, remove;

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else if(obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function") {
		styleElement = createLinkElement(options);
		update = updateLink.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
			if(styleElement.href)
				URL.revokeObjectURL(styleElement.href);
		};
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		styleElement.setAttribute("media", media)
	}

	if(styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}

function updateLink(linkElement, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	if(sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = linkElement.href;

	linkElement.href = URL.createObjectURL(blob);

	if(oldSrc)
		URL.revokeObjectURL(oldSrc);
}


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(46);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(48)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!./node_modules/css-loader/index.js!./node_modules/postcss-loader/index.js!./CodePrinter.css", function() {
			var newContent = require("!!./node_modules/css-loader/index.js!./node_modules/postcss-loader/index.js!./CodePrinter.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 50 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/*
 * CodePrinter.js
 *
 * Copyright (C) 2013-2017 Tomasz Sapeta (@tsapeta)
 * Released under the MIT License.
 *
 * author:  Tomasz Sapeta
 * version: 0.8.3
 * source:  https://github.com/tsapeta/CodePrinter
 */

module.exports = __webpack_require__(17).default;

/***/ })
/******/ ]);