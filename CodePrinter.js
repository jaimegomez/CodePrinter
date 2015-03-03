/*
 * CodePrinter.js
 *
 * Copyright (C) 2013-2015 Tomasz Sapeta (@tsapeta)
 * Released under the MIT License.
 *
 * author:  Tomasz Sapeta
 * version: 0.7.2
 * source:  https://github.com/tsapeta/CodePrinter
 */

"use strict";

(window.define || function() { arguments[2]($ || env); })('CodePrinter', ['env'], function($) {
  var CodePrinter, Data, Branch, Line
  , Caret, Document, Stream, ReadStream
  , History, Selection, keyMap
  , commands, lineendings
  , div, li, pre, span
  , BRANCH_OPTIMAL_SIZE = 50
  , BRANCH_HALF_SIZE = 25
  , wheelUnit = $.browser.webkit ? -1/3 : $.browser.firefox ? 5 : $.browser.ie ? -0.53 : null
  , offsetDiff, activeClassName = 'cp-active-line', zws = '\u200b', eol = /\r\n?|\n/;
  
  $.require.registerNamespace('CodePrinter', 'mode/');
  $.require.registerNamespace('CodePrinter/addons', 'addons/');
  
  CodePrinter = function(source, options) {
    if (arguments.length === 1 && source == '[object Object]') {
      options = source;
      source = null;
    }
    options = this.options = $.extend({}, CodePrinter.defaults, options);
    buildDOM(this);
    this.prepare();
    this.parser = new CodePrinter.Mode();
    
    if (source && source.nodeType) {
      if (source.parentNode) source.parentNode.insertBefore(this.mainNode, source);
      this.doc.init((source.tagName == 'TEXTAREA' ? source.value : source.innerHTML).decode());
    } else {
      this.doc.init('string' == typeof source ? source : '');
    }
    CodePrinter.instances.push(this);
    return this.print();
  }
  
  CodePrinter.version = '0.7.2';
  
  CodePrinter.defaults = {
    path: '',
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
    caretHeight: 1,
    viewportMargin: 80,
    keyupInactivityTimeout: 1500,
    scrollSpeed: 1,
    autoCompleteDelay: 200,
    historyStackSize: 100,
    historyDelay: 1000,
    firstLineNumber: 1,
    lineNumbers: true,
    lineNumberFormatter: false,
    lineWrapping: false,
    autoComplete: false,
    autoFocus: false,
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
    insertClosingBrackets: true,
    insertClosingQuotes: true,
    useParserKeyMap: true,
    tabTriggers: true,
    shortcuts: true,
    disableThemeClassName: false
  }
  
  div = document.createElement('div');
  li = document.createElement('li');
  pre = document.createElement('pre');
  span = document.createElement('span');
  
  CodePrinter.prototype = {
    isFullscreen: false,
    prepare: function() {
      if (this.doc) return;
      var cp = this
      , wrapper = this.wrapper
      , options = this.options
      , addons = options.addons
      , lastScrollTop = 0, counterSelection = []
      , sizes, allowKeyup, activeLine
      , isMouseDown, isScrolling
      , moveevent, moveselection
      , T, T2, T3, T4, fn;
      
      if (options.fontFamily !== CodePrinter.defaults.fontFamily) {
        this.container.style.fontFamily = options.fontFamily;
      }
      
      this.mainNode.CodePrinter = this;
      sizes = this.sizes = { scrollTop: 0, paddingTop: 5, paddingLeft: 10 };
      this.caret = new Caret(cp);
      this.doc = new Document(this);
      this.keyMap = new keyMap;
      this.setTheme(options.theme);
      this.setMode(options.mode);
      
      options.lineNumbers ? this.openCounter() : this.closeCounter();
      options.drawIndentGuides || this.mainNode.addClass('cp-without-indentation');
      options.legacyScrollbars && this.wrapper.addClass('cp-legacy-scrollbars');
      options.tabWidth && this.setTabWidth(options.tabWidth);
      options.lineWrapping && this.setLineWrapping(true);
      options.width !== 'auto' && this.setWidth(options.width);
      options.height !== 300 && this.setHeight(options.height);
      options.fontSize !== 12 && this.setFontSize(options.fontSize);
      
      if (addons) {
        if (addons instanceof Array) {
          for (var i = 0; i < addons.length; i++) {
            this.initAddon(addons[i]);
          }
        } else {
          for (var k in addons) {
            this.initAddon(k, addons[k]);
          }
        }
      }
      options.shortcuts && this.initAddon('shortcuts');
      options.autoComplete && this.initAddon('hints');
      
      function mouseController(e) {
        if (e.defaultPrevented) return false;
        
        var doc = cp.doc
        , sl = cp.wrapper.scrollLeft
        , st = cp.wrapper.scrollTop
        , o = sizes.bounds = sizes.bounds || wrapper.bounds()
        , x = Math.max(0, sl + e.pageX - o.x)
        , y = e.pageY < o.y ? 0 : e.pageY <= o.y + wrapper.clientHeight ? st + e.pageY - o.y - sizes.paddingTop : wrapper.scrollHeight
        , ry = Math.max(0, Math.min(y, doc.height()))
        , isinactive = document.activeElement !== cp.input;
        
        cp.input.focus();
        cp.caret.target(x, ry);
        var l = cp.caret.line(), c = cp.caret.column();
        
        if (e.type === 'mousedown') {
          isMouseDown = true;
          if (doc.inSelection(l, c) && ry === y && (x - 3 <= cp.caret.offsetX() || doc.inSelection(l, c+1))) {
            moveselection = true;
            window.on('mousemove', mouseController);
            window.once('mouseup', function(e) {
              window.off('mousemove', mouseController);
              if (moveselection > 1) {
                var savedpos = cp.caret.savePosition();
                if (moveselection && doc.issetSelection() && !doc.inSelection(savedpos[0], savedpos[1])) {
                  var selection = doc.getSelection()
                  , sel = doc.getSelectionRange()
                  , isbf = cp.cursorIsBeforePosition(sel.start.line, sel.start.column);
                  
                  cp.caret.position(sel.end.line, sel.end.column);
                  if (!isbf) {
                    savedpos[0] -= sel.end.line - sel.start.line;
                  }
                  !e.altKey && doc.removeSelection();
                  cp.caret.restorePosition(savedpos);
                  cp.insertSelectedText(selection);
                } else {
                  doc.clearSelection();
                  mouseController(arguments[0]);
                }
              } else {
                isinactive || doc.clearSelection();
                cp.input.focus();
              }
              return isMouseDown = moveselection = e.cancel();
            });
          } else {
            cp.input.value = '';
            cp.caret.deactivate().show();
            if (y > ry) cp.caret.position(l, -1);
            else if (y < 0) cp.caret.position(l, 0);
            
            doc.beginSelection();
            window.on('mousemove', mouseController);
            window.once('mouseup', function(e) {
              !doc.issetSelection() && doc.clearSelection();
              window.off('mousemove', mouseController);
              cp.caret.activate();
              sizes.bounds = moveevent = null;
              document.activeElement != cp.input && ($.browser.firefox ? $.async(function() { cp.input.focus() }) : cp.input.focus());
              return isMouseDown = e.cancel();
            });
          }
          cp.emit('click');
        } else if (!moveselection) {
          moveevent = e;
          doc.endSelection();
          
          if (e.pageY > o.y && e.pageY < o.y + wrapper.clientHeight) {
            var oH = wrapper.offsetHeight
            , i = (e.pageY <= o.y + 25 ? e.pageY - o.y - 25 : e.pageY >= o.y + oH - 25 ? e.pageY - o.y - oH + 25 : 0);
            
            i && setTimeout(function() {
              if (i && !moveselection && isMouseDown && moveevent === e) {
                doc.scrollTo(wrapper.scrollTop + i);
                mouseController.call(wrapper, moveevent);
              }
            }, 50);
          }
        } else {
          ++moveselection;
        }
      }
      
      if ('ontouchstart' in window || navigator.msMaxTouchPoints > 0) {
        var x, y;
        this.wrapper.listen({
          touchstart: function(e) {
            y = e.touches[0].screenY;
            x = e.touches[0].screenX;
          },
          touchmove: function(e) {
            if (x != null && y != null) {
              var touch = e.touches[0];
              this.scrollLeft += options.scrollSpeed * (x - (x = touch.screenX));
              cp.doc.scrollTo(this.scrollTop + options.scrollSpeed * (y - (y = touch.screenY)));
              return e.cancel(true);
            }
          },
          touchend: function() { x = y = null; }
        });
      } else if ('onwheel' in window) {
        this.wrapper.addEventListener('wheel', function(e) { return wheel(cp.doc, this, e, options.scrollSpeed, e.deltaX, e.deltaY); }, false);
      } else {
        var mousewheel = function(e) {
          var d = wheelDelta(e);
          return wheel(cp.doc, this, e, wheelUnit * options.scrollSpeed, d.x, d.y);
        }
        this.wrapper.listen({ mousewheel: mousewheel, DOMMouseScroll: mousewheel });
      }
      
      wrapper.listen({
        scroll: function(e) {
          if (!this._lockedScrolling) {
            cp.doc.scrollTo(cp.counter.scrollTop = this.scrollTop);
          } else {
            if (!isScrolling) wrapper.addClass('scrolling');
            isScrolling = true;
            cp.emit('scroll');
            T4 = clearTimeout(T4) || setTimeout(function() {
              isScrolling = false;
              wrapper.removeClass('scrolling');
              cp.emit('scrollend');
            }, 200);
          }
          this._lockedScrolling = false;
        },
        contextmenu: function(e) {
          return e.cancel();
        },
        dblclick: function() {
          var bf = cp.caret.textBefore()
          , af = cp.caret.textAfter()
          , line = cp.caret.line()
          , c = cp.caret.column()
          , l = 1, r = 0, rgx, timeout;
          
          var tripleclick = function() {
            cp.doc.setSelectionRange(line, 0, line+1, 0);
            cp.caret.position(line+1, 0);
            this.unlisten('click', tripleclick);
            timeout = clearTimeout(timeout);
          }
          this.listen({ 'click': tripleclick });
          timeout = setTimeout(function() { wrapper.unlisten('click', tripleclick); }, 350);
          
          rgx = bf[c-l] == ' ' || af[r] == ' ' ? /\s/ : !isNaN(bf[c-l]) || !isNaN(af[r]) ? /\d/ : /^\w$/.test(bf[c-l]) || /^\w$/.test(af[r]) ? /\w/ : /[^\w\s]/;
          
          while (l <= c && rgx.test(bf[c-l])) l++;
          while (r < af.length && rgx.test(af[r])) r++;
          
          if (c-l+1 != c+r) {
            cp.doc.setSelectionRange(line, c-l+1, line, c+r);
          }
        },
        mousedown: mouseController
      });
      
      this.input.listen({
        focus: function() {
          cp.caret.focus();
          cp.mainNode.removeClass('inactive');
          cp.emit('focus');
        },
        blur: function() {
          if (isMouseDown) {
            this.focus();
          } else {
            cp.caret.blur();
            cp.mainNode.addClass('inactive');
            if (options.abortSelectionOnBlur) cp.doc.clearSelection();
            cp.emit('blur');
          }
        },
        keydown: function(e) {
          var kc, code = e.getCharCode()
          , ch = String.fromCharCode(code)
          , iscmd = $.browser.macosx ? e.metaKey : e.ctrlKey
          , kc = e.getKeyCombination(1, ' ');
          
          cp.caret.deactivate().show();
          allowKeyup = true;
          
          if (iscmd) {
            if (cp.doc.issetSelection() && kc.indexOf(' ') === -1) {
              this.value = cp.doc.getSelection();
              this.setSelectionRange(0, this.value.length);
            } else if (commands[ch]) {
              allowKeyup = commands[ch].call(cp, e, code, ch);
              if (allowKeyup === false) e.cancel();
              return allowKeyup;
            } else {
              this.value = '';
            }
          }
          if (options.readOnly && (code < 37 || code > 40)) return;
          if (!cp.keyMap[kc] && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
            kc = e.getKeyCombination(4, ' ');
          }
          cp.emit('@'+kc, e);
          cp.emit('keydown', e);
          if ((allowKeyup = !e.defaultPrevented) && kc.length > 1 && (!e.ctrlKey || options.shortcuts) && cp.keyMap[kc]) {
            allowKeyup = cp.keyMap[kc].call(cp, e, code, kc);
          }
          if (!allowKeyup || 16 <= code && code <= 20 || 91 <= code && code <= 95 || 112 <= code && code <= 145 || code == 224) {
            return allowKeyup = e.cancel();
          }
          return allowKeyup;
        },
        keypress: function(e) {
          if (options.readOnly) return;
          var a, code = e.getCharCode()
          , s = cp.getStateAt(cp.caret.dl(), cp.caret.column())
          , parser = s && s.parser
          , ch = String.fromCharCode(code);
          
          if (allowKeyup > 0 && e.ctrlKey != true && e.metaKey != true) {
            if (cp.doc.issetSelection() && (a = parser.selectionWrappers[ch])) {
              'string' === typeof a ? cp.doc.wrapSelection(a, a) : cp.doc.wrapSelection(a[0], a[1]);
              allowKeyup = false;
            } else if (options.useParserKeyMap && parser.keyMap[ch]) {
              allowKeyup = parser.keyMap[ch].call(cp, s.stream, s.state);
            }
            if (allowKeyup !== false) {
              this.value = '';
              if (cp.keyMap[ch] ? cp.keyMap[ch].call(cp, e, code, ch) !== false : true) cp.insertText(ch);
              if (T3) T3 = clearTimeout(T3);
              if (options.autoComplete && cp.hints) {
                var isdigit = /^\d+$/.test(ch);
                if ((!isdigit && cp.hints.match(ch)) || parser.isAutoCompleteTrigger(ch)) T3 = setTimeout(function() { cp.hints.show(false); }, options.autoCompleteDelay);
                else if (!isdigit) cp.hints.hide();
              }
            }
            if (options.autoIndent && parser.isIndentTrigger(ch)) {
              fixIndent(cp, parser, -ch.length);
            }
            return e.cancel();
          }
        },
        keyup: function(e) {
          if (options.readOnly) return;
          if (cp.caret.isVisible) cp.caret.activate();
          if ((e.keyCode == 8 || allowKeyup > 0) && e.ctrlKey != true && e.metaKey != true) {
            this.value.length && cp.insertText(this.value);
            T = clearTimeout(T) || setTimeout(function() { runBackgroundParser(cp, cp.parser); }, options.keyupInactivityTimeout);
          }
          this.value = '';
          cp.emit('keyup', e);
        },
        input: function(e) {
          if (!options.readOnly && this.value.length) {
            cp.insertText(this.value);
            this.value = '';
          }
        }
      });
      
      this.select = function(dl) {
        this.unselect();
        if (options.highlightCurrentLine && !moveselection && !cp.doc.issetSelection() && this.caret.isVisible && dl && dl.node && dl.counter) {
          dl.node.addClass(activeClassName);
          dl.counter.addClass(activeClassName);
          dl.active = true;
          activeLine = dl;
        }
      }
      this.unselect = function() {
        if (activeLine && activeLine.node) {
          activeLine.node.removeClass(activeClassName);
          activeLine.counter.removeClass(activeClassName);
          activeLine.active = undefined;
        }
        activeLine = null;
      }
      
      this.caret.on({
        move: function(x, y, dl, line, column) {
          if (options.autoScroll) {
            var pl = sizes.paddingLeft, pt = sizes.paddingTop
            , sl = wrapper.scrollLeft, st = wrapper.scrollTop
            , cw = wrapper.clientWidth, ch = wrapper.clientHeight
            , h = dl.height;
            
            if (x - pl < sl) {
              sl = x - pl;
            } else if (x + pl >= cw + sl) {
              sl = x + pl - cw;
            }
            wrapper.scrollLeft = sl;
            if (Math.abs(y - st) > ch) {
              if (y < ch / 2) {
                st = 0;
              } else {
                st = y - ch / 2;
              }
            } else {
              if (y < st + h) {
                st = y - h - pt;
              } else if (y + 2 * h >= ch + st) {
                st = y + 2 * h + pt - ch;
              }
            }
            cp.doc.scrollTo(st);
            cp.counter.firstChild.scrollTop = st;
          }
          if (options.matching) {
            var m = getMatchingObject(cp.parser.matching);
            if (m) {
              var a, b, cur, bf = this.textBefore(), af = this.textAfter();
              for (var s in m) {
                var len = s.length, i = 0;
                do {
                  a = len == i || bf.endsWith(s.substring(0, len - i));
                  b = af.startsWith(s.substring(len - i, len));
                } while ((!a || !b) && ++i <= len);
                if (a && b) {
                  matchingHelper(cp, s, m[s], line, column - len + i, column + i);
                  break;
                }
              }
              if ((!a || !b) && cp.highlightOverlay) cp.highlightOverlay.remove();
            }
          }
          cp.emit('caretMoved', line, column);
        }
      });
      
      function counterMousemove(e) {
        var min, max, range
        , b = sizes.bounds
        , dl = cp.doc.lineWithOffset(wrapper.scrollTop + e.pageY - b.y - sizes.paddingTop);
        if (dl) {
          counterSelection[1] = dl.info().index;
          min = Math.min.apply(Math, counterSelection);
          max = Math.max.apply(Math, counterSelection);
          cp.doc.setSelectionRange(min, 0, max + 1, 0);
          if (range = cp.doc.getSelectionRange()) {
            var tmp = min === counterSelection[0] ? range.end : range.start;
            cp.caret.position(tmp.line, tmp.column);
          }
        }
      }
      function counterMouseup(e) {
        this.removeEventListener('mousemove', counterMousemove);
        this.removeEventListener('mouseup', counterMouseup);
        
        if (counterSelection.length === 1) {
          var range, min = counterSelection[0];
          cp.doc.setSelectionRange(min, 0, min + 1, 0);
          if (range = cp.doc.getSelectionRange()) cp.caret.position(range.end.line, range.end.column);
        }
        counterSelection.length = 0;
        isMouseDown = false;
      }
      
      this.counter.delegate('li', 'mousedown', function(e) {
        var b = sizes.bounds = sizes.bounds || wrapper.bounds()
        , dl = cp.doc.lineWithOffset(wrapper.scrollTop + e.pageY - b.y - sizes.paddingTop);
        if (dl) {
          counterSelection[0] = dl.info().index;
          cp.input.focus();
          isMouseDown = true;
          window.addEventListener('mousemove', counterMousemove, false);
          window.addEventListener('mouseup', counterMouseup, false);
        }
      });
    },
    print: function(mode, source) {
      mode && this.setMode(mode);
      mode = this.options.mode;
      source && this.doc.init(source);
      
      function callback(ModeObject) {
        var b = !this.parser;
        this.defineParser(ModeObject);
        this.doc.fill();
        runBackgroundParser(this, ModeObject, true);
        if (this.options.autoFocus) {
          this.input.focus();
          this.caret.position(0, 0);
        }
        if (b) {
          this.sizes.paddingTop = parseInt(this.wrapper.querySelector('.cp-codelines').getStyle('padding-top'), 10) || 5;
          $.async(this.emit.bind(this, 'ready'));
        }
      }
      
      if (this.parser && this.parser.name === mode) {
        callback.call(this, this.parser);
      } else if (mode == 'plaintext' && !this.parser) {
        callback.call(this, new CodePrinter.Mode());
      } else {
        CodePrinter.requireMode(mode, callback, this);
      }
      return this;
    },
    createDocument: function() {
      return new Document(this);
    },
    setDocument: function(doc) {
      if (doc instanceof Document) {
        var old = this.doc && this.doc.detach();
        this.doc = doc.attach(this);
        this.emit('documentChanged');
        this.print();
        return old;
      }
    },
    initAddon: function(addon, options) {
      var cp = this;
      CodePrinter.requireAddon(addon, function(construct) {
        new construct(cp, options);
      });
    },
    intervalIterate: function(callback, onend, options) {
      if (!(onend instanceof Function) && arguments.length === 2) options = onend;
      var that = this, dl = this.doc.get(0), fn
      , index = 0, offset = 0, queue = 500;
      
      if (options) {
        if (options.queue) queue = options.queue;
        if (options.index) index = options.index;
        if ('number' === typeof options.start) dl = this.doc.get(index = options.start);
        else if (options.start instanceof Line) {
          dl = options.start;
          if (!options.index) index = dl.info().index;
        }
      }
      
      $.async(fn = function() {
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
        $.async(fn);
      });
    },
    defineParser: function(parser) {
      if (parser instanceof CodePrinter.Mode && this.parser !== parser) {
        var dl = this.doc.get(0);
        do dl.cache = dl.state = null; while (dl = dl.next());
        this.parser = parser;
      }
    },
    parse: function(dl, stateBefore) {
      if (dl != null) {
        var state = stateBefore, tmp = dl
        , tw = this.options.tabWidth;
        
        if (state === undefined) {
          var s = searchLineWithState(this.parser, tmp, tw);
          state = s.state;
          tmp = s.line;
        } else {
          state = state ? copyState(state) : this.parser.initialState();
        }
        for (; tmp; tmp = tmp.next()) {
          var frag = tmp.node ? document.createDocumentFragment() : null
          , ind = parseIndentation(tmp.text, tw, frag)
          , stream = new Stream(ind.rest, { indentation: ind.indentation });
          
          if (frag) {
            if (tmp.cache) {
              restoreFromCache(ind.rest, tmp.cache, frag);
              state = tmp.state;
            } else if (ind.rest) {
              tmp.cache = parse(this, this.parser, stream, state, frag);
            } else if (ind.length == 0) {
              frag.appendChild(document.createTextNode(zws));
              tmp.cache = null;
            }
            rm(tmp.node);
            tmp.node.appendChild(frag);
          } else {
            tmp.cache = fastParse(this, this.parser, stream, state);
          }
          if (stream.definition) tmp.definition = stream.definition;
          else if (tmp.definition) tmp.definition = undefined;
          tmp.state = state;
          if (tmp == dl) break;
          state = copyState(state); 
        }
      }
      return dl;
    },
    getStateAt: function(line, column) {
      var dl = 'number' === typeof line ? this.doc.get(line) : line;
      if (dl != null) {
        var s = searchLineWithState(this.parser, dl, this.options.tabWidth)
        , state = s.state, tmp = s.line;
        for (; tmp; tmp = tmp.next()) {
          var ind = parseIndentation(tmp.text, this.options.tabWidth)
          , stream = new Stream(ind.rest, { indentation: ind.indentation });
          if (tmp == dl) {
            var cache = fastParse(this, this.parser, stream, state, Math.max(0, Math.min(column - (tmp.text.length - ind.rest.length), stream.length)));
            cache = cache[cache.length-1];
            if (stream.eol()) tmp.state = state;
            return { stream: stream, state: state, style: cache && cache.style, parser: state.parser || this.parser };
          } else {
            state = copyState(tmp.state = state);
          }
        }
      }
    },
    getStyleAt: function(line, column, split) {
      var s = this.getStateAt(line, column);
      return s && (split ? s.style && s.style.split(' ') : s.style);
    },
    getCurrentParser: function(cp) {
      var s = this.getStateAt(this.caret.dl() || 0, this.caret.column());
      return s && s.parser;
    },
    focus: function() {
      $.async(this.input.focus.bind(this.input));
    },
    requireStyle: function(style, callback) {
      $.include($.pathJoin(this.options.path, 'theme', style+'.css'), callback);
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
        this.tabString = ' '.repeat(tw);
        this.doc && this.doc.initialized && runBackgroundParser(this, this.parser);
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
      lw ? this.mainNode.addClass('cp-line-wrapping') : this.mainNode.removeClass('cp-line-wrapping');
      this.doc.updateView();
    },
    setTheme: function(name, dontrequire) {
      typeof name === 'string' && name !== 'default' ? dontrequire != true && this.requireStyle(name) : name = 'default';
      if (!this.options.disableThemeClassName) {
        this.mainNode.removeClass('cps-'+this.options.theme.replace(' ', '-').toLowerCase()).addClass('cps-'+name.replace(' ', '-').toLowerCase());
      }
      this.options.theme = name;
      return this;
    },
    setMode: function(mode) {
      mode = CodePrinter.aliases[mode] || mode || 'plaintext';
      this.mainNode.removeClass('cp-'+this.options.mode.replace(/\+/g, 'p').toLowerCase()).addClass('cp-'+mode.replace(/\+/g, 'p').toLowerCase());
      this.options.mode = mode;
      return this;
    },
    setSyntax: function(mode) {
      var oldMode = this.options.mode;
      this.setMode(mode);
      if (oldMode != this.options.mode) {
        this.print();
      }
      return this;
    },
    setFontSize: function(size) {
      if ('number' === typeof size && this.options.minFontSize <= size && size <= this.options.maxFontSize) {
        var i = 0, doc = this.doc;
        this.container.style.fontSize = (this.options.fontSize = size) + 'px';
        doc.updateDefaultHeight();
        
        if (doc.initialized) {
          doc.fill();
          doc.updateHeight().updateView().showSelection();
          doc.updateScroll();
          this.caret.refresh();
          this.emit('fontSizeChanged', size);
        }
      }
      return this;
    },
    increaseFontSize: function() { this.setFontSize(this.options.fontSize+1); },
    decreaseFontSize: function() { this.setFontSize(this.options.fontSize-1); },
    setWidth: function(size) {
      if (size == 'auto') {
        this.mainNode.style.removeProperty('width');
      } else {
        this.mainNode.style.width = (this.options.width = parseInt(size)) + 'px';
      }
      this.emit('widthChanged');
      return this;
    },
    setHeight: function(size) {
      if (size == 'auto') {
        this.body.style.removeProperty('height');
        this.mainNode.addClass('cp-auto-height');
      } else {
        this.body.style.height = (this.options.height = parseInt(size, 10)) + 'px';
        this.mainNode.removeClass('cp-auto-height');
      }
      this.emit('heightChanged');
      return this;
    },
    showIndentation: function() {
      this.options.drawIndentGuides = true;
      this.mainNode.removeClass('cp-without-indentation');
    },
    hideIndentation: function() {
      this.options.drawIndentGuides = false;
      this.mainNode.addClass('cp-without-indentation');
    },
    getLineEnding: function() {
      return lineendings[this.options.lineEndings] || this.options.lineEndings || lineendings['LF'];
    },
    getCurrentLine: function() {
      return this.caret.line();
    },
    setCursorPosition: function(line, column) {
      var dl, l, o, t;
      if (line < 0) {
        l = this.doc.size();
        line = l + line % l;
      }
      if (column == null) column = 0;
      if (column < 0) {
        t = dl.text;
        column = t.length + column % t.length + 1;
      }
      this.caret.position(line, column);
      this.focus();
    },
    getTextAtLine: function(line) {
      var dl = this.doc.get(line < 0 ? this.doc.size() + line : line);
      return dl ? dl.text : '';
    },
    getIndentAtLine: function(dl) {
      dl = dl instanceof Line ? dl : this.doc.get(dl);
      if (dl) {
        var i = -1, text = dl.text
        , tw = this.options.tabWidth
        , sp = 0, ind = 0;
        
        while (++i < text.length) {
          if (text[i] == ' ') {
            ++sp;
            if (sp == tw) {
              ++ind;
              sp = 0;
            }
          } else if (text[i] == '\t') {
            ++ind;
          } else {
            break;
          }
        }
        return ind;
      }
      return 0;
    },
    setIndentAtLine: function(line, indent, dl) {
      indent = Math.max(0, indent);
      var old, diff;
      if (line instanceof Line) {
        dl = line;
        line = dl.info().index;
      } else if ('number' === typeof line && !dl) {
        dl = this.doc.get(line);
      }
      if (dl) {
        old = this.getIndentAtLine(dl);
        diff = indent - old;
        if (diff) {
          var tab = tabString(this);
          dl.setText(tab.repeat(indent) + dl.text.replace(/^\s*/g, ''));
          var sp = RegExp.lastMatch.length;
          this.parse(dl);
          if (this.caret.line() == line) {
            this.caret.moveX(tab.length * indent - sp);
          } else {
            this.caret.refresh();
          }
          this.emit('changed', { line: line, column: 0, text: tab.repeat(Math.abs(diff)), added: diff > 0 });
        }
      }
      return indent;
    },
    indent: function(line) {
      var range;
      if ('number' == typeof line || !(range = this.doc.getSelectionRange())) {
        line = line >= 0 ? line : this.caret.line();
        var dl = this.doc.get(line), tab = tabString(this);
        if (dl) {
          var i = tab == '\t' ? 1 : tab.length;
          dl.text = tab + dl.text;
          this.parse(dl);
          this.caret.line() == line && this.caret.moveX(i);
          this.emit('changed', { line: line, column: 0, text: tab, added: true });
          return i;
        }
      } else {
        var i = range.start.line, l = range.end.line
        , m = this.indent(i);
        if (m > 0) range.start.column += m;
        while (++i <= l) m = this.indent(i);
        if (m > 0) range.end.column += m;
        this.doc.setSelectionRange(range);
      }
      return 0;
    },
    unindent: function(line) {
      var range;
      if ('number' == typeof line || !(range = this.doc.getSelectionRange())) {
        line = line >= 0 ? line : this.caret.line();
        var dl = this.doc.get(line), change, i = 1;
        if (dl) {
          if (dl.text[0] == '\t') {
            dl.text = dl.text.substr(1);
            change = '\t';
          } else if (dl.text[0] == ' ') {
            while (dl.text[i] == ' ' && i < this.options.tabWidth) ++i;
            dl.text = dl.text.substr(i);
            change = ' '.repeat(i);
          }
          if (change) {
            this.parse(dl);
            if (this.caret.line() == line) {
              var col = this.caret.column();
              this.caret.moveX(Math.max(-col, change == '\t' ? -1 : -i));
            }
            this.emit('changed', { line: line, column: 0, text: change, added: false });
            return i;
          }
        }
      } else {
        var i = range.start.line, l = range.end.line
        , m = this.unindent(i);
        if (m > 0) range.start.column -= m;
        while (++i <= l) m = this.unindent(i);
        if (m > 0) range.end.column -= m;
        this.doc.setSelectionRange(range);
      }
      return 0;
    },
    getNextLineIndent: function(line) {
      var indent = this.getIndentAtLine(line);
      return nextLineIndent(this, indent, line);
    },
    fixIndents: function() {
      var range = this.doc.getSelectionRange()
      , dl = this.doc.get(0)
      , parser = this.parser
      , i = 0, end = null, s;
      
      if (range) {
        dl = this.doc.get(Math.max(0, range.start.line - 1));
        end = this.doc.get(range.end.line + 1);
      } else {
        this.setIndentAtLine(0, i, dl);
      }
      
      for (;;) {
        s = this.getStateAt(dl, dl.text.length);
        parser = s.state && s.state.parser || this.parser;
        i = s.stream.indentation + parser.indent(s.stream, s.state);
        dl = dl.next();
        if (dl != end) {
          s = this.getStateAt(dl, 0);
          parser = s.state && s.state.parser || this.parser;
          s.stream.indentation = i;
          i = parser.indent(s.stream, s.state);
          this.setIndentAtLine(dl, i);
        } else {
          break;
        }
      }
    },
    toggleComment: function() {
      if (this.parser && this.parser.lineComment) {
        var start, end, line, sm, insert
        , comment = this.parser.lineComment
        , range = this.doc.getSelectionRange();
        
        if (range) {
          start = range.start.line;
          end = range.end.line;
        } else {
          start = end = this.caret.line();
        }
        for (var line = end; line >= start; line--) {
          var text = this.getTextAtLine(line)
          , i = text.search(new RegExp('^(\\s*)'+comment.escape()))
          , s = RegExp.$1.length;
          
          if (insert !== false && i === -1) {
            insert = true;
            this.put(comment, line, 0);
          } else if (insert !== true) {
            insert = false;
            this.erase(comment, line, s + comment.length);
          }
        }
        if (range) {
          var mv = (insert ? 1 : -1) * comment.length;
          this.doc.moveSelection(mv, mv);
        }
      } else {
        this.toggleBlockComment(true);
      }
    },
    toggleBlockComment: function(lineComment) {
      var cs, ce;
      if (this.parser && (cs = this.parser.blockCommentStart) && (ce = this.parser.blockCommentEnd)) {
        var range = this.doc.getSelectionRange()
        , l = this.caret.line(), c = this.caret.column()
        , bc = 'block-comment';
        
        if (this.isState(bc, l, c)) {
          var sl = this.searchLeft(cs, l, c, bc)
          , sr = this.searchRight(ce, l, c, bc);
          if (sl && sr) {
            this.erase(ce, sr[0], sr[1] + ce.length);
            this.erase(cs, sl[0], sl[1] + cs.length);
            if (range && range.start.line === sl[0]) {
              this.doc.moveSelectionStart(-cs.length);
            }
            if (sl[0] === l && sl[1] < c) this.caret.moveX(-cs.length);
          }
        } else {
          if (range) {
            var start = range.start, end = range.end
            , sel = this.doc.getSelection();
            
            if (new RegExp('^'+cs.escape()).test(sel) && new RegExp(ce.escape()+'$').test(sel)) {
              this.erase(ce, end.line, end.column);
              this.erase(cs, start.line, start.column + ce.length);
              if (l === start.line) this.caret.moveX(-cs.length);
            } else {
              this.doc.wrapSelection(cs, ce);
              if (l === start.line) this.caret.moveX(cs.length);
            }
          } else {
            if (lineComment) {
              var txt = this.getTextAtLine(l);
              this.put(ce, l, txt.length);
              this.put(cs, l, 0);
              this.caret.moveX(cs.length);
            } else {
              this.insertText(cs + ce, -ce.length);
            }
          }
        }
      } else {
        this.toggleComment();
      }
    },
    textBeforeCursor: function(i) {
      var bf = this.caret.textBefore();
      return i > 0 ? bf.slice(-i) : bf;
    },
    textAfterCursor: function(i) {
      var af = this.caret.textAfter();
      return i > 0 ? af.substring(0, i) : af;
    },
    textNearCursor: function(i) {
      return i > 0 ? this.caret.textAfter().substring(0, i) : this.caret.textBefore().slice(i);
    },
    cursorIsBeforePosition: function(line, column, atline) {
      var l = this.caret.line(), c = this.caret.column();
      return l == line ? c < column : !atline && l < line;
    },
    cursorIsAfterPosition: function(line, column, atline) {
      var l = this.caret.line(), c = this.caret.column();
      return l == line ? c > column : !atline && l > line;
    },
    searchLeft: function(pattern, line, column, style) {
      var i = -1, dl = this.doc.get(line)
      , search = 'string' == typeof pattern
      ? function(text) { return text.lastIndexOf(pattern); }
      : function(text) { return text.search(pattern); };
      
      while (dl) {
        i = search(dl.text.substring(0, column));
        if (i == -1) {
          column = Infinity;
          dl = dl.prev();
          --line;
        } else {
          var st = this.getStyleAt(line, i + 1);
          if (st == style) {
            break;
          }
          column = i;
        }
      }
      return dl && [line, i];
    },
    searchRight: function(pattern, line, column, style) {
      var i = -1, dl = this.doc.get(line)
      , search = 'string' === typeof pattern
      ? function(text) { return text.indexOf(pattern); }
      : function(text) { return text.search(pattern); };
      
      while (dl) {
        i = search(dl.text.substr(column));
        if (i == -1) {
          column = 0;
          dl = dl.next();
          ++line;
        } else {
          var st = this.getStyleAt(line, column + i + 1);
          if (st == style) {
            break;
          }
          column += i + 1;
        }
      }
      return dl && [line, i + column];
    },
    substring: function(from, to) {
      var str = '';
      while (from[0] < to[0]) {
        str += this.doc.get(from[0]++).text.substr(from[1]) + '\n';
        from[1] = 0;
      }
      return str += this.doc.get(to[0]).text.substring(from[1], to[1]);
    },
    charAt: function(line, column) {
      return line < this.doc.size() ? this.getTextAtLine(line).charAt(column) : '';
    },
    isState: function(state, line, col, all) {
      if (state && state.length) {
        state = 'string' === typeof state ? [state] : state;
        var gs = getStates.call(this, this.doc.get(line).parsed, col), l = gs ? gs.length : 0;
        return gs ? all ? gs.diff(state).length === 0 && gs.length == state.length : gs.diff(state).length !== l : false;
      }
      return false;
    },
    insertText: function(text, mx) {
      this.doc.removeSelection();
      var pos, s = text.split(eol)
      , bf = this.caret.textBefore()
      , line = this.caret.line()
      , col = this.caret.column(true);
      
      if (s.length > 1) {
        var af = this.caret.textAfter()
        , dl = this.caret.dl(), sbf;
        
        this.caret.setTextAtCurrentLine(bf + s.shift(), '');
        this.doc.insert(line+1, s);
        this.caret.position(line + s.length, -1);
        this.caret.setTextAfter(af);
      } else {
        this.caret.setTextBefore(bf + s[0]);
      }
      mx && this.caret.moveX(mx);
      text.length && this.emit('changed', { line: line, column: col, text: text, added: true });
      return this;
    },
    insertSelectedText: function(text, mx) {
      this.doc.beginSelection();
      this.insertText(text, mx);
      this.doc.endSelection();
      return this;
    },
    put: function(text, line, column, mx) {
      if (text.length && line < this.doc.size()) {
        var s = text.split(eol)
        , dl = this.doc.get(line)
        , dlt = dl.text
        , bf = dlt.substring(0, column), af = dlt.substr(column)
        , isa = this.cursorIsAfterPosition(line, bf.length, true);
        
        if (s.length > 1) {
          var i = s.length - 1;
          this.doc.insert(line+1, s[i] + af);
          af = '';
          while (--i > 0) {
            this.doc.insert(line+1, s[i]);
          }
        }
        this.dispatch(dl, bf + s[0] + af);
        this.caret.refresh();
        isa && this.caret.moveX(text.length);
        mx && this.caret.moveX(mx);
        this.emit('changed', { line: line, column: bf.length, text: text, added: true });
      }
      return this;
    },
    erase: function(arg, line, column, mx) {
      var isa = this.cursorIsAfterPosition(line, column, true);
      this.caret.savePosition();
      this.caret.position(line, column);
      this.removeBeforeCursor(arg);
      this.caret.restorePosition();
      isa && this.caret.moveX(-(arg.length || arg));
      mx && this.caret.moveX(mx);
      return this;
    },
    dispatch: function(dl, text) {
      dl.setText(text);
      return this.parse(dl);
    },
    appendText: function(text) {
      text = text.split(eol);
      var size = this.doc.size(), fi = text.shift();
      if (fi) {
        var last = this.doc.get(size - 1);
        last && this.dispatch(last, last.text + fi);
      }
      this.doc.insert(size, text);
      if (!this.doc.isFilled) this.doc.isFilled = this.doc.fill();
      return this.doc.isFilled;
    },
    appendLine: function(text) {
      var dl, size = this.doc.size();
      (size == 1 && (dl = this.doc.get(0)).text.length == 0) ? dl.setText(text) : this.doc.insert(size, text);
      if (!this.doc.isFilled) this.doc.isFilled = this.doc.fill();
      return this;
    },
    swapLineUp: function() {
      var cur, up, l = this.caret.line();
      if (l) {
        this.replaceLines(l - 1, l);
        this.caret.moveY(-1);
      }
    },
    swapLineDown: function() {
      var cur, down, l = this.caret.line();
      if (l < this.doc.size() - 1) {
        this.replaceLines(l, l + 1);
        this.caret.moveY(1);
      }
    },
    removeBeforeCursor: function(arg) {
      var r = '', type = typeof arg, bf = this.caret.textBefore();
      if ('string' === type) {
        arg = arg.split(eol);
        var l = this.caret.line(), x
        , af = this.caret.textAfter()
        , last = arg[arg.length-1];
        
        if ((x = bf.length - last.length) == bf.lastIndexOf(last)) {
          bf = bf.substring(0, x);
        }
        if (arg.length > 1) {
          var rm = this.doc.remove(l - arg.length + 1, arg.length - 1)
          , first = rm && rm[0].text;
          
          if (first && (x = first.length - arg[0].length) == first.lastIndexOf(arg[0])) {
            bf = first.substring(0, x) + bf;
          }
        }
        this.caret.setTextBefore(bf);
        r = arg;
      } else if ('number' === type) {
        if (arg <= bf.length) {
          this.caret.setTextBefore(bf.substring(0, bf.length - arg));
        } else {
          var af = this.caret.textAfter()
          , l = this.caret.line();
          
          while (arg > bf.length && l-1 >= 0) {
            r = '\n' + bf + r;
            this.doc.remove(l, 1);
            arg = arg - bf.length - 1;
            bf = this.caret.position(--l, -1).textBefore();
          }
          if (arg) {
            this.caret.setTextAtCurrentLine(bf.substring(0, bf.length - arg), af);
          } else {
            this.caret.setTextAfter(af);
          }
        }
        r = bf.substr(bf.length - arg) + r;
      }
      r && this.emit('changed', { line: this.caret.line(), column: this.caret.column(true), text: r, added: false });
      return r;
    },
    removeAfterCursor: function(arg) {
      var r = '', type = typeof arg
      , af = this.caret.textAfter();
      
      if ('string' === type) {
        var i = 0, l = this.caret.line()
        , dl = this.caret.dl(), nextdl
        , bf = this.caret.textBefore();
        arg = arg.split(eol);
        
        if (af.indexOf(arg[0]) == 0) {
          af = af.substr(arg[0].length);
        }
        if (arg.length > 1) {
          var rm = this.doc.remove(l + 1, arg.length - 1)
          , lastline = rm && rm[rm.length-1].text
          , lastarg = arg[arg.length-1];
          
          if (lastline && lastline.indexOf(lastarg) == 0) {
            af += lastline.substr(lastarg.length);
          }
        }
        this.caret.setTextAfter(af);
        r = arg;
      } else if ('number' === type) {
        if (arg <= af.length) {
          this.caret.setTextAfter(af.substr(arg));
        } else {
          var size = this.doc.size()
          , dl = this.caret.dl(), nextdl
          , bf = this.caret.textBefore()
          , l = this.caret.line();
          
          while (arg > af.length && l+1 < size) {
            r = r + af + '\n';
            this.caret.setTextAfter('');
            arg = arg - af.length - 1;
            nextdl = dl.next();
            af = nextdl.text;
            this.doc.remove(l+1, 1);
          }
          this.caret.setTextAfter(af.substr(arg));
          this.caret.refresh();
        }
        r = r + af.substring(0, arg);
      }
      r && this.emit('changed', { line: this.caret.line(), column: this.caret.column(true), text: r, added: false });
      return r;
    },
    replaceLines: function(a, b) {
      if ('number' === typeof a && 'number' === typeof b) {
        var first = cp.doc.get(a), second = cp.doc.get(b);
        if (first && second) {
          var tmp = first.text;
          
          this.emit('changed', { line: a, column: 0, text: first.text, added: false });
          first.setText(second.text);
          this.emit('changed', { line: a, column: 0, text: first.text, added: true });
          this.emit('changed', { line: b, column: 0, text: second.text, added: false });
          second.setText(tmp);
          this.emit('changed', { line: b, column: 0, text: second.text, added: true });
          this.parse(first);
          this.parse(second);
        }
      }
    },
    wordBefore: function(pattern) {
      pattern = pattern || /[\w$]+/;
      var bf = this.caret.textBefore(), m
      , rgx = new RegExp(pattern.source + '$');
      if (m = rgx.exec(bf)) {
        return m[0];
      }
      return '';
    },
    wordAfter: function(pattern) {
      pattern = pattern || /[\w$]+/;
      var af = this.caret.textAfter(), m
      , rgx = new RegExp('^' + pattern.source);
      if (m = rgx.exec(af)) {
        return m[0];
      }
      return '';
    },
    removeWordBefore: function(pattern) {
      var word = this.wordBefore(pattern);
      word && this.removeBeforeCursor(word);
      return word;
    },
    removeWordAfter: function(pattern) {
      var word = this.wordAfter(pattern);
      word && this.removeAfterCursor(word);
      return word;
    },
    deleteToBeginning: function() {
      this.removeBeforeCursor(this.caret.textBefore());
      return this;
    },
    deleteToEnd: function() {
      this.removeAfterCursor(this.caret.textAfter());
      return this;
    },
    isEmpty: function() {
      return this.doc.size() === 1 && !this.doc.get(0).text;
    },
    getValue: function() {
      var cp = this, r = [];
      this.doc.each(function() {
        r.push(this.text);
      });
      return r.join(this.getLineEnding());
    },
    createReadStream: function() {
      return new ReadStream(this);
    },
    createHighlightOverlay: function(/* arrays, ... */) {
      if (this.highlightOverlay) this.highlightOverlay.remove();
      var self = this, args = arguments
      , overlay = this.highlightOverlay = this.doc.createOverlay('cp-highlight-overlay', ['blur', 'changed']);
      for (var i = 0; i < arguments.length; i++) {
        var dl = this.doc.get(arguments[i][0]), pos;
        if (dl) {
          pos = this.doc.measureRect(dl, arguments[i][1], arguments[i][1] + arguments[i][2].length);
          var sp = span.cloneNode().addClass('cp-highlight');
          sp.setAttribute('style', 'top:'+(dl.getOffset()+pos.offsetY+this.sizes.paddingTop)+'px;left:'+pos.offsetX+'px;width:'+pos.width+'px;height:'+(pos.charHeight+1)+'px;');
          overlay.node.appendChild(sp);
        }
      }
      overlay.reveal();
      return this;
    },
    search: function(find, scroll) {
      if (find) {
        var search = this.searches = this.searches || {};
        
        if (!search.value || find.toString() != search.value.toString() || !search.results || !search.length) {
          var cp = this, j = 0, results = search.results = {}, cur, linkCallback, clearSelected, escape;
          search.value = find;
          
          linkCallback = function(dl, line) {
            if (cp.searches.results && (cur = cp.searches.results[line])) {
              searchAppendResult.call(cp, dl, cur);
            }
          }
          clearSelected = function() {
            var children = search.overlay.node.children, k = 0;
            for (var i = 0; i < children.length; i++) {
              if (children[i].style.opacity == '0' && ++k) {
                children[i].style.opacity = '1';
              }
            }
            k && cp.doc.clearSelection();
          }
          
          if (!(search.overlay instanceof CodePrinter.Overlay)) {
            search.overlay = new CodePrinter.Overlay(this.doc, 'cp-search-overlay');
            search.mute = false;
            
            search.overlay.on({
              'click': clearSelected,
              'blur': clearSelected,
              'changed': function() {
                if (!search.mute) {
                  search.length = 0;
                  cp.search(search.value, false);
                }
              },
              '$removed': function() {
                cp.searches.results = cp.searches.active = undefined;
                cp.searches.length = 0;
              }
            });
            search.overlay.node.delegate('span', 'mousedown', function(e) {
              var res = this._searchResult;
              if (res) {
                clearSelected();
                search.mute = true;
                cp.input.focus();
                cp.doc.setSelectionRange(res.line, res.startColumn, res.line, res.startColumn + res.length);
                cp.caret.position(res.line, res.startColumn + res.length);
                this.style.opacity = '0';
                search.mute = false;
              }
              return e.cancel();
            });
            this.on({
              link: function(dl, line) {
                cp.doc.once('viewUpdated', function() {
                  linkCallback(dl, line);
                });
              },
              unlink: function(dl, line) {
                cp.doc.once('viewUpdated', function() {
                  if (cp.searches.results && (cur = cp.searches.results[line])) {
                    for (var i = 0; i < cur.length; i++) {
                      if (cur[i].node) {
                        cur[i].node.parentNode && search.overlay.node.removeChild(cur[i].node);
                        cur[i].node = undefined;
                      }
                    }
                  }
                });
              }
            });
          }
          
          if ('string' === typeof find) escape = new RegExp(find.escape());
          else escape = find;
          
          this.intervalIterate(function(dl, line, offset) {
            if (this.searches.value !== find) return false;
            j += searchOverLine.call(cp, escape, dl, line, offset);
          }, function(index, last) {
            var sl = this.wrapper.scrollLeft;
            search.overlay.node.innerHTML = '';
            if (last !== false) {
              if (j) {
                if (scroll !== false || search.length === 0) {
                  for (var k in results) {
                    if (results[k].length) {
                      search.active = results[k][0];
                      scroll !== false && this.doc.scrollTo(results[k][0].offset - this.wrapper.offsetHeight/2);
                      break;
                    }
                  }
                }
                this.doc.eachVisibleLines(linkCallback);
              }
              search.length = j;
              search.overlay.reveal();
              this.wrapper.scrollLeft = sl;
              this.emit('searchCompleted', find, j);
            }
          });
        } else {
          this.searchNext();
        }
      }
      return this;
    },
    searchEnd: function() {
      if (this.searches) {
        this.searches.overlay.remove();
      }
    },
    searchNext: function() {
      if (this.searches) {
        var search = this.searches
        , results = search.results
        , activeLine = search.active.line
        , newActive;
        
        if (search.active) {
          var i = results[activeLine].indexOf(search.active);
          if (i < results[activeLine].length - 1) {
            newActive = results[activeLine][i+1];
          } else {
            var keys = Object.keys(results)
            , j = keys.indexOf(''+activeLine);
            newActive = results[keys[j+1 < keys.length ? j+1 : 0]][0];
          }
          search.active.node.removeClass('active');
        } else {
          for (var k in results) {
            newActive = results[k][0];
            break;
          }
        }
        if (newActive) {
          if (newActive.offset < this.wrapper.scrollHeight || newActive.offset > this.wrapper.scrollHeight + this.wrapper.offsetHeight) {
            this.doc.scrollTo(newActive.offset - this.wrapper.offsetHeight/2);
          }
          (search.active = newActive).node.addClass('active');
        } else {
          search.active = undefined;
        }
      }
    },
    searchPrev: function() {
      if (this.searches) {
        var search = this.searches
        , results = search.results
        , activeLine = search.active.line
        , newActive;
        
        if (search.active) {
          var i = results[activeLine].indexOf(search.active);
          if (i > 0) {
            newActive = results[activeLine][i-1];
          } else {
            var keys = Object.keys(results)
            , j = keys.indexOf(''+activeLine)
            , cur = results[keys[j > 0 ? j-1 : keys.length - 1]];
            newActive = cur[cur.length-1];
          }
          search.active.node.removeClass('active');
        } else {
          for (var k in results) {
            newActive = results[k][0];
            break;
          }
        }
        if (newActive) {
          this.doc.scrollTo(newActive.offset - this.wrapper.offsetHeight/2);
          (search.active = newActive).node.addClass('active');
        }
      }
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
        if (dl.definition) {
          obj[i] = dl.definition;
        }
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
      return {}.extend(this.options.snippets, this.parser && this.parser.snippets);
    },
    findSnippet: function(snippetName) {
      var s = this.options.snippets, b;
      if (!(b = s && s.hasOwnProperty(snippetName))) {
        s = this.parser && this.parser.snippets;
        b = s && s.hasOwnProperty(snippetName);
      }
      s = b && s[snippetName];
      if ('function' == typeof s) s = functionSnippet(this, s);
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
      this.keyMap.extend(arg);
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
    call: function(keyCombination, code, prototype) {
      if (keyCombination) {
        var obj = prototype ? keyMap.prototype : this.keyMap;
        if (obj[keyCombination]) {
          return obj[keyCombination].call(this, {}, code || 0, keyCombination);
        }
      }
    },
    emit: function(eventName) {
      var args = [], i = arguments.length, ov = this.doc.overlays;
      while (i--) args[i] = arguments[i];
      for (var i = ov.length; i--; ) ov[i].emit.apply(ov[i], args);
      Object.prototype.emit.apply(this, args);
      return this;
    },
    enterFullscreen: function() {
      if (!this.isFullscreen) {
        var main = this.mainNode, b = document.body;
        this._ = document.createTextNode('');
        main.addClass('cp-fullscreen').style.margin = [-b.style.paddingTop, -b.style.paddingRight, -b.style.paddingBottom, -b.style.paddingLeft, ''].join('px ');
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
        this.mainNode.removeClass('cp-fullscreen').style.removeProperty('margin');
        tmp.parentNode.insertBefore(this.mainNode, tmp);
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
      this.counter.removeClass('hidden');
    },
    closeCounter: function() {
      this.counter.addClass('hidden');
    },
    destroy: function() {
      var p = this.mainNode.parentNode, i = CodePrinter.instances.indexOf(this);
      if (p) p.removeChild(this.mainNode);
      if (i >= 0) CodePrinter.instances.splice(i, 1);
    }
  }
  
  function searchLineWithState(parser, dl, tw) {
    var tmp = dl.prev(), minI = Infinity, best;
    for (var i = 0; tmp && i < 100; i++) {
      if (tmp.state) {
        best = tmp;
        break;
      }
      var tmpind = parseIndentation(tmp.text, tw).length;
      if (tmpind < minI) {
        best = tmp;
        minI = tmpind;
      }
      tmp = tmp.prev();
    }
    if (best && best.state) {
      return { state: copyState(best.state), line: best.next() }
    } else {
      return { state: parser.initialState(), line: best || dl }
    }
  }
  function restoreFromCache(text, cache, frag) {
    var i = 0, j = 0, l = cache.length, tmp;
    for (; i < l; i++) {
      tmp = cache[i];
      if (j < tmp.from) frag.appendChild(cspan(null, text.substring(j, tmp.from)));
      frag.appendChild(cspan(tmp.style, text.substring(tmp.from, j = tmp.to)));
    }
    if (j < text.length) frag.appendChild(cspan(null, text.substr(j)));
  }
  function parseIndentation(text, tabWidth, fragment) {
    var p = '', i = -1, spaces = 0, ind = 0
    , tab = ' '.repeat(tabWidth);
    while (++i < text.length) {
      if (text[i] == ' ') {
        ++spaces;
        if (spaces == tabWidth) {
          if (fragment) fragment.appendChild(cspan('tab', tab));
          spaces = 0;
          ++ind;
        }
      } else if (text[i] == '\t') {
        if (fragment) fragment.appendChild(cspan('tab', '\t'));
        spaces = 0;
        ++ind;
      } else {
        break;
      }
    }
    if (spaces && fragment) fragment.appendChild(cspan(null, ' '.repeat(spaces)));
    return { indentation: ind, length: ind*tabWidth+spaces, indentText: text.substring(0, i), rest: text.substr(i) };
  }
  function readIteration(parser, stream, state) {
    for (var i = 0; i < 10; i++) {
      var style = (state && (state.next ? state.next : (state.parser || parser).iterator) || parser.iterator)(stream, state);
      if (style) stream.lastStyle = style;
      if (stream.pos > stream.start) return style;
    }
    throw new Error();
  }
  function parse(cp, parser, stream, state, frag, col) {
    var pos, style, l = col != null ? col : stream.length, cache = [];
    pos = stream.pos;
    while (stream.pos < l) {
      stream.start = stream.pos;
      if (style = readIteration(parser, stream, state)) {
        if (pos < stream.start) frag.appendChild(cspan(null, stream.value.substring(pos, stream.start)));
        var v = stream.from(stream.start);
        if (v != ' ' && v != '\t') stream.lastValue = v;
        pos = stream.pos;
        frag.appendChild(cspan(style, v));
        cache.push({ from: stream.start, to: pos, style: style });
      }
    }
    if (pos < stream.pos) frag.appendChild(cspan(null, stream.from(pos)));
    return cache;
  }
  function fastParse(cp, parser, stream, state, col) {
    var style, v, l = col != null ? col : stream.length, cache = [];
    while (stream.pos < l) {
      stream.start = stream.pos;
      style = readIteration(parser, stream, state);
      v = stream.from(stream.start);
      if (v != ' ' && v != '\t') stream.lastValue = v;
      if (style) cache.push({ from: stream.start, to: stream.pos, style: style });
    }
    return cache;
  }
  function forwardParsing(cp, dl) {
    var a = dl.state && dl.state.next, b, state;
    cp.parse(dl);
    b = (state = dl.state) && state.next;
    
    while ((!a && b || a && a !== b) && (dl = dl.next())) {
      if (dl.cache) dl.cache = undefined;
      a = dl.state && dl.state.next;
      cp.parse(dl, state);
      b = (state = dl.state) && state.next;
    }
    return dl;
  }
  function runBackgroundParser(cp, parser, whole) {
    var to = whole ? cp.doc.size() - 1 : cp.doc.to()
    , state = parser.initialState();
    
    cp.intervalIterate(function(dl, index) {
      if (index > to) return false;
      this.parse(dl, state);
      state = dl.state;
    });
  }
  function cspan(style, content) {
    var node = span.cloneNode();
    if (style) node.className = style.replace(/\S+/g, 'cpx-$&');
    node.appendChild(document.createTextNode(content));
    return node;
  }
  function rm(node) {
    var fc = node.firstChild;
    while (fc) {
      node.removeChild(fc);
      fc = node.firstChild;
    }
  }
  function copyState(state) {
    var st = {};
    for (var k in state) if (state[k] != null) st[k] = state[k];
    return st;
  }
  function fixIndent(cp, parser, offset) {
    var dl = cp.caret.dl(), prev = dl.prev()
    , col = cp.caret.column() + offset
    , s = prev && cp.getStateAt(prev, prev.text.length);
    if (s) {
      var i = parser.indent(s.stream, s.state);
      s = cp.getStateAt(dl, 0);
      s.stream.indentation = i;
      i = parser.indent(s.stream, s.state);
      cp.setIndentAtLine(dl, i);
    }
  }
  function matchingHelper(cp, key, opt, line, start, end) {
    if (cp.getStyleAt(line, start+1) == opt.style) {
      var counter = 1, i = -1, l = line, c, fn, fix = 0;
      
      if (opt.direction == 'left') {
        c = start;
        fn = cp.searchLeft;
      } else {
        c = end;
        fn = cp.searchRight;
        fix = 1;
      }
      
      do {
        var a = fn.call(cp, opt.value, l, c, opt.style)
        , b = fn.call(cp, key, l, c, opt.style);
        
        if (a) {
          if (b && (fix ? (b[0] < a[0] || b[0] == a[0] && b[1] < a[1]) : (b[0] > a[0] || b[0] == a[0] && b[1] > a[1]))) {
            ++counter;
            a = b;
          } else {
            --counter;
          }
          l = a[0];
          c = a[1] + fix;
        } else {
          counter = 0;
        }
      } while (counter != 0 && ++i < 100);
      
      if (i < 100) cp.createHighlightOverlay(
        [line, start, key],
        [l, c - fix, opt.value]
      );
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
        var of = 0, i = this.parent.indexOf(this);
        while (--i >= 0) of += this.parent[i].height;
        return of + this.parent.getOffset();
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
        while (prev && !prev.isLeaf) prev = prev[prev.length-1];
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
    addClass: function() {
      if (!this.classes) this.classes = Array.apply(null, arguments);
      else
        for (var i = 0; i < arguments.length; i++)
          if (this.classes.indexOf(arguments[i]) == -1)
            this.classes.push(arguments[i]);
      touch(this);
    },
    removeClass: function() {
      if (this.classes) {
        for (var i = arguments.length - 1, j; i >= 0; i--)
          if ((j = this.classes.indexOf(arguments[i])) >= 0)
            this.classes.splice(j, 1);
        if (this.classes.length == 0) this.classes = undefined;
      }
      touch(this);
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
            return prev && prev.length ? prev[prev.length-1] : null;
          }
        }
      }
      return null;
    }
  }
  
  Document = CodePrinter.Document = function(editor) {
    var that = this, cp, counter, ol
    , code, from = 0, to = -1
    , defHeight = 13, firstNumber, maxLine
    , maxLineLength = 0, maxLineChanged
    , data, view, history, selection;
    
    function desiredHeight(half) {
      return (cp.body.offsetHeight || cp.options.height) + cp.options.viewportMargin * (half ? 1 : 2);
    }
    function isFilled(half) {
      return (code.scrollHeight || heightOfLines()) > desiredHeight(half);
    }
    function heightOfLines() {
      var h = 0;
      for (var i = 0; i < view.length; i++) {
        h += view[i].height;
      }
      return h;
    }
    function link(dl, index, withoutParsing) {
      if (dl.node && dl.counter) {
        dl.counter.firstChild.nodeValue = formatter(firstNumber + (dl.counter._index = index));
        if (index < to) {
          var q = index - from, bef = view[q];
          code.insertBefore(dl.node, bef.node);
          ol.insertBefore(dl.counter, bef.counter);
          view.splice(q, 0, dl);
          var tmp = dl.counter.nextSibling;
          while (tmp && tmp._index !== index + 1) {
            tmp.firstChild.nodeValue = formatter(firstNumber + (tmp._index = ++index));
            tmp = tmp.nextSibling;
          }
        } else {
          code.appendChild(dl.node);
          ol.appendChild(dl.counter);
          index = view.push(dl) + from;
        }
        cp.parse(dl);
        cp.emit('link', dl, index);
      }
    }
    function insert(dl) { init(dl); link(dl, to + 1); ++to; }
    function prepend(dl) { init(dl); link(dl, --from); }
    function remove(dl, index) {
      code.removeChild(deleteNode(dl));
      ol.removeChild(deleteCounter(dl));
      view.remove(dl); --to;
      cp.emit('unlink', dl, index);
    }
    function clear() {
      for (var i = 0; i < view.length; i++) {
        deleteNode(view[i]);
        deleteCounter(view[i]);
      }
      to = -1; from = 0;
      view.length = 0;
      code.innerHTML = ol.innerHTML = '';
      code.style.top = ol.style.top = (cp.sizes.scrollTop = 0) + 'px';
    }
    function scroll(delta) {
      cp.sizes.scrollTop = Math.max(0, cp.sizes.scrollTop + delta);
      code.style.top = cp.sizes.scrollTop + 'px';
      ol.style.top = cp.sizes.scrollTop + 'px';
    }
    function scrollTo(st) {
      cp.counter.scrollTop = st;
      cp.wrapper.scrollTop = st;
    }
    function scrollBy(delta, s) {
      cp.counter.scrollTop += delta;
      cp.wrapper.scrollTop += delta;
      s !== false && scroll(delta);
    }
    function updateCounters(dl, index) {
      var tmp = dl.counter;
      while (tmp) {
        tmp.firstChild.nodeValue = formatter(firstNumber + (tmp._index = index++));
        tmp = tmp.nextSibling;
      }
    }
    function changedListener(e) {
      if (this.doc == that) {
        if (e.text != '\n') that.updateView();
        if (cp.options.history) history.pushChanges(e.line, e.column, e.text, e.added);
      }
    }
    function formatter(i) {
      return i;
    }
    
    this.init = function(source) {
      source = source || '';
      this.initialized = true;
      data = this.data = new Data();
      
      if (to !== -1) {
        clear();
        this.clearSelection();
      }
      this.insert(data.size, source.split(eol));
      this.updateHeight();
      this.fill();
      return this;
    }
    this.attach = function(editor) {
      if (cp) cp.off('changed', changedListener);
      cp = editor;
      this.screen = cp.screen;
      counter = cp.counterChild;
      code = cp.code;
      ol = cp.counterOL;
      
      if (view.length) {
        for (var i = 0; i < view.length; i++) {
          code.appendChild(view[i].node);
          ol.appendChild(view[i].counter);
        }
      }
      cp.on('changed', changedListener);
      if (data) this.updateHeight();
      if (selection) selection.overlay.reveal();
      this.emit('attached');
      this.updateView();
      return this;
    }
    this.detach = function() {
      for (var i = 0; i < view.length; i++) {
        code.removeChild(view[i].node);
        ol.removeChild(view[i].counter);
      }
      cp.off('changed', changedListener);
      selection.overlay.remove();
      this.emit('detached');
      cp = cp.doc = this.screen = counter = code = ol = null;
      return this;
    }
    this.insert = function(at, text) {
      var lines = [];
      if ('string' === typeof text) {
        lines[0] = new Line(text, defHeight);
        if (text.length > maxLineLength) {
          maxLine = lines[0];
          maxLineLength = text.length;
          maxLineChanged = true;
        }
      } else {
        for (var i = 0; i < text.length; i++) {
          lines[i] = new Line(text[i], defHeight);
          if (text[i].length > maxLineLength) {
            maxLine = lines[i];
            maxLineLength = text[i].length;
            maxLineChanged = true;
          }
        }
        data.insert(at, lines, defHeight * lines.length);
      }
      if (at < from) {
        from += lines.length;
        updateCounters(view[0], from);
      } else if (at <= to + 1) {
        if (isFilled()) {
          var m = Math.min(lines.length, to - at), rmdl;
          for (var i = 0; i < m; i++) {
            rmdl = view.pop();
            captureNode(lines[i], rmdl);
            cp.emit('unlink', rmdl, to + m - i);
            link(lines[i], at + i);
          }
        } else {
          var i = -1;
          while (++i < lines.length && !isFilled()) {
            init(lines[i]);
            ++to;
            link(lines[i], at + i);
          }
        }
      }
      this.updateHeight();
      this.updateView();
    }
    this.remove = function(at, n) {
      if ('number' === typeof n && n > 0 && at >= 0 && at + n <= data.size) {
        var h = data.height, rm = data.remove(at, n), sd = 0;
        
        if (at + n < from) {
          sd = data.height - h;
          from -= n; to -= n;
          updateCounters(view[0], from);
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
            next = view[view.length-1].next();
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
          updateCounters(view[0], from);
        }
        if (sd) scrollBy(sd);
        
        var last = rm[rm.length-1];
        if (last.stateAfter) {
          cp.parse(data.get(at));
        }
        this.updateHeight();
        cp.wrapper.scrollTop = cp.counter.scrollTop;
        this.updateView();
        return rm;
      }
    }
    this.updateCounters = function() {
      updateCounters(view[0], from);
    }
    this.fill = function() {
      var half, b, dl = (half = view.length === 0) ? data.get(0) : view[view.length-1].next();
      while (dl && !(b = isFilled(half))) {
        insert(dl);
        dl = dl.next();
      }
      if (!dl) {
        dl = view[0].prev();
        while (dl && !(b = isFilled(half))) {
          prepend(dl);
          scroll(-dl.height);
          dl = dl.prev();
        }
      }
      return b;
    }
    this.rewind = function(dl, st) {
      var tmp = dl, dli = dl.info()
      , offset = dli.offset
      , i = -1, oldfrom = from;
      
      if (from <= dli.index && dli.index <= to) return false;
      
      from = dli.index;
      to = from - 1;
      
      ol.style.display = 'none';
      code.style.display = 'none';
      
      while (tmp && ++i < view.length) {
        cp.emit('unlink', view[i], oldfrom + i);
        captureNode(tmp, view[i]);
        cp.parse(tmp);
        tmp.counter.firstChild.nodeValue = formatter(firstNumber + (tmp.counter._index = to = from + i));
        view[i] = tmp;
        cp.emit('link', tmp, from + i);
        tmp = tmp.next();
      }
      if (++i < view.length) {
        var spliced = view.splice(i, view.length - i);
        tmp = dl.prev();
        while (tmp && spliced.length) {
          cp.emit('unlink', spliced[0], oldfrom + i++);
          captureNode(tmp, spliced.shift());
          cp.parse(tmp);
          tmp.counter.firstChild.nodeValue = formatter(firstNumber + (tmp.counter._index = --from));
          code.insertBefore(tmp.node, view[0].node);
          ol.insertBefore(tmp.counter, view[0].counter);
          view.unshift(tmp);
          cp.emit('link', tmp, from);
          offset -= tmp.height;
          tmp = tmp.prev();
        }
      }
      cp.sizes.scrollTop = Math.max(0, offset);
      ol.style.top = cp.sizes.scrollTop + 'px';
      code.style.top = cp.sizes.scrollTop + 'px';
      if (st != null) scrollTo(this.scrollTop = st);
      ol.style.display = '';
      code.style.display = '';
      this.updateView();
    }
    this.scrollTo = function(st) {
      cp.wrapper._lockedScrolling = true;
      
      var x = st - cp.sizes.scrollTop
      , limit = cp.options.viewportMargin
      , d = Math.round(x - limit)
      , abs = Math.abs(d)
      , tmpd = d, a = to
      , h, dl, disp;
      
      if (d) {
        if (abs > 700 && abs > 2 * code.offsetHeight && 0 <= st &&  st <= cp.wrapper.scrollHeight - cp.wrapper.clientHeight) {
          dl = data.getLineWithOffset(Math.max(0, st - limit));
          if (this.rewind(dl, st) !== false) return;
        }
        if (from === 0 && d < 0) {
          h = view[0].height;
          dl = view[view.length-1];
          while (h < x && !isFilled() && (dl = dl.next())) {
            insert(dl);
            x -= dl.height;
          }
        } else {
          if (disp = abs > defHeight) { ol.style.display = 'none'; code.style.display = 'none'; }
          if (d > 0) {
            while (view.length && (h = view[0].height) <= d && (dl = view[view.length-1].next())) {
              var first = view.shift();
              captureNode(dl, first);
              if (dl.active) cp.select(dl);
              cp.emit('unlink', first, from);
              link(dl, to + 1);
              ++from; ++to;
              d -= h;
            }
          } else if (d < 0) {
            while (view.length && (h = view[view.length-1].height) <= -d && (dl = view[0].prev())) {
              var last = view.pop();
              captureNode(dl, last);
              if (dl.active) cp.select(dl);
              cp.emit('unlink', last, to);
              --to; link(dl, --from);
              d += dl.height;
            }
          }
          if (tmpd != d) {
            scroll(tmpd - d);
          }
        }
      }
      scrollTo(this.scrollTop = st);
      if (disp) { ol.style.display = ''; code.style.display = ''; }
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
      , ch = maybeExternalMeasure(cp, dl).childNodes
      , child, l, ow, ol, chl = ch.length
      , i = -1, r = { dl: dl, column: 0, offsetX: cp.sizes.paddingLeft, offsetY: 0, charWidth: 0, charHeight: defHeight };
      y = offsetDiff;
      if (chl === 1 && ch[0].nodeValue == zws) return r;
      while (++i < chl) {
        child = ch[i];
        l = child.firstChild.nodeValue.length;
        if (l === 0) continue;
        
        if (!cp.options.lineWrapping || y <= (r.offsetY = child.offsetTop) + (r.height = child.offsetHeight)) {
          ol = child.offsetLeft; ow = child.offsetWidth;
          if (x <= ol + ow) {
            r.charWidth = Math.round(ow / l);
            var tmp = Math.round((x - ol) * l / ow);
            r.column += tmp;
            r.offsetX = Math.round(ol + tmp * ow / l);
            break;
          } else {
            r.charWidth = Math.round(ow / l);
            r.offsetX = ol + ow;
            r.column += l;
          }
        } else {
          r.column += l;
        }
      }
      if (!r.charWidth) { r.charWidth = Math.round(ow / l); r.offsetX = ol + ow; }
      return r;
    }
    this.measureRect = function(dl, offset, to) {
      var ch = maybeExternalMeasure(cp, dl).childNodes, child
      , l, ow, ol, chl = ch.length, tmp = 0, i = -1, bool
      , r = { column: 0, offsetX: cp.sizes.paddingLeft, offsetY: 0, width: 0, height: defHeight, charWidth: 0, charHeight: defHeight };
      if (chl === 1 && ch[0].nodeValue == zws) return r;
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
          r.column = offset;
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
      if (!bool) {
        r.column = tmp;
        if (child) {
          ow = child.offsetWidth;
          r.charWidth = Math.round(ow / l);
          r.offsetX = child.offsetLeft + ow;
          r.offsetY = child.offsetTop;
        }
      } else if (r.width) r.width = Math.round(r.width);
      if (child) r.height = child.offsetTop - r.offsetY + (r.charHeight = child.offsetHeight);
      if (!r.charWidth) r.charWidth = calcCharWidth(dl.node);
      return r;
    }
    this.updateDefaultHeight = function() {
      var pr = pre.cloneNode();
      pr.style.position = 'absolute';
      pr.style.fontSize = cp.options.fontSize + 'px';
      pr.style.fontFamily = cp.options.fontFamily;
      pr.innerHTML = zws;
      document.documentElement.appendChild(pr);
      pr.style.display = '';
      defHeight = pr.offsetHeight;
      document.documentElement.removeChild(pr);
      return this;
    }
    this.updateHeight = function() {
      this.screen.style.minHeight = counter.style.minHeight = (data.height + cp.sizes.paddingTop * 2) + 'px';
      return this;
    }
    this.updateView = function(det) {
      var i = 0, l = view.length, dl, c;
      if (det > 0 && det < l) l = det;
      if (det < 0 && -det < view.length) i = view.length + det;
      for (; i < l; i++) {
        dl = view[i];
        if (defHeight != dl.height || cp.options.lineWrapping) {
          this.updateLineHeight(dl);
        } else if (c = dl.cache) {
          for (var j = 0, cl = c.length; j < cl; j++) {
            if (c[j].style.indexOf('font-') >= 0) {
              this.updateLineHeight(dl);
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
        this.screen.style.minWidth = externalMeasure(cp, maxLine).offsetWidth + 'px';
      }
      this.emit('viewUpdated');
      return this;
    }
    this.updateLineHeight = function(dl) {
      if (dl) {
        var height, node = dl.node;
        if (height = node.offsetHeight) {
          var diff = height - dl.height;
          if (diff) {
            if (dl == view[0] && from != 0) scrollBy(-diff);
            if (dl.counter) dl.counter.style.lineHeight = height + 'px';
            for (; dl; dl = dl.parent) dl.height += diff;
          }
        }
      }
    }
    this.updateScroll = function() {
      if (view.length) {
        var o = view[0].getOffset();
        code.style.top = ol.style.top = (cp.sizes.scrollTop = o) + 'px';
      }
    }
    this.getDefaultLineHeight = function() {
      return defHeight;
    }
    this.getSelectionRange = function() {
      return selection.isset() && { start: selection.start, end: selection.end }
    }
    this.setSelectionRange = function(sl, sc, el, ec) {
      if (arguments.length === 1 && sl instanceof Object) {
        ec = sl.end.column;
        el = sl.end.line;
        sc = sl.start.column;
        sl = sl.start.line;
      }
      if (sl < 0) {
        sl = sc = 0;   
      }
      if (el >= data.size) {
        el = data.size - 1;
        ec = data.get(el).text.length;
      }
      if (sl != null && sc != null) selection.setStart(sl, sc);
      if (el != null && ec != null) selection.setEnd(el, ec);
    }
    this.issetSelection = function() {
      return selection.isset();
    }
    this.inSelection = function(line, column) {
      return selection.isset() && selection.inSelection(line, column);
    }
    this.beginSelection = function() {
      selection.clear();
      selection.setStart(cp.caret.line(), cp.caret.column());
    }
    this.endSelection = function() {
      selection.setEnd(cp.caret.line(), cp.caret.column());
    }
    this.getSelection = function() {
      var range = this.getSelectionRange();
      if (range) {
        if (this.isAllSelected(range)) {
          return cp.getValue();
        }
        var s = range.start, e = range.end
        , dl = data.get(s.line);
        
        if (s.line == e.line) {
          return dl.text.substring(s.column, e.column);
        } else {
          var t = [], i = s.line;
          t.push(dl.text.substr(s.column));
          while ((dl = dl.next()) && ++i < e.line) {
            t.push(dl.text);
          }
          if (dl) t.push(dl.text.substring(0, e.column));
          return t.join(cp.getLineEnding());
        }
      }
      return '';
    }
    this.isAllSelected = function(s) {
      s = s || this.getSelectionRange();
      return s && s.start.line === 0 && s.start.column === 0 && s.end.line === data.size - 1 && s.end.column === cp.getTextAtLine(-1).length;
    }
    this.showSelection = function() {      
      if (selection.isset()) {
        var s = selection.start
        , e = selection.end
        , ov = selection.overlay
        , dl = data.get(s.line), dloffset = dl.getOffset()
        , lastdl = data.get(e.line), lastdloffset = lastdl.getOffset()
        , pos = this.measureRect(dl, s.column)
        , endPos = this.measureRect(lastdl, e.column)
        , equal = s.line == e.line, fh = pos.offsetY + pos.height, selnode;
        
        selnode = ov.top = createSelectionNode.call(cp, ov.top || div.cloneNode()
          , dloffset + pos.offsetY, pos.offsetX, equal && pos.offsetY == endPos.offsetY ? 0 : null, pos.height, 0);
        selnode.parentNode || ov.node.appendChild(selnode);
        selnode = ov.middle = createSelectionNode.call(cp, ov.middle || div.cloneNode()
          , dloffset + fh, cp.sizes.paddingLeft, null, lastdloffset - dloffset - pos.height + endPos.offsetY, 0);
        selnode.parentNode || ov.node.appendChild(selnode);
        
        if (equal && pos.offsetY == endPos.offsetY) {
          selnode = ov.bottom = createSelectionNode.call(cp, ov.bottom || div.cloneNode()
            , dloffset + endPos.offsetY, pos.offsetX, endPos.offsetX - pos.offsetX, pos.height);
        } else {
          selnode = ov.bottom = createSelectionNode.call(cp, ov.bottom || div.cloneNode()
            , lastdloffset + endPos.offsetY, cp.sizes.paddingLeft, endPos.offsetX - cp.sizes.paddingLeft, endPos.charHeight);
        }
        selnode.parentNode || ov.node.appendChild(selnode);
        ov.reveal();
        cp.unselect();
      }
    }
    this.removeSelection = function() {
      var range = this.getSelectionRange();
      if (range) {
        var s = range.start
        , e = range.end
        , delta = e.line - s.line
        , dl = data.get(s.line)
        , next = dl.next()
        , t = [], x, y = '';
        x = dl.text;
        
        if (delta && next) {
          t.push(x.substr(s.column));
          
          if (delta > 1) {
            var r = this.remove(s.line + 1, delta - 1);
            for (var i = 0; i < r.length; i++) {
              t.push(r[i].text);
            }
            next = dl.next();
          }
          if (next) {
            y = next.text;
            t.push(y.substring(0, e.column));
            this.remove(s.line + 1, 1);
          }
        } else {
          t.push(x.slice(s.column, e.column));
          y = x;
        }
        cp.dispatch(dl, x.substring(0, s.column) + y.substr(e.column));
        cp.caret.position(s.line, s.column);
        cp.emit('changed', { line: cp.caret.line(), column: cp.caret.column(true), text: t.join('\n'), added: false });
        this.clearSelection();
      }
    }
    
    this.moveSelection = function(start, end) { selection.move(start, end); }
    this.moveSelectionStart = function(mv) { selection.move(mv, null); }
    this.moveSelectionEnd = function(mv) { selection.move(null, mv); }
    
    this.wrapSelection = function(before, after) {
      var r = this.getSelectionRange();
      if (r) {
        after && cp.put(after, r.end.line, r.end.column);
        before && cp.put(before, r.start.line, r.start.column) && selection.move(before.length, r.start.line == r.end.line ? before.length : 0);
      }
    }
    this.selectAll = function() {
      this.setSelectionRange(0, 0, data.size - 1, cp.getTextAtLine(-1).length);
    }
    this.clearSelection = function() {
      selection.clear();
      cp.select(cp.caret.dl());
    }
    this.createOverlay = function(classes, removeOn) {
      return new CodePrinter.Overlay(this, classes, removeOn);
    }
    this.removeOverlays = function() {
      var ov = this.overlays, args;
      for (var i = ov.length; i--; ) {
        if (ov[i].isRemovable) {
          ov[i].remove();
        } else {
          if (!args) {
            args = ['refresh'];
            args.push.apply(args, arguments);
          }
          ov[i].emit.apply(ov[i], args);
        }
      }
    }
    this.undo = function() { history.undo(); }
    this.redo = function() { history.redo(); }
    this.getHistory = function(stringify) { return history.getStates(stringify); }
    this.clearHistory = function() { history.clear(); }
    this.each = function() { return data.foreach.apply(data, arguments); }
    this.get = function(i) { return data.get(i); }
    this.lineWithOffset = function(offset) { return data.getLineWithOffset(Math.max(0, Math.min(offset, data.height))); }
    this.from = function() { return from; }
    this.to = function() { return to; }
    this.size = function() { return data.size; }
    this.height = function() { return data.height; }
    
    this.overlays = [];
    this.view = view = [];
    this.scrollTop = 0;
    this.attach(editor);
    history = new History(cp, this, cp.options.historyStackSize, cp.options.historyDelay);
    selection = new Selection(this);
    firstNumber = cp.options.firstLineNumber;
    if (cp.options.lineNumberFormatter instanceof Function) {
      formatter = cp.options.lineNumberFormatter;
    }
    this.updateDefaultHeight();
    selection.on({ done: this.showSelection.bind(this, false) });
    return this;
  }
  
  Caret = function(cp) {
    var line, column, currentDL, lastdet
    , before = '', after = '', tmp
    , styles = {
      vertical: function(css) {
        css.width = 1;
        css.height = cp.options.caretHeight * lastdet.charHeight;
        css.left -= 1;
        return css;
      },
      underline: function(css) {
        css.width = lastdet.charWidth || currentDL.height/2;
        css.height = 1;
        css.top += currentDL.height - 1;
        return css;
      },
      block: function(css) {
        css.width = lastdet.charWidth || currentDL.height/2;
        css.height = cp.options.caretHeight * lastdet.charHeight;
        return css;
      }
    }
    
    this.node = create(cp.caretsContainer, 'div', 'cp-caret');
    
    function setPixelPosition(x, y) {
      if (!this.isDisabled) {
        var css = {}, stl = this.style || cp.options.caretStyle;
        
        x >= 0 && (css.left = this.x = x = Math.floor(Math.max(cp.sizes.paddingLeft, x)));
        y >= 0 && (css.top = this.y = y = Math.floor(y + cp.sizes.paddingTop));
        
        stl != this.style && this.setStyle(stl);
        css = this.drawer(css);
        this.emit('beforeMove', x, y, currentDL, line, this.column());
        this.node.css(css);
        this.emit('move', x, y, currentDL, line, this.column());
      }
      return this;
    }
    function updateDL() {
      if (currentDL) {
        currentDL.setText(before + after);
        forwardParsing(cp, currentDL);
        cp.doc.updateView();
      }
    }
    
    this.dispatch = function(dl, det, c) {
      var t = dl.text, dli = dl.info(), b;
      
      if (b = currentDL !== dl) {
        if (currentDL) currentDL.active = undefined;
        currentDL = dl;
        dl.active = true;
      }
      if (line !== dli.index || b) {
        this.emit('lineChange', dl, dli.index, c);
        line = dli.index;
      }
      if (column !== c) {
        this.emit('columnChange', dl, dli.index, c);
        column = c;
      }
      lastdet = det;
      before = t.substring(0, c);
      after = t.substr(c);
      setPixelPosition.call(this, det.offsetX, det.offsetY + dli.offset);
      cp.select(dl);
    }
    this.setTextBefore = function(str) {
      var col = str.length;
      if (before !== str) {
        before = str;
        updateDL();
        this.position(line, col);
      }
      return this;
    }
    this.setTextAfter = function(str) {
      if (after !== str) {
        after = str;
        updateDL();
        this.position(line, this.column());
      }
      return this;
    }
    this.setTextAtCurrentLine = function(bf, af) {
      var col = bf.length;
      if (before !== bf || after !== af) {
        before = bf;
        after = af;
        updateDL();
        this.position(line, col);
      }
      return this;
    }
    this.textBefore = function() {
      return before;
    }
    this.textAfter = function() {
      return after;
    }
    this.textAtCurrentLine = function(b) {
      return b ? before + after : this.textBefore() + this.textAfter();
    }
    this.getPosition = function() {
      return { line: line ? line + 1 : 1, column: this.column() + 1 };
    }
    this.position = function(l, c) {
      var dl = cp.doc.get(l);
      if (dl) {
        if (c < 0) {
          var t = dl.text;
          c = t.length + c % t.length + 1;
        }
        this.dispatch(dl, cp.doc.measureRect(dl, c), c);
      }
      return this;
    }
    this.target = function(x, y) {
      var m = cp.doc.measurePosition(x, y);
      this.dispatch(m.dl, m, m.column);
      return this;
    }
    this.moveX = function(mv) {
      var abs, t = '', cl = line
      , size = cp.doc.size()
      , bf = this.textBefore()
      , af = this.textAfter();
      
      if (mv >= 0 || cl === 0) {
        abs = mv;
        t = af;
      } else {
        abs = Math.abs(mv);
        t = bf;
      }
      
      if (abs <= t.length) {
        return this.position(cl, Math.max(0, Math.min((bf + af).length, column) + mv));
      }
      while (abs > t.length) {
        abs = abs - t.length - 1;
        cl = cl + (mv > 0) - (mv < 0);
        if (cl < size) {
          t = cp.getTextAtLine(cl);
        } else {
          if (mv >= 0) {
            --cl;
            abs = -1;
          } else {
            mv = cl = abs = 0;
          }
          break;
        }
      }
      return this.position(cl, mv >= 0 ? abs : t.length - abs);
    }
    this.moveY = function(mv) {
      var l;
      mv = line + mv;
      if (mv < 0) {
        mv = column = 0;
      } else if (mv >= (l = cp.doc.size())) {
        column = -1;
        mv = l-1;
      }
      return this.position(mv, column);
    }
    this.offsetX = function() {
      return lastdet ? lastdet.offsetX : 0;
    }
    this.offsetY = function() {
      return lastdet ? lastdet.offsetY : 0;
    }
    this.refresh = function() {
      cp.emit('caretRefresh');
      return this.position(line || 0, column || 0);
    }
    this.dl = function() {
      return currentDL;
    }
    this.isCurrentLine = function(dl) {
      return currentDL === dl;
    }
    this.line = function() {
      return line;
    }
    this.column = function() {
      return before.length;
    }
    this.savePosition = function(onlycolumn) {
      return tmp = [onlycolumn ? null : line, column];
    }
    this.restorePosition = function(save) {
      if (save instanceof Array && save.length == 2) {
        this.position(save[0], save[1]);
      } else {
        tmp != null && this.position(tmp[0], tmp[1]);
        tmp = null;
      }
    }
    this.setStyle = function(style) {
      this.style = style;
      this.node.className = 'cp-caret cp-caret-'+style;
      this.drawer = styles[styles[style] ? style : 'vertical'];
      this.refresh();
    }
    this.activate = function() {
      if (!this.isDisabled) {
        if (cp.options.blinkCaret) this.node.addClass('cp-animation-blink');
        this.isActive = true;
      }
      return this;
    }
    this.focus = function() {
      if (!this.isVisible) {
        this.show().activate();
      } else if (currentDL && !cp.doc.isLineVisible(currentDL)) {
        cp.doc.scrollTo(currentDL.getOffset() - cp.wrapper.offsetHeight/2);
      }
      cp.select(currentDL);
      return this;
    }
    this.blur = function() {
      this.deactivate().hide();
      cp.unselect();
      this.emit('blur');
      return this;
    }
  }
  Caret.prototype = {
    isActive: false,
    isVisible: false,
    isDisabled: false,
    show: function() {
      if (!this.isDisabled) {
        this.node.style.display = '';
        this.isVisible = true;
      }
      return this;
    },
    hide: function() {
      this.node.style.display = 'none';
      this.isVisible = false;
      return this;
    },
    enable: function() {
      this.isDisabled = false;
      this.show().activate();
    },
    disable: function() {
      this.isDisabled = true;
      this.deactivate().hide();
    },
    deactivate: function() {
      this.node.removeClass('cp-animation-blink');
      this.isActive = false;
      return this;
    },
    move: function(x, y) {
      x && this.moveX(x);
      y && this.moveY(y);
      return this;
    }
  }
  
  CodePrinter.Overlay = function(doc, className, removeOn) {
    this.node = div.cloneNode().addClass('cp-overlay', className);
    this.doc = doc;
    if (removeOn instanceof Array) {
      this.emit = function(event) {
        Object.prototype.emit.apply(this, arguments);
        if (removeOn.indexOf(event) >= 0) {
          this.remove();
        }
      }
    }
    return this;
  }
  CodePrinter.Overlay.prototype = {
    reveal: function() {
      if (!this.node.parentNode) {
        this.doc.overlays.push(this);
        this.doc.screen.appendChild(this.node);
        this.emit('$revealed');
      }
    },
    remove: function() {
      var i = this.doc.overlays.indexOf(this);
      i != -1 && this.doc.overlays.splice(i, 1);
      this.node.remove();
      this.emit('$removed');
    },
    removable: function(is) {
      this.isRemovable = !!is;
    }
  }
  
  Stream = function(value, extend) {
    this.pos = 0;
    this.value = value;
    this.length = value.length;
    if (extend) {
      for (var k in extend) {
        this[k] = extend[k];
      }
    }
  }
  Stream.prototype = {
    next: function() { if (this.pos < this.value.length) return this.value.charAt(this.pos++); },
    peek: function() { return this.value.charAt(this.pos) || undefined; },
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
      this.definition = { pos: this.start }.extend(defObject);
    }
  }
  
  ReadStream = function(cp) {
    var rs = this, stack = []
    , dl = cp.doc.get(0)
    , le = cp.getLineEnding(), fn;
    
    $.async(fn = function() {
      var r = 25 + 50 * Math.random(), i = -1;
      
      while (dl && ++i < r) {
        stack.push(dl.text);
        dl = dl.next();
      }
      if (i >= 0) {
        rs.emit('data', stack.join(le));
        stack = [''];
        $.async(fn);
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
  
  CodePrinter.Mode = function(extend) {
    this.name = 'plaintext';
    this.keyMap = {};
    this.onLeftRemoval = {
      '{': '}', '(': ')', '[': ']', '"': '"', "'": "'"
    }
    this.onRightRemoval = {
      '}': '{', ')': '(', ']': '[', '"': '"', "'": "'"
    }
    this.selectionWrappers = {
      '(': ['(', ')'], '[': ['[', ']'], '{': ['{', '}'], '"': '"', "'": "'"
    }
    this.extend(extend instanceof Function ? extend.call(this) : extend);
    this.extension && this.expand(this.extension);
    this.init();
  }
  CodePrinter.Mode.prototype = {
    init: function() {},
    initialState: function() { return; },
    iterator: function(stream, state) {
      var ch = stream.next();
      if (/\s/.test(ch)) {
        stream.take(/^\s+/);
        return 'space';
      }
      stream.take(/^\S+/);
      return 'word';
    },
    compile: function(string) {
      if ('string' == typeof string) {
        var state = this.initialState()
        , node = pre.cloneNode()
        , lines = string.split(eol)
        , l = lines.length;
        
        for (var i = 0; i < l; i++) {
          var stream = new Stream(lines[i]);
          node.innerHTML = '';
          parse(null, this, stream, state, node);
          lines[i] = '<pre>'+node.innerHTML+'</pre>';
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
    'Backspace': function() {
      if (this.doc.issetSelection()) {
        this.doc.removeSelection();
      } else {
        var bf = this.caret.textBefore()
        , af = this.caret.textAfter()
        , chbf = bf.slice(-1), m = bf.match(/ +$/)
        , tw = this.options.tabWidth
        , r = m && m[0] && m[0].length % tw === 0 ? tw : 1;
        
        if (this.parser.onLeftRemoval && this.parser.onLeftRemoval[chbf]) {
          var x = this.parser.onLeftRemoval[chbf];
          if (x instanceof Function) {
            x = x.call(this, chbf, bf, af);
            if (x === false) return false;
          }
          if ('string' === typeof x && af.indexOf(x) === 0) {
            this.caret.moveX(x.length);
            r = chbf + x;
          }
        }
        r = this.removeBeforeCursor(r);
        if (r && this.options.autoComplete && this.hints && !this.hints.match(r)) {
          this.hints.hide();
        }
      }
      return false;
    },
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
        this.insertText(this.options.indentByTabs ? '\t' : ' '.repeat(this.options.tabWidth - this.caret.column() % this.options.tabWidth));
      }
      return false;
    },
    'Enter': function() {
      var bf = this.caret.textBefore()
      , af = this.caret.textAfter()
      , dl = this.caret.dl()
      , s = this.getStateAt(dl, this.caret.column())
      , parser = s.parser;
      
      if (this.options.autoIndent) {
        var indent = this.getIndentAtLine(dl)
        , rest = '', tw = this.options.tabWidth
        , tmp, mv = 0;
        
        if (parser && parser.indent) {
          var tab = this.options.indentByTabs ? '\t' : ' '.repeat(tw)
          , i = parser.indent(s.stream, s.state);
          
          if (i instanceof Array) {
            indent = i.shift();
            while (i.length) {
              rest += '\n' + tab.repeat(indent + i.shift());
            }
          } else {
            indent = i >= 0 ? parseInt(i, 10) : indent;
          }
        }
        tmp = parseIndentation(af, tw);
        tab = tab.repeat(indent);
        if (tmp.indentText && tab.endsWith(tmp.indentText)) {
          tab = tab.slice(0, mv = -tmp.indentText.length);
        }
        this.insertText('\n' + tab + rest, -rest.length - mv);
      } else {
        this.insertText('\n');
      }
      if (parser && parser.afterEnterKey) {
        parser.afterEnterKey.call(this, bf, af);
      }
      return false;
    },
    'Shift Enter': function() {
      this.caret.position(this.caret.line(), -1);
      return this.call('Enter');
    },
    'Esc': function() {
      this.isFullscreen ? this.exitFullscreen() : this.searchEnd();
      return false;
    },
    'PageUp': function() { this.caret.moveY(-50); },
    'PageDown': function() { this.caret.moveY(50); },
    'End': function() { this.caret.position(this.doc.size() - 1, -1); },
    'Home': function() { this.caret.position(0, 0); },
    'Left': function(e, c) {
      c % 2 ? this.caret.move(c - 38, 0) : this.caret.move(0, c - 39);
      this.doc.clearSelection();
      return false;
    },
    'Delete': function() {
      if (this.doc.issetSelection()) {
        this.doc.removeSelection();
      } else {
        var bf = this.caret.textBefore()
        , af = this.caret.textAfter()
        , chaf = af.charAt(0), m = af.match(/^ +/)
        , tw = this.options.tabWidth
        , r = m && m[0] && m[0].length % tw === 0 ? tw : 1;
        
        if (this.parser.onRightRemoval && this.parser.onRightRemoval[chaf]) {
          var x = this.parser.onRightRemoval[chaf];
          if (x instanceof Function) {
            x = x.call(this, chaf, bf, af);
            if (x === false) return false;
          }
          if ('string' === typeof x && bf.slice(-x.length) === x) {
            this.caret.moveX(-x.length);
            r = x + chaf;
          }
        }
        this.removeAfterCursor(r);
      }
      return false;
    },
    '"': function(e, k, ch) {
      if (this.options.insertClosingQuotes) {
        this.textAfterCursor(1) !== ch ? this.caret.textAtCurrentLine().count(ch) % 2 ? this.insertText(ch, 0) : this.insertText(ch + ch, -1) : this.caret.moveX(1);
        return false;
      }
    },
    '(': function(e, k, ch) {
      this.insertText(ch);
      if (this.options.insertClosingBrackets) {
        var af = this.caret.textAfter()[0]
        , cb = complementBracket(ch);
        if (!af || af === cb || !/\w/.test(af)) {
          this.insertText(cb, -cb.length);
        }
      }
      return false;
    },
    ')': function(e, k, ch) {
      if (this.options.insertClosingBrackets && this.textAfterCursor(1) == ch) {
        this.caret.moveX(1);
      } else {
        this.insertText(ch);
      }
      return false;
    },
    'Shift Left': function(e, c) {
      if (!this.doc.issetSelection()) {
        this.doc.beginSelection();
      }
      c % 2 ? this.caret.move(c - 38, 0) : this.caret.move(0, c - 39);
      this.doc.endSelection();
    }
  }
  keyMap.prototype['Down'] = keyMap.prototype['Right'] = keyMap.prototype['Up'] = keyMap.prototype['Left'];
  keyMap.prototype['Shift Down'] = keyMap.prototype['Shift Right'] = keyMap.prototype['Shift Up'] = keyMap.prototype['Shift Left'];
  keyMap.prototype['`'] = keyMap.prototype['\''] = keyMap.prototype['"'];
  keyMap.prototype['['] = keyMap.prototype['{'] = keyMap.prototype['('];
  keyMap.prototype[']'] = keyMap.prototype['}'] = keyMap.prototype[')'];
  
  commands = {
    'A': function(e) {
      if (!this.doc.isAllSelected()) {
        this.doc.selectAll();
        this.emit('cmd.selectAll');
      }
      return false;
    },
    'C': function(e) {
      if (this.doc.issetSelection()) {
        this.emit('cmd.copy');
      }
      return -1;
    },
    'V': function(e) {
      this.doc.removeSelection();
      this.emit('cmd.paste');
      return true;
    },
    'X': function() {
      if (this.doc.issetSelection()) {
        this.doc.removeSelection();
        this.emit('cmd.cut');
      }
      return -1;
    },
    'Z': function(e) {
      e.shiftKey ? this.doc.redo() : this.doc.undo();
      return false;
    }
  }
  
  History = function(cp, doc, stackSize, delay) {
    var states, initialState
    , index, timeout, muted, performed;
    
    this.undo = function() {
      if (0 <= index && index <= states.length && states.length) {
        var state;
        muted = true;
        if (timeout == null) {
          state = states[--index];
        } else {
          timeout = clearTimeout(timeout);
          state = states[index];
        }
        doc.clearSelection();
        if (state) {
          for (var i = state.length - 1; i >= 0; i--) {
            var a = state[i];
            cp.caret.position(a.line, a.column);
            a.added ? cp.removeAfterCursor(a.text) : cp.insertText(a.text);
          }
          this.emit('undo', state);
          muted = false;
          performed = true;
        }
      }
    }
    this.redo = function() {
      if (index < 0) index = 0;
      if (index < states.length) {
        timeout = clearTimeout(timeout);
        muted = true;
        var state = states[index];
        doc.clearSelection();
        if (state) {
          for (var i = 0; i < state.length; i++) {
            var a = state[i];
            cp.caret.position(a.line, a.column);
            a.added ? cp.insertText(a.text) : cp.removeAfterCursor(a.text);
          }
          this.emit('redo', state);
          ++index;
          muted = false;
          performed = true;
        }
      }
    }
    this.pushChanges = function(line, column, text, added) {
      if (!muted && arguments.length == 4) {
        if (performed && index < states.length) {
          states.splice(index, states.length - index);
        }
        performed = false;
        if (!states[index]) {
          states[index] = [{ line: line, column: column, text: text, added: added }];
        } else {
          var last = states[index].last(), b = false;
          if (last.line == line && added == last.added) {
            if (b = (last.column + (added ? last.text.length : '') == column)) {
              last.text += text;
            } else if (b = (column + text.length == last.column)) {
              last.text = text + last.text;
              last.column = column;
            }
          }
          !b && states[index].push({ line: line, column: column, text: text, added: added });
        }
        timeout = clearTimeout(timeout) || setTimeout(this.save, delay);
      }
      return this;
    }
    this.save = function() {
      timeout = null;
      ++index;
      while (states.length >= stackSize) {
        shift();
      }
    }
    this.clear = function() {
      states = [];
      initialState = [];
      index = 0;
      timeout = null;
      muted = performed = false;
    }
    this.getStates = function(stringify) {
      var str  = JSON.stringify(states);
      return stringify ? str : JSON.parse(str);
    }
    function shift() {
      var state = states.shift();
      if (state) {
        initialState.push.apply(initialState, state);
        --index;
      }
    }
    this.clear();
  }
  
  Selection = function(doc) {
    var coords = [], make = function() {
      if (coords.length == 2 && (coords[1][0] < coords[0][0] || coords[0][0] === coords[1][0] && coords[1][1] < coords[0][1])) {
        this.start = { line: coords[1][0], column: coords[1][1] }
        this.end = { line: coords[0][0], column: coords[0][1] }
      } else {
        this.start = { line: coords[0][0], column: coords[0][1] }
        this.end = { line: coords[1][0], column: coords[1][1] }
      }
      this.emit('done', this.start, this.end);
    }
    this.overlay = new CodePrinter.Overlay(doc, 'cp-selection-overlay');
    
    this.clear = function() {
      this.overlay.remove();
      coords = [];
      return this;
    }
    this.setStart = function(line, column) {
      coords[0] = [line, column];
      this.emit('started', { line: line, column: column });
    }
    this.setEnd = function(line, column) {
      if (coords[0]) {
        coords[1] = [line, column];
        make.call(this);
      }
    }
    this.isset = function() {
      return coords && coords.length == 2;
    }
    this.coords = function() {
      return [[this.start.line, this.start.column], [this.end.line, this.end.column]];
    }
    return this;
  }
  Selection.prototype = {
    inSelection: function(line, column) {
      var c = this.coords();
      return line == Math.max(c[0][0], Math.min(line, c[1][0]))
      && (line != c[0][0] || column >= c[0][1])
      && (line != c[1][0] || column <= c[1][1]);
    },
    move: function(start, end) {
      if (start != null) this.start.column += start;
      if (end != null) this.end.column += end;
      this.emit('done', this.start, this.end);
    }
  }
  
  lineendings = { 'LF': '\n', 'CR': '\r', 'LF+CR': '\n\r', 'CR+LF': '\r\n' }
  CodePrinter.aliases = { 'js': 'javascript', 'htm': 'html', 'less': 'css', 'h': 'c++', 'cpp': 'c++', 'rb': 'ruby', 'pl': 'perl',
    'sh': 'bash', 'adb': 'ada', 'coffee': 'coffeescript', 'md': 'markdown', 'svg': 'xml', 'plist': 'xml', 'yml': 'yaml' };
  CodePrinter.matching = {'brackets': {}};
  
  var brackets = ['{', '(', '[', '}', ')', ']'];
  for (var i = 0; i < brackets.length; i++) {
    CodePrinter.matching.brackets[brackets[i]] = {
      direction: i < 3 ? 'right' : 'left',
      style: 'bracket',
      value: complementBracket(brackets[i])
    }
  }
  
  CodePrinter.requireMode = function(req, cb, del) {
    $.require('CodePrinter/'+req, cb, del);
  }
  CodePrinter.defineMode = function(name, req, func) {
    if (arguments.length === 2) {
      func = req;
      req = null;
    }
    if (req) {
      for (var i = 0; i < req.length; i++) {
        req[i] = 'CodePrinter/'+(CodePrinter.aliases[req[i]] || req[i]);
      }
    }
    $.define('CodePrinter/'+name, req, func);
    $.require('CodePrinter/'+name, function(mode) {
      mode.name = name;
      CodePrinter.emit(name+':loaded', mode);
    });
  }
  CodePrinter.hasMode = function(name) {
    return $.require.has('CodePrinter/'+name);
  }
  CodePrinter.requireAddon = function(name, cb, del) {
    $.require('CodePrinter/addons/'+name, cb, del);
  }
  CodePrinter.defineAddon = function(name, obj) {
    $.define('CodePrinter/addons/'+name, obj);
  }
  CodePrinter.registerExtension = function(ext, parserName) {
    CodePrinter.aliases[ext.toLowerCase()] = parserName.toLowerCase();
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
  CodePrinter.instances = [];
  
  window.addEventListener('resize', function() {
    CodePrinter.instances.each(function(cp) {
      cp.doc && cp.doc.updateView();
      cp.caret.refresh();
    });
  });
  
  function buildDOM(cp) {
    cp.mainNode = document.createElement('div').addClass('codeprinter');
    cp.body = create(cp.mainNode, 'div', 'cp-body');
    cp.container = create(cp.body, 'div', 'cp-container');
    cp.input = create(cp.container, 'textarea', 'cp-input');
    cp.counter = create(cp.container, 'div', 'cp-counter');
    cp.counterChild = create(cp.counter, 'div', 'cp-counter-child');
    cp.counterOL = create(cp.counterChild, 'ol', 'cp-counter-ol');
    cp.wrapper = create(cp.container, 'div', 'cp-wrapper');
    cp.caretsContainer = create(cp.wrapper, 'div', 'cp-carets');
    cp.screen = create(cp.wrapper, 'div', 'cp-screen');
    cp.code = create(cp.screen, 'div', 'cp-code');
    cp.measure = create(cp.screen, 'div', 'cp-measure');
    cp.measure.appendChild(pre.cloneNode());
    cp.input.tabIndex = cp.options.tabIndex;
    cp.input.autofocus = cp.options.autoFocus;
  }
  function create(parent, tag, className) {
    var d = document.createElement(tag);
    d.className = className;
    parent.appendChild(d);
    return d;
  }
  function createSelectionNode(node, top, left, width, height, right) {
    var style = 'top:'+(top+this.sizes.paddingTop)+'px;left:'+left+'px;height:'+height+'px;';
    node.addClass('cp-selection');
    if (width != null) style += 'width:'+width+'px;';
    if (right != null) style += 'right:'+(right+this.sizes.paddingLeft)+'px;';
    node.setAttribute('style', style);
    return node;
  }
  function getMatchingObject(m) {
    if ('string' === typeof m) return CodePrinter.matching[m];
    return m;
  }
  function tabString(cp) {
    return cp.options.indentByTabs ? '\t' : ' '.repeat(cp.options.tabWidth);
  }
  function wheelDelta(e) {
    var x = e.wheelDeltaX, y = e.wheelDeltaY;
    if (x == null && e.axis === e.HORIZONTAL_AXIS) x = e.detail;
    if (y == null) y = e.axis === e.VERTICAL_AXIS ? e.detail : e.wheelDelta;
    return { x: x, y: y };
  }
  function wheel(doc, node, e, speed, x, y) {
    if (x) { node._lockedScrolling = true; node.scrollLeft += speed * x; }
    if (y) doc.scrollTo(node.scrollTop + speed * y);
    return e.cancel(true);
  }
  function getLineClasses(line) {
    var isact = line.node && line.node.hasClass(activeClassName);
    if (isact) {
      var cls = activeClassName;
      if (line.classes && line.classes.length) cls += ' '+line.classes.join(' ');
      return cls;
    }
    return line.classes ? line.classes.join(' ') : '';
  }
  function init(dl, node, counter) {
    dl.node = pre.cloneNode();
    dl.counter = li.cloneNode();
    dl.counter.appendChild(document.createTextNode(''));
    dl.counter.style.lineHeight = dl.height + 'px';
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
    if (c.height != dl.height) co.style.lineHeight = dl.height + 'px';
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
  function maybeExternalMeasure(cp, dl) {
    return dl.node || externalMeasure(cp, dl);
  }
  function externalMeasure(cp, dl) {
    var o = dl.node, n = dl.node = cp.measure.firstChild;
    cp.parse(dl); dl.node = o;
    return n;
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
  function functionSnippet(cp, snippet) {
    var s = cp.getStateAt(cp.caret.dl(), cp.caret.column());
    return snippet.call(s.parser, s.stream, s.state);
  }
  function searchOverLine(find, dl, line, offset) {
    var results = this.searches.results
    , text = dl.text, ln = 0, i, j = 0
    , match, startflag = find.source.search(/(^|[^\\])\^/) >= 0;
    
    while (text && (i = text.search(find)) !== -1) {
      if (match = RegExp.lastMatch) {
        var cur = results[line] = results[line] || [];
        cur.push({ value: match, line: line, startColumn: ln + i, length: match.length, offset: offset });
        ++j;
      }
      if (startflag && ln + i === 0) break;
      var d = (i + match.length) || 1;
      ln += d;
      text = text.substr(d);
    }
    return j;
  }
  function searchAppendResult(dl, res) {
    for (var i = 0; i < res.length; i++) {
      var node = res[i].node;
      if (!node) {
        node = span.cloneNode();
        node.appendChild(document.createTextNode(''));
      }
      node.className = 'cp-search-occurrence';
      node.firstChild.nodeValue = res[i].value;
      searchUpdateNode.call(this, dl, node, res[i]);
      this.searches.overlay.node.appendChild(node);
    }
  }
  function searchUpdateNode(dl, node, res) {
    var rect = this.doc.measureRect(dl, res.startColumn, res.startColumn + res.length);
    node._searchResult = res;
    node.setAttribute('style', rect.width ? 'top:'+(this.sizes.paddingTop+dl.getOffset()+rect.offsetY)+'px;left:'+rect.offsetX+'px;width:'+(rect.width+2)+'px;height:'+(rect.charHeight+2)+'px;' : 'display:none;');
    res.node = node;
    if (this.searches.active === res && scroll !== false) {
      node.addClass('active');
      this.wrapper.scrollLeft = rect.offsetX - this.wrapper.clientWidth / 2;
    }
  }
  
  return window.CodePrinter = CodePrinter;
});