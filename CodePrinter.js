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
  , Measure, commands, lineendings
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
  , Flags = {};
  
  CodePrinter = function(source, options) {
    if (arguments.length === 1 && source == '[object Object]') {
      options = source;
      source = null;
    }
    options = this.options = extend({}, CodePrinter.defaults, options);
    buildDOM(this);
    EventEmitter.call(this);
    
    this.keyMap = new keyMap;
    checkOptions(this, options);
    this.setDocument(new Document(this, valueOf(source), options.mode));
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
    mode: 'plaintext',
    theme: 'default',
    caretStyle: 'vertical',
    lineEndings: '\n',
    width: 'auto',
    height: 300,
    tabWidth: 2,
    tabIndex: -1,
    fontSize: 12,
    fontFamily: 'Menlo, Monaco, Consolas, Courier, monospace',
    minFontSize: 6,
    maxFontSize: 60,
    lineHeight: 'normal',
    caretHeight: 1,
    caretBlinkRate: 500,
    viewportMargin: 80,
    keyupInactivityTimeout: 1000,
    scrollSpeed: 1,
    autoCompleteDelay: 200,
    historyStackSize: 100,
    historyDelay: 1000,
    firstLineNumber: 1,
    lineNumbers: true,
    lineNumberFormatter: false,
    lineWrapping: false,
    autoComplete: false,
    autoFocus: true,
    abortSelectionOnBlur: false,
    legacyScrollbars: false,
    readOnly: false,
    drawIndentGuides: true,
    history: true,
    matching: true,
    highlightCurrentLine: true,
    blinkCaret: true,
    autoScroll: true,
    autoIndent: true,
    indentByTabs: false,
    trimTrailingSpaces: false,
    insertClosingBrackets: true,
    insertClosingQuotes: true,
    searchOnDblClick: true,
    useParserKeyMap: true,
    tabTriggers: true,
    shortcuts: true,
    disableThemeClassName: false
  }
  
  div = document.createElement('div');
  li = document.createElement('li');
  pre = document.createElement('pre');
  span = document.createElement('span');
  
  EventEmitter = function(parent) {
    var events = {};
    this.emit = function(event) {
      var args = new Array(arguments.length - 1), ev;
      for (var i = 0; i < args.length; i++) args[i] = arguments[i+1];
      if (ev = events[event]) for (var i = ev.length; i-- && ev[i];) ev[i].apply(this, args);
      if (parent) parent.emit.apply(parent, [event, this].concat(args));
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
        callback.apply(this, arguments);
        this.off(event, fn);
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
          if (!args[k] || events[k].length == 0) events[k] = null;
        }
      }
      return this;
    }
  }
  EventEmitter.call(CodePrinter);
  
  CodePrinter.prototype = {
    createDocument: function(source, mode) {
      return new Document(this, valueOf(source), mode);
    },
    setDocument: function(doc) {
      if (doc instanceof Document && this.doc != doc) {
        var old = this.doc && this.doc.detach();
        (this.doc = doc).attach(this);
        this.emit('documentChanged');
        doc.print();
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
    requireStyle: function(style) {
      load('theme/'+style+'.css', true);
    },
    setOptions: function(key, value) {
      if (this.options[key] !== value) {
        this.options[key] = value;
        this.emit('optionsChanged', key, value);
      }
      return this;
    },
    setTabWidth: function(tw) {
      if ('number' == typeof tw && tw >= 0) {
        this.options.tabWidth = tw;
        this.tabString = repeat(' ', tw);
        this.doc && this.doc.initialized && runBackgroundParser(this.doc);
      }
      return this;
    },
    setLineEndings: function(le) {
      le = le.toUpperCase();
      this.options.lineEndings = lineendings[le] || this.options.lineEndings || '\n';
      return this;
    },
    setLineWrapping: function(lw) {
      this.options.lineWrapping = !!lw;
      lw ? addClass(this.dom.mainNode, 'cp-line-wrapping') : removeClass(this.dom.mainNode, 'cp-line-wrapping');
      this.doc.updateView();
    },
    setTheme: function(name, dontrequire) {
      typeof name === 'string' && name !== 'default' ? dontrequire != true && this.requireStyle(name) : name = 'default';
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
        this.dom.container.style.fontSize = (this.options.fontSize = size) + 'px';
        
        if (doc) {
          doc.sizes.defaultHeight = getFontHeight(this.options);
          doc.fill();
          doc.updateView().showSelection();
          updateScroll(doc);
        }
        this.caret.refresh();
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
        addClass(this.dom.mainNode, 'cp-auto-height');
      } else {
        this.dom.body.style.height = (this.options.height = parseInt(size, 10)) + 'px';
        removeClass(this.dom.mainNode, 'cp-auto-height');
      }
      this.emit('heightChanged');
      return this;
    },
    getTextAtLine: function(line) {
      var dl = this.doc.get(line < 0 ? this.doc.size() + line : line);
      return dl ? dl.text : '';
    },
    getNextLineIndent: function(line) {
      var indent = this.getIndentAtLine(line);
      return nextLineIndent(this, indent, line);
    },
    reIndent: function(from, to) {
      var size = this.doc.size(), parser = this.doc.parser
      , i = 0, range, dl, end, s, oi, diff;
      
      if (arguments.length < 2) {
        if (range = this.doc.getSelectionRange()) {
          from = range.start.line;
          to = range.end.line;
        } else {
          from = 0;
          to = size - 1;
        }
      }
      if ('number' == typeof from && 'number' == typeof to && from <= to) {
        dl = this.doc.get(from = Math.max(0, from - 1));
        end = this.doc.get(to = Math.min(to + 1, size));
        
        if (from == 0) diff = this.setIndentAtLine(0, 0, dl);
        
        for (var j = 0 ;; ++j) {
          s = this.getStateAt(dl, dl.text.length);
          parser = s.state && s.state.parser || parser;
          i = parser.indent(s.stream, s.state, s.nextIteration);
          dl = dl.next();
          if (dl != end) {
            s = this.getStateAt(dl, 0);
            parser = s.state && s.state.parser || parser;
            oi = s.stream.indentation; s.stream.indentation = i;
            i = parser.indent(s.stream, s.state, s.nextIteration);
            if ('number' == typeof i && i != oi) {
              diff = this.setIndentAtLine(dl, i);
              if (j == 0 && range && diff) this.doc.moveSelectionStart(diff);
            }
          } else {
            if (range && diff) this.doc.moveSelectionEnd(diff);
            if (range) this.doc.showSelection();
            break;
          }
        }
      }
    },
    isState: function(state, line, col, all) {
      if (state && state.length) {
        state = 'string' === typeof state ? [state] : state;
        var gs = getStates.call(this, this.doc.get(line).parsed, col), l = gs ? gs.length : 0;
        return gs ? all ? gs.diff(state).length === 0 && gs.length == state.length : gs.diff(state).length !== l : false;
      }
      return false;
    },
    replace: function(replaceWith, vol) {
      if ('string' === typeof replaceWith && this.searches) {
        var search = this.searches
        , results = search.results
        , cur, tmp;
        
        if (arguments.length === 1) {
          vol = 1;
        }
        vol = Math.max(0, Math.min(vol, search.length));
        
        search.mute = true;
        while (vol-- > 0 && (cur = search.active) && results[cur.line]) {
          this.searchNext();
          if ((tmp = results[cur.line]).length > 1) {
            tmp.splice(tmp.indexOf(cur), 1);
          } else {
            delete results[cur.line];
          }
          --search.length;
          cur.node && search.overlay.node.removeChild(cur.node);
          
          this.caret.position(cur.line, cur.startColumn);
          this.removeAfterCursor(cur.value);
          this.insertText(replaceWith);
          
          if (cur.line === search.active.line) {
            var cmv = replaceWith.length - cur.length
            , dl = this.doc.get(cur.line);
            for (var i = 0, l = tmp.length; i < l; i++) {
              tmp[i].startColumn += cmv;
              searchUpdateNode.call(this, dl, tmp[i].node, tmp[i]);
            }
          }
        }
        search.mute = false;
      }
    },
    replaceAll: function(replaceWith) {
      return this.searches && this.replace(replaceWith, this.searches.length);
    },
    getDefinitions: function() {
      var obj = {}, dl = this.doc.get(0), i = 0;
      for (; dl; dl = dl.next()) {
        if (dl.definition) obj[i] = dl.definition;
        ++i;
      }
      return obj;
    },
    nextDefinition: function() {
      var dl = this.caret.dl().next();
      for (; dl; dl = dl.next()) {
        if (dl.definition) {
          this.caret.position(dl.info().index, dl.definition.pos);
          return;
        }
      }
    },
    previousDefinition: function() {
      var dl = this.caret.dl().prev();
      for (; dl; dl = dl.prev()) {
        if (dl.definition) {
          this.caret.position(dl.info().index, dl.definition.pos);
          return;
        }
      }
    },
    getSnippets: function() {
      return extend({}, this.options.snippets, this.doc.parser && this.doc.parser.snippets);
    },
    findSnippet: function(snippetName) {
      var s = this.options.snippets, b;
      if (!(b = s && s.hasOwnProperty(snippetName))) {
        s = this.doc.parser && this.doc.parser.snippets;
        b = s && s.hasOwnProperty(snippetName);
      }
      s = b && s[snippetName];
      if ('function' == typeof s) s = functionSnippet(this, /*p(x,y),*/ s);
      if (s) return 'string' == typeof s ? { content: s } : s;
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
    registerKey: function(arg) {
      if (!(arg instanceof Object)) { var t = arguments[0]; arg = {}; arg[t] = arguments[1]; }
      extend(this.keyMap, arg);
      return this;
    },
    unregisterKey: function() {
      for (var i = 0; i < arguments.length; i++) {
        if (this.keyMap[arguments[i]]) {
          this.keyMap[arguments[i]] = function() { return true; }
        }
      }
      return this;
    },
    exec: function(command) {
      var cmd = commands[command], args = new Array(arguments.length), cp = this;
      if ('function' === typeof cmd) {
        for (var i = 1; i < args.length; i++) args[i] = arguments[i+1];
        this.doc.eachCaret(function(caret) {
          args[0] = caret;
          cmd.apply(cp, args);
        });
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
    openCounter: function() {
      removeClass(this.dom.counterContainer, 'cp-hidden');
    },
    closeCounter: function() {
      addClass(this.dom.counterContainer, 'cp-hidden');
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
    if (dl.text.length == 0) {
      var child = maybeSpanUpdate(dl.node, dl.node.firstChild, '', zws);
      while (child) child = rm(doc, dl.node, child);
      return;
    }
    var child = updateInnerLine(dl.node, cache, ind, tabString);
    while (child) child = rm(doc, dl.node, child);
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
    if (doc.wheelTarget == child) child.style.display = 'none';
    else parent.removeChild(child);
    return next;
  }
  function updateSpan(span, className, content) {
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
  function readIteration(parser, stream, state, cache) {
    stream.start = stream.pos;
    for (var i = 0; i < 3; i++) {
      var style = (state && (state.next ? state.next : (state.parser || parser).iterator) || parser.iterator)(stream, state);
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
        , stream = new Stream(ind.rest, { indentation: ind.indent });
        tmp.cache = parseStream(parser, stream, state);
        
        if (tmp.node) updateLine(doc, tmp, ind, doc.getEditor().tabString, tmp.cache);
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
    var a = dl.state && dl.state.next, b, state;
    parse(doc, dl);
    b = (state = dl.state) && state.next;
    
    while ((dl = dl.next()) && (!a && b || a && a !== b || dl.cache === null)) {
      dl.cache = undefined;
      a = dl.state && dl.state.next;
      parse(doc, dl, state);
      b = (state = dl.state) && state.next;
    }
    return dl;
  }
  function runBackgroundParser(doc, whole) {
    var to = whole ? doc.size() - 1 : doc.to()
    , state = doc.parser.initialState && doc.parser.initialState();
    
    doc.asyncEach(function(dl, index) {
      if (index > to) return false;
      parse(doc, dl, state);
      state = dl.state;
    });
  }
  function process(doc, dl) {
    if (!dl.cache) return parse(doc, dl);
    var ind = parseIndentation(dl.text, doc.getOption('tabWidth')), stream = new Stream(ind.rest, { indentation: ind.indent });
    updateLine(doc, dl, ind, doc.getEditor().tabString, dl.cache);
  }
  function cspan(style, content) {
    var node = span.cloneNode(false);
    if (style) node.className = style;
    node.appendChild(document.createTextNode(content));
    return node;
  }
  function copyState(state) {
    var st = {};
    for (var k in state) if (state[k] != null) st[k] = state[k];
    return st;
  }
  function reIndent(doc, parser, at) {
    var s = doc.getState(p(at.line - 1, -1));
    if (s) {
      var i = parser.indent(s.stream, s.state, s.nextIteration);
      s = doc.getState(at);
      s.stream.indentation = i;
      i = parser.indent(s.stream, s.state, s.nextIteration);
      if ('number' == typeof i) doc.setIndent(at.line, i);
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
          var comp = b && comparePos(a, b);
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
      } while (counter != 0 && ++i < 100);
      
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
  , pop = Array.prototype.pop;
  
  Branch.prototype = {
    splice: splice,
    push: push,
    pop: pop,
    shift: Array.prototype.shift,
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
    getOffset: function() {
      if (this.parent) {
        var off = 0, i = this.parent.indexOf(this);
        while (--i >= 0) off += this.parent[i].height;
        return off + this.parent.getOffset();
      }
      return 0;
    },
    getLineWithOffset: function(offset) {
      var h = 0, i = -1;
      while (++i < this.length && h + this[i].height < offset) h += this[i].height;
      if (i == this.length) --i; offsetDiff = offset - h;
      return this.isLeaf ? this[i] : this[i] ? this[i].getLineWithOffset(offsetDiff) : null;
    },
    info: function() {
      var r = { offset: 0, index: 0 }
      if (this.parent) {
        var tmp, i = this.parent.indexOf(this);
        r.index = this.parent.isLeaf ? i : 0;
        while (--i >= 0) {
          r.offset += this.parent[i].height;
          r.index += this.parent[i].size || 0;
        }
        tmp = this.parent.info();
        return tmp ? { offset: r.offset + tmp.offset, index: r.index + tmp.index } : r;
      }
      return null;
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
    this.parent = this.cache = null;
    this.node = this.counter = null;
    return this;
  }
  
  Line.prototype = {
    getOffset: Branch.prototype.getOffset,
    info: Branch.prototype.info,
    setText: function(str) {
      this.text = str;
      this.cache = null;
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
    next: function() {
      if (this.parent) {
        var i = this.parent.indexOf(this);
        if (i >= 0) {
          if (i + 1 < this.parent.length) {
            return this.parent[i+1];
          } else {
            var next = this.parent.next();
            return next && next.length ? next[0] : null;
          }
        }
      }
      return null;
    },
    prev: function() {
      if (this.parent) {
        var i = this.parent.indexOf(this);
        if (i >= 0) {
          if (i > 0) {
            return this.parent[i-1];
          } else {
            var prev = this.parent.prev();
            return prev && prev.length ? lastV(prev) : null;
          }
        }
      }
      return null;
    }
  }
  
  function updateLineHeight(doc, dl) {
    if (dl) {
      var height, node = dl.node;
      if (height = node.offsetHeight) {
        var diff = height - dl.height;
        if (diff) {
          if (dl == doc.view[0] && doc.from() != 0) scrollBy(doc, -diff);
          if (dl.counter) dl.counter.style.height = height + 'px';
          for (; dl; dl = dl.parent) dl.height += diff;
        }
      }
    }
  }
  function updateHeight(doc) {
    var minHeight, dom = doc.dom, sizes = doc.sizes;
    if (dom && sizes.minHeight != (minHeight = doc.height() + sizes.paddingTop * 2)) {
      dom.screen.style.minHeight = minHeight + 'px';
      dom.counterWrapper.style.minHeight = minHeight + 'px';
      sizes.minHeight = minHeight;
    }
  }
  function updateScroll(doc) {
    if (doc.view.length) {
      var o = doc.view[0].getOffset();
      doc.dom.code.style.top = doc.dom.counter.style.top = (doc.sizes.scrollTop = o) + 'px';
    }
  }
  function updateCounters(doc, firstNumber, formatter) {
    var tmp = doc.view.length && doc.view[0].counter, index = doc.from();
    do tmp.firstChild.nodeValue = formatter(firstNumber + index++); while (tmp = tmp.nextSibling);
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
    var cmp = comparePos(pos, change.from);
    if (anchor ? cmp <= 0 : cmp < 0) return pos;
    if (comparePos(pos, change.to) <= 0) return changeEnd(change);
    var line = pos.line - change.to.line + change.from.line + change.text.length - 1, col = pos.column;
    if (pos.line === change.to.line) col += changeEnd(change).column - change.to.column;
    return p(line, col);
  }
  function singleInsert(doc, line, lineIndex, insert, at) {
    var text = line.text, change = { text: [insert] };
    line.setText(text.substring(0, at) + insert + text.substr(at));
    line.node && parse(doc, line);
    change.from = change.to = p(lineIndex, at);
    change.end = p(lineIndex, at + insert.length);
    adjustCaretsPos(doc, change);
  }
  function singleRemove(doc, line, lineIndex, from, to) {
    var text = line.text, change = { from: p(lineIndex, from), to: p(lineIndex, to) };
    line.setText(text.substring(0, from) + text.substr(to));
    line.node && parse(doc, line);
    change.text = [text.substring(from, to)];
    change.end = change.from;
    adjustCaretsPos(doc, change);
  }
  function getFontHeight(options) {
    var pr = pre.cloneNode(false), height;
    pr.setAttribute('style', 'position:absolute;font:normal normal '+options.fontSize+'px/'+options.lineHeight+' '+options.fontFamily+';');
    pr.appendChild(document.createTextNode('CP'));
    document.documentElement.appendChild(pr);
    height = pr.offsetHeight;
    document.documentElement.removeChild(pr);
    return height;
  }
  function applySizes(doc) {
    var dom = doc.dom, sizes = doc.sizes;
    dom.screen.style.minWidth = sizes.minWidth + 'px';
    dom.screen.style.minHeight = sizes.minHeight + 'px';
    dom.counter.style.minHeight = sizes.minHeight + 'px';
    dom.wrapper.scrollTop = dom.counterContainer.scrollTop = doc.scrollTop | 0;
    dom.wrapper.scrollLeft = doc.scrollLeft | 0;
  }
  function replaceRange(doc, txt, from, to) {
    from = nPos(doc, from); to = nPos(doc, to) || from;
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
  
  Measure = function(dl, sizes) {
    var inf = dl.info();
    this.dl = dl;
    this.line = inf.index;
    this.lineOffset = inf.offset;
    this.column = this.offsetY = this.width = this.charWidth = 0;
    this.offsetX = sizes.paddingLeft;
    this.height = this.charHeight = sizes.defaultHeight;
  }
  
  Document = CodePrinter.Document = function(editor, source, mode) {
    var that = this, cp, dom, from = 0, to = -1, caretPos
    , firstNumber, formatter, lineEnding, maxLine
    , maxLineLength = 0, maxLineChanged, data, view, selection
    , sizes = this.sizes = { scrollTop: 0, defaultHeight: 14 };
    
    function link(dl, index, withoutParsing) {
      if (dl.node && dl.counter) {
        dl.counter.firstChild.nodeValue = formatter(firstNumber + index);
        if (index < to) {
          var q = index - from, bef = view[q];
          dom.code.insertBefore(dl.node, bef.node);
          dom.counter.insertBefore(dl.counter, bef.counter);
          view.splice(q, 0, dl);
          var tmp = dl.counter.nextSibling, counter = index;
          while (tmp) {
            tmp.firstChild.nodeValue = formatter(firstNumber + ++counter);
            tmp = tmp.nextSibling;
          }
        } else {
          dom.code.appendChild(dl.node);
          dom.counter.appendChild(dl.counter);
          view.push(dl);
        }
        withoutParsing || process(that, dl);
        touch(dl);
        that.emit('link', dl, index);
      }
    }
    function insert(dl) { init(dl); link(dl, to + 1); ++to; }
    function prepend(dl) { init(dl); link(dl, --from); }
    function remove(dl, index) {
      dom.code.removeChild(deleteNode(dl));
      dom.counter.removeChild(deleteCounter(dl));
      var i = view.indexOf(dl);
      if (i >= 0) view.splice(i, 1);
      --to; that.emit('unlink', dl, index);
    }
    function clear() {
      for (var i = 0; i < view.length; i++) {
        deleteNode(view[i]);
        deleteCounter(view[i]);
      }
      that.clearSelection();
      to = -1; from = view.length = 0;
      dom.code.innerHTML = dom.counter.innerHTML = '';
      dom.code.style.top = dom.counter.style.top = (sizes.scrollTop = 0) + 'px';
    }
    function changedListener(e) {
      if (this.doc == that) {
        if (e.text != '\n') that.updateView();
        if (cp.options.history) that.history.pushChanges(e.line, e.column, e.text, e.added);
        that.emit('changed', e);
      }
    }
    
    this.init = function(source, mode) {
      source = source || '';
      this.initialized = true;
      data = new Data();
      if (to !== -1) clear();
      this.insert(0, source.split(eol));
      this.setMode(mode);
      return this;
    }
    this.attach = function(editor) {
      if (cp) cp.off('changed', changedListener);
      dom = this.dom = editor.dom;
      cp = editor;
      firstNumber = cp.options.firstLineNumber;
      formatter = cp.options.lineNumberFormatter || defaultFormatter;
      lineEnding = cp.options.lineEnding;
      
      if (view.length) {
        for (var i = 0; i < view.length; i++) {
          dom.code.appendChild(view[i].node);
          dom.counter.appendChild(view[i].counter);
        }
        this.scrollTo(this.scrollTop | 0);
        updateScroll(this);
      }
      cp.on('changed', changedListener);
      sizes.defaultHeight = getFontHeight(cp.options);
      applySizes(this);
      this.attached = true;
      this.emit('attached');
      return this;
    }
    this.detach = function() {
      this.scrollTop = dom.wrapper.scrollTop;
      this.scrollLeft = dom.wrapper.scrollLeft;
      for (var i = 0; i < view.length; i++) {
        dom.code.removeChild(view[i].node);
        dom.counter.removeChild(view[i].counter);
      }
      cp.off('changed', changedListener);
      if (cp.selectionOverlay) cp.selectionOverlay.remove();
      clearMeasures(dom);
      cp.dom.input.blur();
      cp = cp.doc = this.attached = null;
      this.emit('detached');
      return this;
    }
    this.insert = function(at, text) {
      var lines = [];
      if ('string' === typeof text) {
        lines[0] = new Line(text, sizes.defaultHeight);
        if (text.length > maxLineLength) {
          maxLine = lines[0];
          maxLineLength = text.length;
          maxLineChanged = true;
        }
      } else {
        for (var i = 0; i < text.length; i++) {
          lines[i] = new Line(text[i], sizes.defaultHeight);
          if (text[i].length > maxLineLength) {
            maxLine = lines[i];
            maxLineLength = text[i].length;
            maxLineChanged = true;
          }
        }
      }
      data.insert(at, lines, sizes.defaultHeight * lines.length);
      if (cp) {
        if (at < from) {
          from += lines.length;
          updateCounters(this, firstNumber, formatter);
        } else if (at <= to + 1) {
          var sh = dom.code.scrollHeight || heightOfLines(view), dh = desiredHeight(cp);
          if (sh >= dh) {
            var m = Math.min(lines.length, to - at + 1), rmdl;
            for (var i = 0; i < m; i++) {
              rmdl = view.pop();
              captureNode(lines[i], rmdl);
              this.emit('unlink', rmdl, to + m - i);
              link(lines[i], at + i, true);
            }
          } else {
            var i = -1;
            while (++i < lines.length && sh < dh) {
              init(lines[i]); ++to;
              sh += lines[i].height;
              link(lines[i], at + i, true);
            }
          }
        }
        this.updateView();
      }
      return lines;
    }
    this.remove = function(at, n) {
      if ('number' === typeof n && n > 0 && at >= 0 && at + n <= data.size) {
        var h = data.height, rm = data.remove(at, n), sd = 0;
        
        if (at + n < from) {
          sd = data.height - h;
          from -= n; to -= n;
        } else if (at <= to) {
          var m, e, out, inv, next, prev, k = 0;
          
          if (at > from) {
            m = at;
            prev = view[0].prev();
          } else {
            m = from;
            prev = data.get(at - 1);
          }
          if (at + n < to + 1) {
            e = at + n;
            next = lastV(view).next();
          } else {
            e = to + 1;
            next = data.get(at);
          }
          inv = e - m;
          out = m - at;
          k = m - from;
          
          for (var i = 0; i < out; i++) {
            sd -= rm[i].height;
            if (rm[i] == maxLine) maxLineChanged = !(maxLine = null);
          }
          for (; i < rm.length; i++) if (rm[i] == maxLine) maxLineChanged = !(maxLine = null);
          
          while (inv--) {
            var dl = view[k];
            remove(dl, from + k);
            if (next) {
              insert(next);
              next = next.next();
            } else if (prev) {
              prepend(prev);
              prev = prev.prev();
              sd -= dl.height;
              ++k;
            }
          }
          from -= out; to = from + view.length - 1;
        }
        updateCounters(this, firstNumber, formatter);
        if (sd) scroll(this, sd);
        
        var last = lastV(rm);
        if (last.stateAfter) {
          parse(this, data.get(at));
        }
        dom.wrapper.scrollTop = dom.counterContainer.scrollTop;
        this.updateView();
        return rm;
      }
    }
    this.textAt = function(line) {
      var dl = data.get(line);
      return dl ? dl.text : null;
    }
    this.substring = function(a, b) {
      var parts = [], from = nPos(this, a), to = nPos(this, b);
      if (from && to && comparePos(from, to) <= 0) {
        var dl = data.get(from.line);
        if (from.line === to.line) return dl.text.substring(from.column, to.column);
        parts[0] = dl.text.substr(from.column);
        var i = from.line;
        while ((dl = dl.next()) && ++i < to.line) parts[parts.length] = dl.text;
        if (dl) parts[parts.length] = dl.text.substring(0, to.column);
      }
      return parts.join(this.getLineEnding());
    }
    this.insertText = this.replaceRange = function(text, from, to) {
      var change = replaceRange(this, text, from, to);
      if (change) {
        this.pushChange(change);
        return change.removed;
      }
    }
    this.removeRange = function(from, to) {
      return this.replaceRange('', from, to);
    }
    this.fill = function() {
      var half, b, dl = (half = view.length === 0) ? data.get(0) : lastV(view).next()
      , sh = dom.code && dom.code.scrollHeight || heightOfLines(view), dh = desiredHeight(cp, half);
      while (dl && !(b = sh > dh)) {
        insert(dl); sh += dl.height;
        dl = dl.next();
      }
      if (!dl) {
        dl = view[0].prev();
        while (dl && !(b = sh > dh)) {
          prepend(dl);
          sh += dl.height;
          scroll(this, -dl.height);
          dl = dl.prev();
        }
      }
      return b;
    }
    this.print = function() {
      this.fill();
      this.updateView();
      runBackgroundParser(this, true);
      this.sizes.paddingTop = parseInt(dom.code.style.paddingTop, 10) || 5;
      this.sizes.paddingLeft = parseInt(dom.code.style.paddingLeft, 10) || 10;
      if (cp.options.autoFocus) dom.input.focus();
      async(function() { cp && cp.emit('ready'); });
    }
    this.rewind = function(dl, st) {
      var tmp = dl, dli = dl.info()
      , offset = dli.offset
      , i = -1, oldfrom = from;
      
      if (from <= dli.index && dli.index <= to) return false;
      
      from = dli.index;
      to = from - 1;
      
      dom.counter.style.display = 'none';
      dom.code.style.display = 'none';
      
      while (tmp && ++i < view.length) {
        captureNode(tmp, view[i]);
        this.emit('unlink', view[i], oldfrom + i);
        process(this, tmp);
        tmp.counter.firstChild.nodeValue = formatter(firstNumber + (to = from + i));
        view[i] = tmp;
        this.emit('link', tmp, from + i);
        tmp = tmp.next();
      }
      if (++i < view.length) {
        var spliced = view.splice(i, view.length - i);
        tmp = dl.prev();
        while (tmp && spliced.length) {
          var shift = spliced.shift();
          captureNode(tmp, shift);
          this.emit('unlink', shift, oldfrom + i++);
          process(this, tmp);
          tmp.counter.firstChild.nodeValue = formatter(firstNumber + --from);
          dom.code.insertBefore(tmp.node, view[0].node);
          dom.counter.insertBefore(tmp.counter, view[0].counter);
          view.unshift(tmp);
          this.emit('link', tmp, from);
          offset -= tmp.height;
          tmp = tmp.prev();
        }
      }
      sizes.scrollTop = Math.max(0, offset);
      dom.counter.style.top = sizes.scrollTop + 'px';
      dom.code.style.top = sizes.scrollTop + 'px';
      if (st != null) scrollTo(this, st);
      dom.counter.style.display = '';
      dom.code.style.display = '';
      this.updateView();
    }
    this.scrollTo = function(st) {
      this._lockedScrolling = true;
      
      var x = st - sizes.scrollTop
      , limit = cp.options.viewportMargin
      , d = Math.round(x - limit)
      , abs = Math.abs(d)
      , tmpd = d, a = to
      , h, dl, disp;
      
      if (d) {
        if (abs > 700 && abs > 2 * dom.code.offsetHeight && 0 <= st && st <= dom.wrapper.scrollHeight - dom.wrapper.clientHeight) {
          dl = data.getLineWithOffset(Math.max(0, st - limit));
          if (this.rewind(dl, st) !== false) return;
        }
        if (from === 0 && d < 0) {
          h = view[0].height;
          dl = lastV(view);
          var sh = dom.code.scrollHeight, dh = desiredHeight(cp);
          while (h < x && sh < dh && (dl = dl.next())) {
            insert(dl);
            x -= dl.height;
            sh += dl.height;
          }
        } else {
          //if (disp = abs > 4 * sizes.defaultHeight) { dom.counter.style.display = 'none'; dom.code.style.display = 'none'; }
          if (d > 0) {
            while (view.length && (h = view[0].height) <= d && (dl = lastV(view).next())) {
              var first = view.shift();
              captureNode(dl, first);
              this.emit('unlink', first, from);
              link(dl, to + 1);
              ++from; ++to;
              d -= h;
            }
          } else if (d < 0) {
            while (view.length && (h = lastV(view).height) <= -d && (dl = view[0].prev())) {
              var last = view.pop();
              captureNode(dl, last);
              this.emit('unlink', last, to);
              --to; link(dl, --from);
              d += dl.height;
            }
          }
          if (tmpd != d) scroll(this, tmpd - d);
        }
      }
      //if (disp) { dom.counter.style.display = ''; dom.code.style.display = ''; }
      scrollTo(this, st);
      if (to != a) this.updateView(a - to);
    }
    this.isLineVisible = function(dl) {
      return view.indexOf('number' === typeof dl ? data.get(dl) : dl) >= 0;
    }
    this.eachVisibleLines = function(callback) {
      for (var i = 0; i < view.length; i++) {
        callback.call(this, view[i], from + i, i && view[i-1]);
      }
    }
    this.measurePosition = function(x, y) {
      var dl = this.lineWithOffset(y)
      , ch = maybeExternalMeasure(this, dl).childNodes
      , child, l, ow, ol, chl = ch.length
      , i = -1, r = new Measure(dl, sizes);
      
      y = offsetDiff;
      if (chl === 1 && ch[0].firstChild.nodeValue == zws) return r;
      while (++i < chl) {
        child = ch[i];
        l = child.firstChild.nodeValue.length;
        if (l === 0) continue;
        
        if (!cp.options.lineWrapping || y <= (r.offsetY = child.offsetTop) + (r.height = child.offsetHeight)) {
          ol = child.offsetLeft; ow = child.offsetWidth;
          r.charWidth = Math.round(ow / l);
          if (x <= ol + ow) {
            var tmp = Math.round(Math.max(0, x - ol) * l / ow);
            r.column += tmp;
            r.offsetX = Math.round(ol + tmp * ow / l);
            break;
          } else {
            r.offsetX = ol + ow;
            r.column += l;
          }
        } else {
          r.column += l;
        }
      }
      if (child) r.charHeight = child.offsetHeight;
      if (!r.charWidth) { r.charWidth = Math.round(ow / l); r.offsetX = ol + ow; }
      return r;
    }
    this.measureRect = function(dl, offset, to) {
      var ch = maybeExternalMeasure(this, dl).childNodes, child
      , l, ow, ol, chl = ch.length, tmp = 0, i = -1, bool, r = new Measure(dl, sizes);
      
      if (chl === 1 && ch[0].firstChild.nodeValue == zws) return r;
      while (++i < chl) {
        child = ch[i];
        l = child.firstChild.nodeValue.length;
        if (l === 0) continue;
        
        if (bool) {
          if (to <= tmp + l) {
            r.width = child.offsetLeft - r.offsetX + (to - tmp) * child.offsetWidth / l;
            break;
          }
        } else if (offset < tmp + l) {
          ow = child.offsetWidth;
          ol = child.offsetLeft;
          r.offsetX = Math.round(ol + (offset - tmp) * ow / l);
          r.offsetY = child.offsetTop;
          r.charWidth = Math.round(ow / l);
          bool = true;
          
          if (to < offset || 'number' !== typeof to) break;
          if (to <= tmp + l) {
            r.width = Math.round((to - offset) * ow / l);
            break;
          }
        }
        tmp += l;
      }
      if (!bool && child) {
        ow = child.offsetWidth;
        r.charWidth = Math.round(ow / l);
        r.offsetX = child.offsetLeft + ow;
        r.offsetY = child.offsetTop;
      }
      if (r.width) r.width = Math.round(r.width);
      if (child) r.height = child.offsetTop - r.offsetY + (r.charHeight = child.offsetHeight);
      if (!r.charWidth) r.charWidth = calcCharWidth(dl.node || dom.measure.firstChild);
      r.column = offset;
      return r;
    }
    this.updateView = function(det) {
      var i = 0, l = view.length, dl, c;
      if (det > 0 && det < l) l = det;
      if (det < 0 && -det < view.length) i = view.length + det;
      for (; i < l; i++) {
        dl = view[i];
        if (sizes.defaultHeight != dl.height || cp.options.lineWrapping) {
          updateLineHeight(this, dl);
        } else if (c = dl.cache) {
          for (var j = 0, cl = c.length; j < cl; j++) {
            if (c[j].style.indexOf('font-') >= 0) {
              updateLineHeight(this, dl);
            }
          }
        }
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
        var minWidth = externalMeasure(this, maxLine).offsetWidth;
        if (sizes.minWidth != minWidth) {
          dom.screen.style.minWidth = minWidth + 'px';
          sizes.minWidth = minWidth;
        }
      }
      updateHeight(this);
      this.emit('viewUpdated');
      return this;
    }
    this.somethingSelected = function() {
      for (var i = 0; i < this.carets.length; i++)
        if (this.carets[i].hasSelection())
          return true;
      return false;
    }
    this.getSelection = function() {
      var parts = [], carets = [].concat(this.carets);
      carets.sort(function(a, b) { return comparePos(a.head(), b.head()); });
      each(carets, function(caret) {
        var sel = caret.getSelection();
        if (sel) parts[parts.length] = sel;
      }, this);
      return parts.join('');
    }
    this.drawSelection = function(overlay, range) {
      if (overlay instanceof CodePrinter.Overlay && range) {
        var from = range.from, to = range.to
        , firstLine = data.get(from.line)
        , lastLine = data.get(to.line)
        , fromOffset = firstLine.getOffset()
        , toOffset = lastLine.getOffset()
        , fromMeasure = this.measureRect(firstLine, from.column)
        , toMeasure = this.measureRect(lastLine, to.column)
        , pl = sizes.paddingLeft, pt = sizes.paddingTop
        , equal = from.line === to.line, fh = fromMeasure.offsetY + fromMeasure.height;
        
        if (comparePos(from, to) > 0) return;
        
        overlay.top = prepareSelNode(overlay, overlay.top || div.cloneNode(false)
          , fromOffset + fromMeasure.offsetY + pt, fromMeasure.offsetX, equal && fromMeasure.offsetY === toMeasure.offsetY ? 0 : null, fromMeasure.height, pl);
        
        overlay.middle = prepareSelNode(overlay, overlay.middle || div.cloneNode(false)
          , fromOffset + fh + pt, pl, null, toOffset - fromOffset - fromMeasure.height + toMeasure.offsetY, pl);
        
        if (equal && fromMeasure.offsetY === toMeasure.offsetY) {
          overlay.bottom = prepareSelNode(overlay, overlay.bottom || div.cloneNode(false)
            , fromOffset + toMeasure.offsetY + pt, fromMeasure.offsetX, toMeasure.offsetX - fromMeasure.offsetX, fromMeasure.height, null);
        } else {
          overlay.bottom = prepareSelNode(overlay, overlay.bottom || div.cloneNode(false)
            , toOffset + fromMeasure.offsetY + pt, pl, toMeasure.offsetX - pl, toMeasure.charHeight, null);
        }
        overlay.show();
      }
    }
    this.pushChange = function(change) {
      if (!change) return;
      this.history.push(change);
      this.emit('change', change);
      return change;
    }
    this.each = function(func) { data.foreach(func); }
    this.get = function(i) { return data.get(i); }
    this.getEditor = function() { return cp; }
    this.getOptions = function() { return cp.options; }
    this.getOption = function(key) { return cp && cp.options[key]; }
    this.getTabString = function() { return cp.options.indentByTabs ? '\t' : repeat(' ', cp.options.tabWidth); }
    this.lineWithOffset = function(offset) { return data.getLineWithOffset(Math.max(0, Math.min(offset, data.height))); }
    this.getLineEnding = function() { return lineendings[lineEnding] || lineEnding || lineendings['LF']; }
    this.from = function() { return from; }
    this.to = function() { return to; }
    this.size = function() { return data.size; }
    this.height = function() { return data.height; }
    
    EventEmitter.call(this);
    
    this.on('caretMoved', function(caret) {
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
      if (this.getOption('autoScroll')) {
        var wrapper = this.dom.wrapper
        , pl = this.sizes.paddingLeft, pt = this.sizes.paddingTop
        , sl = wrapper.scrollLeft, st = wrapper.scrollTop
        , cw = wrapper.clientWidth, ch = wrapper.clientHeight
        , h = caret.dl().height;
        
        if (caret.x - pl < sl) {
          sl = caret.x - pl;
        } else if (caret.x + pl >= cw + sl) {
          sl = caret.x + pl - cw;
        }
        wrapper.scrollLeft = sl;
        if (Math.abs(caret.y - st) > ch) {
          if (caret.y < ch / 2) {
            st = 0;
          } else {
            st = caret.y - ch / 2;
          }
        } else {
          if (caret.y < st + h) {
            st = caret.y - h - pt;
          } else if (caret.y + 2 * h >= ch + st) {
            st = caret.y + 2 * h + pt - ch;
          }
        }
        this.scrollTo(st);
      }
      if (this.getOption('matching')) {
        var m = getMatchingObject(this.parser.matching);
        if (m) {
          var a, b, cur, bf = caret.textBefore(), af = caret.textAfter();
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
    });
    
    this.view = view = [];
    this.overlays = [];
    this.carets = [new Caret(this)];
    this.scrollTop = 0;
    this.parser = modes.plaintext;
    this.history = new History(this, editor.options.historyStackSize, editor.options.historyDelay);
    
    return this.init(source, mode);
  }
  
  function startBlinking(doc, options) {
    clearInterval(doc.caretsBlinkingInterval);
    if (options.blinkCaret) {
      var v = true;
      if (options.caretBlinkRate > 0) {
        for (var i = 0; i < doc.carets.length; i++) doc.carets[i].node.style.opacity = '1';
        doc.caretsBlinkingInterval = setInterval(function() {
          var tick = Flags.isKeyDown | Flags.isMouseDown | (v = !v) ? '1' : '0';
          for (var i = 0; i < doc.carets.length; i++) doc.carets[i].node.style.opacity = tick;
        }, options.caretBlinkRate);
      } else if (options.caretBlinkRate < 0)
        for (var i = 0; i < doc.carets.length; i++) doc.carets[i].node.style.opacity = '0';
    }
  }
  function mergeCarets(first, second) {
    var h1 = first.head(), h2 = second.head()
    , a1 = first.anchor(), a2 = second.anchor()
    , pos = [h1, h2];
    if (a1) pos.push(a1);
    if (a2) pos.push(a2);
    pos = pos.sort(comparePos);
    if (comparePos(h1, h2) < 0) first.setSelection(pos[0], lastV(pos));
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
  function searchNodeStyle(dl, rect, sizes) {
    return rect.width ? 'top:'+(sizes.paddingTop+dl.getOffset()+rect.offsetY)+'px;left:'+rect.offsetX+'px;width:'+(rect.width+2)+'px;height:'+(rect.charHeight+2)+'px;' : 'display:none;';
  }
  function searchShow(dl, line) {
    if (this.searchResults) this.searchResults.show(dl, line);
  }
  function searchHide(dl, line) {
    if (this.searchResults) this.searchResults.hide(dl, line);
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
      node.span.setAttribute('style', searchNodeStyle(dl, rect, doc.sizes));
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
      var pos = nPos(this, at), dl = pos && this.get(pos.line);
      if (!dl) return;
      var parser = this.parser
      , tw = this.getOption('tabWidth')
      , s = searchLineWithState(parser, dl, tw)
      , state = s.state, tmp = s.line;
      
      for (; tmp; tmp = tmp.next()) {
        var ind = parseIndentation(tmp.text, tw), stream = new Stream(ind.rest, { indentation: ind.indent });
        if (tmp === dl) {
          state = copyState(state);
          var readTo = Math.max(0, Math.min(pos.column - ind.length, ind.rest.length))
          , cache = parseStream(parser, stream, state, readTo)
          , oldpos = stream.pos, lastCache = lastV(cache);
          if (stream.eol()) tmp.state = state;
          stream.pos = pos;
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
      var pos = nPos(this, at);
      if (!pos) return false;
      //var dl = this.get(pos.line);
      //if (dl.cache) for (var i = 0; i < dl.cache.length; i++) if (dl.cache[i].from <= at.column) return dl.cache[i].style;
      return this.getState(pos).style;
    },
    getParser: function(at) {
      var s = this.getState(at);
      return s && s.parser;
    },
    searchLeft: function(start, pattern, style) {
      var pos = nPos(this, start), dl = pos && this.get(pos.line)
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
      var pos = nPos(this, start), dl = pos && this.get(pos.line)
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
          
          this.asyncEach(function(dl, line, offset) {
            if (search.request !== find) return false;
            searchBy.call(this, find, dl, line);
          }, function(index, last) {
            var sl = this.dom.wrapper.scrollLeft;
            if (last !== false) {
              if (search.length) {
                if (scroll !== false || search.length === 0) {
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
              this.dom.wrapper.scrollLeft = sl;
              'function' === typeof callback && callback.call(this, search);
              this.emit('searchCompleted', find, search.length);
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
          sp.setAttribute('style', 'top:'+(dl.getOffset()+ms.offsetY+this.sizes.paddingTop)+'px;left:'+ms.offsetX+'px;width:'+ms.width+'px;height:'+(ms.charHeight+1)+'px;');
          overlay.node.appendChild(sp);
        }
      }
      return this;
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
            doc.attached && doc.print();
          }
        });
      }
    },
    getIndent: function(at) {
      var pos = nPos(this, at);
      if (!pos) return 0;
      return parseIndentation(this.textAt(pos.line), this.getOption('tabWidth')).indent;
    },
    setIndent: function(line, indent) {
      if ('number' !== typeof line) return;
      var dl = this.get(line), old = parseIndentation(dl.text, this.getOption('tabWidth'))
      , diff = indent - old.indent, tab = tabString(this.getEditor());
      
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
    appendText: function(text) {
      var t = text.split(eol), size = this.size(), fi = t.shift();
      if (fi) {
        var last = this.get(size - 1);
        last && last.setText(last.text + fi);
      }
      this.insert(size, t);
      if (this.attached && !this.isFilled) this.isFilled = this.fill();
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
      , index = 0, offset = 0, queue = 500;
      
      if (options) {
        if (options.queue) queue = options.queue;
        if (options.index) index = options.index;
        if ('number' === typeof options.start) dl = this.get(index = options.start);
        else if (options.start instanceof Line) {
          dl = options.start;
          if (!options.index) index = dl.info().index;
        }
      }
      
      async(fn = function() {
        var j = 0, r;
        while (dl && j++ < queue) {
          r = callback.call(that, dl, index++, offset);
          offset += dl.height;
          dl = r ? r.next() : r == null ? dl.next() : false;
        }
        if (!dl) {
          onend instanceof Function && onend.call(that, index, dl);
          return false;
        }
        async(fn);
      });
    }
  }
  
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
    var cmp = comparePos(anchor, head);
    if (cmp < 0 && mv < 0 || cmp > 0 && mv > 0) {
      caret.reverse();
      return mv - cmp;
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
    var head = p(0, 0), currentLine, anchor, selOverlay, lastMeasure;
    
    EventEmitter.call(this, doc);
    this.node = addClass(div.cloneNode(false), 'cp-caret');
    
    function setPixelPosition(x, y) {
      if (!this.isDisabled) {
        var css = {}, stl = doc.getOption('caretStyle');
        
        x >= 0 && (css.left = this.x = Math.floor(Math.max(doc.sizes.paddingLeft, x)));
        y >= 0 && (css.top = this.y = Math.floor(y + doc.sizes.paddingTop));
        
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
      if (b) this.emit('caretWillMove');
      lastMeasure = measure;
      setPixelPosition.call(this, measure.offsetX, measure.offsetY + measure.lineOffset);
      if (b) this.emit('caretMoved');
      return this;
    }
    this.beginSelection = function() {
      this.clearSelection();
      anchor = this.head();
      if (!selOverlay) selOverlay = doc.createOverlay('cp-selection-overlay');
    }
    this.hasSelection = function() {
      return anchor && comparePos(anchor, this.head()) !== 0;
    }
    this.inSelection = function(line, column) {
      var pos = p(line, column);
      return anchor && comparePos(anchor, pos) * comparePos(pos, head) > 0;
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
      var newAnchor = nPos(doc, a), newHead = nPos(doc, b);
      if (!newHead) return;
      if (newAnchor && comparePos(newAnchor, newHead)) anchor = newAnchor;
      else anchor = null;
      return this.position(newHead);
    }
    this.setSelectionRange = function(range) {
      return range && this.setSelection(range.from, range.to);
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
      if (!anchor) return;
      if (selOverlay) selOverlay.hide();
      anchor = null;
      select(currentLine);
      this.emit('selectionCleared');
    }
    this.wrapSelection = function(before, after) {
      var range = this.getRange();
      replaceRange(doc, after, range.to, range.to);
      replaceRange(doc, before, range.from, range.from);
      if (comparePos(anchor, head) < 0) this.moveX(-after.length, true) && this.moveAnchor(before.length);
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
      if (!pos || !range || comparePos(range.from, pos) <= 0 && comparePos(pos, range.to) <= 0) return false;
      this.clearSelection();
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
      this.position(oldAnchor.line, oldAnchor.column);
    }
    this.match = function(pattern, dir) {
      if (pattern) {
        var text = currentLine.text, left = head.column, right = head.column
        , ch, test = function(ch) {
          return 'function' === typeof pattern ? pattern(ch) : pattern.test ? pattern.test(ch) : false;
        }
        if (!dir || dir === 1) for (; (ch = text.charAt(right)) && test(ch); ++right);
        if (!dir || dir === -1) for (; (ch = text.charAt(left - 1)) && test(ch); --left);
        var str = text.substring(left, right);
        this.setSelection(p(head.line, left), p(head.line, right));
        return str;
      }
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
    
    this.textBefore = function() { return currentLine && currentLine.text.substring(0, head.column); }
    this.textAfter = function() { return currentLine && currentLine.text.substr(head.column); }
    this.textAtCurrentLine = function() { return currentLine && currentLine.text; }
    
    this.position = function(line, column) {
      var nHead = nPos(doc, line, column);
      if (nHead) {
        var dl = doc.get(nHead.line);
        this.dispatch(doc.measureRect(doc.get(nHead.line), nHead.column));
      }
      return this;
    }
    this.moveX = function(mv, dontReverse) {
      if ('number' === typeof mv) {
        if (!dontReverse) mv = maybeReverseSelection(this, anchor, head, mv);
        var pos = positionAfterMove(doc, this.head(), mv);
        return this.position(pos.line, pos.column);
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
        this.position(mv, head.column);
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
    this.totalOffsetY = function(withLine) {
      var o = currentLine.getOffset() + this.offsetY();
      if (withLine && lastMeasure) o += lastMeasure.charHeight;
      return o;
    }
    this.head = function(real) {
      return real ? copy(head) : p(head.line, this.column());
    }
    this.anchor = function(real) {
      return anchor && (real || comparePos(anchor, this.head())) && copy(anchor);
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
    move: function(x, y) {
      x && this.moveX(x);
      y && this.moveY(y);
      return this;
    }
  }
  
  CodePrinter.Overlay = function(classes) {
    var cls = 'string' === typeof classes ? classes.split(/\s+/g) : isArray(classes) ? classes : [];
    this.node = addClass(div.cloneNode(false), ['cp-overlay'].concat(cls));
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
  
  Stream = function(value, ext) {
    this.pos = 0;
    this.value = value;
    this.length = value.length;
    if (ext) for (var k in ext) this[k] = ext[k];
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
      this.definition = extend({ pos: this.start }, defObject);
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
      if ('string' == typeof string) {
        if ('number' != typeof tabWidth) tabWidth = 2;
        var state = this.initialState && this.initialState()
        , node = pre.cloneNode(false)
        , lines = string.split(eol)
        , tabString = repeat(' ', tabWidth);
        
        for (var i = 0; i < lines.length; i++) {
          var ind = parseIndentation(lines[i], tabWidth), stream = new Stream(ind.rest, { indentation: ind.indent })
          , cache = parseStream(this, stream, state);
          node.innerHTML = '';
          updateInnerLine(node, cache, ind, tabString);
          lines[i] = '<pre>'+(node.innerHTML || zws)+'</pre>';
        }
        return lines.join('');
      }
    },
    indent: function(stream, state) {
      return stream.indentation;
    },
    isIndentTrigger: function(char) {
      return this.indentTriggers instanceof RegExp && this.indentTriggers.test(char);
    },
    isAutoCompleteTrigger: function(char) {
      return this.autoCompleteTriggers instanceof RegExp && this.autoCompleteTriggers.test(char);
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
    'Tab': function() {
      if (this.doc.issetSelection()) {
        this.indent();
      } else {
        if (this.options.tabTriggers) {
          var wbf = this.wordBefore(/\S+/), snippet;
          if (snippet = this.findSnippet(wbf)) {
            this.removeBeforeCursor(wbf);
            this.insertText(snippet.content, snippet.cursorMove);
            return false;
          }
        }
        this.insertText(this.options.indentByTabs ? '\t' : repeat(' ', this.options.tabWidth - this.caret.column() % this.options.tabWidth));
      }
    },
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
    'Cmd V': 'removeSelection',
    'Cmd X': 'removeSelection',
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
    var dl = doc.get(line), offset = dl.getOffset(), st = doc.dom.wrapper.scrollTop, oh = doc.dom.wrapper.offsetHeight;
    if (offset > st + oh - 20) doc.scrollTo(offset - oh + doc.getOption('viewportMargin'));
    else if (offset < st + 20) doc.scrollTo(offset - doc.getOption('viewportMargin'));
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
    'moveToStart': function() { this.doc.resetCarets().position(0, 0); },
    'moveToEnd': function() { this.doc.resetCarets().position(this.doc.size() - 1, -1); },
    'moveToLineStart': caretCmd(function(caret) { caret.position(caret.line(), 0); }),
    'moveToLineEnd': caretCmd(function(caret) { caret.position(caret.line(), -1); }),
    'moveWordLeft': function() {},
    'moveWordRight': function() {},
    'selectWord': function() { this.doc.call('match', /\w/); },
    'selectLine': caretCmd(function(caret) {
      var head = caret.head();
      caret.setSelection(p(head.line, 0), p(head.line + 1, 0));
    }),
    'selectAll': function() { this.doc.resetCarets().setSelection(p(this.doc.size(), -1), p(0, 0)); },
    'pageUp': function() { this.doc.call('moveY', -50); },
    'pageDown': function() { this.doc.call('moveY', 50); },
    'scrollToTop': function() { this.dom.wrapper.scrollTop = 0; },
    'scrollToBottom': function() { this.dom.wrapper.scrollTop = this.dom.wrapper.scrollHeight; },
    'scrollToLeft': function() { this.dom.wrapper.scrollLeft = 0; },
    'scrollToRight': function() { this.dom.wrapper.scrollLeft = this.dom.wrapper.scrollWidth; },
    'removeSelection': function() { this.doc.call('removeSelection'); },
    'indent': caretCmd(indent),
    'outdent': caretCmd(outdent),
    'autoIndent': function() {},
    'undo': function() { this.doc.undo(); },
    'redo': function() { this.doc.redo(); },
    'toNextDef': function() {},
    'toPrevDef': function() {},
    'swapUp': caretCmd(function(caret) { swap(this, caret, true); }),
    'swapDown': caretCmd(function(caret) { swap(this, caret, false); }),
    'duplicate': caretCmd(function(caret) {
      var range = caret.getRange(), text = this.substring(p(range.from.line, 0), p(range.to.line, -1));
      caret.clearSelection();
      caret.position(range.to.line, -1).insert('\n' + text);
    }),
    'toggleCounter': function() {
      var ln = this.options.lineNumbers = !this.options.lineNumbers;
      (ln ? removeClass : addClass)(this.dom.counterContainer, 'cp-hidden');
    },
    'toggleIndentGuides': function() {
      var dig = this.options.drawIndentGuides = !this.options.drawIndentGuides;
      (dig ? removeClass : addClass)(this.dom.mainNode, 'cp-without-indentation');
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
    'insertNewLine': function() {
      return this.doc.call('insert', '\n');
      /*var bf = this.caret.textBefore()
      , af = this.caret.textAfter()
      , dl = this.caret.dl()
      , s = this.getStateAt(dl, this.caret.column())
      , parser = s.parser;
      
      if (this.options.autoIndent) {
        var indent = this.getIndentAtLine(dl)
        , rest = '', tw = this.options.tabWidth
        , tmp, mv = 0;
        
        if (parser && parser.indent) {
          var tab = this.options.indentByTabs ? '\t' : repeat(' ', tw)
          , i = parser.indent(s.stream, s.state, s.nextIteration);
          
          if (i instanceof Array) {
            indent = i.shift();
            while (i.length) {
              rest += '\n' + repeat(tab, indent + i.shift());
            }
          } else {
            indent = i >= 0 && 'number' == typeof i ? parseInt(i, 10) : indent;
          }
        }
        tmp = parseIndentation(af, tw);
        tab = repeat(tab, indent);
        if (tmp.indentText && tab.indexOf(tmp.indentText, tab.length - tmp.indentText.length) >= 0) {
          tab = tab.slice(0, mv = -tmp.length);
        }
        this.insertText('\n' + tab + rest, -rest.length - mv);
      } else {
        this.insertText('\n');
      }
      if (parser && parser.afterEnterKey) {
        parser.afterEnterKey.call(this, s.stream, s.state);
      }*/
    },
    'esc': function() {
      this.isFullscreen ? this.exitFullscreen() : this.searchEnd();
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
        return comparePos(changeEnd(a), b.from) === 0 ? 1 : comparePos(a.from, changeEnd({ text: b.removed, from: b.from })) === 0 ? 2 : 0;
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
  
  History = function(doc, stackSize, delay) {
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
      var mode = 'function' == typeof func ? func.apply(CodePrinter, arguments) : func;
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
  
  on(window, 'resize', function() {
    for (var i = 0; i < instances.length; i++) {
      var cp = instances[i];
      cp.doc && cp.doc.updateView();
    }
  });
  CodePrinter.defineMode('plaintext', new CodePrinter.Mode());
  
  function buildDOM(cp) {
    var dom = cp.dom = {};
    dom.mainNode = addClass(document.createElement('div'), 'codeprinter');
    dom.body = create(dom.mainNode, 'div', 'cp-body');
    dom.container = create(dom.body, 'div', 'cp-container');
    dom.input = create(dom.container, 'textarea', 'cp-input');
    dom.counterContainer = create(dom.container, 'div', 'cp-counter');
    dom.counterWrapper = create(dom.counterContainer, 'div', 'cp-counter-wrapper');
    dom.counter = create(dom.counterWrapper, 'ol', 'cp-counter-ol');
    dom.wrapper = create(dom.container, 'div', 'cp-wrapper');
    dom.caretsContainer = create(dom.wrapper, 'div', 'cp-carets');
    dom.screen = create(dom.wrapper, 'div', 'cp-screen');
    dom.code = create(dom.screen, 'div', 'cp-code');
    dom.measure = create(dom.screen, 'div', 'cp-measure');
    dom.measure.appendChild(pre.cloneNode(false));
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
    binding.call(cp, key);
    return true;
  }
  function attachEvents(cp) {
    var wrapper = cp.dom.wrapper
    , input = cp.dom.input
    , options = cp.options
    , sizes = cp.doc.sizes
    , counterSelection = []
    , allowKeyup, activeLine
    , isMouseDown, isScrolling
    , moveEvent, moveselection
    , dblClickTimeout
    , T, T2, T3, fn, cmdPressed, caret;
    
    function onMouse(e) {
      if (e.defaultPrevented || e.which === 3) return false;
      
      var doc = cp.doc
      , wrapper = cp.dom.wrapper
      , b = bounds(wrapper)
      , x = Math.max(0, wrapper.scrollLeft + e.pageX - b.x)
      , y = e.pageY < b.y ? 0 : e.pageY <= b.y + wrapper.offsetHeight ? wrapper.scrollTop + e.pageY - b.y - sizes.paddingTop : wrapper.scrollHeight
      , realY = Math.max(0, Math.min(y, doc.height()))
      , isinactive = document.activeElement !== input
      , measure = doc.measurePosition(x, realY);
      
      cp.focus();
      
      if (e.type === 'mousedown') {
        isMouseDown = Flags.isMouseDown = true;
        
        if (caret = issetSelectionAt(doc.carets, measure.line, measure.column)) {
          Flags.movingSelection = true;
        } else {
          caret = e.metaKey || e.ctrlKey ? doc.createCaret() : doc.resetCarets();
          caret.dispatch(measure);
          if (!Flags.shiftKey || !caret.hasSelection()) caret.beginSelection();
        }
        on(window, 'mousemove', onMouse);
        on(window, 'mouseup', onMouse);
      }
      else if (e.type === 'mousemove') {
        if (Flags.movingSelection) {
          ++Flags.movingSelection;
        } else {
          caret.dispatch(measure);
        }
        moveEvent = e;
        if (e.pageY > b.y && e.pageY < b.y + wrapper.clientHeight) {
          var oH = wrapper.offsetHeight, dh = doc.sizes.defaultHeight
          , i = e.pageY <= b.y + dh ? e.pageY - b.y - dh : e.pageY >= b.y + oH - dh ? e.pageY - b.y - oH + dh : 0;
          
          i && setTimeout(function() {
            if (i && Flags.isMouseDown && moveEvent === e) {
              doc.scrollTo(wrapper.scrollTop + i);
              onMouse.call(wrapper, moveEvent);
            }
          }, 100);
        }
      }
      else if (e.type === 'mouseup') {
        if (Flags.movingSelection > 1) {
          caret.moveSelectionTo(p(measure.line, measure.column));
        } else {
          if (Flags.movingSelection === true) caret.clearSelection();
          caret.dispatch(measure);
        }
        isMouseDown = Flags.isMouseDown = Flags.movingSelection = false;
        
        off(window, 'mousemove', onMouse);
        off(window, 'mouseup', onMouse);
      }
    }
    
    if ('ontouchstart' in window || navigator.msMaxTouchPoints > 0) {
      var x, y;
      on(wrapper, 'touchstart', function(e) {
        y = e.touches[0].screenY;
        x = e.touches[0].screenX;
      });
      on(wrapper, 'touchmove', function(e) {
        if (x != null && y != null) {
          var touch = e.touches[0];
          this.scrollLeft += options.scrollSpeed * (x - (x = touch.screenX));
          cp.doc.scrollTo(this.scrollTop + options.scrollSpeed * (y - (y = touch.screenY)));
          return eventCancel(e);
        }
      });
      on(wrapper, 'touchend', function() { x = y = null; });
    } else if ('onwheel' in window) {
      on(wrapper, 'wheel', function(e) { return wheel(cp.doc, this, e, options.scrollSpeed, e.deltaX, e.deltaY); });
    } else {
      var mousewheel = function(e) {
        var d = wheelDelta(e);
        return wheel(cp.doc, this, e, wheelUnit * options.scrollSpeed, d.x, d.y);
      }
      on(wrapper, 'mousewheel', mousewheel);
      gecko && on(wrapper, 'DOMMouseScroll', mousewheel);
    }
    
    on(wrapper, 'scroll', function(e) {
      if (!cp.doc._lockedScrolling) {
        var st = this.scrollTop;
        cp.dom.counterContainer.scrollTop = st;
        if (cp.doc && cp.doc.scrollTop != st) cp.doc.scrollTo(st);
      } else {
        if (!isScrolling) addClass(wrapper, 'scrolling');
        isScrolling = true;
        cp.emit('scroll');
        T3 = clearTimeout(T3) || setTimeout(function() {
          isScrolling = false;
          removeClass(wrapper, 'scrolling');
          cp.doc && wheelTarget(cp.doc, null);
          cp.emit('scrollend');
        }, 200);
      }
      cp.doc._lockedScrolling = false;
    });
    on(wrapper, 'dblclick', function() {
      var word = caret.match(/\w/);
      var tripleclick = function(e) {
        var head = caret.head();
        caret.setSelection(p(head.line, 0), p(head.line + 1, 0));
        off(this, 'mouseup', tripleclick);
        Flags.waitForTripleClick = Flags.isMouseDown = false;
        dblClickTimeout = clearTimeout(dblClickTimeout);
        return eventCancel(e);
      }
      on(this, 'mouseup', tripleclick);
      Flags.waitForTripleClick = true;
      dblClickTimeout = setTimeout(function() {
        off(wrapper, 'mouseup', tripleclick);
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
    on(wrapper, 'mousedown', onMouse);
    on(wrapper, 'selectstart', function(e) { return eventCancel(e); });
    
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
        if (code !== 67 && code !== 88) this.value = '';
        else return;
      }
      if (options.readOnly && (code < 37 || code > 40)) return;
      cp.emit('['+seq+']', e); cp.emit('keydown', seq, e);
      if (!cp.keyMap[seq] && e.shiftKey) seq = keySequence(e, true);
      if (seq.length > 1 && cp.keyMap[seq]) {
        if (callKeyBinding(cp, cp.keyMap, seq)) return eventCancel(e, 1);
      }
    });
    on(input, 'keypress', function(e) {
      if (options.readOnly) return;
      var code = e.keyCode, ch = String.fromCharCode(code);
      
      if (e.ctrlKey !== true && e.metaKey !== true) {
        cp.doc.eachCaret(function(caret) {
          var a, head = caret.head(), s = this.getState(head), parser = s && s.parser;
          
          if (caret.hasSelection() && (a = parser.selectionWrappers[ch])) {
            'string' === typeof a ? caret.wrapSelection(a, a) : caret.wrapSelection(a[0], a[1]);
          } else if (options.useParserKeyMap && parser.keyMap[ch]) {
            parser.keyMap[ch].call(cp, s.stream, s.state);
          } else {
            caret.insert(ch);
          }
          if (options.autoIndent && parser.isIndentTrigger(ch)) {
            reIndent(this, parser, head);
          }
        });
        return eventCancel(e);
      }
    });
    on(input, 'keyup', function(e) {
      updateFlags(e, false);
      if (options.readOnly) return;
      if (e.keyCode === 8 && e.ctrlKey !== true && e.metaKey !== true) {
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
    
    function counterMousemove(e) {
      var dl = cp.doc.lineWithOffset(wrapper.scrollTop + e.pageY - sizes.bounds.y - sizes.paddingTop);
      if (!dl) return null;
      counterSelection[1] = dl.info().index;
      counterSelDispatch();
    }
    function counterMouseup(e) {
      off(this, 'mousemove', counterMousemove);
      off(this, 'mouseup', counterMouseup);
      counterSelDispatch();
      counterSelection.length = 0;
    }
    function counterSelDispatch() {
      var last = lastV(counterSelection);
      cp.doc.carets[0].setSelection(p(counterSelection[0], 0), p(last + (counterSelection[0] <= last ? 1 : 0), 0));
    }
    on(cp.dom.counter, 'mousedown', function(e) {
      if (e.target.tagName === 'LI') {
        var dl = cp.doc.lineWithOffset(wrapper.scrollTop + e.pageY - (sizes.bounds = sizes.bounds || bounds(wrapper)).y - sizes.paddingTop);
        if (!dl) return null;
        counterSelection[0] = dl.info().index;
        counterSelDispatch();
        cp.dom.input.focus();
        on(window, 'mousemove', counterMousemove);
        on(window, 'mouseup', counterMouseup);
        return eventCancel(e);
      }
    });
  }
  function checkOptions(cp, options) {
    var addons = options.addons, dom = cp.dom;
    cp.setTheme(options.theme);
    if (options.fontFamily !== CodePrinter.defaults.fontFamily) dom.container.style.fontFamily = options.fontFamily;
    options.lineNumbers ? cp.openCounter() : cp.closeCounter();
    options.drawIndentGuides || addClass(dom.mainNode, 'cp-without-indentation');
    options.legacyScrollbars && addClass(dom.wrapper, 'cp-legacy-scrollbars');
    options.tabWidth && cp.setTabWidth(options.tabWidth);
    options.lineWrapping && cp.setLineWrapping(true);
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
    return 'string' == typeof source ? source : '';
  }
  function r(from, to) {
    return { from: copy(from), to: copy(to) };
  }
  function p(line, column) {
    return { line: line, column: column };
  }
  function isPos(pos) {
    return pos && 'number' === typeof pos.line && 'number' === typeof pos.column;
  }
  function comparePos(a, b) {
    return a.line - b.line || a.column - b.column;
  }
  function nPos(doc, line, column) {
    var pos = column !== undefined ? p(line, column) : copy(line), size = doc.size();
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
  }
  function getRangeOf(a, b) {
    return a ? comparePos(a, b) < 0 ? r(a, b) : r(b, a) : r(b, b);
  }
  function updateFlags(event, down) {
    var code = event.keyCode;
    Flags.keyCode = down ? code : 0;
    Flags.ctrlKey = code === 18 ? down : event.ctrlKey;
    Flags.shiftKey = code === 16 ? down : event.shiftKey;
    Flags.metaKey = [91,92,93,224].indexOf(code) >= 0 ? down : event.metaKey;
    Flags.altKey = code === 19 ? down : event.altKey;
    Flags.cmdKey = macosx ? Flags.metaKey : Flags.ctrlKey;
    Flags.isKeyDown = Flags.ctrlKey | Flags.shiftKey | Flags.metaKey | Flags.altKey | Flags.keyCode > 0;
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
    if (y) doc.scrollTo(node.scrollTop + speed * y);
    if (x) { doc._lockedScrolling = true; node.scrollLeft += speed * x; }
    return eventCancel(e);
  }
  function wheelTarget(doc, wt) {
    if (doc.wheelTarget != wt) {
      if (wt && wt.style.display == 'none') wt.parentNode.removeChild(wt);
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
  function heightOfLines(view) {
    var h = 0;
    for (var i = 0; i < view.length; i++) h += view[i].height;
    return h;
  }
  function scroll(doc, delta) {
    doc.sizes.scrollTop = Math.max(0, doc.sizes.scrollTop + delta);
    doc.dom.code.style.top = doc.sizes.scrollTop + 'px';
    doc.dom.counter.style.top = doc.sizes.scrollTop + 'px';
  }
  function scrollTo(doc, st) {
    doc.scrollTop = st;
    doc.dom.counterContainer.scrollTop = st;
    doc.dom.wrapper.scrollTop = st;
  }
  function scrollBy(doc, delta) {
    doc.scrollTop += delta;
    doc.dom.counterContainer.scrollTop += delta;
    doc.dom.wrapper.scrollTop += delta;
  }
  function defaultFormatter(i) { return i; }
  function getLineClasses(line) { return line.classes ? line.classes.join(' ') : ''; }
  function init(dl, node, counter) {
    dl.node = pre.cloneNode(false);
    dl.counter = li.cloneNode(false);
    dl.counter.appendChild(document.createTextNode(''));
    dl.counter.style.height = dl.height + 'px';
  }
  function touch(dl) {
    if (dl.node) {
      var cls = getLineClasses(dl);
      dl.node.className = cls;
      dl.counter.className = cls;
    }
  }
  function captureNode(dl, c) {
    var co = c.counter;
    if (c.node) dl.node = deleteNode(c);
    if (co) dl.counter = deleteCounter(c);
    if (c.height != dl.height) co.style.height = dl.height + 'px';
  }
  function deleteNode(dl) {
    var node = dl.node;
    if (node) node.className = '';
    dl.node = undefined;
    return node;
  }
  function deleteCounter(dl) {
    var counter = dl.counter;
    if (counter) counter.className = '';
    dl.counter = undefined;
    return counter;
  }
  function maybeExternalMeasure(doc, dl) {
    return dl.node || externalMeasure(doc, dl);
  }
  function externalMeasure(doc, dl) {
    var o = dl.node, n = dl.node = doc.dom.measure.firstChild;
    parse(doc, dl); dl.node = o;
    return n;
  }
  function clearMeasures(dom) {
    dom.screen.style.minWidth = '';
    dom.measure.firstChild.innerHTML = '';
  }
  function calcCharWidth(node) {
    var s = cspan(null, 'A'), cw;
    node.appendChild(s); cw = s.offsetWidth; node.removeChild(s);
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
  function bounds(n) {
    var x = 0, y = 0;
    do { x += n.offsetLeft; y += n.offsetTop; } while (n = n.offsetParent);
    return { x: x, y: y };
  }
  function parseEventArguments(a, b) {
    if ('string' == typeof a) { var obj = {}; obj[a] = b; return obj; }
    return a;
  }
  if (window.postMessage) {
    async = function(callback) {
      if ('function' == typeof callback) {
        asyncQueue.push(callback);
        window.postMessage('CodePrinter', '*');
      }
    }
    on(window, 'message', function(e) { if (e && e.data === 'CodePrinter' && asyncQueue.length) (asyncQueue.shift())(); });
  } else {
    async = function(callback) { 'function' == typeof callback && setTimeout(callback, 1); }
  }
  
  if ('object' === typeof module) module.exports = CodePrinter;
  if ('function' === typeof define) define('CodePrinter', function() { return CodePrinter; });
  if (window) window.CodePrinter = CodePrinter;
}.call(this));
