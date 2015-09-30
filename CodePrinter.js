/*
 * CodePrinter.js
 *
 * Copyright (C) 2013-2015 Tomasz Sapeta (@tsapeta)
 * Released under the MIT License.
 *
 * author:  Tomasz Sapeta
 * version: 0.8.3
 * source:  https://github.com/tsapeta/CodePrinter
 */

"use strict";

(function() {
  var CodePrinter, EventEmitter, Data, Branch
  , Line, CaretStyles, Caret, Document, Stream
  , ReadStream, historyActions, History, keyMap
  , Measure, LineView, View, commands, lineendings
  , div, li, pre, span
  , BRANCH_OPTIMAL_SIZE = 50
  , BRANCH_HALF_SIZE = 25
  , macosx = /Mac/.test(navigator.platform)
  , webkit = /WebKit\//.test(navigator.userAgent)
  , gecko = /gecko\/\d/i.test(navigator.userAgent)
  , ie = /(MSIE \d|Trident\/)/.test(navigator.userAgent)
  , presto = /Opera\//.test(navigator.userAgent)
  , wheelUnit = webkit ? -1/3 : gecko ? 5 : ie ? -0.53 : presto ? -0.05 : -1
  , offsetDiff, activeClassName = 'cp-active-line', zws = '\u200b', eol = /\r\n?|\n/
  , modes = {}, addons = {}, instances = [], keyCodes, async, asyncQueue = []
  , Flags = {}, modifierKeys = [16, 17, 18, 91, 92, 93, 224];
  
  CodePrinter = function(source, options) {
    if (arguments.length === 1 && source == '[object Object]') {
      options = source;
      source = null;
    }
    options = this.options = extend({}, CodePrinter.defaults, options);
    buildDOM(this);
    EventEmitter.call(this);
    
    this.keyMap = new keyMap;
    this.tabString = repeat(' ', options.tabWidth);
    this.setDocument(this.createDocument(source, options.mode));
    checkOptions(this, options);
    attachEvents(this);
    
    if (source && source.parentNode) {
      source.parentNode.insertBefore(this.dom.mainNode, source);
      source.style.display = 'none';
    }
    
    instances.push(this);
    return this;
  }
  
  CodePrinter.version = '0.8.3';
  
  CodePrinter.defaults = {
    abortSelectionOnBlur: false,
    autoComplete: false,
    autoCompleteDelay: 200,
    autoFocus: true,
    autoIndent: true,
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
    history: true,
    historyDelay: 1000,
    historyStackSize: 100,
    indentByTabs: false,
    insertClosingBrackets: true,
    insertClosingQuotes: true,
    keyupInactivityTimeout: 200,
    legacyScrollbars: false,
    lineEndings: '\n',
    lineHeight: 'normal',
    lineNumberFormatter: defaultFormatter,
    lineNumbers: true,
    matching: true,
    maxFontSize: 60,
    minFontSize: 6,
    mode: 'plaintext',
    readOnly: false,
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
  }
  
  div = document.createElement('div');
  li = document.createElement('li');
  pre = addClass(document.createElement('pre'), 'cp-line');
  span = document.createElement('span');
  
  EventEmitter = function(parent) {
    var events = {}, propagate = parent;
    this.emit = function(event) {
      var args = new Array(arguments.length - 1), ev;
      for (var i = 0; i < args.length; i++) args[i] = arguments[i+1];
      if (ev = events[event]) for (var i = ev.length; i-- && ev[i];) ev[i].apply(this, args);
      if (propagate) propagate.emit.apply(propagate, [event, this].concat(args));
      return this;
    }
    this.on = function(event, callback) {
      var args = parseEventArguments(event, callback);
      for (var k in args) if (events[k]) events[k].unshift(args[k]); else events[k] = [args[k]];
      return this;
    }
    this.once = function(event, callback) {
      var fn;
      return this.on(event, fn = function() {
        this.off(event, fn);
        callback.apply(this, arguments);
      });
    }
    this.off = function(event, callback) {
      var args = parseEventArguments(event, callback);
      for (var k in args) {
        if (events[k]) {
          if (args[k]) {
            var i = events[k].lastIndexOf(args[k]);
            if (i >= 0) events[k].splice(i, 1);
          }
          if (events[k].length === 0) events[k] = null;
        }
      }
      return this;
    }
    this.propagateTo = function(eventEmitter) {
      propagate = eventEmitter && eventEmitter.emit ? eventEmitter : null;
    }
  }
  EventEmitter.call(CodePrinter);
  
  var r = CodePrinter.range = function(from, to) {
    return { from: copy(from), to: copy(to) };
  };
  var p = CodePrinter.pos = function(line, column) {
    return { line: line, column: column };
  };
  var cmp = CodePrinter.comparePos = function(a, b) {
    return a.line - b.line || a.column - b.column;
  };
  var np = CodePrinter.normalizePos = function(doc, line, column) {
    var pos = isArray(line) ? p(line[0], line[1]) : column !== undefined ? p(line, column) : copy(line), size = doc.size();
    if (!pos) return null;
    if (pos.line < 0) pos.line = pos.column = 0;
    else if (pos.line >= size) {
      pos.line = size - 1;
      pos.column = doc.get(size - 1).text.length;
    }
    else if (pos.column < 0) {
      var l = doc.get(pos.line).text.length;
      pos.column = l ? l + pos.column % l + 1 : 0;
    }
    return isPos(pos) ? pos : null;
  };
  CodePrinter.requireStyle = function(style) {
    load('theme/'+style+'.css', true);
  }
  
  function attachDoc(editor, doc) {
    doc.editor = editor;
    editor.doc = doc;
    doc.propagateTo(editor);
    var dom = doc.dom = editor.dom;
    dom.measure.appendChild(doc.measure.node);
    doc.view.mount(dom.code, dom.counter);
    doc.scrollTo(doc.scrollTop | 0);
    updateScroll(doc);
    doc.fill();
    applySizes(doc);
    doc.emit('attached');
  }
  function detachDoc(editor, doc) {
    var dom = doc.dom;
    doc.scrollTop = dom.scroll.scrollTop;
    doc.scrollLeft = dom.scroll.scrollLeft;
    doc.view.unmount();
    dom.measure.removeChild(doc.measure.node);
    doc.blur();
    editor.doc = doc.editor = null;
    doc.emit('detached');
    doc.propagateTo(null);
  }
  
  CodePrinter.prototype = {
    createDocument: function(source, mode) {
      return new Document(valueOf(source), mode, getFontDims(this.options));
    },
    setDocument: function(doc) {
      if (doc === null) doc = this.createDocument();
      if (doc instanceof Document && this.doc !== doc) {
        var old = this.doc;
        if (old) detachDoc(this, doc);
        attachDoc(this, doc);
        this.emit('documentChanged', old, doc);
        if (this.dom.mainNode.parentNode) doc.print();
        return old;
      }
    },
    initAddon: function(addon, options) {
      var cp = this;
      CodePrinter.requireAddon(addon, function(construct) {
        new construct(cp, options);
      });
    },
    focus: function() {
      return this.dom.input.focus();
    },
    setOptions: function(key, value) {
      if (this.options[key] !== value) {
        this.options[key] = value;
        this.emit('optionChanged', key, value);
      }
      return this;
    },
    setTabWidth: function(tw) {
      if ('number' === typeof tw && tw >= 0) {
        this.options.tabWidth = tw;
        this.tabString = repeat(' ', tw);
        this.doc && runBackgroundParser(this.doc);
      }
      return this;
    },
    setLineEndings: function(le) {
      le = le.toUpperCase();
      this.options.lineEndings = lineendings[le] || this.options.lineEndings || '\n';
      return this;
    },
    setTheme: function(name, dontrequire) {
      typeof name === 'string' && name !== 'default' ? dontrequire != true && CodePrinter.requireStyle(name) : name = 'default';
      if (!this.options.disableThemeClassName) {
        removeClass(this.dom.mainNode, 'cps-'+this.options.theme.replace(' ', '-').toLowerCase());
        addClass(this.dom.mainNode, 'cps-'+name.replace(' ', '-').toLowerCase());
      }
      this.options.theme = name;
      return this;
    },
    setMode: function(mode) {
      this.doc && this.doc.setMode(mode);
      return this;
    },
    setFontSize: function(size) {
      if ('number' === typeof size && this.options.minFontSize <= size && size <= this.options.maxFontSize) {
        var i = 0, doc = this.doc;
        this.dom.relative.style.fontSize = (this.options.fontSize = size) + 'px';
        
        if (doc) {
          doc.sizes.font = getFontDims(this.options);
          doc.fill();
          doc.updateView().call('showSelection');
          updateScroll(doc);
          doc.call('refresh');
        }
        this.emit('fontSizeChanged', size);
      }
      return this;
    },
    setWidth: function(size) {
      if (size == 'auto') {
        this.dom.mainNode.style.removeProperty('width');
      } else {
        this.dom.mainNode.style.width = (this.options.width = parseInt(size)) + 'px';
      }
      this.emit('widthChanged');
      return this;
    },
    setHeight: function(size) {
      if (size == 'auto') {
        this.dom.body.style.removeProperty('height');
        addClass(this.dom.mainNode, 'cp--auto-height');
      } else {
        this.dom.body.style.height = (this.options.height = parseInt(size, 10)) + 'px';
        removeClass(this.dom.mainNode, 'cp--auto-height');
      }
      this.emit('heightChanged');
      return this;
    },
    isState: function(state, line, col, all) {
      if (state && state.length) {
        state = 'string' === typeof state ? [state] : state;
        var gs = getStates.call(this, this.doc.get(line).parsed, col), l = gs ? gs.length : 0;
        return gs ? all ? gs.diff(state).length === 0 && gs.length == state.length : gs.diff(state).length !== l : false;
      }
      return false;
    },
    getSnippets: function() {
      return extend({}, this.options.snippets, this.doc.parser && this.doc.parser.snippets);
    },
    findSnippet: function(snippetName, head) {
      var s = this.options.snippets, b;
      if (!(b = s && s.hasOwnProperty(snippetName))) {
        s = this.doc.parser && this.doc.parser.snippets;
        b = s && s.hasOwnProperty(snippetName);
      }
      s = b && s[snippetName];
      if ('function' === typeof s) s = functionSnippet(this, head, s);
      if (s) return 'string' === typeof s ? { content: s } : s;
    },
    registerSnippet: function() {
      if (!this.options.snippets) this.options.snippets = [];
      for (var i = 0; i < arguments.length; i++) {
        var snippet = arguments[i];
        if (snippet.content && snippet.trigger) {
          this.options.snippets.push(snippet);
        }
      }
    },
    registerKey: function(keySequence, binding) {
      this.keyMap[keySequence] = binding;
      return this;
    },
    unregisterKey: function(keySequence) {
      delete this.keyMap[keySequence];
      return this;
    },
    exec: function(command) {
      var cmd = commands[command], args = new Array(arguments.length-1);
      if ('function' === typeof cmd) {
        for (var i = 0; i < args.length; i++) args[i] = arguments[i+1];
        cmd.apply(this, args);
      }
      return this;
    },
    call: function(keySequence) {
      if (keySequence) {
        var c = this.keyMap[keySequence];
        if (c) return c.call(this, keySequence);
      }
    },
    enterFullscreen: function() {
      if (!this.isFullscreen) {
        var main = this.dom.mainNode, b = document.body;
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
    },
    exitFullscreen: function() {
      if (this.isFullscreen && this._) {
        var tmp = this._;
        removeClass(this.dom.mainNode, 'cp-fullscreen').style.removeProperty('margin');
        tmp.parentNode.insertBefore(this.dom.mainNode, tmp);
        tmp.parentNode.removeChild(tmp);
        delete this._;
        this.isFullscreen = false;
        this.setWidth(this.options.width);
        this.doc.fill();
        this.input.focus();
        this.emit('fullscreenLeaved');
      }
    },
    showLineNumbers: function() {
      this.options.lineNumbers = true;
      removeClass(this.dom.counter, 'cp-hidden');
      if (this.dom.mainNode.parentNode) maybeUpdateCountersWidth(this.doc, true);
    },
    hideLineNumbers: function() {
      this.options.lineNumbers = false;
      updateCountersWidth(this.doc, 0);
      addClass(this.dom.counter, 'cp-hidden');
    },
    destroy: function() {
      var p = this.dom.mainNode.parentNode, i = instances.indexOf(this);
      if (p) p.removeChild(this.dom.mainNode);
      if (i >= 0) instances.splice(i, 1);
    }
  }
  
  function searchLineWithState(parser, dl, tw) {
    if (!parser.initialState) return { state: null, line: dl };
    var tmp = dl.prev(), minI = Infinity, best, ind;
    for (var i = 0; tmp && i < 300; i++) {
      if (tmp.state) { best = tmp; break; }
      ind = parseIndentation(tmp.text, tw).indent;
      if (ind < minI) { best = tmp; minI = ind; }
      tmp = tmp.prev();
    }
    return best && best.state ? { state: copyState(best.state), line: best.next() } : { state: extend(parser.initialState(), { indent: minI != Infinity ? minI : 0 }), line: best || dl };
  }
  function updateIndent(node, child, indent, tabString) {
    var stack = indent.stack;
    for (var i = 0; i < stack.length; i++) child = maybeSpanUpdate(node, child, 'cpx-tab', stack[i] ? '\t' : tabString);
    if (indent.spaces) child = maybeSpanUpdate(node, child, '', repeat(' ', indent.spaces));
    return child;
  }
  function maybeSpanUpdate(node, child, className, content) {
    if (child) {
      updateSpan(child, className, content);
      return child.nextSibling;
    }
    node.appendChild(cspan(className, content));
  }
  function updateLine(doc, dl, ind, tabString, cache) {
    var pre = dl.view.pre;
    if (dl.text.length === 0) {
      var child = maybeSpanUpdate(pre, pre.firstChild, '', zws);
      while (child) child = rm(doc, pre, child);
      return;
    }
    var child = updateInnerLine(pre, cache, ind, tabString);
    while (child) child = rm(doc, pre, child);
  }
  function updateInnerLine(node, cache, ind, tabString) {
    var child = updateIndent(node, node.firstChild, ind, tabString)
    , i = -1, j = 0, l = cache.length, text = ind.rest, tmp;
    while (++i < l) {
      tmp = cache[i];
      if (j < tmp.from) child = maybeSpanUpdate(node, child, '', text.substring(j, j = tmp.from));
      child = maybeSpanUpdate(node, child, cpx(tmp.style), text.substring(tmp.from, j = tmp.to));
    }
    if (j < text.length) child = maybeSpanUpdate(node, child, '', text.substr(j));
    return child;
  }
  function rm(doc, parent, child) {
    var next = child.nextSibling;
    if (doc.wheelTarget === child) child.style.display = 'none';
    else parent.removeChild(child);
    return next;
  }
  function updateSpan(span, className, content) {
    if (webkit && macosx) span.style.cssText = '';
    span.className = className;
    span.firstChild.nodeValue = content;
  }
  function parseIndentation(text, tabWidth) {
    var p = '', i = -1, spaces = 0, ind = 0, stack = [];
    while (++i < text.length) {
      if (text[i] == ' ') {
        ++spaces;
        if (spaces == tabWidth) {
          spaces = 0;
          stack[ind++] = 0;
        }
      } else if (text[i] == '\t') {
        spaces = 0;
        stack[ind++] = 1;
      } else {
        break;
      }
    }
    return { indent: ind, spaces: spaces, length: i, stack: stack, indentText: text.substring(0, i), rest: text.substr(i) };
  }
  function getIterator(state, parser) {
    if (!state) return parser.iterator;
    var iters = state.iterators;
    return iters && iters.length ? iters[iters.length - 1] : state.parser ? state.parser.iterator : parser.iterator;
  }
  function readIteration(parser, stream, state, cache) {
    stream.start = stream.pos;
    for (var i = 0; i < 3; i++) {
      var style = getIterator(state, parser)(stream, state);
      if (style) stream.lastStyle = style;
      if (stream.pos > stream.start) {
        var v = stream.from(stream.start);
        if (v != ' ' && v != '\t') stream.lastValue = v;
        if (style) cachePush(cache, stream.start, stream.pos, style);
        return style;
      }
    }
    throw new Error('Parser has reached an infinite loop!');
  }
  function cachePush(cache, from, to, style) {
    var length = cache.length, last = cache[length - 1];
    if (last && last.style == style && last.to == from) last.to = to;
    else cache[length] = { from: from, to: to, style: style };
  }
  function parse(doc, dl, stateBefore) {
    if (dl != null) {
      var state = stateBefore, tmp = dl
      , tw = doc.getOption('tabWidth')
      , parser = doc.parser;
      
      if (parser.initialState) {
        if (state === undefined) {
          var s = searchLineWithState(parser, tmp, tw);
          state = s.state;
          tmp = s.line;
        } else {
          state = state ? copyState(state) : parser.initialState();
        }
      }
      
      for (; tmp; tmp = tmp.next()) {
        var ind = parseIndentation(tmp.text, tw)
        , stream = new Stream(ind.rest, ind.indent, ind.length);
        tmp.cache = parseStream(parser, stream, state);
        
        if (tmp.view) updateLine(doc, tmp, ind, doc.editor.tabString, tmp.cache);
        if (stream.definition) tmp.definition = stream.definition;
        else if (tmp.definition) tmp.definition = undefined;
        tmp.state = state;
        if (tmp == dl) break;
        state = copyState(state);
      }
    }
    return dl;
  }
  function parseStream(parser, stream, state, col) {
    var style, v, l = col != null ? col : stream.length, cache = [];
    (state && state.parser || parser).onEntry(stream, state);
    while (stream.pos < l) readIteration(parser, stream, state, cache);
    (state && state.parser || parser).onExit(stream, state);
    return cache;
  }
  function forwardParsing(doc, dl) {
    var a = getIterator(dl.state, doc.parser), b, state;
    parse(doc, dl);
    b = getIterator(state = dl.state, doc.parser);
    
    while ((dl = dl.next()) && (a !== b || dl.cache === null)) {
      dl.cache = undefined;
      a = getIterator(dl.state, doc.parser);
      parse(doc, dl, state);
      b = getIterator(state = dl.state, doc.parser);
    }
    return dl;
  }
  function runBackgroundParser(doc, whole) {
    if (doc.parsing === true) return;
    var to = whole ? doc.size() - 1 : doc.view.to
    , state = doc.parser.initialState && doc.parser.initialState();
    doc.parsing = true;
    doc.asyncEach(function(dl, index) {
      if (index > to) return false;
      parse(doc, dl, state);
      state = dl.state;
    }, function(index, last) {
      doc.parsing = false;
    });
  }
  function process(doc, dl) {
    if (!dl.cache) return parse(doc, dl);
    var ind = parseIndentation(dl.text, doc.getOption('tabWidth')), stream = new Stream(ind.rest, ind.indent, ind.length);
    updateLine(doc, dl, ind, doc.editor.tabString, dl.cache);
  }
  function cspan(style, content) {
    var node = span.cloneNode(false);
    if (style) node.className = style;
    node.appendChild(document.createTextNode(content));
    return node;
  }
  function forcopy(arr) {
    var i, l = arr.length, copy = new Array(l);
    for (i = 0; i < l; i++) copy[i] = arr[i];
    return copy;
  }
  function copyState(state) {
    var st = {};
    if (state) {
      for (var k in state) if (state[k] != null) st[k] = state[k];
      if (state.iterators) st.iterators = forcopy(state.iterators);
    }
    return st;
  }
  function reIndent(doc, from, to) {
    from = Math.max(0, from - 1);
    to = Math.min(to, doc.size() - 1);
    if (from === 0) doc.setIndent(0, 0);
    for (var line = from; line < to; line++) {
      var indent = doc.getNextLineIndent(line);
      if ('number' === typeof indent) doc.setIndent(line + 1, indent);
    }
  }
  function matchingHelper(doc, key, opt, line, start, end) {
    if (doc.getStyles(p(line, start+1)) === opt.style) {
      var counter = 1, i = 0, pos = p(line, start), fn = doc.searchLeft, fix = 0;
      
      if (opt.direction !== 'left') {
        pos.column = end;
        fn = doc.searchRight;
        fix = 1;
      }
      do {
        var a = fn.call(doc, pos, opt.value, opt.style), b = fn.call(doc, pos, key, opt.style);
        
        if (a) {
          var comp = b && cmp(a, b);
          if (comp && (fix ? comp > 0 : comp < 0)) {
            ++counter;
            a = b;
          } else {
            --counter;
          }
          pos = p(a.line, a.column + fix);
        } else {
          counter = 0;
        }
      } while (counter !== 0 && ++i < 100);
      
      if (i < 100) {
        doc.createHighlightOverlay({ line: line, column: start, text: key }, { line: pos.line, column: pos.column - fix, text: opt.value });
        return true;
      }
    }
  }
  
  Branch = function(leaf, children) {
    this.parent = null;
    this.isLeaf = leaf = leaf == null ? true : leaf;
    this.size = this.height = 0;
    if (children) {
      for (var i = 0; i < children.length; i++) {
        var ch = children[i];
        this.height += ch.height;
        this.size += ch.size;
        ch.parent = this;
        this.push(ch);
      }
      if (leaf) {
        this.size = children.length;
      }
    }
    return this;
  }
  
  var splice = Array.prototype.splice
  , push = Array.prototype.push
  , pop = Array.prototype.pop
  , shift = Array.prototype.shift
  , unshift = Array.prototype.unshift;
  
  Branch.prototype = {
    splice: splice,
    push: push,
    pop: pop,
    shift: shift,
    indexOf: function(node, offset) {
      for (var i = offset || 0, l = this.length; i < l; i++) {
        if (this[i] == node) {
          return i;
        }
      }
      return -1;
    },
    get: function(line) {
      if (this.isLeaf) return this[line];
      var i = -1, s;
      while (++i < this.length && line >= (s = this[i].size)) line -= s;
      return this[i] ? this[i].get(line) : null;
    },
    insert: function(at, lines, height) {
      this.size += lines.length;
      this.height += height;
      if (this.isLeaf) {
        for (var i = 0; i < lines.length; i++) {
          lines[i].parent = this;
        }
        splice.apply(this, [at, 0].concat(lines));
        return;
      }
      for (var i = 0; i < this.length; i++) {
        var ch = this[i], s = ch.size;
        if (at <= s) {
          ch.insert(at, lines, height);
          if (ch.isLeaf && ch.size > BRANCH_OPTIMAL_SIZE) {
            do {
              var rm = ch.splice(ch.size - BRANCH_HALF_SIZE, BRANCH_HALF_SIZE)
              , leaf = new Branch(true, rm);
              ch.size -= leaf.size;
              ch.height -= leaf.height;
              leaf.parent = this;
              this.splice(i + 1, 0, leaf);
            } while (ch.size > BRANCH_OPTIMAL_SIZE);
            
            if (this.length > BRANCH_OPTIMAL_SIZE) {
              this.wrapAll();
            }
          }
          break;
        }
        at -= s;
      }
    },
    remove: function(at, n) {
      this.size -= n;
      if (this.isLeaf) {
        for (var i = at, j = at + n; i < j; i++) {
          this.height -= this[i].height;
          this[i].parent = null;
        }
        return this.splice(at, n);
      }
      var r = [];
      for (var i = 0; i < this.length; i++) {
        var ch = this[i], s = ch.size;
        if (at < s) {
          var min = Math.min(n, s - at), oh = ch.height;
          push.apply(r, ch.remove(at, min));
          this.height -= oh - ch.height;
          if (s == min) { this.splice(i--, 1); ch.parent = null; }
          if ((n -= min) == 0) break;
          at = 0;
        } else {
          at -= s;
        }
      }
      this.fall();
      return r;
    },
    fall: function() {
      if (this.size < 10 && this.parent && this.length == 1) {
        var child = this.pop();
        while (child.length) {
          var node = child.shift();
          node.parent = this;
          this.push(node);
        }
        child.parent = null;
        this.isLeaf = child.isLeaf;
      }
    },
    wrapAll: function() {
      var parts = Math.ceil(this.length / BRANCH_OPTIMAL_SIZE) * 2;
      if (parts > 2) {
        var l = Math.ceil(this.length / parts), branches = Array(parts);
        for (var i = 0; i < parts; i++) {
          (branches[i] = new Branch(false, this.splice(0, l))).parent = this;
        }
        this.push.apply(this, branches);
      }
    },
    getLineWithOffset: function(offset) {
      var h = 0, i = -1;
      while (++i < this.length && h + this[i].height < offset) h += this[i].height;
      if (i == this.length) --i; offsetDiff = offset - h;
      return this.isLeaf ? this[i] : this[i] ? this[i].getLineWithOffset(offsetDiff) : null;
    },
    next: function() {
      var i;
      if (this.parent && (i = this.parent.indexOf(this)) >= 0) {
        if (i + 1 < this.parent.length) return this.parent[i+1];
        var next = this.parent.next();
        while (next && !next.isLeaf) next = next[0];
        return next;
      }
      return null;
    },
    prev: function() {
      var i;
      if (this.parent && (i = this.parent.indexOf(this)) >= 0) {
        if (i > 0) return this.parent[i-1];
        var prev = this.parent.prev();
        while (prev && !prev.isLeaf) prev = lastV(prev);
        return prev;
      }
      return null;
    },
    foreach: function(f, tmp) {
      tmp = tmp || 0;
      if (this.isLeaf) for (var i = 0; i < this.length; i++) f.call(this[i], tmp + i);
      else for (var i = 0; i < this.length; i++) {
        this[i].foreach(f, tmp);
        tmp += this[i].size;
      }
      return this;
    }
  }
  
  Data = function() {
    Branch.call(this, false);
    var branch = new Branch(true);
    branch.parent = this;
    push.call(this, branch);
    return this;
  }
  Data.prototype = Branch.prototype;
  
  Line = function(text, height) {
    this.text = text;
    this.height = height;
    this.parent = this.view = null;
    this.cache = this.state = null;
    return this;
  }
  
  Line.prototype = {
    setText: function(str) {
      if (this.text !== str) {
        this.text = str;
        this.cache = null;
        if (this.view) this.view.change = true;
      }
    },
    getOffset: function() {
      if (!this.parent) return 0;
      var child = this, parent = this.parent, total = 0, i;
      do {
        i = parent.indexOf(child);
        while (--i >= 0) total += parent[i].height | 0;
        child = parent;
        parent = parent.parent;
      } while (parent);
      return total;
    },
    getIndex: function() {
      if (!this.parent) return -1;
      var child = this, parent = this.parent, total = 0, i;
      do {
        i = parent.indexOf(child);
        if (parent.isLeaf) total += i;
        while (--i >= 0) total += parent[i].size | 0;
        child = parent;
        parent = parent.parent;
      } while (parent);
      return total;
    },
    addClass: function(className) {
      if (!this.classes) this.classes = [className];
      else if (this.classes.indexOf(className) == -1)
        this.classes.push(className);
      touch(this);
    },
    removeClass: function(className) {
      if (this.classes) {
        var j = this.classes.indexOf(className);
        if (j >= 0) this.classes.splice(j, 1);
        if (this.classes.length == 0) this.classes = undefined;
        touch(this);
      }
    },
    next: function(skipMerged) {
      if (!this.parent) return;
      if (skipMerged && this.merged) return lastV(this.merged).next();
      var i = this.parent.indexOf(this);
      if (i + 1 < this.parent.length) return this.parent[i+1];
      else {
        var next = this.parent.next();
        return next && next[0];
      }
    },
    prev: function(skipMerged) {
      if (!this.parent) return;
      var i = this.parent.indexOf(this), dl;
      if (i > 0) dl = this.parent[i-1];
      else {
        var prev = this.parent.prev();
        dl = prev && prev.length && lastV(prev);
      }
      return dl && skipMerged && dl.mergedWith || dl;
    }
  }
  
  function updateLineHeight(doc, dl) {
    if (dl) {
      var height, node = dl.view.pre;
      if (height = node.getBoundingClientRect().height) {
        var diff = height - dl.height;
        if (diff) {
          if (dl === doc.view[0] && doc.from !== 0) scrollBy(doc, -diff);
          for (; dl; dl = dl.parent) dl.height += diff;
        }
      }
    }
  }
  function updateHeight(doc) {
    var minHeight, dom = doc.dom, minHeight = doc.height() + doc.sizes.paddingTop * 2;
    if (dom && doc.sizes.minHeight !== minHeight) {
      dom.wrapper.style.minHeight = minHeight + 'px';
      doc.sizes.minHeight = minHeight;
    }
  }
  function updateScroll(doc) {
    if (doc.view.length) {
      var o = doc.view[0].line.getOffset();
      doc.dom.code.style.top = (doc.sizes.scrollTop = o) + 'px';
    }
  }
  function updateCounters(doc) {
    var tmp = doc.view.length && doc.view[0].counter, index = doc.from;
    do tmp.firstChild.nodeValue = lineNumberFor(doc.editor.options, index++); while (tmp = tmp.nextSibling);
  }
  function changeEnd(change) {
    if (change.end) return change.end;
    if (!change.text) return change.from;
    return p(change.from.line + change.text.length - 1, lastV(change.text).length + (change.text.length === 1 ? change.from.column : 0));
  }
  function adjustCaretsPos(doc, change) {
    eachCaret(doc, function(caret) {
      caret.setSelection(adjustPosForChange(caret.anchor(), change, true), adjustPosForChange(caret.head(true), change));
    });
  }
  function adjustPosForChange(pos, change, anchor) {
    if (!pos) return null;
    var c = cmp(pos, change.from);
    if (anchor ? c <= 0 : c < 0) return pos;
    if (cmp(pos, change.to) <= 0) return changeEnd(change);
    var line = pos.line - change.to.line + change.from.line + change.text.length - 1, col = pos.column;
    if (pos.line === change.to.line) col += changeEnd(change).column - change.to.column;
    return p(line, col);
  }
  function singleInsert(doc, line, lineIndex, insert, at) {
    var text = line.text, change = { text: [insert] };
    line.setText(text.substring(0, at) + insert + text.substr(at));
    line.view && parse(doc, line);
    change.from = change.to = p(lineIndex, at);
    change.end = p(lineIndex, at + insert.length);
    adjustCaretsPos(doc, change);
  }
  function singleRemove(doc, line, lineIndex, from, to) {
    var text = line.text, change = { from: p(lineIndex, from), to: p(lineIndex, to) };
    line.setText(text.substring(0, from) + text.substr(to));
    line.view && parse(doc, line);
    change.text = [text.substring(from, to)];
    change.end = change.from;
    adjustCaretsPos(doc, change);
  }
  function getFontDims(options) {
    var pr = pre.cloneNode(false), rect;
    pr.setAttribute('style', 'position:absolute;font:normal normal '+options.fontSize+'px/'+options.lineHeight+' '+options.fontFamily+';');
    pr.appendChild(document.createTextNode('CP'));
    document.documentElement.appendChild(pr);
    rect = pr.getBoundingClientRect();
    document.documentElement.removeChild(pr);
    return { width: rect.width / 2, height: rect.height };
  }
  function applySizes(doc) {
    var dom = doc.dom, sizes = doc.sizes;
    if (!sizes.minHeight) updateHeight(doc);
    else dom.wrapper.style.minHeight = sizes.minHeight + 'px';
    dom.wrapper.style.minWidth = sizes.minWidth + 'px';
    dom.scroll.scrollTop = doc.scrollTop | 0;
    dom.scroll.scrollLeft = doc.scrollLeft | 0;
  }
  function replaceRange(doc, txt, from, to) {
    from = np(doc, from); to = np(doc, to) || from;
    var text = 'string' === typeof txt ? txt.split(eol) : isArray(txt) ? txt : [''];
    if (!from) return;
    var removed = [], first = doc.get(from.line)
    , delta = to.line - from.line, dl = first, i = 0
    , after = delta ? doc.get(to.line).text.substr(to.column) : first.text.substr(to.column);
    
    removed[0] = delta ? first.text.substr(from.column) : first.text.substring(from.column, to.column);
    first.setText(first.text.substring(0, from.column) + text[0]);
    while (++i < delta && i < text.length && (dl = dl.next())) {
      removed[i] = dl.text;
      dl.setText(text[i]);
    }
    if (i < delta || i === delta && i === text.length) {
      var removedLines = doc.remove(from.line + i, delta - i + 1);
      for (var j = 0; j < removedLines.length - 1; j++) removed[removed.length] = removedLines[j].text;
      removed[removed.length] = removedLines[j].text.substring(0, to.column);
    } else if (i < text.length) {
      if (delta) {
        removed[removed.length] = (dl = dl.next()).text.substring(0, to.column);
        var inserted = doc.insert(from.line + i, text.slice(i, -1));
        dl.setText(lastV(text));
      } else {
        var inserted = doc.insert(from.line + i, text.slice(i));
        dl = lastV(inserted) || dl;
      }
    }
    dl.setText(dl.text + after);
    forwardParsing(doc, first);
    var change = { type: 'replace', text: text, removed: removed, from: from, to: to };
    adjustCaretsPos(doc, change);
    return change;
  }
  function removeRange(doc, from, to) {
    return replaceRange(doc, '', from, to);
  }
  function insertText(doc, text, at) {
    return replaceRange(doc, text, at, at);
  }
  function defaultFormatter(i) { return i; }
  function lineNumberFor(options, index) {
    return String(options.lineNumberFormatter(index + options.firstLineNumber));
  }
  function formatter(doc, index) {
    var lineFormatter = doc.editor.options.lineNumberFormatter || defaultFormatter;
    return lineFormatter(doc.editor.options.firstLineNumber + index);
  }
  function cacheHasFontStyle(cache) {
    for (var j = 0, cl = cache ? cache.length : 0; j < cl; j++) if (cache[j].style.indexOf('font-') >= 0) return true;
    return false;
  }
  
  Measure = function(dl, sizes) {
    this.dl = dl;
    this.line = dl.getIndex();
    this.column = this.offsetX = this.offsetY = this.width = this.charWidth = 0;
    this.height = this.charHeight = sizes.font.height;
  }
  
  var lineViewNode = addClass(div.cloneNode(false), 'cp-line-view')
  , lnumberWrapper = addClass(div.cloneNode(false), 'cp-line-number-wrapper')
  , lnumberNode = addClass(div.cloneNode(false), 'cp-line-number');
  lnumberNode.appendChild(document.createTextNode(''));
  lnumberWrapper.appendChild(lnumberNode);
  lineViewNode.appendChild(lnumberWrapper);
  lineViewNode.appendChild(pre.cloneNode(false));
  
  LineView = function() {
    this.node = lineViewNode.cloneNode(true);
    this.counter = this.node.firstChild.firstChild;
    this.pre = this.node.lastChild;
    this.change = 0;
  }
  
  function lineUnlink(doc, lineView) {
    var line = lineView.line;
    if (!line) return;
    if (lineView.line.view === lineView) {
      line.view = undefined;
      doc.emit('unlink', line);
    }
    lineView.line = undefined;
  }
  function lineLink(doc, lineView, line) {
    lineUnlink(doc, lineView);
    lineView.change = true;
    lineView.line = line;
    lineView.size = 1;
    lineView.counterText = null;
    line.view = lineView;
    touch(line);
    process(doc, line);
    doc.emit('link', line);
    return lineView;
  }
  
  LineView.prototype.tail = function() {
    return this.line; // TODO: merged lines
  }
  
  function setCounter(doc, lineView, index, setWidth) {
    var opts = doc.editor.options, text = lineNumberFor(opts, index);
    if (lineView.counterText !== text) lineView.counter.firstChild.nodeValue = lineView.counterText = text;
    if (setWidth) {
      lineView.counter.parentNode.style.left = -doc.sizes.countersWidth + (opts.fixedLineNumbers ? doc.scrollLeft : 0) + 'px';
      lineView.counter.style.width = doc.sizes.countersWidth + 'px';
    }
  }
  function insertLineViewNode(view, lineView, at) {
    if (!view.display) return;
    setCounter(view.doc, lineView, view.from + at, true);
    if (at < view.length) view.display.insertBefore(lineView.node, view.display.children[at]);
    else view.display.appendChild(lineView.node);
  }
  function removeLineViewNode(view, lineView) {
    if (!view.display) return;
    view.display.removeChild(lineView.node);
  }
  function maybeUpdateCountersWidth(doc, force) {
    var last = lineNumberFor(doc.editor.options, doc.size() - 1);
    if (force || doc.editor.options.lineNumbers && last.length !== doc.sizes.lastLineNumberLength) {
      var measure = doc.measure.node.firstChild;
      measure.firstChild.innerHTML = last;
      var width = measure.firstChild.offsetWidth;
      doc.sizes.lastLineNumberLength = last.length;
      updateCountersWidth(doc, width);
      return width;
    }
  }
  function updateCountersWidth(doc, width) {
    doc.sizes.countersWidth = width;
    doc.dom.counter.style.width = width + 'px';
    doc.dom.wrapper.style.marginLeft = width + 'px';
  }
  function replaceLineInLineView(doc, lineView, newLine, newLineIndex) {
    setCounter(doc, lineView, newLineIndex);
    lineLink(doc, lineView, newLine);
  }
  function renderView(view, startLine, startIndex) {
    var i = startIndex - 1, next = startLine, sd = 0, scrolled;
    while (next && ++i < view.length) {
      replaceLineInLineView(this, view[i], next, view.from + i);
      next = next.next(true);
    }
    if (i + 1 < view.length) {
      while (i++ < view.length && (scrolled = scrollDocUp(this))) sd -= scrolled.line.height;
      while (i < view.length && view.pop());
    }
    return sd;
  }
  function rewind(doc, st) {
    var dl = doc.lineWithOffset(st - doc.editor.options.viewportMargin)
    , view = doc.view, tmpdl = dl, dli = dl.getIndex(), i = -1, popped
    , from = view.from, codeScrollDelta = dl.getOffset() - doc.sizes.scrollTop;
    
    if (view.from <= dli && dli <= view.to) return false;
    
    while (tmpdl && ++i < view.length) {
      replaceLineInLineView(doc, view[i], tmpdl, dli + i);
      tmpdl = tmpdl.next(true);
    }
    view.from = dli;
    view.to = view.from + i;
    if (i + 1 < view.length) {
      while (++i < view.length && (popped = scrollDocUp(doc))) codeScrollDelta -= popped.line.height;
      while (i < view.length && (popped = view.pop())) codeScrollDelta -= popped.line.height;
    }
    view.to = view.from + view.length - 1;
    doc.dom.scroll.scrollTop = doc.scrollTop = st;
    scroll(doc, codeScrollDelta);
    doc.fill();
    return true;
  }
  function scrollDocUp(doc) {
    var view = doc.view, prev = view.firstLine().prev();
    if (!prev) return;
    var popped = pop.call(view);
    --view.from; --view.to;
    insertLineViewNode(view, popped, 0);
    unshift.call(view, popped);
    return lineLink(doc, popped, prev);
  }
  function scrollDocDown(doc) {
    var view = doc.view, next = view.lastLine().next();
    if (!next) return;
    var shifted = shift.call(view);
    ++view.from; ++view.to;
    insertLineViewNode(view, shifted, view.length);
    push.call(view, shifted);
    return lineLink(doc, shifted, next);
  }
  
  View = function(doc) {
    EventEmitter.call(this, doc);
    this.doc = doc;
    this.length = this.from = 0;
    this.to = -1;
    this.display = null;
  }
  
  View.prototype = {
    indexOf: Array.prototype.indexOf,
    push: function(lineView) {
      ++this.to;
      insertLineViewNode(this, lineView, this.length);
      push.call(this, lineView);
      return lineView;
    },
    pop: function() {
      --this.to;
      var popped = pop.call(this);
      removeLineViewNode(this, popped);
      return popped;
    },
    shift: function() {
      ++this.from;
      var shifted = shift.call(this);
      removeLineViewNode(this, shifted);
      return shifted;
    },
    unshift: function(lineView) {
      --this.from;
      insertLineViewNode(this, lineView, 0);
      unshift.call(this, lineView);
      return lineView;
    },
    insert: function(index, lineView) {
      ++this.to;
      insertLineViewNode(this, lineView, index);
      splice.call(this, index, 0, lineView);
    },
    mount: function(display) {
      this.display = display;
      for (var i = 0, l = this.length; i < l; i++) insertLineViewNode(this, this[i], l);
    },
    unmount: function() {
      for (var i = 0, l = this.length; i < l; i++) removeLineViewNode(this, this[i]);
      this.display = null;
    },
    height: function() {
      var h = 0;
      for (var i = 0; i < this.length; i++) h += this[i].line.height;
      return h;
    },
    firstLine: function() {
      return this.length ? this[0].line : null;
    },
    lastLine: function() {
      return this.length ? this[this.length - 1].tail() : null;
    }
  }
  
  function clearDoc(doc) {
    var view = doc.view;
    view.length = view.from = 0;
    view.to = -1;
    view.display.innerHTML = '';
    doc.clearSelection();
    doc.dom.code.style.top = (doc.sizes.scrollTop = 0) + 'px';
  }
  function computeCodeReserve(doc) {
    return doc.dom.code.offsetHeight - doc.dom.scroll.offsetHeight - 2 * doc.sizes.paddingTop;
  }
  function maybeAppendLineViews(doc, bottom, margin) {
    var dl = doc.view.lastLine().next();
    while (dl && bottom < margin) {
      var lv = doc.view.push(new LineView());
      lineLink(doc, lv, dl);
      bottom += dl.height;
      dl = dl.next(true);
    }
  }
  
  Document = CodePrinter.Document = function(source, mode, font) {
    var that = this, caretPos, maxLine, maxLineLength = 0, maxLineChanged, data;
    
    this.init = function(source, mode) {
      source = source || '';
      data = new Data();
      if (this.view.to !== -1) clearDoc(this);
      this.insert(0, source.split(eol));
      this.setMode(mode);
      return this;
    }
    this.insert = function(at, text) {
      var lines = [];
      if ('string' === typeof text) {
        lines[0] = new Line(text, this.sizes.font.height);
        if (text.length > maxLineLength) {
          maxLine = lines[0];
          maxLineLength = text.length;
          maxLineChanged = true;
        }
      } else {
        for (var i = 0; i < text.length; i++) {
          lines[i] = new Line(text[i], this.sizes.font.height);
          if (text[i].length > maxLineLength) {
            maxLine = lines[i];
            maxLineLength = text[i].length;
            maxLineChanged = true;
          }
        }
      }
      data.insert(at, lines, this.sizes.font.height * lines.length);
      if (this.editor) {
        var view = this.view, scrollDelta;
        if (at < view.from) {
          view.from += lines.length;
          view.to += lines.length;
          scrollDelta = this.sizes.font.height * lines.length;
        } else if (at <= view.to + 1) {
          scrollDelta = renderView.call(this, view, lines[0], at - view.from);
        }
        scroll(this, scrollDelta);
        this.fill();
        this.updateView();
      }
      return lines;
    }
    this.remove = function(at, n) {
      if ('number' !== typeof n || n <= 0 || at < 0 || at + n > data.size) return;
      var view = this.view, h = data.height, rm = data.remove(at, n), sd = 0;
      
      if (at + n < view.from) { // change before view
        sd = data.height - h;
        view.from -= n; view.to -= n;
      } else if (at <= view.to) { // change in view
        var max = Math.max(view.from, at), m = max - at, firstLineView = rm[m].view, i = view.indexOf(firstLineView), next = data.get(at);
        for (var j = 0; j < m; j++) sd -= rm[j].height;
        view.from -= m; view.to -= m;
        sd += renderView.call(this, view, next, i);
      }
      if (sd) {
        scroll(this, sd);
        this.scroll(0, sd);
      }
      this.updateView();
      return rm;
    }
    this.scroll = function(deltaX, deltaY) {
      if (deltaX) {
        var sl = Math.max(0, Math.min(this.scrollLeft + deltaX, this.dom.scroll.scrollWidth - this.dom.scroll.offsetWidth));
        if (this.scrollLeft !== sl) {
          this._lockedScrolling = true;
          this.dom.scroll.scrollLeft = this.scrollLeft = sl;
          realignHorizontally(this);
        }
      }
      if (deltaY) {
        var st = Math.max(0, Math.min(this.scrollTop + deltaY, this.dom.scroll.scrollHeight - this.dom.scroll.offsetHeight));
        if (this.scrollTop !== st) {
          this._lockedScrolling = true;
          var margin = this.editor.options.viewportMargin
          , top = this.scrollTop + deltaY - this.sizes.scrollTop
          , oldTop = top;
          
          if ((deltaY < -200 || 200 < deltaY) && rewind(this, st) !== false) return;
          
          if (deltaY > 0) {
            if (top < margin) {
              maybeAppendLineViews(this, computeCodeReserve(this) - top, margin);
            } else {
              var shifted;
              while (top > margin && (shifted = scrollDocDown(this))) {
                top -= shifted.line.height;
              }
            }
          }
          else if (deltaY < 0) {
            var bottom = computeCodeReserve(this) - top;
            if (top > margin) {
              maybeAppendLineViews(this, bottom, margin);
            } else {
              var popped;
              while (top < margin && (popped = scrollDocUp(this))) {
                top += popped.line.height;
              }
            }
          }
          this.dom.scroll.scrollTop = this.scrollTop = st;
          if (oldTop !== top) scroll(this, oldTop - top);
        }
      }
    }
    this.scrollTo = function(sl, st) {
      return this.scroll(Math.round(sl - this.scrollLeft), Math.round(st - this.scrollTop));
    }
    this.updateView = function() {
      var view = this.view, cw = maybeUpdateCountersWidth(this);
      for (var i = 0, lv = view[i]; i < view.length; lv = view[++i]) {
        setCounter(this, lv, view.from + i, cw);
        if (lv.change) process(this, lv.line);
        if (this.sizes.font.height !== lv.line.height || cacheHasFontStyle(lv.line.cache)) updateLineHeight(this, lv.line);
      }
      if (maxLineChanged) {
        if (!maxLine) {
          var dl = data.get(0);
          maxLine = dl; maxLineLength = dl.text.length;
          while (dl = dl.next()) {
            if (dl.text.length > maxLineLength) {
              maxLine = dl;
              maxLineLength = dl.text.length;
            }
          }
        }
        maxLineChanged = false;
        var minWidth = externalMeasure(this, maxLine).pre.offsetWidth;
        if (this.sizes.minWidth !== minWidth) this.dom.wrapper.style.minWidth = (this.sizes.minWidth = minWidth) + 'px';
      }
      updateHeight(this);
      return this.emit('viewUpdated');
    }
    this.pushChange = function(change) {
      if (!change) return;
      this.history.push(change);
      this.emit('change', change);
      return change;
    }
    this.each = function(func) { data.foreach(func); }
    this.get = function(i) { return data.get(i); }
    this.getOptions = function() { return this.editor && this.editor.options; }
    this.getOption = function(key) { return this.editor && this.editor.options[key]; }
    this.getTabString = function() { return this.editor && this.editor.options.indentByTabs ? '\t' : repeat(' ', this.editor.options.tabWidth); }
    this.lineWithOffset = function(offset) { return data.getLineWithOffset(Math.max(0, Math.min(offset, data.height))); }
    this.getLineEnding = function() { var ln = this.getOption('lineEnding'); return ln && lineendings[ln] || ln || lineendings['LF']; }
    
    this.size = function() { return data.size; }
    this.height = function() { return data.height; }
    
    EventEmitter.call(this);
    
    this.on({
      'caretWillMove': function(caret, x, y) {
        var head = caret.head();
        for (var i = 0; i < this.carets.length; i++) {
          var cc = this.carets[i];
          if (caret !== cc && cc.inSelection(head.line, head.column)) {
            this.carets.splice(i, 1);
            this.dom.caretsContainer.removeChild(cc.node);
            cc.clearSelection();
            mergeCarets(caret, cc);
            break;
          }
        }
      },
      'caretMoved': function(caret) {
        if (this.getOption('autoScroll') && lastV(this.carets) === caret && !Flags.mouseScrolling) {
          var scroll = this.dom.scroll
          , pl = this.sizes.paddingLeft, pt = this.sizes.paddingTop
          , sl = scroll.scrollLeft, st = scroll.scrollTop
          , ow = scroll.offsetWidth - this.sizes.countersWidth
          , oh = scroll.offsetHeight
          , h = caret.dl().height;
          
          if (caret.x < sl) {
            sl = caret.x;
          } else if (caret.x >= sl + ow) {
            sl = caret.x - ow;
          }
          if (caret.y < st + h) {
            st = caret.y + (caret.y < st ? -oh / 2 : -h);
          } else if (caret.y >= st + oh - h) {
            st = caret.y + (caret.y >= st + oh ? -oh / 2 : -oh + 2 * h);
          }
          this.scrollTo(sl, st);
        }
        if (this.getOption('matching')) {
          var m = getMatchingObject(this.parser.matching);
          if (m) {
            var a, b, cur, head = caret.head(), bf = caret.textBefore(), af = caret.textAfter();
            outer: for (var s in m) {
              var len = s.length, i = 0;
              do {
                a = len == i || bf.indexOf(s.substring(0, len - i), bf.length - len + i) >= 0;
                b = i == 0 || af.indexOf(s.substring(len - i, len)) == 0;
                if (a && b) {
                  a = b = matchingHelper(this, s, m[s], head.line, head.column - len + i, head.column + i);
                  if (a) break outer;
                }
              } while (++i <= len);
            }
            if (!(a && b) && this.highlightOverlay) this.removeOverlay(this.highlightOverlay);
          }
        }
      }
    });
    
    this.from = 0;
    this.to = -1;
    this.sizes = { scrollTop: 0, font: font || {}, paddingTop: 5, paddingLeft: 10, countersWidth: 30, lastLineNumberLength: 1 };
    this.view = new View(this);
    this.measure = new LineView();
    this.overlays = [];
    this.carets = [new Caret(this)];
    this.scrollTop = this.scrollLeft = 0;
    this.parser = modes.plaintext;
    this.history = new History(this);
    
    return this.init(source, mode);
  }
  
  function startBlinking(doc, options) {
    clearInterval(doc.caretsBlinkingInterval);
    if (options.blinkCaret) {
      var v = true, cc = doc.dom.caretsContainer;
      if (options.caretBlinkRate > 0) {
        cc.style.visibility = '';
        doc.caretsBlinkingInterval = setInterval(function() {
          var tick = (v = !v) ? '' : 'hidden';
          if (Flags.isKeyDown || Flags.isMouseDown) {
            tick = '';
            v = false;
          }
          cc.style.visibility = tick;
        }, options.caretBlinkRate);
      } else if (options.caretBlinkRate < 0)
        cc.style.visibility = 'hidden';
    }
  }
  function mergeCarets(first, second) {
    var h1 = first.head(), h2 = second.head()
    , a1 = first.anchor(), a2 = second.anchor()
    , pos = [h1, h2];
    if (a1) pos.push(a1);
    if (a2) pos.push(a2);
    pos = pos.sort(cmp);
    if (cmp(h1, h2) < 0) first.setSelection(pos[0], lastV(pos));
    else first.setSelection(lastV(pos), pos[0]);
  }
  function eachCaret(doc, func, start) {
    return each(doc.carets, func, doc, start);
  }
  function searchByString(find, dl, line) {
    if (!find) return 0;
    var search = this.searchResults, text = dl.text, ln = 0, i;
    while (ln < text.length && (i = text.indexOf(find, ln)) >= 0) {
      search.add(dl, p(line, i), find);
      ln = i + find.length;
    }
  }
  function searchByRegExp(pattern, dl, line) {
    var search = this.searchResults, text = dl.text, ln = 0, i, match;
    while (text && (i = text.substr(ln).search(pattern)) >= 0) {
      if (match = RegExp.lastMatch) {
        search.add(dl, p(line, ln + i), match);
      }
      if (ln + i === 0) break;
      ln += (i + match.length) || 1;
    }
  }
  function searchNodeStyle(dl, rect) {
    return rect.width ? 'top:'+rect.offsetY+'px;left:'+rect.offsetX+'px;width:'+rect.width+'px;height:'+rect.charHeight+'px;' : 'display:none;';
  }
  function searchShow(dl, line) {
    if (this.searchResults) this.searchResults.show(dl, dl.getIndex());
  }
  function searchHide(dl, line) {
    if (this.searchResults) this.searchResults.hide(dl, dl.getIndex());
  }
  function searchOnChange(change) {
    this.searchResults.length = 0;
    this.search(this.searchResults.request, false);
  }
  function nextSearchNode(move) {
    return function() {
      if (this.length === 0) this.setActive(null);
      var keys = Object.keys(this.rows);
      if (this.active) {
        var i = keys.indexOf(''+this.active.line);
        if (i < 0) this.setActive(null);
        else {
          var row = this.rows[this.active.line], j = row.indexOf(this.active);
          if (j >= 0 && j + move >= 0 && j + move < row.length) this.setActive(row[j + move]);
          else if (keys[i + move]) this.setActive(move >= 0 ? this.rows[keys[i + move]][0] : lastV(this.rows[keys[i + move]]));
          else this.setActive(null);
        }
      }
      if (!this.active) this.setActive(move >= 0 ? this.rows[keys[0]][0] : lastV(this.rows[lastV(keys)]));
      return this.active;
    }
  }
  
  var SearchResults = function(doc) {
    this.overlay = new CodePrinter.Overlay(['cp-search-overlay']);
    this.update = function(dl, node) {
      var rect = doc.measureRect(dl, node.column, node.column + node.value.length);
      rect.offsetY = dl.getOffset() + doc.sizes.paddingTop;
      node.span.setAttribute('style', searchNodeStyle(dl, rect));
      node.span.setAttribute('data-cp-pos', node.line + ',' + node.column);
    }
  }
  
  SearchResults.prototype = {
    setRequest: function(req) {
      this.rows = {};
      this.length = 0;
      this.active = null;
      this.request = req;
      this.overlay.node.innerHTML = '';
    },
    add: function(dl, pos, value) {
      var row = this.rows[pos.line], node, diff = -1;
      if (!row) row = this.rows[pos.line] = [];
      for (var i = 0; i < row.length; i++) {
        diff = pos.column - row[i].column;
        if (diff <= 0) {
          if (diff === 0) (node = row[i]).setValue(value);
          break;
        }
      }
      if (diff !== 0)  {
        node = new SearchNode(value, pos);
        row.splice(i, 0, node);
        if (++this.length === 1) this.setActive(node);
      }
    },
    get: function(line, column) {
      var row = this.rows[line], node, i = -1;
      if (!row) return;
      while (node = row[++i]) {
        if (node.column <= column && column < node.column + node.value.length) return node;
      }
    },
    each: function(func) {
      if ('function' !== typeof func) return;
      var row, j = 0;
      for (var k in this.rows) {
        row = this.rows[k];
        for (var i = 0; i < row.length; i++) {
          func.call(this, row[i], j++, i);
        }
      }
    },
    setActive: function(node) {
      if (this.active) this.active.span.classList.remove('active');
      if (this.active = node) node.span.classList.add('active');
    },
    show: function(dl, line) {
      var row = this.rows[line];
      if (!row) return;
      for (var i = 0; i < row.length; i++) {
        this.overlay.node.appendChild(row[i].span);
        this.update(dl, row[i]);
      }
    },
    hide: function(line) {
      var row = this.rows[line];
      if (!row) return;
      for (var i = 0; i < row.length; i++) {
        this.overlay.node.removeChild(row[i].span);
      }
    },
    next: nextSearchNode(+1),
    prev: nextSearchNode(-1),
    reset: function(line) {
      var row = this.rows[line];
      if (!row) return;
      for (var k in row) {
        row[k] = null;
        --this.length;
      }
      delete this.rows[line];
    }
  }
  
  var SearchNode = function(value, pos) {
    this.span = span.cloneNode(false);
    this.span.classList.add('cp-search-occurrence');
    this.span.appendChild(document.createTextNode(value));
    this.value = value;
    this.line = pos.line;
    this.column = pos.column;
  }
  
  SearchNode.prototype = {
    setValue: function(value) {
      this.span.firstChild.nodeValue = this.value = value;
    }
  }
  
  function getOffsetRect(doc, mainRect, el) {
    var rect = el.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      left: doc.scrollLeft + rect.left - mainRect.left - doc.sizes.countersWidth,
      top: doc.scrollTop + rect.top - mainRect.top
    };
  }
  
  Document.prototype = {
    undo: function() { return this.history.operation(this, 'undo', historyBack(this.history)); },
    redo: function() { return this.history.operation(this, 'redo', historyForward(this.history)); },
    undoAll: function() { while (this.undo()); },
    redoAll: function() { while (this.redo()); },
    focus: function() {
      if (!this.isFocused) {
        this.isFocused = true;
        startBlinking(this, this.getOptions());
        eachCaret(this, function(caret) {
          this.dom.caretsContainer.appendChild(caret.node);
          caret.focus();
        });
        this.emit('focus');
      }
    },
    blur: function() {
      if (this.isFocused) {
        clearInterval(this.caretsBlinkingInterval);
        this.isFocused = false;
        eachCaret(this, function(caret) {
          caret.blur();
          this.dom.caretsContainer.removeChild(caret.node);
        });
        this.emit('blur');
      }
    },
    getState: function(at) {
      var pos = np(this, at), dl = pos && this.get(pos.line);
      if (!dl) return;
      var parser = this.parser
      , tw = this.getOption('tabWidth')
      , s = searchLineWithState(parser, dl, tw)
      , state = s.state, tmp = s.line;
      
      for (; tmp; tmp = tmp.next()) {
        var ind = parseIndentation(tmp.text, tw), stream = new Stream(ind.rest, ind.indent, ind.length);
        if (tmp === dl) {
          state = copyState(state);
          var readTo = Math.max(0, Math.min(pos.column - ind.length, ind.rest.length))
          , cache = parseStream(parser, stream, state, readTo)
          , oldpos = stream.pos, lastCache = lastV(cache);
          if (stream.eol()) tmp.state = state;
          stream.pos = readTo;
          return { stream: stream, state: state, cache: cache, style: lastCache && lastCache.style, parser: state && state.parser || parser, nextIteration: function() {
            if (stream.pos < oldpos) stream.pos = oldpos;
            return readIteration(parser, stream, state, cache);
          }};
        } else {
          state = parse(this, tmp, state).state;
        }
      }
    },
    getStyles: function(at) {
      var pos = np(this, at);
      if (!pos) return false;
      //var dl = this.get(pos.line);
      //if (dl.cache) for (var i = 0; i < dl.cache.length; i++) if (dl.cache[i].from <= at.column) return dl.cache[i].style;
      return this.getState(pos).style;
    },
    getParser: function(at) {
      var s = this.getState(at);
      return s && s.parser;
    },
    measurePosition: function(x, y) {
      var dl = this.lineWithOffset(y)
      , ch = maybeExternalMeasure(this, dl).pre.childNodes
      , mainRect = this.dom.mainNode.getBoundingClientRect()
      , child = ch[0], rect, l, i = -1, chl = ch.length
      , m = new Measure(dl, this.sizes);
      
      if (chl === 1 && child.firstChild.nodeValue === zws) {
        rect = getOffsetRect(this, mainRect, child);
      } else {
        while (++i < chl) {
          child = ch[i];
          l = child.firstChild.nodeValue.length;
          if (l === 0) continue;
          rect = getOffsetRect(this, mainRect, child);
          if (x <= rect.left + rect.width) {
            var tmp = Math.round(Math.max(0, x - rect.left) * l / rect.width);
            m.column += tmp;
            m.offsetX = rect.left + tmp * rect.width / l;
            break;
          }
          m.column += l;
        }
      }
      if (child) {
        if (!m.offsetX) m.offsetX = rect.left + rect.width;
        m.offsetY = rect.top;
        m.charWidth = rect.width / child.firstChild.nodeValue.length;
        m.charHeight = rect.height;
        m.height = rect.height;
      }
      return m;
    },
    measureRect: function(dl, offset, to) {
      var ch = maybeExternalMeasure(this, dl).pre.childNodes
      , mainRect = this.dom.mainNode.getBoundingClientRect()
      , child = ch[0], rect, l, i = -1, chl = ch.length, b
      , tmp = 0, m = new Measure(dl, this.sizes);
      
      if (chl === 1 && child.firstChild.nodeValue === zws) {
        rect = getOffsetRect(this, mainRect, child);
      } else {
        while (++i < chl && (child = ch[i])) {
          l = child.firstChild.nodeValue.length;
          if (l === 0) continue;
          rect = getOffsetRect(this, mainRect, child);
          if (b) {
            if (to <= tmp + l) {
              m.width = rect.left - m.offsetX + (to - tmp) * rect.width / l;
              break;
            }
          } else if (offset < tmp + l) {
            m.offsetX = rect.left + (offset - tmp) * rect.width / l;
            m.offsetY = rect.top;
            m.charWidth = rect.width / l;
            b = true;
            
            if (to < offset || 'number' !== typeof to) break;
            if (to <= tmp + l) {
              m.width = (to - offset) * rect.width / l;
              break;
            }
          }
          tmp += l;
        }
      }
      m.column = offset;
      if (child) {
        if (!b) {
          m.charWidth = rect.width / l;
          m.offsetX = rect.left + rect.width;
          m.offsetY = rect.top;
        }
        m.height = rect.top - m.offsetY + rect.height;
        m.charHeight = rect.height;
      }
      if (!m.charWidth) m.charWidth = calcCharWidth(dl.view || this.measure);
      return m;
    },
    searchLeft: function(start, pattern, style) {
      var pos = np(this, start), dl = pos && this.get(pos.line)
      , search = 'string' === typeof pattern ? function(text) { return text.lastIndexOf(pattern); } : function(text) { return text.search(pattern); };
      if (!pos) return;
      while (dl) {
        var i = search(dl.text.substring(0, pos.column));
        if (i === -1) {
          pos.column = Infinity;
          dl = dl.prev();
          --pos.line;
        } else {
          var st = this.getStyles(p(pos.line, i + 1));
          if (st === style) break;
          pos.column = i;
        }
      }
      return dl && p(pos.line, i);
    },
    searchRight: function(start, pattern, style) {
      var pos = np(this, start), dl = pos && this.get(pos.line)
      , search = 'string' === typeof pattern ? function(text) { return text.indexOf(pattern); } : function(text) { return text.search(pattern); };
      if (!pos) return;
      while (dl) {
        var i = search(dl.text.substr(pos.column));
        if (i === -1) {
          pos.column = 0;
          dl = dl.next();
          ++pos.line;
        } else {
          var st = this.getStyles(p(pos.line, pos.column + i + 1));
          if (st === style) break;
          pos.column += i + 1;
        }
      }
      return dl && p(pos.line, i + pos.column);
    },
    search: function(find, scroll, callback) {
      if (!callback && 'function' === typeof scroll) {
        callback = scroll;
        scroll = false;
      }
      if ('string' === typeof find || find instanceof RegExp) {
        var search = this.searchResults = this.searchResults || new SearchResults(this);
        
        if (!search.request || find.toString() !== search.request.toString() || search.length === 0 || !search.onNodeMousedown || this.overlays.indexOf(search.overlay) === -1) {
          var doc = this, clearSelected, esc;
          search.setRequest(find);
          
          clearSelected = function() {
            var children = search.overlay.node.children, k = 0;
            for (var i = 0; i < children.length; i++) {
              if (children[i].classList.contains('cp-hidden') && ++k) {
                children[i].classList.remove('cp-hidden');
              }
            }
            k && doc.call('clearSelection');
          }
          
          if (this.addOverlay(search.overlay) !== undefined) {
            this.on({ link: searchShow, unlink: searchHide, change: searchOnChange });
            on(search.overlay.node, 'mousedown', search.onNodeMousedown = function(e) {
              var target = e.target, pos = target.getAttribute('data-cp-pos');
              if (pos && target.tagName === 'SPAN') {
                clearSelected();
                pos = pos.split(/\,/g);
                var node = search.get(parseInt(pos[0], 10), parseInt(pos[1], 10));
                var caret = doc.resetCarets();
                caret.setSelection(p(node.line, node.column), p(node.line, node.column + node.value.length));
                caret.once('selectionCleared', function() { node.span.classList.remove('cp-hidden'); });
                target.classList.add('cp-hidden');
                doc.dom.input.focus();
                return eventCancel(e);
              }
            });
          }
          
          var searchBy = 'string' === typeof find ? searchByString : searchByRegExp;
          
          this.asyncEach(function(dl, line) {
            if (search.request !== find || !search.onNodeMousedown) return false;
            searchBy.call(this, find, dl, line);
          }, function(index, last) {
            if (last !== false) {
              if (search.length) {
                if (scroll !== false) {
                  var rows = search.rows;
                  for (var k in rows) {
                    if (rows[k].length) {
                      scrollToLine(this, k);
                      break;
                    }
                  }
                }
                this.eachVisibleLines(searchShow);
              }
              search.overlay.show();
              this.emit('searchCompleted', search, find);
              'function' === typeof callback && callback.call(this, search, find);
            }
          });
        } else {
          'function' === typeof callback && callback.call(this, search);
        }
      }
      return this;
    },
    searchEnd: function() {
      var search = this.searchResults;
      if (!search) return;
      this.off({ link: searchShow, unlink: searchHide, changed: searchOnChange });
      off(search.overlay.node, 'mousedown', search.onNodeMousedown);
      search.onNodeMousedown = null;
      this.removeOverlay(search.overlay);
    },
    replace: function(replaceWith) {
      var active = this.searchResults && this.searchResults.active;
      if (active && 'string' === typeof replaceWith) {
        this.replaceRange(replaceWith, p(active.line, active.column), p(active.line, active.column + active.value.length));
      }
    },
    replaceAll: function(replaceWith) {
      if (!this.searchResults) return;
      var doc = this, changes = [];
      this.searchResults.each(function(node) {
        changes.push(replaceRange(doc, replaceWith, p(node.line, node.column), p(node.line, node.column + node.value.length)));
      });
      this.history.stage();
      for (var i = 0; i < changes.length; i++) this.pushChange(changes[i]);
      this.history.commit();
    },
    createCaret: function() {
      var caret = new Caret(this);
      this.carets.push(caret);
      if (this.isFocused) {
        this.dom.caretsContainer.appendChild(caret.node);
      }
      return caret;
    },
    resetCarets: function(all) {
      var startIndex = all ? 0 : 1;
      eachCaret(this, function(caret) {
        caret.clearSelection();
        caret.blur();
        this.dom.caretsContainer.removeChild(caret.node);
      }, startIndex);
      this.carets.length = startIndex;
      return this.carets[0];
    },
    makeCarets: function(n) {
      if ('number' === typeof n) {
        if (n > this.carets.length) this.carets.length = n;
        else for (; this.carets.length < n;) this.createCaret();
      }
    },
    eachCaret: function(func, startIndex) {
      var carets = this.carets;
      this.history.stage();
      each(this.carets, func, this, startIndex);
      this.history.commit();
      return this;
    },
    somethingSelected: function() {
      for (var i = 0; i < this.carets.length; i++)
        if (this.carets[i].hasSelection())
          return true;
      return false;
    },
    getSelection: function() {
      var parts = [], carets = [].concat(this.carets);
      carets.sort(function(a, b) { return cmp(a.head(), b.head()); });
      each(carets, function(caret) {
        var sel = caret.getSelection();
        if (sel) parts[parts.length] = sel;
      }, this);
      return parts.join('');
    },
    drawSelection: function(overlay, range) {
      if (overlay instanceof CodePrinter.Overlay && range) {
        var from = range.from, to = range.to
        , firstLine = this.get(from.line)
        , lastLine = this.get(to.line)
        , fromOffset = firstLine.getOffset()
        , toOffset = lastLine.getOffset()
        , fromMeasure = this.measureRect(firstLine, from.column)
        , toMeasure = this.measureRect(lastLine, to.column)
        , pl = this.sizes.paddingLeft, pt = this.sizes.paddingTop
        , equal = from.line === to.line;
        
        if (cmp(from, to) > 0) return;
        
        overlay.top = prepareSelNode(overlay, overlay.top || div.cloneNode(false)
          , fromMeasure.offsetY, fromMeasure.offsetX, equal && fromMeasure.offsetY === toMeasure.offsetY ? 0 : null, fromMeasure.height, pl);
        
        overlay.middle = prepareSelNode(overlay, overlay.middle || div.cloneNode(false)
          , fromMeasure.offsetY + fromMeasure.height, pl, null, toMeasure.offsetY - fromMeasure.offsetY - fromMeasure.height, pl);
        
        if (equal && fromMeasure.offsetY === toMeasure.offsetY) {
          overlay.bottom = prepareSelNode(overlay, overlay.bottom || div.cloneNode(false)
            , toMeasure.offsetY, fromMeasure.offsetX, toMeasure.offsetX - fromMeasure.offsetX, fromMeasure.height, null);
        } else {
          overlay.bottom = prepareSelNode(overlay, overlay.bottom || div.cloneNode(false)
            , toMeasure.offsetY, pl, toMeasure.offsetX - pl, toMeasure.charHeight, null);
        }
        overlay.show();
      }
    },
    createOverlay: function(classes) {
      return this.addOverlay(new CodePrinter.Overlay(classes));
    },
    addOverlay: function(overlay) {
      if (!(overlay instanceof CodePrinter.Overlay) || this.overlays.indexOf(overlay) >= 0) return;
      this.overlays.push(overlay);
      this.dom.screen.appendChild(overlay.node);
      return overlay.emit('added');
    },
    removeOverlay: function(overlay) {
      var i = this.overlays.indexOf(overlay);
      if (i === -1) return;
      this.overlays.splice(i, 1);
      this.dom.screen.removeChild(overlay.node);
      return overlay.emit('removed');
    },
    createHighlightOverlay: function() {
      if (this.highlightOverlay) this.removeOverlay(this.highlightOverlay);
      var overlay = this.highlightOverlay = this.createOverlay('cp-highlight-overlay'), args = Array.apply(null, arguments);
      this.once('blur', function() { this.removeOverlay(overlay); });
      this.once('changed', function() { this.removeOverlay(overlay); });
      for (var i = 0, dl; i < args.length; i++) {
        var cur = args[i];
        if (dl = this.get(cur.line)) {
          var ms = this.measureRect(dl, cur.column, cur.column + cur.text.length), sp = addClass(span.cloneNode(false), 'cp-highlight');
          sp.setAttribute('style', 'top:'+ms.offsetY+'px;left:'+ms.offsetX+'px;width:'+ms.width+'px;height:'+ms.charHeight+'px;');
          overlay.node.appendChild(sp);
        }
      }
      return this;
    },
    isLineVisible: function(dl) {
      return this.view.indexOf('number' === typeof dl ? this.get(dl) : dl) >= 0;
    },
    eachVisibleLines: function(callback) {
      for (var i = 0; i < this.view.length; i++) {
        callback.call(this, this.view[i].line, this.view.from + i);
      }
    },
    textAt: function(line) {
      var dl = this.get(line);
      return dl ? dl.text : null;
    },
    substring: function(a, b) {
      var parts = [], from = np(this, a), to = np(this, b);
      if (from && to && cmp(from, to) <= 0) {
        var dl = this.get(from.line);
        if (from.line === to.line) return dl.text.substring(from.column, to.column);
        parts[0] = dl.text.substr(from.column);
        var i = from.line;
        while ((dl = dl.next()) && ++i < to.line) parts[parts.length] = dl.text;
        if (dl) parts[parts.length] = dl.text.substring(0, to.column);
      }
      return parts.join(this.getLineEnding());
    },
    replaceRange: function(text, from, to) {
      var change = replaceRange(this, text, from, to);
      if (change) {
        this.pushChange(change);
        return change.removed;
      }
    },
    removeRange: function(from, to) {
      return this.replaceRange('', from, to);
    },
    fill: function() {
      var view = this.view
      , dl = view.length ? view.lastLine().next() : this.get(0)
      , margin = this.editor.options.viewportMargin
      , topMargin = this.scrollTop - this.sizes.scrollTop
      , bottomMargin = computeCodeReserve(this) - topMargin
      , oldTopMargin = topMargin;
      
      if (bottomMargin < margin) {
        while (dl && bottomMargin < margin) {
          var lv = view.push(new LineView());
          lineLink(this, lv, dl);
          bottomMargin += dl.height;
          dl = lv.tail().next(true);
        }
      } else {
        while (bottomMargin - this.sizes.font.height > margin) {
          var popped = view.pop();
          bottomMargin -= popped.line.height;
        }
      }
      if (topMargin < margin) {
        dl = view.firstLine().prev(true);
        while (dl && topMargin < margin) {
          var lv = view.unshift(new LineView());
          lineLink(this, lv, dl);
          topMargin += dl.height;
          dl = dl.prev(true);
        }
      } else {
        while (topMargin - this.sizes.font.height > margin) {
          var shifted = view.shift();
          topMargin -= shifted.line.height;
        }
      }
      if (oldTopMargin !== topMargin) scroll(this, oldTopMargin - topMargin);
      return this;
    },
    print: function() {
      this.fill();
      this.updateView();
      runBackgroundParser(this, true);
      this.sizes.paddingTop = parseInt(this.dom.code.style.paddingTop, 10) || 5;
      this.sizes.paddingLeft = parseInt(this.dom.code.style.paddingLeft, 10) || 10;
      if (this.editor.options.autoFocus) this.dom.input.focus();
      var cp = this.editor;
      async(function() { cp && cp.emit('ready'); });
    },
    setMode: function(mode) {
      var doc = this;
      mode = CodePrinter.aliases[mode] || mode || 'plaintext';
      if (this.mode != mode) {
        CodePrinter.requireMode(mode, function(parser) {
          if (parser instanceof CodePrinter.Mode) {
            var dl = doc.get(0);
            if (dl) do dl.cache = dl.state = null; while (dl = dl.next());
            doc.mode = mode;
            doc.parser = parser;
            doc.editor && doc.print();
          }
        });
      }
    },
    getIndent: function(at) {
      var pos = np(this, at);
      if (!pos) return 0;
      return parseIndentation(this.textAt(pos.line), this.editor.options.tabWidth).indent;
    },
    setIndent: function(line, indent) {
      if ('number' !== typeof line) return;
      var dl = this.get(line), old = parseIndentation(dl.text, this.editor.options.tabWidth)
      , diff = indent - old.indent, tab = tabString(this.editor);
      
      if (diff) {
        var newIndent = repeat(tab, indent), lm;
        dl.setText(newIndent + dl.text.replace(/^\s*/g, ''));
        lm = RegExp.lastMatch.length;
        forwardParsing(this, dl);
        adjustCaretsPos(this, { text: [newIndent], from: p(line, 0), to: p(line, lm) });
        this.pushChange({ type: 'setIndent', line: line, before: old.indent, after: indent });
      }
      return tab.length * diff;
    },
    getNextLineIndent: function(line, allowArrays) {
      var ps = this.getState(p(line, -1))
      , i = ps.parser.indent(ps.stream, ps.state, ps.nextIteration);
      return 'number' === typeof i ? i : isArray(i) ? allowArrays ? i : i[0] : 0;
    },
    reIndent: function(from, to) {
      if ('number' === typeof from && 'number' === typeof to) {
        if (from <= to) reIndent(this, from, to);
        else reIndent(this, to, from);
      } else if (this.somethingSelected()) {
        this.eachCaret(function(caret) {
          var range = caret.getRange();
          reIndent(this, range.from.line, range.to.line);
        });
      } else {
        reIndent(this, 0, this.size() - 1);
      }
    },
    getDefinitions: function() {
      var obj = {}, dl = this.get(0), i = 0;
      for (; dl; dl = dl.next()) {
        if (dl.definition) obj[i] = dl.definition;
        ++i;
      }
      return obj;
    },
    appendText: function(text) {
      var t = text.split(eol), size = this.size(), fi = t.shift();
      if (fi) {
        var last = this.get(size - 1);
        last && last.setText(last.text + fi);
      }
      this.insert(size, t);
      if (this.editor && !this.isFilled) this.isFilled = this.fill();
      return this.isFilled;
    },
    write: function(data) {
      this.appendText(data);
      return true;
    },
    end: function() {
      runBackgroundParser(this, true);
    },
    appendLine: function(text) {
      var dl, size = this.doc.size();
      (size == 1 && (dl = this.doc.get(0)).text.length == 0) ? dl.setText(text) : this.doc.insert(size, text);
      if (!this.doc.isFilled) this.doc.isFilled = this.doc.fill();
      return this;
    },
    call: function(command) {
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) args[i] = arguments[i+1];
      this.eachCaret(function(caret) {
        var func = caret[command];
        if ('function' === typeof func) func.apply(caret, args);
      });
      return this;
    },
    isEmpty: function() {
      return this.size() === 1 && !this.get(0).text;
    },
    clear: function() {
      return this.init('');
    },
    getValue: function(lineEnding) {
      var r = [], i = 0, transform = this.getOption('trimTrailingSpaces') ? trimSpaces : defaultFormatter;
      this.each(function() { r[i++] = transform(this.text); });
      return r.join(lineEnding || this.getLineEnding());
    },
    createReadStream: function() {
      return new ReadStream(this, this.getOption('trimTrailingSpaces') ? trimSpaces : defaultFormatter);
    },
    asyncEach: function(callback, onend, options) {
      if (!(onend instanceof Function) && arguments.length === 2) options = onend;
      var that = this, dl = this.get(0), fn
      , index = 0, queue = 1500;
      
      if (options) {
        if (options.queue) queue = options.queue;
        if (options.index) index = options.index;
        if ('number' === typeof options.start) dl = this.get(index = options.start);
        else if (options.start instanceof Line) {
          dl = options.start;
          if (!options.index) index = dl.getIndex();
        }
      }
      
      async(fn = function() {
        var j = 0;
        while (dl && j++ < queue) dl = callback.call(that, dl, index++) === false ? false : dl.next();
        if (!dl) {
          onend instanceof Function && onend.call(that, index, dl);
          return false;
        }
        async(fn);
      });
    }
  }
  Document.prototype.insertText = Document.prototype.replaceRange;
  
  CaretStyles = {
    vertical: function(css, measure, options) {
      css.width = 1;
      css.height = options.caretHeight * measure.charHeight;
      css.left -= 1;
    },
    underline: function(css, measure, options) {
      css.width = measure.charWidth || measure.dl.height / 2;
      css.height = 1;
      css.top += measure.dl.height - 1;
    },
    block: function(css, measure, options) {
      css.width = measure.charWidth || measure.dl.height / 2;
      css.height = options.caretHeight * measure.charHeight;
    }
  }
  
  function maybeReverseSelection(caret, anchor, head, mv) {
    if (!caret.hasSelection() || Flags.shiftKey) return mv;
    var comp = cmp(anchor, head);
    if (comp < 0 && mv < 0 || comp > 0 && mv > 0) {
      caret.reverse();
      return mv - comp;
    }
    return mv;
  }
  function positionAfterMove(doc, pos, move) {
    var mv = move, line = pos.line, column = pos.column
    , dl = doc.get(line), size = doc.size();
    
    if (mv <= 0) {
      while (dl) {
        if (-mv <= column) return p(line, column + mv);
        mv += column + 1;
        if (dl = dl.prev()) { column = dl.text.length; --line; }
      }
    } else {
      while (dl) {
        if (column + mv <= dl.text.length) return p(line, column + mv);
        mv -= dl.text.length - column + 1;
        if (dl = dl.next()) { column = 0; ++line; }
      }
    }
    return p(line, column);
  }
  function rangeWithMove(doc, pos, move) {
    var afterMove = positionAfterMove(doc, pos, move);
    return move <= 0 ? r(afterMove, pos) : r(pos, afterMove);
  }
  
  Caret = CodePrinter.Caret = function(doc) {
    var head = p(0, 0), currentLine, anchor, selOverlay, lastMeasure, parserState;
    
    EventEmitter.call(this, doc);
    this.node = addClass(div.cloneNode(false), 'cp-caret');
    
    function setPixelPosition(x, y) {
      if (!this.isDisabled) {
        var css = {}, stl = doc.getOption('caretStyle');
        
        if (x >= 0) css.left = this.x = x;
        if (y >= 0) css.top = this.y = y;
        
        stl != this.style && this.setStyle(stl);
        (CaretStyles[this.style] || CaretStyles['vertical']).call(this, css, lastMeasure, doc.getOptions());
        for (var k in css) this.node.style[k] = css[k] + ('number' === typeof css[k] ? 'px' : '');
      }
      return this;
    }
    function updateDL(text) {
      if (currentLine) {
        currentLine.setText(text);
        forwardParsing(doc, currentLine);
        doc.updateView();
      }
    }
    function select(dl) {
      if (dl && !dl.active && doc.isFocused) {
        if (doc.getOption('highlightCurrentLine')) dl.addClass(activeClassName);
        dl.active = true;
      }
    }
    function unselect() {
      if (currentLine && currentLine.active) {
        currentLine.removeClass(activeClassName);
        currentLine.active = undefined;
      }
    }
    
    this.dispatch = function(measure) {
      var dl = measure.dl
      , column = measure.column
      , line = measure.line
      , t = dl.text, b;
      
      if (currentLine !== dl) {
        unselect();
        select(currentLine = dl);
      }
      if (head.line !== line) {
        this.emit('lineChange', dl, line, column);
        head.line = line;
        b = true;
      }
      if (head.column !== column) {
        this.emit('columnChange', dl, line, column);
        head.column = column;
        b = true;
      }
      this.showSelection();
      if (b) this.emit('caretWillMove', measure.offsetX, measure.offsetY);
      lastMeasure = measure;
      parserState = undefined;
      setPixelPosition.call(this, measure.offsetX, measure.offsetY);
      if (b) this.emit('caretMoved');
      return this;
    }
    this.beginSelection = function() {
      this.clearSelection();
      anchor = this.head();
      if (!selOverlay) selOverlay = doc.createOverlay('cp-selection-overlay');
    }
    this.hasSelection = function() {
      return anchor && cmp(anchor, this.head()) !== 0;
    }
    this.inSelection = function(line, column) {
      var pos = p(line, column);
      return anchor && cmp(anchor, pos) * cmp(pos, head) > 0;
    }
    this.getSelection = function() {
      var r = this.getSelectionRange();
      return r ? doc.substring(r.from, r.to) : '';
    }
    this.getSelectionRange = function() {
      if (this.hasSelection()) {
        return getRangeOf(anchor, head);
      }
    }
    this.getRange = function() {
      return this.getSelectionRange() || r(head, head);
    }
    this.setSelection = function(a, b) {
      var newAnchor = np(doc, a), newHead = np(doc, b);
      if (!newHead) return;
      if (newAnchor && cmp(newAnchor, newHead)) anchor = newAnchor;
      else anchor = null;
      return this.setHead(newHead);
    }
    this.showSelection = function() {
      var range = this.getSelectionRange();
      if (range) {
        if (!selOverlay) selOverlay = doc.createOverlay('cp-selection-overlay');
        doc.drawSelection(selOverlay, range);
        unselect();
      } else {
        if (selOverlay) selOverlay.hide();
        select(currentLine);
      }
    }
    this.removeSelection = function() {
      var range = this.getSelectionRange();
      if (range) {
        this.clearSelection();
        doc.removeRange(range.from, range.to);
      }
    }
    this.clearSelection = function() {
      if (!anchor) return this;
      if (selOverlay) selOverlay.hide();
      anchor = null;
      select(currentLine);
      return this.emit('selectionCleared');
    }
    this.wrapSelection = function(before, after) {
      var range = this.getRange();
      replaceRange(doc, after, range.to, range.to);
      replaceRange(doc, before, range.from, range.from);
      if (anchor && cmp(anchor, head) < 0) this.moveX(-after.length, true) && this.moveAnchor(before.length);
      doc.pushChange({ type: 'wrap', range: range, before: before, after: after, wrap: true });
    }
    this.unwrapSelection = function(before, after) {
      var range = this.getRange()
      , from = positionAfterMove(doc, range.from, -before.length)
      , to = positionAfterMove(doc, range.to, after.length);
      if (doc.substring(from, range.from) !== before || doc.substring(range.to, to) !== after) return false;
      removeRange(doc, range.to, to);
      removeRange(doc, from, range.from);
      doc.pushChange({ type: 'wrap', range: range, before: before, after: after, wrap: false });
    }
    this.moveSelectionTo = function(pos) {
      var range = this.getSelectionRange();
      if (!pos || !range || cmp(range.from, pos) <= 0 && cmp(pos, range.to) <= 0) return false;
      this.position(pos);
      var removed = removeRange(doc, range.from, range.to).removed, anchor = this.head();
      insertText(doc, removed, head);
      this.setSelection(anchor, this.head());
      doc.pushChange({ type: 'moveSelection', text: removed, from: range.from, into: this.anchor() });
    }
    this.reverse = function() {
      if (!anchor) return;
      var oldAnchor = anchor;
      anchor = head;
      return this.setHead(oldAnchor);
    }
    this.insert = function(text, movement) {
      var range = this.getRange();
      doc.replaceRange(text, range.from, range.to);
      if ('number' === typeof movement) this.moveX(movement);
      return this;
    }
    
    function docRemove(rangeHandler) {
      return function(n) {
        var range = this.hasSelection() ? getRangeOf(anchor, head) : rangeHandler.call(this, n);
        if (range) return doc.removeRange(range.from, range.to);
      }
    }
    this.removeBefore = docRemove(function(n) { return rangeWithMove(doc, this.head(), -n); });
    this.removeAfter = docRemove(function(n) { return rangeWithMove(doc, this.head(), n); });
    this.removeLine = docRemove(function() { return r(p(head.line, 0), p(head.line, currentLine.text.length)); });
    
    this.textBefore = function(len) { return currentLine && currentLine.text.substring(len ? head.column - len : 0, head.column); }
    this.textAfter = function(len) { return currentLine && currentLine.text.substr(head.column, len); }
    this.textAtCurrentLine = function() { return currentLine && currentLine.text; }
    
    this.getParserState = function() {
      if (!parserState) parserState = doc.getState(head);
      return parserState;
    }
    this.setHead = function(pos) {
      var nHead = np(doc, pos);
      if (nHead) this.dispatch(doc.measureRect(doc.get(nHead.line), nHead.column));
      return this;
    }
    this.position = function(line, column) {
      var pos = np(doc, line, column);
      return this.clearSelection().setHead(pos);
    }
    this.moveX = function(mv, dontReverse) {
      if ('number' === typeof mv) {
        if (!dontReverse) mv = maybeReverseSelection(this, anchor, head, mv);
        var pos = positionAfterMove(doc, this.head(), mv);
        return this.setHead(pos);
      }
      return this;
    }
    this.moveY = function(mv) {
      if ('number' === typeof mv) {
        mv = maybeReverseSelection(this, anchor, head, mv);
        var size = doc.size();
        mv = head.line + mv;
        if (mv < 0) {
          mv = head.column = 0;
        } else if (mv >= size) {
          head.column = -1;
          mv = size - 1;
        }
        this.setHead(p(mv, head.column));
      }
      return this;
    }
    this.moveAnchor = function(mv) {
      if ('number' === typeof mv) {
        anchor = positionAfterMove(doc, anchor, mv);
        this.showSelection();
      }
    }
    this.offsetX = function() {
      return lastMeasure ? lastMeasure.offsetX : 0;
    }
    this.offsetY = function() {
      return lastMeasure ? lastMeasure.offsetY : 0;
    }
    this.head = function(real) {
      return real ? copy(head) : p(head.line, this.column());
    }
    this.anchor = function(real) {
      if (anchor && (real || cmp(anchor, this.head()))) return copy(anchor);
    }
    this.dl = function() {
      return currentLine;
    }
    this.isCurrentLine = function(dl) {
      return currentLine === dl;
    }
    this.line = function() {
      return head.line;
    }
    this.column = function() {
      return currentLine ? Math.min(head.column, currentLine.text.length) : 0;
    }
    this.eachLine = function(fn) {
      if ('function' === typeof fn) {
        var sel = this.getRange();
        for (var i = sel.from.line; i <= sel.to.line; i++) {
          fn.call(this, doc.get(i), i, i - sel.from.line);
        }
        return sel;
      }
    }
    this.setStyle = function(style) {
      this.style = style;
      this.node.className = 'cp-caret cp-caret-'+style;
    }
    this.focus = function() {
      if (!this.hasSelection()) select(currentLine);
    }
    this.blur = function() {
      unselect();
    }
    return this;
  }
  Caret.prototype = {
    isDisabled: false,
    enable: function() {
      this.isDisabled = false;
    },
    disable: function() {
      this.isDisabled = true;
      this.blur();
    },
    setSelectionRange: function(range) {
      return range && this.setSelection(range.from, range.to);
    },
    match: function(pattern, dir, select) {
      if (pattern) {
        var text = this.textAtCurrentLine(), head = this.head()
        , left = head.column, right = head.column, ch, test = function(ch) {
          return 'function' === typeof pattern ? pattern(ch) : pattern.test ? pattern.test(ch) : false;
        }
        if (!dir || dir === 1) for (; (ch = text.charAt(right)) && test(ch); ++right);
        if (!dir || dir === -1) for (; (ch = text.charAt(left - 1)) && test(ch); --left);
        var str = text.substring(left, right);
        if (select !== false) this.setSelection(p(head.line, left), p(head.line, right));
        return str;
      }
    },
    refresh: function() {
      return this.setSelectionRange(this.getRange());
    }
  }
  
  function classArray(base, classes) {
    var arr = [base];
    return arr.concat('string' === typeof classes ? classes.split(/\s+/g) : isArray(classes) ? classes : []);
  }
  
  CodePrinter.Overlay = function(classes) {
    this.node = addClass(div.cloneNode(false), classArray('cp-overlay', classes));
    EventEmitter.call(this);
    return this;
  }
  CodePrinter.Overlay.prototype = {
    show: function() {
      this.node.classList.remove('cp-hidden');
    },
    hide: function() {
      this.node.classList.add('cp-hidden');
    }
  }
  
  Stream = function(value, indent, offset) {
    this.pos = 0;
    this.value = value;
    this.length = value.length;
    this.indent = indent | 0;
    this.offset = offset | 0;
  }
  Stream.prototype = {
    next: function() { if (this.pos < this.value.length) return this.value.charAt(this.pos++); },
    at: function(offset) { return this.value.charAt(this.pos + (offset | 0)); },
    peek: function() { return this.at(0); },
    from: function(pos) { return this.value.substring(pos, this.pos); },
    rest: function() { return this.value.substr(this.pos); },
    sol: function() { return this.pos === 0; },
    eol: function() { return this.pos >= this.value.length; },
    eat: function(match) {
      var ch = this.value.charAt(this.pos), eaten;
      if ('string' == typeof match) eaten = ch == match;
      else eaten = ch && (match.test ? match.test(ch) : match(ch));
      if (eaten) {
        ++this.pos;
        return ch;
      }
    },
    eatWhile: function(match) {
      var pos = this.pos;
      while (this.eat(match));
      return this.from(pos);
    },
    eatUntil: function(match, noLeftContext) {
      var pos = this.pos;
      if (match instanceof RegExp) {
        if (match.test(this.value.substr(this.pos))) {
          var lc = RegExp.leftContext.length;
          if (!noLeftContext || lc == 0) {
            this.pos += lc + RegExp.lastMatch.length;
          }
        }
      }
      return this.from(pos);
    },
    match: function(match, eat, caseSensitive) {
      if ('string' == typeof match) {
        var cs = function(str) { return caseSensitive ? str.toLowerCase() : str; };
        var substr = this.value.substr(this.pos, match.length);
        if (cs(substr) == cs(match)) {
          if (eat) this.pos += match.length;
          return true;
        }
      } else {
        var ex = match.exec(this.value.substr(this.pos));
        if (ex && ex.index > 0) return null;
        if (ex && eat) this.pos += ex[0].length;
        return ex;
      }
    },
    take: function(match) {
      var v = this.value.substr(this.pos), lm = '';
      if (match.test(v) && !RegExp.leftContext) this.pos += (lm = RegExp.lastMatch).length;
      return lm;
    },
    capture: function(match, index) {
      if (match instanceof RegExp) {
        var m = match.exec(this.value.substr(this.pos));
        if (m) return m[index || 0];
      }
    },
    isAfter: function(match) {
      var str = this.value.substr(this.pos);
      return 'string' == typeof match ? str.indexOf(match) == 0 : match.test ? match.test(str) : match(str);
    },
    isBefore: function(match, offset) {
      var str = this.value.substring(0, this.pos + (offset || 0));
      return 'string' == typeof match ? str.lastIndexOf(match) == str.length - match.length : match.test ? match.test(str) : match(str);
    },
    skip: function(ch, eat) {
      if (ch) {
        var i = this.value.indexOf(ch, this.pos);
        if (i >= 0) {
          this.pos = i + (eat ? ch.length : 0);
          return true;
        }
      } else {
        this.pos = this.value.length;
        return true;
      }
    },
    undo: function(n) {
      this.pos = Math.max(0, this.pos - n);
    },
    markDefinition: function(defObject) {
      this.definition = extend({ pos: this.offset + this.start }, defObject);
    }
  }
  
  ReadStream = function(doc, transform) {
    var rs = this, stack = []
    , dl = doc.get(0), le = doc.getLineEnding(), fn;
    EventEmitter.call(this);
    
    async(fn = function() {
      var r = 25 + 50 * Math.random(), i = -1;
      
      while (dl && ++i < r) {
        stack.push(transform(dl.text));
        dl = dl.next();
      }
      if (i >= 0) {
        rs.emit('data', stack.join(le));
        stack = [''];
        async(fn);
      } else {
        rs.emit('end');
      }
    });
    return this;
  }
  
  ReadStream.prototype = {
    pipe: function(stream) {
      if (stream) {
        'function' === typeof stream.write && this.on('data', function(data) {
          stream.write(data);
        });
        'function' === typeof stream.end && this.on('end', function() {
          stream.end();
        });
      }
      return stream;
    }
  }
  
  CodePrinter.Mode = function(ext) {
    this.name = 'plaintext';
    this.keyMap = {};
    this.onLeftRemoval = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'" }
    this.onRightRemoval = { '}': '{', ')': '(', ']': '[', '"': '"', "'": "'" }
    this.selectionWrappers = { '(': ['(', ')'], '[': ['[', ']'], '{': ['{', '}'], '"': '"', "'": "'" }
    extend(this, ext instanceof Function ? ext.call(this) : ext);
    this.init();
  }
  CodePrinter.Mode.prototype = {
    init: function() {},
    onEntry: function() {},
    onExit: function() {},
    iterator: function(stream, state) {
      stream.skip();
      return '';
    },
    compile: function(string, tabWidth) {
      if ('string' === typeof string) {
        if ('number' != typeof tabWidth) tabWidth = 2;
        var state = this.initialState && this.initialState()
        , node = pre.cloneNode(false)
        , lines = string.split(eol)
        , tabString = repeat(' ', tabWidth);
        
        for (var i = 0; i < lines.length; i++) {
          var ind = parseIndentation(lines[i], tabWidth), stream = new Stream(ind.rest, ind.indent, ind.length)
          , cache = parseStream(this, stream, state);
          node.innerHTML = '';
          updateInnerLine(node, cache, ind, tabString);
          lines[i] = '<pre>'+(node.innerHTML || zws)+'</pre>';
        }
        return lines.join('');
      }
    },
    indent: function(stream, state) {
      return stream.indent;
    },
    isIndentTrigger: function(char) {
      return this.indentTriggers instanceof RegExp && this.indentTriggers.test(char);
    },
    isAutoCompleteTrigger: function(char) {
      return this.autoCompleteTriggers instanceof RegExp && this.autoCompleteTriggers.test(char);
    },
    redirect: function(parser, stream, state) {
      if (state && state.parser !== parser) {
        state.parser = parser;
        if (this.initialState !== parser.initialState) {
          var initial = parser.initialState();
          for (var k in initial) if (state[k] == null) state[k] = initial[k];
        }
      }
    }
  }
  
  keyMap = function() {}
  keyMap.prototype = {
    'Backspace': 'delCharLeft',
    'Delete': 'delCharRight',
    'Alt Backspace': 'delWordLeft',
    'Alt Delete': 'delWordRight',
    'Shift Backspace': 'delToLeft',
    'Shift Delete': 'delToRight',
    'Alt Shift Backspace': 'delLine',
    'Alt Shift Delete': 'delLine',
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
    'Shift Left': 'moveSelLeft',
    'Shift Right': 'moveSelRight',
    'Shift Up': 'moveSelUp',
    'Shift Down': 'moveSelDown',
    'Ctrl Shift W': 'selectWord',
    '"': function(k) {
      if (this.options.insertClosingQuotes) {
        return insertClosing(this, k, k);
      }
    },
    '(': function(k) {
      if (this.options.insertClosingBrackets) {
        return insertClosing(this, k, complementBracket(k));
      }
    },
    ')': function(k) {
      if (this.options.insertClosingBrackets && this.textAfterCursor(1) == k) this.caret.moveX(1);
      else this.insertText(k);
      return false;
    },
    'Cmd A': 'selectAll',
    'Cmd Z': 'undo',
    'Cmd Shift Z': 'redo'
  }
  keyMap.prototype['`'] = keyMap.prototype['\''] = keyMap.prototype['"'];
  keyMap.prototype['['] = keyMap.prototype['{'] = keyMap.prototype['('];
  keyMap.prototype[']'] = keyMap.prototype['}'] = keyMap.prototype[')'];
  
  function moveCaret(fn, mv) {
    return function() {
      this.doc.call('clearSelection').call(fn, mv);
    }
  }
  function moveSel(fn, mv) {
    return function() {
      this.doc.eachCaret(function(caret) { caret.hasSelection() || caret.beginSelection(); }).call(fn, mv);
    }
  }
  function caretCmd(fn) {
    return function() { this.doc.eachCaret(fn); };
  }
  function swap(doc, caret, up) {
    var range = caret.getRange(), next = doc.get(up ? range.from.line - 1 : range.to.line + 1);
    if (next) {
      var text = next.text;
      if (up) removeRange(doc, p(range.from.line - 1, 0), p(range.from.line, 0)) && insertText(doc, '\n' + text, p(range.to.line - 1, -1));
      else removeRange(doc, p(range.to.line, -1), p(range.to.line + 1, -1)) && insertText(doc, text + '\n', p(range.from.line, 0));
      doc.pushChange({ type: 'swap', range: range, offset: up ? -1 : 1 });
    }
  }
  function posNegativeCols(doc, pos) {
    return p(pos.line, pos.column - doc.textAt(pos.line).length - 1);
  }
  function indent(caret) {
    var doc = this, tabString = doc.getTabString(), range;
    caret.eachLine(function(line, index) {
      singleInsert(doc, line, index, tabString, 0);
    });
    range = caret.getRange();
    doc.pushChange({ type: 'indent', range: r(posNegativeCols(doc, range.from), posNegativeCols(doc, range.to)), offset: 1 });
  }
  function outdent(caret) {
    var doc = this, tw = doc.getOption('tabWidth'), success, range;
    caret.eachLine(function(line, index) {
      var text = line.text, min = Math.min(tw, text.length);
      for (var i = 0; i < min && text.charAt(i) === ' '; i++);
      if (i === 0 && text.charAt(0) === '\t') i++;
      if (i > 0) success = singleRemove(doc, line, index, 0, i) | true;
    });
    range = caret.getRange();
    success && doc.pushChange({ type: 'indent', range: r(posNegativeCols(doc, range.from), posNegativeCols(doc, range.to)), offset: -1 });
  }
  function scrollToLine(doc, line) {
    var dl = doc.get(line), offset = dl.getOffset(), st = doc.dom.scroll.scrollTop, oh = doc.dom.scroll.offsetHeight;
    if (offset > st + oh - 20) doc.scroll(0, offset - oh + doc.getOption('viewportMargin') - st);
    else if (offset < st + 20) doc.scroll(0, offset - doc.getOption('viewportMargin') - st);
  }
  function moveWord(dir) {
    return caretCmd(function(caret) {
      var match = caret.match(/\w/, dir, false);
      caret.moveX(dir * Math.max(1, match.length));
    });
  }
  
  commands = {
    'moveCaretLeft': moveCaret('moveX', -1),
    'moveCaretRight': moveCaret('moveX', 1),
    'moveCaretUp': moveCaret('moveY', -1),
    'moveCaretDown': moveCaret('moveY', 1),
    'moveSelLeft': moveSel('moveX', -1),
    'moveSelRight': moveSel('moveX', 1),
    'moveSelUp': moveSel('moveY', -1),
    'moveSelDown': moveSel('moveY', 1),
    'moveToStart': function() { this.doc.resetCarets().setHead(p(0, 0)); },
    'moveToEnd': function() { this.doc.resetCarets().setHead(p(this.doc.size() - 1, -1)); },
    'moveToLineStart': caretCmd(function(caret) { caret.setHead(p(caret.line(), 0)); }),
    'moveToLineEnd': caretCmd(function(caret) { caret.setHead(p(caret.line(), -1)); }),
    'moveWordLeft': moveWord(-1),
    'moveWordRight': moveWord(1),
    'selectWord': function() { this.doc.call('match', /\w/); },
    'selectLine': caretCmd(function(caret) {
      var head = caret.head();
      caret.setSelection(p(head.line, 0), p(head.line + 1, 0));
    }),
    'selectAll': function() { this.doc.resetCarets().setSelection(p(this.doc.size(), -1), p(0, 0)); },
    'pageUp': function() { this.doc.call('moveY', -50); },
    'pageDown': function() { this.doc.call('moveY', 50); },
    'scrollToTop': function() { this.dom.scroll.scrollTop = 0; },
    'scrollToBottom': function() { this.dom.scroll.scrollTop = this.dom.scroll.scrollHeight; },
    'scrollToLeft': function() { this.dom.scroll.scrollLeft = 0; },
    'scrollToRight': function() { this.dom.scroll.scrollLeft = this.dom.scroll.scrollWidth; },
    'removeSelection': function() { this.doc.call('removeSelection'); },
    'indent': caretCmd(indent),
    'outdent': caretCmd(outdent),
    'reIndent': function() { this.doc.reIndent(); },
    'undo': function() { this.doc.undo(); },
    'redo': function() { this.doc.redo(); },
    'toNextDef': function() {},
    'toPrevDef': function() {},
    'swapUp': caretCmd(function(caret) { swap(this, caret, true); }),
    'swapDown': caretCmd(function(caret) { swap(this, caret, false); }),
    'duplicate': caretCmd(function(caret) {
      var range = caret.getRange(), text = this.substring(p(range.from.line, 0), p(range.to.line, -1));
      caret.position(range.to.line, -1).insert('\n' + text);
    }),
    'toggleLineNumbers': function() {
      var ln = this.options.lineNumbers;
      ln ? this.hideLineNumbers() : this.showLineNumbers();
    },
    'toggleIndentGuides': function() {
      var dig = this.options.drawIndentGuides = !this.options.drawIndentGuides;
      (dig ? removeClass : addClass)(this.dom.mainNode, 'cp--no-indent-guides');
    },
    'toggleMark': caretCmd(function(caret) {
      var dl = caret.dl();
      dl && dl.classes && dl.classes.indexOf('cp-marked') >= 0 ? dl.removeClass('cp-marked') : dl.addClass('cp-marked');
    }),
    'increaseFontSize': function() { this.setFontSize(this.options.fontSize+1); },
    'decreaseFontSize': function() { this.setFontSize(this.options.fontSize-1); },
    'prevSearchResult': function() {
      if (!this.doc.searchResults) return;
      var act = this.doc.searchResults.prev();
      if (act) scrollToLine(this.doc, act.line);
    },
    'nextSearchResult': function() {
      if (!this.doc.searchResults) return;
      var act = this.doc.searchResults.next();
      if (act) scrollToLine(this.doc, act.line);
    },
    'toNextDefinition': function() {
      var caret = this.doc.resetCarets(), dl = caret.dl().next();
      for (; dl; dl = dl.next()) {
        if (dl.definition) {
          caret.position(dl.getIndex(), dl.definition.pos);
          return;
        }
      }
    },
    'toPrevDefinition': function() {
      var caret = this.doc.resetCarets(), dl = caret.dl().prev();
      for (; dl; dl = dl.prev()) {
        if (dl.definition) {
          caret.position(dl.getIndex(), dl.definition.pos);
          return;
        }
      }
    },
    'delCharLeft': function() {
      var tw = this.options.tabWidth;
      this.doc.eachCaret(function(caret) {
        if (caret.hasSelection()) return caret.removeSelection();
        var bf = caret.textBefore(), af = caret.textAfter()
        , chbf = bf.slice(-1), m = bf.match(/^ +$/)
        , r = m && m[0] && m[0].length % tw === 0 ? tw : 1;
        caret.removeBefore(r);
      });
    },
    'delCharRight': function() {
      var tw = this.options.tabWidth;
      this.doc.eachCaret(function(caret) {
        if (caret.hasSelection()) return caret.removeSelection();
        var bf = caret.textBefore(), af = caret.textAfter()
        , chaf = af.charAt(0), m = af.match(/^ +$/)
        , r = m && m[0] && m[0].length % tw === 0 ? tw : 1;
        caret.removeAfter(r);
      });
    },
    'delWordLeft': function() { this.doc.call('match', /\w/, -1); this.doc.call('removeSelection'); },
    'delWordRight': function() { this.doc.call('match', /\w/, 1); this.doc.call('removeSelection'); },
    'delToLeft': caretCmd(function(caret) { caret.removeBefore(caret.column()); }),
    'delToRight': caretCmd(function(caret) { caret.removeAfter(caret.dl().text.length - caret.column()); }),
    'delLine': caretCmd(function(caret) { caret.removeLine(); }),
    'insertNewLine': caretCmd(function(caret) {
      var options = this.editor.options;
      if (options.autoIndent) {
        var head = caret.head()
        , ps = caret.getParserState()
        , indent = this.getIndent(head)
        , tw = options.tabWidth
        , tab = options.indentByTabs ? '\t' : repeat(' ', tw)
        , rest = '', mv = 0, tmp;
        
        if (ps.parser && ps.parser.indent) {
          var nextIndent = this.getNextLineIndent(head.line, true);
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
    'insertTab': function() {
      if (this.doc.somethingSelected()) {
        this.exec('indent');
      } else {
        var options = this.options;
        this.doc.eachCaret(function(caret) {
          if (options.tabTriggers) {
            var head = caret.head(), bf = caret.match(/\S+/, -1, false), af = caret.match(/\S+/, 1, false), snippet;
            if (!af && (snippet = this.editor.findSnippet(bf, head))) {
              this.replaceRange(snippet.content, p(head.line, head.column - bf.length), head);
              if ('number' === typeof snippet.cursorMove) caret.moveX(snippet.cursorMove);
              return false;
            }
          }
          caret.insert(options.indentByTabs ? '\t' : repeat(' ', options.tabWidth - caret.column() % options.tabWidth));
        });
      }
    },
    'esc': function() {
      this.isFullscreen ? this.exitFullscreen() : this.doc.searchEnd();
    }
  }
  
  function mergeStringArrays(a, b) {
    a[a.length-1] += b.shift();
    return a.concat(b);
  }
  function moveRangeBy(range, line, col) {
    if (line) { range.from.line += line; range.to.line += line; }
    if (col) { range.from.column += col; range.to.column += col; }
    return range;
  }
  
  historyActions = {
    'replace': {
      make: function(caret, change) {
        caret.setSelection(change.from, change.to).insert(change.text).clearSelection();
      },
      reverse: function(change) {
        return { type: 'replace', text: change.removed, removed: change.text, from: change.from, to: changeEnd(change) };
      },
      canBeMerged: function(a, b) {
        return cmp(changeEnd(a), b.from) === 0 ? 1 : cmp(a.from, changeEnd({ text: b.removed, from: b.from })) === 0 ? 2 : 0;
      },
      merge: function(a, b, code) {
        var x = a, y = b;
        if (code === 2) {
          x = b; y = a;
          a.from = b.from;
        }
        a.text = mergeStringArrays(x.text, y.text);
        a.removed = mergeStringArrays(x.removed, y.removed);
        a.to = changeEnd({ text: x.removed, from: x.from });
      }
    },
    'indent': {
      make: function(caret, change) {
        caret.setSelectionRange(change.range);
        (change.offset > 0 ? indent : outdent).call(this, caret);
      },
      reverse: function(change) {
        return extend(change, { offset: -change.offset });
      },
      canBeMerged: function(a, b) {
        return a.offset + b.offset && a.range.from.line === b.range.from.line && a.range.to.line === b.range.to.line;
      },
      merge: function(a, b) {
        a.offset += b.offset;
        a.range = b.range;
      },
      split: function(a) {
        if (a.offset === 1 || a.offset === -1) return a;
        a.offset > 1 ? --a.offset : ++a.offset;
        return { type: 'indent', range: a.range, offset: a.offset > 0 ? 1 : -1 };
      }
    },
    'setIndent': {
      make: function(change) {
        this.setIndent(change.line, change.after);
      },
      reverse: function(change) {
        return extend(change, { before: change.after, after: change.before });
      }
    },
    'wrap': {
      make: function(caret, change) {
        var method = change.wrap ? 'wrapSelection' : 'unwrapSelection';
        caret.setSelection(change.range.from, change.range.to)[method](change.before, change.after);
      },
      reverse: function(change) {
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
      make: function(caret, change) {
        caret.setSelection(change.from, changeEnd(change)).moveSelectionTo(change.into);
      },
      reverse: function(change) {
        return extend(change, { from: change.into, into: change.from });
      }
    },
    'swap': {
      make: function(caret, change) {
        caret.setSelectionRange(change.range);
        swap(this, caret, change.offset < 0);
      },
      reverse: function(change) {
        moveRangeBy(change.range, change.offset);
        return extend(change, { offset: -change.offset });
      },
      canBeMerged: function(a, b) {
        var off = a.offset;
        return a.range.from.column === b.range.from.column && a.range.to.column === b.range.to.column
        && a.range.from.line + off === b.range.from.line && a.range.to.line + off === b.range.to.line;
      },
      merge: function(a, b) {
        a.offset += b.offset;
      },
      split: function(a) {
        if (a.offset === 1 || a.offset === -1) return a;
        var r = copy(a.range);
        moveRangeBy(r, a.offset > 1 ? a.offset-- : a.offset++);
        return { type: 'swap', range: r, offset: a.offset > 0 ? -1 : 1 };
      }
    }
  }
  
  function checkHistorySupport(stack) {
    for (var i = 0; i < stack.length; i++) {
      var change = stack[i];
      if (!change.type || !change.make || !change.reverse) throw new Error('Some of the changes in the history are incorrect');
      if (!historyActions[change.type]) throw new Error('Some of the changes in the history contain unsupported actions (like "' + change.type + '" ).');
    }
  }
  function reverseChange(change) {
    return historyActions[change.type].reverse(change);
  }
  function reverseChanges(state) {
    return isArray(state) ? map(state, reverseChange) : reverseChange(state);
  }
  function splitChange(change) {
    var act = historyActions[change.type];
    return act && act.split && act.split(change);
  }
  function maybeSplitChanges(state) {
    if (!isArray(state)) return splitChange(state) || state;
    var split = [];
    for (var i = 0; i < state.length; i++) {
      var s = splitChange(state[i]);
      if (s === state[i]) split.push(state.splice(i--, 1)[0]);
      else if (s) split.push(s);
    }
    return split.length ? split : state;
  }
  function historyMove(hist, from, into) {
    if (!hist.lock && from.length) {
      var last = lastV(from), split = maybeSplitChanges(last);
      if (last === split || last.length === 0) from.pop();
      historyPush(hist, into, split = reverseChanges(split));
      return split;
    }
  }
  function historyPush(hist, into, state) {
    var last = lastV(into);
    if (isArray(last)) {
      if (!isArray(state)) state = [state];
      var codes = [], min = Math.min(last.length, state.length);
      for (var i = 0; i < min; i++) {
        var ch = last[i], cur = state[i], hist = historyActions[ch.type];
        if (ch.type === cur.type && hist.merge && hist.canBeMerged) codes[i] = hist.canBeMerged(ch, cur);
        if (!codes[i]) break;
      }
      if (i === min) {
        for (var i = 0; i < min; i++) {
          var hist = historyActions[last[i].type];
          hist.merge(last[i], state[i], codes[i]);
        }
        for (; i < state.length; i++) last.push(state[i]);
        return true;
      }
    }
    into.push(state);
  }
  function historyBack(hist) { return historyMove(hist, hist.done, hist.undone); }
  function historyForward(hist) { return historyMove(hist, hist.undone, hist.done); }
  
  History = function(doc) {
    this.lock = false;
    this.done = [];
    this.undone = [];
    this.staged = undefined;
  }
  
  History.prototype = {
    push: function(state) {
      if (!this.lock && state && historyActions[state.type]) {
        if (this.staged) return this.staged.push(copy(state));
        if (this.undone.length) this.undone.length = 0;
        return this.done.push(copy(state));
      }
    },
    stage: function() {
      this.staged = [];
    },
    commit: function() {
      if (this.staged && this.staged.length) {
        if (this.undone.length) this.undone.length = 0;
        historyPush(this, this.done, this.staged);
      }
      this.staged = undefined;
    },
    operation: function(doc, op, state) {
      if (state) {
        var arr = isArray(state) ? state : [state];
        doc.resetCarets();
        this.lock = true;
        for (var i = arr.length - 1, j = 0, act; i >= 0; i--) {
          if (act = historyActions[arr[i].type]) {
            if (act.make.length > 1) act.make.call(doc, j ? doc.createCaret() : doc.carets[j++], arr[i]);
            else act.make.call(doc, arr[i]);
          }
        }
        return !(this.lock = false);
      }
    },
    getChanges: function(stringify) {
      var obj = { done: this.done, undone: this.undone, staged: this.staged };
      return stringify ? JSON.stringify(obj) : copy(obj);
    },
    setChanges: function(data) {
      if (data && data.done && data.undone) {
        try {
          checkHistorySupport(data.done);
          checkHistorySupport(data.undone);
          data.staged && checkHistorySupport(data.staged);
        } catch (e) { throw e; }
        this.done = data.done;
        this.undone = data.undone;
        this.staged = data.staged;
      }
    }
  }
  
  lineendings = { 'LF': '\n', 'CR': '\r', 'LF+CR': '\n\r', 'CR+LF': '\r\n' }
  CodePrinter.aliases = { 'js': 'JavaScript', 'htm': 'HTML', 'less': 'CSS', 'h': 'C++', 'cpp': 'C++', 'rb': 'Ruby', 'pl': 'Perl',
    'sh': 'Bash', 'adb': 'Ada', 'coffee': 'CoffeeScript', 'md': 'Markdown', 'svg': 'XML', 'plist': 'XML', 'yml': 'YAML' };
  CodePrinter.matching = {'brackets': {}};
  
  var brackets = ['{', '(', '[', '}', ')', ']'];
  for (var i = 0; i < brackets.length; i++) {
    CodePrinter.matching.brackets[brackets[i]] = {
      direction: i < 3 ? 'right' : 'left',
      style: 'bracket',
      value: complementBracket(brackets[i])
    }
  }
  
  function checkScript(script) {
    var src = script.getAttribute('src'), ex = /\/?codeprinter[\d\-\.]*\.js\/?$/i.exec(src);
    if (ex) {
      CodePrinter.src = src.slice(0, -ex[0].length) + '/';
      return true;
    }
  }
  if (document.currentScript) {
    checkScript(document.currentScript);
  } else {
    var scripts = document.scripts;
    for (var i = 0; i < scripts.length; i++) {
      if (checkScript(scripts[i])) break;
    }
  }
  if (!CodePrinter.src) CodePrinter.src = '';
  
  CodePrinter.helpers = {
    pushIterator: function(state, iterator) {
      if (!state.iterators) state.iterators = [iterator];
      else state.iterators.push(iterator);
    },
    popIterator: function(state) {
      if (state.iterators) state.iterators.pop();
    }
  }
  
  CodePrinter.requireMode = function(names, cb) {
    if ('string' == typeof names) names = [names];
    if ('function' == typeof cb) {
      var m = getModes(names), fn;
      if (m.indexOf(null) == -1) {
        var cbapply = function() { cb.apply(CodePrinter, m); }
        CodePrinter.syncRequire ? cbapply() : async(cbapply);
      } else {
        CodePrinter.on('modeLoaded', fn = function(modeName, mode) {
          var i = names.indexOf(modeName);
          if (i >= 0) {
            m[i] = mode;
            if (m.indexOf(null) == -1) {
              cb.apply(CodePrinter, m);
              CodePrinter.off('modeLoaded', fn);
            }
          }
        });
        for (var i = 0; i < m.length; i++) m[i] || load('mode/'+names[i]+'.js');
      }
    }
  }
  CodePrinter.defineMode = function(name, req, func) {
    if (arguments.length === 2) { func = req; req = null; }
    var fn = function() {
      var mode = 'function' == typeof func ? func.apply(CodePrinter, Array.apply(null, arguments)) : func;
      mode.name = name;
      modes[name = name.toLowerCase()] = mode;
      CodePrinter.emit('modeLoaded', mode.name, mode);
      CodePrinter.emit(mode.name+':loaded', mode);
    }
    req ? CodePrinter.requireMode(req, fn) : fn();
  }
  CodePrinter.hasMode = function(name) {
    if (name instanceof Array) for (var i = 0; i < name.length; i++) if (!modes.hasOwnProperty(name[i].toLowerCase())) return false;
    return modes.hasOwnProperty(name.toLowerCase());
  }
  CodePrinter.requireAddon = function(name, cb) {
    if ('string' == typeof name && 'function' == typeof cb) {
      if (addons.hasOwnProperty(name)) cb.call(CodePrinter, addons[name]);
      else CodePrinter.on(name+':addonLoaded', cb) && load('addons/'+name+'.js');
    }
  }
  CodePrinter.defineAddon = function(name, func) {
    var addon = func.call(CodePrinter);
    addons[name] = addon;
    CodePrinter.emit(name+':addonLoaded', addon);
  }
  CodePrinter.registerExtension = function(ext, parserName) {
    CodePrinter.aliases[ext.toLowerCase()] = parserName;
  }
  CodePrinter.issetExtension = function(ext) {
    if (CodePrinter.aliases[ext]) return true;
    for (var k in CodePrinter.aliases) {
      if (CodePrinter.aliases[k] == ext) {
        return true;
      }
    }
    return false;
  }
  CodePrinter.registerCommand = function(name, func) {
    if (commands[name]) throw new Error('CodePrinter: Command called "' + name + '" is already defined!');
    commands[name] = func;
  }
  CodePrinter.unregisterCommand = function(name) {
    if (commands[name]) commands[name] = undefined;
  }
  CodePrinter.registerHistoryAction = function(action, face) {
    if (action && face && 'function' === typeof face.undo && 'function' === typeof face.redo) {
      historyActions[action] = face;
    }
  }
  CodePrinter.getFlag = function(key) {
    return Flags[key];
  }
  
  CodePrinter.defineMode('plaintext', new CodePrinter.Mode());
  
  on(window, 'resize', function() {
    for (var i = 0; i < instances.length; i++) {
      var cp = instances[i];
      cp.doc && cp.doc.updateView();
    }
  });
  
  var animationEventName = 'animationstart';
  if ('undefined' === window.onanimationstart) animationEventName = webkit ? 'webkitAnimationStart' : ie ? 'MSAnimationStart' : presto ? 'oanimationstart' : animationEventName;
  
  on(document, animationEventName, function(e) {
    if (e.animationName === 'cp-insertAnimation') {
      for (var i = 0; i < instances.length; i++) {
        var cp = instances[i], doc = cp.doc;
        if (doc.dom.mainNode === e.target) {
          doc.scrollTo(doc.scrollTop | 0);
          updateScroll(doc);
          doc.print();
          cp.emit('inserted');
        }
      }
    }
  });
  
  function buildDOM(cp) {
    var dom = cp.dom = {};
    dom.mainNode = addClass(document.createElement('div'), 'codeprinter');
    dom.body = create(dom.mainNode, 'div', 'cp-body');
    dom.container = create(dom.body, 'div', 'cp-container');
    dom.input = create(dom.container, 'textarea', 'cp-input');
    dom.scroll = create(dom.container, 'div', 'cp-scroll');
    dom.wrapper = create(dom.scroll, 'div', 'cp-wrapper');
    dom.relative = create(dom.wrapper, 'div', 'cp-relative');
    dom.counter = create(dom.scroll, 'div', 'cp-counter');
    dom.counterChild = create(dom.counter, 'div', 'cp-counter-child');
    dom.caretsContainer = create(dom.relative, 'div', 'cp-carets');
    dom.screen = create(dom.relative, 'div', 'cp-screen');
    dom.code = create(dom.screen, 'div', 'cp-code');
    dom.measure = create(dom.screen, 'div', 'cp-measure');
    dom.input.tabIndex = cp.options.tabIndex;
    dom.input.autofocus = cp.options.autoFocus;
  }
  
  function issetSelectionAt(carets, line, column) {
    for (var i = 0; i < carets.length; i++)
      if (carets[i].inSelection(line, column))
        return carets[i];
  }
  function callKeyBinding(cp, keyMap, key) {
    var binding = keyMap[key];
    if ('string' === typeof binding) binding = commands[binding];
    if ('function' !== typeof binding) return false;
    try { binding.call(cp, key); }
    catch (e) { console.error(e); }
    finally { return true; }
  }
  function maybeClearSelection(caret) {
    var anchor = caret.anchor(true);
    if (anchor && cmp(anchor, caret.head(true)) === 0) caret.clearSelection();
  }
  function realignHorizontally(doc) {
    var view = doc.view, sl = doc.dom.scroll.scrollLeft, cW = doc.sizes.countersWidth
    , left = -cW + sl + 'px', width = cW + 'px';
    if (!doc.editor.options.fixedLineNumbers) {
      doc.dom.counter.style.left = -sl + 'px';
    } else {
      for (var i = 0; i < view.length; i++) {
        view[i].counter.parentNode.style.left = left;
        view[i].counter.style.width = width;
      }
    }
  }
  function attachEvents(cp) {
    var scroll = cp.dom.scroll
    , wrapper = cp.dom.wrapper
    , input = cp.dom.input
    , options = cp.options
    , sizes = cp.doc.sizes
    , counterSelection = []
    , allowKeyup, activeLine
    , isMouseDown, isScrolling
    , moveEvent, moveselection
    , dblClickTimeout
    , T, T2, T3, fn, cmdPressed, caret;
    
    function counterSelDispatch(line, selIndex) {
      counterSelection[selIndex] = line;
      var last = lastV(counterSelection), caret = cp.doc.resetCarets();
      caret.setSelection(p(counterSelection[0], 0), p(last + (counterSelection[0] <= last ? 1 : 0), 0));
      return caret;
    }
    function tripleclick(e) {
      var head = caret.head();
      caret.setSelection(p(head.line, 0), p(head.line + 1, 0));
      Flags.waitForTripleClick = Flags.isMouseDown = false;
      dblClickTimeout = clearTimeout(dblClickTimeout);
      return eventCancel(e);
    }
    function onMouse(e) {
      if (e.defaultPrevented || e.which === 3) return false;
      
      var doc = cp.doc
      , rect = scroll.getBoundingClientRect()
      , oH = scroll.offsetHeight
      , x = scroll.scrollLeft + e.clientX - rect.left - doc.sizes.countersWidth
      , y = e.clientY < rect.top ? 0 : e.clientY <= rect.top + oH ? scroll.scrollTop + e.clientY - rect.top : scroll.scrollHeight
      , measure = doc.measurePosition(Math.max(0, x), y - doc.sizes.paddingTop);
      
      cp.focus();
      
      if (e.type === 'mousedown') {
        isMouseDown = Flags.isMouseDown = true;
        
        if (x < 0) {
          caret = counterSelDispatch(measure.line, 0);
        } else {
          if (Flags.waitForTripleClick) {
            caret = doc.resetCarets();
            return tripleclick(e);
          }
          if (caret = issetSelectionAt(doc.carets, measure.line, measure.column)) {
            Flags.movingSelection = true;
          } else {
            caret = e.metaKey || e.ctrlKey ? doc.createCaret() : doc.resetCarets();
            caret.dispatch(measure);
            if (!Flags.shiftKey || !caret.hasSelection()) caret.beginSelection();
          }
        }
        on(window, 'mousemove', onMouse);
        on(window, 'mouseup', onMouse);
      }
      else if (e.type === 'mousemove') {
        if (Flags.movingSelection) {
          ++Flags.movingSelection;
        } else if (x < 0) {
          counterSelDispatch(measure.line, 1);
        } else if (cmp(caret.head(), measure) !== 0) {
          caret.dispatch(measure);
        }
        
        moveEvent = e;
        var top = e.clientY - rect.top, bottom = rect.top + oH - e.clientY, i, t;
        
        if (top <= 40) {
          i = -doc.sizes.font.height;
          t = Math.round(top);
        } else if (bottom <= 40) {
          i = doc.sizes.font.height;
          t = Math.round(bottom);
        }
        if (i) {
          Flags.mouseScrolling = true;
          setTimeout(function() {
            if (i && Flags.isMouseDown && moveEvent === e) {
              doc.scroll(0, i);
              onMouse.call(scroll, moveEvent);
            } else {
              Flags.mouseScrolling = false;
            }
          }, Math.max(10, Math.min(t + 10, 50)));
        }
      }
      else if (e.type === 'mouseup') {
        if (Flags.movingSelection > 1) {
          caret.moveSelectionTo(p(measure.line, measure.column));
        } else {
          if (Flags.movingSelection === true) caret.clearSelection();
          maybeClearSelection(caret);
        }
        isMouseDown = Flags.isMouseDown = Flags.movingSelection = false;
        counterSelection.length = 0;
        
        off(window, 'mousemove', onMouse);
        off(window, 'mouseup', onMouse);
      }
    }
    
    if ('ontouchstart' in window || navigator.msMaxTouchPoints > 0) {
      var x, y;
      on(scroll, 'touchstart', function(e) {
        y = e.touches[0].screenY;
        x = e.touches[0].screenX;
      });
      on(scroll, 'touchmove', function(e) {
        if (x != null && y != null) {
          var touch = e.touches[0];
          this.scrollLeft += options.scrollSpeed * (x - (x = touch.screenX));
          cp.doc.scrollTo(this.scrollTop + options.scrollSpeed * (y - (y = touch.screenY)));
          return eventCancel(e);
        }
      });
      on(scroll, 'touchend', function() { x = y = null; });
    } else if ('onwheel' in window) {
      on(scroll, 'wheel', function(e) { return wheel(cp.doc, this, e, options.scrollSpeed, e.deltaX, e.deltaY); });
    } else {
      var mousewheel = function(e) {
        var d = wheelDelta(e);
        return wheel(cp.doc, this, e, wheelUnit * options.scrollSpeed, d.x, d.y);
      }
      on(scroll, 'mousewheel', mousewheel);
      gecko && on(scroll, 'DOMMouseScroll', mousewheel);
    }
    
    on(scroll, 'scroll', function(e) {
      if (!cp.doc._lockedScrolling) {
        cp.doc.scroll(this.scrollLeft - cp.doc.scrollLeft, this.scrollTop - cp.doc.scrollTop);
      } else {
        if (!isScrolling) addClass(scroll, 'cp--scrolling');
        isScrolling = true;
        cp.emit('scroll');
        T3 = clearTimeout(T3) || setTimeout(function() {
          isScrolling = false;
          removeClass(scroll, 'cp--scrolling');
          wheelTarget(cp.doc, null);
          cp.emit('scrollend');
        }, 200);
      }
      cp.doc._lockedScrolling = false;
    });
    on(scroll, 'dblclick', function() {
      var word = caret.match(/\w/);
      Flags.waitForTripleClick = true;
      dblClickTimeout = setTimeout(function() {
        Flags.waitForTripleClick = false;
        if (word && cp.options.searchOnDblClick) {
          var from = caret.getRange().from;
          cp.doc.search(word, false, function(results) {
            var node = results.get(from.line, from.column);
            results.setActive(null);
            if (node) node.span.classList.add('cp-hidden');
            caret.once('selectionCleared', function() { cp.doc.searchEnd(); });
          });
        }
      }, 250);
    });
    on(scroll, 'mousedown', onMouse);
    on(scroll, 'selectstart', function(e) { return eventCancel(e); });
    
    on(input, 'focus', function() {
      cp.doc.focus();
      removeClass(cp.dom.mainNode, 'inactive');
      cp.emit('focus');
    });
    on(input, 'blur', function() {
      if (isMouseDown) {
        this.focus();
      } else {
        cp.doc.blur();
        addClass(cp.dom.mainNode, 'inactive');
        if (options.abortSelectionOnBlur) cp.doc.call('clearSelection');
        cp.emit('blur');
      }
    });
    on(input, 'keydown', function(e) {
      updateFlags(e, true);
      var code = e.keyCode, seq = keySequence(e);
      
      if (seq === (macosx ? 'Cmd' : 'Ctrl')) {
        this.value = cp.doc.getSelection();
        this.setSelectionRange(0, this.value.length);
        return eventCancel(e);
      }
      if (Flags.cmdKey) {
        if (code === 67 || code === 88) return;
        if (code === 86) cp.doc.call('removeSelection');
        this.value = '';
      }
      if (options.readOnly && (code < 37 || code > 40)) return;
      cp.emit('['+seq+']', e); cp.emit('keydown', seq, e);
      if (!e.defaultPrevented) {
        if (!cp.keyMap[seq] && e.shiftKey) seq = keySequence(e, true);
        if (seq.length > 1 && cp.keyMap[seq]) {
          if (callKeyBinding(cp, cp.keyMap, seq)) return eventCancel(e, 1);
        }
      }
    });
    on(input, 'keypress', function(e) {
      if (options.readOnly) return;
      var ch = String.fromCharCode(e.keyCode);
      
      if (e.ctrlKey !== true && e.metaKey !== true) {
        cp.doc.eachCaret(function(caret) {
          var a, head = caret.head(), s = caret.getParserState(), parser = s && s.parser;
          
          if (caret.hasSelection() && (a = parser.selectionWrappers[ch])) {
            'string' === typeof a ? caret.wrapSelection(a, a) : caret.wrapSelection(a[0], a[1]);
          } else if (options.useParserKeyMap && parser.keyMap[ch]) {
            var str = parser.keyMap[ch].call(cp, s.stream, s.state, caret);
            if ('string' === typeof str) caret.insert(str);
            else if (str == null) caret.insert(ch);
          } else {
            caret.insert(ch);
          }
          if (options.autoIndent && parser.isIndentTrigger(ch)) {
            reIndent(this, head.line, head.line);
          }
        });
        return eventCancel(e);
      }
    });
    on(input, 'keyup', function(e) {
      updateFlags(e, false);
      if (options.readOnly) return;
      if (e.keyCode === 8 || e.keyCode === 46 || (!e.ctrlKey && !e.metaKey && modifierKeys.indexOf(e.keyCode) === -1)) {
        if (this.value.length) cp.doc.call('insert', this.value);
        T = clearTimeout(T) || setTimeout(function() {
          cp.emit('pause');
          runBackgroundParser(cp.doc);
        }, options.keyupInactivityTimeout);
      }
      this.value = '';
      cp.emit('keyup', e);
    });
    on(input, 'input', function(e) {
      if (!options.readOnly && this.value.length) {
        cp.doc.call('insert', this.value, 0, options.autoIndent && cp.doc.parser.name !== 'plaintext');
        this.value = '';
      }
    });
  }
  function checkOptions(cp, options) {
    var addons = options.addons, dom = cp.dom;
    cp.setTheme(options.theme);
    if (options.fontFamily !== CodePrinter.defaults.fontFamily) dom.container.style.fontFamily = options.fontFamily;
    options.lineNumbers ? cp.showLineNumbers() : cp.hideLineNumbers();
    options.drawIndentGuides || addClass(dom.mainNode, 'cp--no-indent-guides');
    options.legacyScrollbars && addClass(dom.scroll, 'cp--legacy-scrollbars');
    options.tabWidth && cp.setTabWidth(options.tabWidth);
    options.width !== 'auto' && cp.setWidth(options.width);
    options.height !== 300 && cp.setHeight(options.height);
    options.fontSize !== 12 && cp.setFontSize(options.fontSize);
    if (addons) {
      if (addons instanceof Array) {
        for (var i = 0; i < addons.length; i++) {
          cp.initAddon(addons[i]);
        }
      } else {
        for (var k in addons) {
          cp.initAddon(k, addons[k]);
        }
      }
    }
    options.shortcuts && cp.initAddon('shortcuts');
    options.autoComplete && cp.initAddon('hints');
  }
  function create(parent, tag, className) {
    var d = document.createElement(tag);
    d.className = className;
    parent.appendChild(d);
    return d;
  }
  function prepareSelNode(overlay, node, top, left, width, height, right) {
    var style = 'top:'+top+'px;left:'+left+'px;height:'+height+'px;';
    addClass(node, 'cp-selection');
    if ('number' === typeof width) style += 'width:'+width+'px;';
    if ('number' === typeof right) style += 'right:'+right+'px;';
    node.setAttribute('style', style);
    node.parentNode || overlay.node.appendChild(node);
    return node;
  }
  function getMatchingObject(m) {
    if ('string' === typeof m) return CodePrinter.matching[m];
    return m;
  }
  function valueOf(source) {
    if (source && source.nodeType) return source.value || '';
    return 'string' === typeof source ? source : '';
  }
  function isPos(pos) {
    return pos && 'number' === typeof pos.line && 'number' === typeof pos.column;
  }
  function getRangeOf(a, b) {
    return a ? cmp(a, b) < 0 ? r(a, b) : r(b, a) : r(b, b);
  }
  function updateFlags(event, down) {
    var code = event.keyCode;
    Flags.keyCode = down ? code : 0;
    Flags.ctrlKey = code === 18 ? down : event.ctrlKey;
    Flags.shiftKey = code === 16 ? down : event.shiftKey;
    Flags.metaKey = [91,92,93,224].indexOf(code) >= 0 ? down : event.metaKey;
    Flags.altKey = code === 19 ? down : event.altKey;
    Flags.cmdKey = macosx ? Flags.metaKey : Flags.ctrlKey;
    Flags.modifierKey = Flags.ctrlKey || Flags.shiftKey || Flags.metaKey || Flags.altKey;
    Flags.isKeyDown = Flags.modifierKey || Flags.keyCode > 0;
  }
  function cpx(style) {
    return style.replace(/\S+/g, 'cpx-$&');
  }
  function tabString(cp) {
    return cp.options.indentByTabs ? '\t' : repeat(' ', cp.options.tabWidth);
  }
  function wheelDelta(e) {
    var x = e.wheelDeltaX, y = e.wheelDeltaY;
    if (x == null && e.axis === e.HORIZONTAL_AXIS) x = e.detail;
    if (y == null) y = e.axis === e.VERTICAL_AXIS ? e.detail : e.wheelDelta;
    return { x: x, y: y };
  }
  function wheel(doc, node, e, speed, x, y) {
    if (webkit && macosx) wheelTarget(doc, e.target);
    doc.scroll(speed * x, speed * y);
    return eventCancel(e);
  }
  function wheelTarget(doc, wt) {
    if (doc.wheelTarget !== wt && doc.dom.scroll !== wt) {
      if (wt && wt.style.display === 'none') wt.parentNode.removeChild(wt);
      doc.wheelTarget = wt;
    }
  }
  function insertClosing(doc, ch, comp) {
    var s = doc.getState(caret.head()), charAfter = s.stream.at(0);
    charAfter == ch ? caret.moveX(1) : /\b(string|invalid)\b/.test(s.style) || /[^\s\)\]\}]/.test(charAfter) ? doc.insertText(ch, 0) : doc.insertText(ch + comp, -1);
    return false;
  }
  function desiredHeight(cp, half) {
    return (cp.dom.body.offsetHeight || cp.options.height || 0) + cp.options.viewportMargin * (half ? 1 : 2);
  }
  function scroll(doc, delta) {
    if (!delta) return;
    doc.sizes.scrollTop += delta;
    doc.dom.code.style.top = doc.sizes.scrollTop + 'px';
  }
  function scrollTo(doc, st) {
    doc.scrollTop = st;
    doc.dom.scroll.scrollTop = st;
  }
  function scrollBy(doc, delta) {
    doc.scrollTop += delta;
    doc.dom.scroll.scrollTop += delta;
  }
  function getLineClasses(line) { return 'cp-line-view' + (line.classes ? ' '+line.classes.join(' ') : ''); }
  function touch(line) {
    if (line.view) {
      line.view.node.className = getLineClasses(line);
    }
  }
  function maybeExternalMeasure(doc, dl) {
    return dl.view || externalMeasure(doc, dl);
  }
  function externalMeasure(doc, dl) {
    var oldView = dl.view, view = dl.view = doc.measure;
    view.node.style.top = doc.sizes.paddingTop + dl.getOffset() + 'px';
    process(doc, dl); dl.view = oldView;
    return view;
  }
  function calcCharWidth(view) {
    var s = cspan(null, 'A'), cw;
    view.pre.appendChild(s); cw = s.offsetWidth; view.pre.removeChild(s);
    return cw;
  }
  function complementBracket(ch) {
    var obj = { '(':')', ')':'(', '{':'}', '}':'{', '[':']', ']':'[', '<':'>', '>':'<' }
    return obj[ch];
  }
  function functionSnippet(cp, head, snippet) {
    var s = doc.getState(head);
    return snippet.call(s.parser, s.stream, s.state);
  }
  function trimSpaces(txt) {
    return txt.replace(/\s+$/, '');
  }
  function getModes(names) {
    var m = [];
    for (var i = 0; i < names.length; i++) m.push(modes[names[i].toLowerCase()] || null);
    return m;
  }
  function load(src, css) {
    src = CodePrinter.src + src;
    var s, tag = css ? 'link' : 'script', attr = css ? 'href' : 'src';
    if (!document.querySelector(tag+'['+attr+'="'+src+'"]')) {
      s = document.createElement(tag);
      s.type = css ? 'text/css' : 'text/javascript';
      if (css) s.rel = 'stylesheet';
      s.async = true; s[attr] = src;
      document.head.appendChild(s);
    }
  }
  CodePrinter.keyCodes = keyCodes = {
    3: 'Enter', 8: 'Backspace', 9: 'Tab', 12: 'NumLock', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 19: 'Pause', 20: 'CapsLock',
    27: 'Esc', 32: 'Space', 33: 'PageUp', 34: 'PageDown', 35: 'End', 36: 'Home', 37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down',
    44: 'PrintScrn', 45: 'Insert', 46: 'Delete', 59: ';', 61: '=', 91: 'Cmd', 92: 'Cmd', 93: 'Cmd', 106: 'Multiply', 107: 'Add',
    109: 'Subtract', 110: 'Point', 111: 'Divide', 127: 'Delete', 144: 'NumLock', 145: 'ScrollLock', 186: ';', 187: '=', 188: ',',
    189: '-', 190: '.', 191: '/', 192: '`', 219: '[', 220: '\\', 221: ']', 222: '\'', 224: 'Cmd', 229: '/', 63232: 'Up', 63233: 'Down',
    63234: 'Left', 63235: 'Right', 63272: 'Delete', 63273: 'Home', 63275: 'End', 63276: 'PageUp', 63277: 'PageDown', 63302: 'Insert'
  }
  for (var i = 0; i < 10; i++) { keyCodes[i+96] = 'Num'+i; keyCodes[i+48] = ''+i; }
  for (var i = 65; i < 91; i++) keyCodes[i] = String.fromCharCode(i);
  for (var i = 1; i < 20; i++) keyCodes[i+111] = keyCodes[i+63235] = 'F'+i;
  
  function keySequence(e, noShift) {
    var key = keyCodes[e.keyCode], res = key;
    if (key == null) return false;
    if (!noShift && e.shiftKey && key != 'Shift') res = 'Shift ' + res;
    if (e.altKey && key != 'Alt') res = 'Alt ' + res;
    if ((macosx ? e.ctrlKey : e.metaKey) && key != 'Ctrl') res = 'Ctrl ' + res;
    if ((macosx ? e.metaKey : e.ctrlKey) && key != 'Cmd') res = 'Cmd ' + res;
    return res;
  }
  function escape(str) { return str.replace(/[-\/\\^$*+?.()|[\]{}"']/g, '\\$&'); }
  function extend(base) { if (base) for (var i = 1; i < arguments.length; i++) for (var k in arguments[i]) base[k] = arguments[i][k]; return base; }
  function copy(obj) { var cp = isArray(obj) ? [] : {}; for (var k in obj) cp[k] = 'object' === typeof obj[k] ? copy(obj[k]) : obj[k]; return cp; }
  function isArray(arr) { return Object.prototype.toString.call(arr) === '[object Array]'; }
  function each(arr, func, owner, start) { for (var i = start | 0; i < arr.length; i++) func.call(owner, arr[i], i); }
  function map(arr, func) { var m = []; for (var i = 0; i < arr.length; i++) m[i] = func.call(this, arr[i], i); return m; }
  function lastV(arr) { return arr[arr.length-1]; }
  function on(node, event, listener) { node.addEventListener(event, listener, false); }
  function off(node, event, listener) { node.removeEventListener(event, listener, false); }
  function eventCancel(e, propagate) { e.preventDefault(); propagate || e.stopPropagation(); return e.returnValue = false; }
  function addClass(n, c) { isArray(c) ? n.classList.add.apply(n.classList, c) : n.classList.add(c); return n; }
  function removeClass(n, c) { isArray(c) ? n.classList.remove.apply(n.classList, c) : n.classList.remove(c); return n; }
  function hasClass(n, c) { return n.classList.contains(c); }
  function repeat(th, times) {
    var str = '';
    while (times > 0) { if (times % 2 == 1) str += th; th += th; times >>= 1; }
    return str;
  }
  function parseEventArguments(a, b) {
    if ('string' == typeof a) { var obj = {}; obj[a] = b; return obj; }
    return a;
  }
  if (window.postMessage) {
    async = CodePrinter.async = function(callback) {
      if ('function' == typeof callback) {
        asyncQueue.push(callback);
        window.postMessage('CodePrinter', '*');
      }
    }
    on(window, 'message', function(e) { if (e && e.data === 'CodePrinter' && asyncQueue.length) (asyncQueue.shift())(); });
  } else {
    async = CodePrinter.async = function(callback) { 'function' == typeof callback && setTimeout(callback, 1); }
  }
  
  if ('object' === typeof module) module.exports = CodePrinter;
  if ('function' === typeof define) define('CodePrinter', function() { return CodePrinter; });
  if (window) window.CodePrinter = CodePrinter;
})();
