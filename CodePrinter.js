/*
 * CodePrinter.js
 *
 * Copyright (C) 2013-2014 Tomasz Sapeta (@tsapeta)
 * Released under the MIT License.
 *
 * author:  Tomasz Sapeta
 * version: 0.6.2
 * source:  https://github.com/tsapeta/CodePrinter
 */

"use strict";

if (!define) var define = function() { arguments[2]($ || Selector); }

define('CodePrinter', ['Selector'], function($) {
    var CodePrinter, Data, Branch, Line
    , Caret, Document, StreamArray, Stream
    , History, Selection, keyMap, commands
    , tracking, lineendings, extensions
    , div, li, pre, span
    , BRANCH_OPTIMAL_SIZE = 40
    , wheelUnit = $.browser.webkit ? -1/3 : $.browser.firefox ? 15 : $.browser.ie ? -0.53 : null
    , setImmediate = window.global && window.global.setImmediate || window.setImmediate || function(fn) { return setTimeout(fn, 1); };
    
    $.scripts.registerNamespace('CodePrinter', 'mode/');
    
    CodePrinter = function(source, options) {
        if (arguments.length === 1 && source == '[object Object]') {
            options = source;
            source = null;
        }
        options = this.options = $.extend({}, CodePrinter.defaults, options);
        buildDOM(this);
        this.prepare();
        
        if (source && source.nodeType) {
            this.document.init((source.tagName.toLowerCase() === 'textarea' ? source.value : source.innerHTML).decode());
            source.before(this.mainElement);
        } else {
            this.document.init(source);
        }
        return this.print();
    }
    
    CodePrinter.version = '0.6.2';
    
    CodePrinter.defaults = {
        path: '',
        mode: 'plaintext',
        theme: 'default',
        caretStyle: 'vertical',
        lineEndings: '\n',
        width: 'auto',
        height: 300,
        tabWidth: 4,
        tabIndex: -1,
        fontSize: 11,
        fontFamily: 'Menlo, Monaco, Consolas, Courier, monospace',
        minFontSize: 6,
        maxFontSize: 60,
        keyupInactivityTimeout: 1500,
        caretBlinkSpeed: 400,
        scrollSpeed: 1,
        autoScrollSpeed: 20,
        historyStackSize: 100,
        historyDelay: 500,
        firstLineNumber: 1,
        lineNumbers: true,
        lineNumberFormatter: false,
        autofocus: true,
        readOnly: false,
        showIndentation: true,
        tracking: true,
        history: true,
        highlightBrackets: true,
        highlightCurrentLine: true,
        blinkCaret: true,
        autoScroll: true,
        indentNewLines: true,
        insertClosingBrackets: true,
        insertClosingQuotes: true,
        tabTriggers: true,
        shortcuts: true,
        keyCombinationFlag: 1
    }
    
    div = document.createElement('div');
    li = document.createElement('li');
    pre = document.createElement('pre');
    span = document.createElement('span');
    
    CodePrinter.prototype = {
        isFullscreen: false,
        prepare: function() {
            if (this.document) return;
            var self = this
            , options = this.options
            , lastScrollTop = 0, lock, counterSelection = []
            , doc, sizes, allowKeyup, activeLine
            , isMouseDown, moveevent, moveselection
            , T, T2, fn;
            
            this.mainElement.CodePrinter = this;
            sizes = this.sizes = { scrollTop: 0, paddingTop: 5, paddingLeft: 10 };
            this.overlays = [];
            this.snippets = [];
            doc = this.document = new Document(this);
            this.keyMap = new keyMap;
            this.setTheme(options.theme);
            this.setMode(options.mode);
            
            options.lineNumbers && this.openCounter();
            options.showIndentation || this.mainElement.addClass('without-indentation');
            options.readOnly && this.caret.disable();
            options.snippets && this.snippets.push.apply(this.snippets, options.snippets);
            options.mode !== 'plaintext' && CodePrinter.requireMode(options.mode);
            options.width !== 'auto' && this.setWidth(options.width);
            options.height !== 300 && this.setHeight(options.height);
            options.fontSize !== 11 && setImmediate(this.setFontSize.bind(this, options.fontSize));
            
            function mouseController(e) {
                if (e.button > 0 || e.which > 1 || e.defaultPrevented) return false;
                
                var sl = self.wrapper.scrollLeft
                , st = self.wrapper.scrollTop
                , o = sizes.bounds = sizes.bounds || self.wrapper.bounds()
                , x = Math.max(0, sl + e.pageX - o.x)
                , y = e.pageY < o.y ? 0 : e.pageY <= o.y + self.wrapper.clientHeight ? st + e.pageY - o.y - sizes.paddingTop : self.wrapper.scrollHeight
                , ry = Math.max(0, Math.min(y, doc.height()));
                
                self.input.focus();
                self.caret.target(doc.lineWithOffset(ry), x);
                var l = self.caret.line(), c = self.caret.column();
                
                if (e.type === 'mousedown') {
                    isMouseDown = true;
                    if (doc.inSelection(l, c) && ry === y) {
                        moveselection = true;
                        window.on('mousemove', mouseController);
                        window.once('mouseup', function() {
                            window.off('mousemove', mouseController);
                            if (moveselection > 1) {
                                var savedpos = self.caret.savePosition();
                                if (moveselection && doc.issetSelection() && !doc.inSelection(savedpos[0], savedpos[1])) {
                                    var selection = doc.getSelection()
                                    , sel = doc.getSelectionRange()
                                    , isbf = self.cursorIsBeforePosition(sel.start.line, sel.start.column);
                                    
                                    self.caret.position(sel.end.line, sel.end.column);
                                    if (!isbf) {
                                        savedpos[0] -= sel.end.line - sel.start.line;
                                    }
                                    doc.removeSelection();
                                    self.caret.restorePosition(savedpos);
                                    self.insertSelectedText(selection);
                                } else {
                                    doc.clearSelection();
                                    mouseController(arguments[0]);
                                }
                            } else {
                                self.input.focus();
                            }
                            return isMouseDown = moveselection = e.cancel();
                        });
                    } else {
                        self.input.value = '';
                        self.caret.deactivate().show();
                        self.document.beginSelection();
                        window.on('mousemove', mouseController);
                        window.once('mouseup', function(e) {
                            !doc.issetSelection() && doc.clearSelection();
                            window.off('mousemove', mouseController);
                            self.caret.activate();
                            self.sizes.bounds = moveevent = null;
                            document.activeElement != self.input && ($.browser.firefox ? setImmediate(function() { self.input.focus() }) : self.input.focus());
                            return isMouseDown = e.cancel();
                        });
                    }
                } else if (!moveselection) {
                    moveevent = e;
                    doc.endSelection();
                    
                    if (e.pageY > o.y && e.pageY < o.y + self.wrapper.clientHeight) {
                        var i = e.pageY <= o.y + 2 * sizes.lineHeight ? -1 : e.pageY >= o.y + self.wrapper.clientHeight - 2 * sizes.lineHeight ? 1 : 0;
                        i && setTimeout(function() {
                            if (moveevent) {
                                self.wrapper.scrollTop += i * sizes.lineHeight / 2;
                                mouseController(moveevent);
                            }
                        }, 50);
                        return e.cancel();
                    }
                } else {
                    ++moveselection;
                }
            }
            function mousewheel(e) {
                var x = e.wheelDeltaX, y = e.wheelDeltaY;
                
                if (x == null && e.axis === e.HORIZONTAL_AXIS) x = e.detail;
                if (y == null) y = e.axis === e.VERTICAL_AXIS ? e.detail : e.wheelDelta;
                
                if (x) {
                    if (!y && this.clientWidth >= this.scrollWidth) return;
                    var pixels = wheelUnit * options.scrollSpeed * x;
                    this.scrollLeft += pixels;
                }
                if (y) {
                    var pixels = wheelUnit * options.scrollSpeed * y
                    , cH = this.clientHeight
                    , sH = this.scrollHeight;
                    
                    if (cH >= sH) return;
                    if (pixels < -60) pixels = -60;
                    else if (pixels > 60) pixels = 60;
                    
                    lock = true;
                    doc.scroll(pixels, sH - cH);
                    self.counter.scrollTop = this.scrollTop += pixels;
                }
                return e.cancel();
            }
            
            this.wrapper.listen({
                mousewheel: mousewheel,
                DOMMouseScroll: mousewheel,
                scroll: function(e) {
                    if (!lock) {
                        lock = true;
                        var st = this.scrollTop;
                        doc.scrollTo(st, false);
                        self.counter.scrollTop = st;
                    }
                    lock = false;
                },
                dblclick: function() {
                    var bf = self.caret.textBefore()
                    , af = self.caret.textAfter()
                    , line = self.caret.line()
                    , c = self.caret.column()
                    , l = 1, r = 0, rgx, timeout;
                    
                    var tripleclick = function() {
                        doc.setSelectionRange(line, 0, line+1, 0);
                        self.caret.position(line+1, 0);
                        this.unlisten('click', tripleclick);
                        timeout = clearTimeout(timeout);
                    }
                    this.listen({ 'click': tripleclick });
                    timeout = setTimeout(function() { self.wrapper.unlisten('click', tripleclick); }, 1000);
                    
                    rgx = bf[c-l] == ' ' || af[r] == ' ' ? /\s/ : !isNaN(bf[c-l]) || !isNaN(af[r]) ? /\d/ : /^\w$/.test(bf[c-l]) || /^\w$/.test(af[r]) ? /\w/ : /[^\w\s]/;
                    
                    while (l <= c && rgx.test(bf[c-l])) l++;
                    while (r < af.length && rgx.test(af[r])) r++;
                    
                    if (c-l+1 != c+r) {
                        doc.setSelectionRange(line, c-l+1, line, c+r);
                    }
                },
                mousedown: mouseController
            });
            
            this.input.listen({
                focus: function() {
                    self.caret.focus();
                    self.mainElement.removeClass('inactive');
                },
                blur: function() {
                    if (isMouseDown) {
                        this.focus();
                    } else {
                        self.caret.blur();
                        self.mainElement.addClass('inactive');
                        self.removeOverlays('blur');
                    }
                },
                keydown: function(e) {
                    var kc, code = e.getCharCode()
                    , ch = String.fromCharCode(code)
                    , iscmd = $.browser.macosx ? e.metaKey : e.ctrlKey
                    , kc = e.getKeyCombination(options.keyCombinationFlag);
                    
                    self.caret.deactivate().show();
                    allowKeyup = true;
                    
                    if (iscmd) {
                        if (doc.issetSelection() && kc.indexOf('+') === -1) {
                            this.value = doc.getSelection();
                            this.setSelectionRange(0, this.value.length);
                        } else if (ch in commands) {
                            allowKeyup = commands[ch].call(self, e, code, ch);
                            if (allowKeyup === false) e.cancel();
                            return allowKeyup;
                        } else {
                            this.value = '';
                        }
                    }
                    if (options.readOnly && (code < 37 || code > 40)) return;
                    if (code < 48 && code != 9 && !(kc in self.keyMap)) {
                        kc = e.getKeyCombination(options.keyCombinationFlag | 4);
                    }
                    if (kc.length > 1 && (!/^[A-Z0-9]+$/i.test(ch) || !e.hasModifierKey() || options.shortcuts) && kc in self.keyMap) {
                        allowKeyup = self.keyMap[kc].call(self, e, code, kc);
                    }
                    if (!allowKeyup || 16 <= code && code <= 20 || 91 <= code && code <= 95 || 112 <= code && code <= 145 || code == 224) {
                        return allowKeyup = e.cancel();
                    }
                    return allowKeyup;
                },
                keypress: function(e) {
                    if (options.readOnly) return;
                    var a, code = e.getCharCode()
                    , ch = String.fromCharCode(code);
                    
                    if (allowKeyup > 0 && e.ctrlKey != true && e.metaKey != true) {
                        if (doc.issetSelection() && (a = self.parser.selectionWrappers[ch])) {
                            doc.wrapSelection(a[0], a[1]);
                            allowKeyup = false;
                        } else if (ch in self.parser.keyMap) {
                            allowKeyup = self.parser.keyMap[ch].call(self, e, code, ch);
                        }
                        if (allowKeyup !== false) {
                            (ch in self.keyMap ? self.keyMap[ch].call(self, e, code, ch) !== false : true) && self.insertText(ch);
                            this.value = '';
                            return e.cancel();
                        }
                    }
                },
                keyup: function(e) {
                    if (options.readOnly) return;
                    if (self.caret.isVisible) self.caret.activate();
                    if (allowKeyup > 0 && e.ctrlKey != true && e.metaKey != true) {
                        this.value.length && self.insertText(this.value);
                        T = clearTimeout(T) || setTimeout(function() { self.forcePrint(); }, options.keyupInactivityTimeout);
                    }
                    this.value = '';
                }
            });
            
            this.select = function(dl) {
                this.unselect();
                if (this.options.highlightCurrentLine && !moveselection && !doc.issetSelection() && this.caret.isVisible && dl && dl.node && dl.counter) {
                    dl.node.className = dl.counter.className = 'cp-active-line';
                    dl.active = true;
                    activeLine = dl;
                }
            }
            this.unselect = function() {
                if (activeLine && activeLine.node) {
                    activeLine.node.className = activeLine.counter.className = '';
                    delete activeLine.active;
                }
                activeLine = null;
            }
            
            this.caret.on({
                move: function(x, y, dl, line, column) {
                    if (options.autoScroll) {
                        var wrapper = self.wrapper
                        , pl = sizes.paddingLeft, pt = sizes.paddingTop
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
                        doc.scrollTo(Math.max(0, Math.min(st, wrapper.scrollHeight - ch)));
                    }
                    if (options.tracking) {
                        T2 = clearTimeout(T2);
                        var a, b, before = this.textBefore(), after = this.textAfter();
                        for (var s in self.tracking) {
                            var len = s.length, i = 0;
                            do {
                                a = len == i || before.endsWith(s.substring(0, len - i));
                                b = after.startsWith(s.substring(len - i, len));
                            } while ((!a || !b) && ++i <= len);
                            
                            if (a && b) {
                                T2 = setTimeout(function() {
                                    var r = self.tracking[s].call(self, s, before+after, { line: line, columnStart: column - len + i, columnEnd: column + i });
                                    r === false && self.highlightOverlay && self.highlightOverlay.remove();
                                }, 40);
                                break;
                            }
                        }
                        if ((!a || !b) && self.highlightOverlay) {
                            self.highlightOverlay.remove();
                        }
                    }
                    self.removeOverlays('caret');
                }
            });
            
            function counterMousemove(e) {
                var dli, min, max, range;
                if (dli = e.target._dl && e.target._dl.info()) {
                    counterSelection[1] = dli.index;
                    min = Math.min.apply(Math, counterSelection);
                    max = Math.max.apply(Math, counterSelection);
                    doc.setSelectionRange(min, 0, max + 1, 0);
                    if (range = doc.getSelectionRange()) {
                        var tmp = min === counterSelection[0] ? range.end : range.start;
                        self.caret.position(tmp.line, tmp.column);
                    }
                }
            }
            function counterMouseup(e) {
                this.removeEventListener('mousemove', counterMousemove);
                this.removeEventListener('mouseup', counterMouseup);
                
                if (counterSelection.length === 1) {
                    var range, min = counterSelection[0];
                    doc.setSelectionRange(min, 0, min + 1, 0);
                    if (range = doc.getSelectionRange()) self.caret.position(range.end.line, range.end.column);
                }
                counterSelection.length = 0;
                isMouseDown = false;
            }
            
            this.counter.delegate('mousedown', 'li', function() {
                var dli = this._dl && this._dl.info();
                if (dli) {
                    counterSelection[0] = this._dl.info().index;
                    self.input.focus();
                    isMouseDown = true;
                    window.addEventListener('mousemove', counterMousemove, false);
                    window.addEventListener('mouseup', counterMouseup, false);
                }
            });
        },
        print: function(mode, source) {
            mode && this.setMode(mode);
            mode = this.options.mode;
            source && this.document.init(source);
            
            function callback(ModeObject) {
                var b = !this.parser;
                this.defineParser(ModeObject);
                this.document.fill();
                this.forcePrint();
                if (this.options.autofocus) {
                    this.input.focus();
                    this.caret.position(0, 0);
                }
                if (b) {
                    setImmediate(this.emit.bind(this, 'ready'));
                }
            }
            
            if (mode === 'plaintext') {
                callback.call(this, new CodePrinter.Mode('plaintext'));
            } else if (this.parser && this.parser.name.toLowerCase() === mode) {
                callback.call(this, this.parser);
            } else {
                if (!CodePrinter.hasMode(mode)) {
                    var that = this;
                    this.document.eachVisibleLines(function(line) {
                        that.parse(line);
                    });
                }
                CodePrinter.requireMode(mode, callback, this);
            }
            return this;
        },
        forcePrint: function() {
            this.memory = this.parser.memoryAlloc();
            this.document.isFilled = undefined;
            
            this.intervalIterate(function(dl, line, offset) {
                return this.parse(dl, true);
            }, function() {
                this.emit('printed');
            }, 10);
        },
        intervalIterate: function(callback, onend, options) {
            if (!(onend instanceof Function) && arguments.length === 2) options = onend;
            var that = this, dl = this.document.get(0), fn
            , index = -1, offset = 0, queue = 150;
            
            if (options) {
                if (options.queue) queue = options.queue;
                if ('number' === typeof options.start) dl = this.document.get(options.start);
                else if (options.start instanceof Line) dl = options.start;
            }
            
            setImmediate(fn = function() {
                var j = 0, r;
                while (dl && j++ < queue) {
                    r = callback.call(that, dl, ++index, offset);
                    offset += dl.height;
                    dl = r ? r.next() : r == null ? dl.next() : null;
                }
                if (!dl) {
                    onend instanceof Function && onend.call(that, index);
                    return false;
                }
                setImmediate(fn);
            });
        },
        defineParser: function(parser) {
            if (parser instanceof CodePrinter.Mode && this.parser !== parser) {
                this.parser = parser;
                this.memory = parser.memoryAlloc();
                this.tracking = (new tracking(this)).extend(parser.tracking);
            }
        },
        parse: function(dl, force, state) {
            if (dl != null) {
                dl = 'number' === typeof dl ? this.document.get(dl) : dl;
                
                if (!this.parser || this.parser.name === 'plaintext') {
                    var p = '', i = 0, l = dl.text.length;
                    while (i < l && dl.text[i] === '\t') {
                        p += '<span class="cpx-tab">'+(Array(this.options.tabWidth+1).join(' '))+'</span>';
                        ++i;
                    }
                    if (i < l) p += '<span>'+this.convertToSpaces(dl.text.substr(i)).encode()+'</span>';
                    if (!p) p = '&#8203;';
                    dl.setParsed(p);
                } else if (!dl.parsed || dl.changed & 1 || force) {
                    if (arguments.length < 3) {
                        state = dl.prev()
                        state = state && state.stateAfter;
                    }
                    var text = dl.text, i = -1, p = '', tab = this.tabString(), stream, b;
                    
                    while (++i < dl.text.length && dl.text[i] === '\t') {
                        p += '<span class="cpx-tab">'+tab+'</span>';
                    }
                    if (i) text = text.substr(i);
                    
                    if (!text) {
                        dl.setParsed(p || '&#8203;');
                        if (b = state) {
                            dl.stateAfter = state;
                        } else if (b = dl.stateAfter) {
                            delete dl.stateAfter;
                        }
                        if (b && !this._inserting) {
                            var next = dl.next();
                            if (next) return this.parse(next, true, dl.stateAfter);
                        }
                    } else {
                        stream = new Stream(text, {
                            stateBefore: state,
                            testNextLine: function(rgx) {
                                if (rgx instanceof RegExp) {
                                    var next = dl.next();
                                    if (next) return rgx.test(next.text);
                                }
                                return false;
                            }
                        });
                        
                        this.parser.parse(stream, this.memory);
                        dl.setParsed(p + stream.toString());
                        var keys = dl.stateAfter && Object.keys(dl.stateAfter);
                        
                        if (stream.stateAfter) {
                            dl.stateAfter = stream.stateAfter;
                            b = keys ? keys.toString() !== Object.keys(dl.stateAfter).toString() : true;
                        } else if (b = dl.stateAfter) {
                            dl.stateAfter = undefined;
                        }
                        if (b && !this._inserting) {
                            var next = dl.next();
                            if (next) return this.parse(next, true, dl.stateAfter);
                        }
                    }
                }
            }
            return dl;
        },
        focus: function() {
            setImmediate(this.input.focus.bind(this.input));
        },
        requireStyle: function(style, callback) {
            $.require($.glue(this.options.path, 'theme', style+'.css'), callback);
        },
        tabString: function(m) {
            m == null && (m = 1);
            return m <= 0 ? '' : Array(m*this.options.tabWidth+1).join(' ');
        },
        setOptions: function(key, value) {
            if (this.options[key] !== value) {
                this.options[key] = value;
                if (key === 'tracking' && value) {
                    this.caret.tracking = (new tracking(this)).extend(this.parser && this.parser.tracking);
                }
            }
            return this;
        },
        setTabWidth: function(tw) {
            if (typeof tw === 'number' && tw >= 0) {
                var self = this;
                self.options.tabWidth = tw;
                
                this.intervalIterate(function(dl) {
                    return this.parse(dl, true);
                });
            }
            return this;
        },
        setLineEndings: function(le) {
            le = le.toUpperCase();
            this.options.lineEndings = lineendings[le] || this.options.lineEndings || '\n';
            return this;
        },
        setTheme: function(name, dontrequire) {
            typeof name === 'string' && name !== 'default' ? dontrequire != true && this.requireStyle(name) : name = 'default';
            this.mainElement.removeClass('cps-'+this.options.theme.toLowerCase()).addClass('cps-'+(this.options.theme = name.replace(' ', '-')).toLowerCase());
            return this;
        },
        setMode: function(mode) {
            var mlc = mode.toLowerCase();
            mode = extensions[mlc] || mlc || 'plaintext';
            this.mainElement.removeClass('cp-'+this.options.mode.toLowerCase()).addClass('cp-'+mode.toLowerCase());
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
            size = Math.max(this.options.minFontSize, Math.min(size, this.options.maxFontSize));
            if (size != this.sizes.fontSize) {
                var dl = this.document.get(0);
                this.wrapper.style.fontSize = this.counter.style.fontSize = (this.sizes.fontSize = size) + 'px';
                this.document.updateDefaultHeight();
                
                this.intervalIterate(function(dl) {
                    dl.node && dl.updateHeight(true);
                    return dl;
                }, function() {
                    this.document.fill();
                    this.caret.refresh();
                    this.emit('fontsize:changed', size);
                });
            }
            return this;
        },
        increaseFontSize: function() { this.setFontSize(this.sizes.fontSize+1); },
        decreaseFontSize: function() { this.setFontSize(this.sizes.fontSize-1); },
        setWidth: function(size) {
            if (size == 'auto') {
                this.mainElement.style.removeProperty('width');
            } else {
                this.mainElement.style.width = (this.options.width = parseInt(size)) + 'px';
            }
            this.emit('width:changed');
            return this;
        },
        setHeight: function(size) {
            if (size == 'auto') {
                this.container.style.removeProperty('height');
            } else {
                this.container.style.height = this.container.style.flexBasis = this.container.style.MozFlexBasis = (this.options.height = parseInt(size)) + 'px';
            }
            this.emit('height:changed');
            return this;
        },
        showIndentation: function() {
            this.options.showIndentation = true;
            this.mainElement.removeClass('without-indentation');
        },
        hideIndentation: function() {
            this.options.showIndentation = false;
            this.mainElement.addClass('without-indentation');
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
                l = this.document.lines();
                line = l + line % l;
            }
            if (dl = this.document.get(line)) {
                if (column == null) column = 0;
                if (column < 0) {
                    t = this.convertToSpaces(dl.text);
                    column = t.length + column % t.length + 1;
                }
                this.caret.target(dl, column, true);
            }
        },
        getTextAtLine: function(line) {
            var dl = this.document.get(line < 0 ? this.document.lines() + line : line);
            return dl ? this.convertToSpaces(dl.text) : '';
        },
        getIndentAtLine: function(line, dl) {
            var i = -1;
            dl = dl || this.document.get(line);
            if (dl) {
                while (dl.text[++i] === '\t');
                return i;
            }
            return 0;
        },
        setIndentAtLine: function(line, indent) {
            indent = Math.max(0, indent);
            var dl = this.document.get(line), old, diff;
            if (dl) {
                old = this.getIndentAtLine(old, dl);
                diff = indent - old;
                dl.setText('\t'.repeat(indent) + dl.text.replace(/^\t*/g, ''));
                this.caret.line() == line && this.caret.moveX(diff * this.options.tabWidth);
                this.emit('changed', { line: line, column: 0, text: '\t'.repeat(Math.abs(diff)), added: diff > 0 });
            }
        },
        indent: function(line) {
            var range;
            if (arguments.length || !(range = this.document.getSelectionRange())) {
                line = line >= 0 ? line : this.caret.line();
                var dl = this.document.get(line);
                if (dl) {
                    dl.setText('\t' + dl.text);
                    this.parse(dl);
                    this.caret.line() == line && this.caret.moveX(this.options.tabWidth);
                    this.emit('changed', { line: line, column: 0, text: '\t', added: true });
                }
            } else {
                var w = this.options.tabWidth, i, l;
                this.caret.position(i = range.start.line, range.start.column);
                l = range.end.line;
                range.start.column += w;
                range.end.column += w;
                this.document.setSelectionRange(range);
                do this.indent(i); while (++i <= l);
                this.document.showSelection();
            }
        },
        unindent: function(line) {
            var range;
            if (arguments.length || !(range = this.document.getSelectionRange())) {
                line = line >= 0 ? line : this.caret.line();
                var dl = this.document.get(line);
                if (dl && dl.text.indexOf('\t') === 0) {
                    dl.setText(dl.text.substr(1));
                    this.parse(dl);
                    this.caret.line() == line && this.caret.moveX(-this.options.tabWidth);
                    this.emit('changed', { line: line, column: 0, text: '\t', added: false });
                }
            } else {
                var w = this.options.tabWidth, i, l;
                
                this.caret.position(i = range.start.line, range.start.column);
                l = range.end.line;
                
                if (this.document.get(i).text.indexOf('\t') === 0) {
                    range.start.column -= w;
                }
                this.document.setSelectionRange(range);
                do this.unindent(i); while (++i <= l);
                this.document.showSelection();
            }
        },
        getNextLineIndent: function(line) {
            var indent = this.getIndentAtLine(line);
            if (this.parser.indentation) {
                var i = this.parser.indentation.call(this, this.getTextAtLine(line).trim(), '', line, indent, this.parser);
                return indent + (i instanceof Array ? i.shift() : parseInt(i) || 0);
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
        statesBefore: function(line, column) {
            line = line >= 0 ? line : this.caret.line();
            column = column >= 0 ? column : this.caret.column();
            var states = getStates.call(this, this.document.get(line).parsed, column);
            return states || [];
        },
        statesAfter: function(line, column) {
            line = line >= 0 ? line : this.caret.line();
            column = column >= 0 ? column : this.caret.column();
            var states = getStates.call(this, this.document.get(line).parsed, column+1);
            return states || [];
        },
        cursorIsBeforePosition: function(line, column, atline) {
            var l = this.caret.line(), c = this.caret.column();
            return l == line ? c < column : !atline && l < line;
        },
        cursorIsAfterPosition: function(line, column, atline) {
            var l = this.caret.line(), c = this.caret.column();
            return l == line ? c > column : !atline && l > line;
        },
        searchLeft: function(pattern, line, column, states) {
            var i = -1, dl;
            pattern = pattern instanceof RegExp ? pattern : new RegExp(pattern.isAlpha() ? '\\b'+pattern+'\\b(?!\\b'+pattern+'\\b).*$' : pattern.escape()+'(?!.*'+pattern.escape()+').*$');
            line = Math.max(0, Math.min(line, this.document.lines() - 1));
            while (dl = this.document.get(line)) {
                i = this.convertToSpaces(dl.text).substring(0, column).search(pattern);
                if (i === -1) {
                    column = Infinity;
                    --line;
                } else {
                    if (this.isState(states, line, i + 1)) {
                        break;
                    }
                    column = i;
                }
            }
            return [line, i];
        },
        searchRight: function(pattern, line, column, states) {
            var i = -1, dl;
            pattern = pattern instanceof RegExp ? pattern : new RegExp(pattern.isAlpha() ? '\\b'+pattern+'\\b' : pattern.escape());
            line = Math.max(0, Math.min(line, this.document.lines() - 1));
            while (dl = this.document.get(line)) {
                i = this.convertToSpaces(dl.text).substr(column).search(pattern);
                if (i === -1) {
                    column = 0;
                    ++line;
                } else {
                    if (this.isState(states, line, i + column + 1)) {
                        break;
                    }
                    column += i + 1;
                }
            }
            return [line, i + column];
        },
        substring: function(from, to) {
            var str = '';
            while (from[0] < to[0]) {
                str += this.convertToSpaces(this.document.get(from[0]++).text).substr(from[1]) + '\n';
                from[1] = 0;
            }
            return str += this.convertToSpaces(this.document.get(to[0]).text).substring(from[1], to[1]);
        },
        charAt: function(line, column) {
            return line < this.document.lines() ? this.getTextAtLine(line).charAt(column) : '';
        },
        isState: function(state, line, col, all) {
            if (state && state.length) {
                state = 'string' === typeof state ? [state] : state;
                var gs = getStates.call(this, this.document.get(line).parsed, col);
                return gs ? all ? gs.diff(state).length === 0 && gs.length == state.length : gs.diff(state).length !== gs.length : false;
            }
            return false;
        },
        insertText: function(text, mx) {
            this.document.issetSelection() && this.document.removeSelection();
            var pos, s = this.convertToSpaces(text).split('\n')
            , bf = this.caret.textBefore()
            , line = this.caret.line()
            , col = this.caret.column(true);
            
            if (s.length > 1) {
                var af = this.caret.textAfter()
                , dl = this.caret.dl();
                
                this._inserting = true;
                this.caret.setTextBefore(bf + s[0]);
                for (var i = 1; i < s.length; i++) {
                    this.caret.setTextAfter('');
                    dl = this.document.insert(line + i, s[i]);
                }
                this.caret.position(line + s.length - 1, -1);
                delete this._inserting;
                this.caret.setTextAfter(af);
            } else {
                this.caret.setTextBefore(bf + s[0]);
            }
            mx && this.caret.moveX(mx);
            text.length && this.emit('changed', { line: line, column: col, text: text, added: true });
            return this;
        },
        insertSelectedText: function(text, mx) {
            this.document.beginSelection();
            this.insertText(text, mx);
            this.document.endSelection();
            return this;
        },
        put: function(text, line, column, mx) {
            text = this.convertToSpaces(text);
            if (text.length && line < this.document.lines()) {
                var s = text.split('\n')
                , dl = this.document.get(line)
                , dlt = this.convertToSpaces(dl.text)
                , bf = dlt.substring(0, column), af = dlt.substr(column)
                , isa = this.cursorIsAfterPosition(line, bf.length, true);
                
                if (s.length > 1) {
                    var i = s.length - 1;
                    this.document.insert(line+1, s[i] + af);
                    af = '';
                    while (--i > 0) {
                        this.document.insert(line+1, s[i]);
                    }
                }
                this.dispatch(dl, bf + s[0] + af);
                this.caret.refresh();
                isa && this.caret.moveX(text.length);
                mx && this.caret.moveX(mx);
                this.emit('changed', { line: line, column: this.convertToTabs(bf).length, text: text, added: true });
            }
            return this;
        },
        erase: function(arg, line, column, mx) {
            var isb = this.cursorIsBeforePosition(line, column);
            this.caret.savePosition();
            this.caret.position(line, column);
            this.removeBeforeCursor(arg);
            this.caret.restorePosition();
            !isb && this.caret.moveX(-(arg.length || arg));
            mx && this.caret.moveX(mx);
            return this;
        },
        dispatch: function(dl, text) {
            dl.setText(this.convertToTabs(text));
            return this.parse(dl);
        },
        appendText: function(text) {
            text = text.split(/\n/);
            if (text[0]) {
                var last = this.document.get(this.document.lines()-1);
                last && this.dispatch(last, last.text + text[0]);
            }
            for (var i = 1; i < text.length; i++) {
                this.parse(this.document.append(this.convertToTabs(text[i])));
            }
            if (!this.document.isFilled) this.document.isFilled = this.document.fill();
            return this;
        },
        appendLine: function(text) {
            var dl, text = this.convertToTabs(text);
            (this.document.lines() == 1 && (dl = this.document.get(0)).text.length == 0) ? dl.setText(text) : this.document.append(text);
            if (!this.document.isFilled) this.document.isFilled = this.document.fill();
            return this;
        },
        swapLineUp: function() {
            var cur, up, l = this.caret.line();
            if (l) {
                swapLines(this, l-1);
                this.caret.moveY(-1);
            }
        },
        swapLineDown: function() {
            var cur, down, l = this.caret.line();
            if (l < this.document.lines() - 1) {
                swapLines(this, l);
            }
        },
        removeBeforeCursor: function(arg) {
            var r = '', type = typeof arg, bf = this.caret.textBefore();
            if ('string' === type) {
                arg = this.convertToSpaces(arg).split('\n');
                var i = arg.length - 1, x
                , af = this.caret.textAfter()
                , l = this.caret.line();
                while ((x = bf.length - arg[i].length) >= 0 && i && (bf.lastIndexOf(arg[i--]) === x || !arg.length)) {
                    r = '\n' + bf.substr(x) + r;
                    this.caret.setTextBefore(bf.substring(0, x));
                    this.document.remove(this.caret.dl(), l);
                    bf = this.caret.position(--l, -1).textBefore();
                }
                if (bf.lastIndexOf(arg[i]) === x) {
                    this.caret.setTextBefore(bf.substring(0, x));
                    r = arg[i] + r;
                } else {
                    this.caret.setTextBefore(bf);
                }
            } else if ('number' === type) {
                if (arg <= bf.length) {
                    this.caret.setTextBefore(bf.substring(0, bf.length - arg));
                } else {
                    var af = this.caret.textAfter()
                    , l = this.caret.line();
                    
                    while (arg > bf.length && l-1 >= 0) {
                        r = '\n' + bf + r;
                        this.document.remove(this.caret.dl(), l);
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
            if (r) {
                this.emit('changed', { line: this.caret.line(), column: this.caret.column(true), text: r, added: false });
            }
        },
        removeAfterCursor: function(arg) {
            var r = '', type = typeof arg
            , af = this.caret.textAfter();
            
            if ('string' === type) {
                var i = 0, l = this.caret.line()
                , dl = this.caret.dl(), nextdl
                , bf = this.caret.textBefore();
                arg = this.convertToSpaces(arg).split('\n');
                
                while (i < arg.length - 1 && (af.indexOf(arg[i]) === 0 || !arg[i].length)) {
                    r = r + arg[i] + '\n';
                    this.caret.setTextAfter(af.substr(arg[i++].length));
                    nextdl = dl.next();
                    af = nextdl ? this.convertToSpaces(nextdl.text) : '';
                    this.document.remove(nextdl, l+1);
                }
                if (af.indexOf(arg[i]) === 0) {
                    this.caret.setTextAfter(af.substr(arg[i].length));
                    r = r + af.substring(0, arg[i].length);
                } else {
                    this.caret.setTextAfter(af);
                }
            } else if ('number' === type) {
                if (arg <= af.length) {
                    this.caret.setTextAfter(af.substr(arg));
                } else {
                    var size = this.document.lines()
                    , dl = this.caret.dl(), nextdl
                    , bf = this.caret.textBefore()
                    , l = this.caret.line();
                    
                    while (arg > af.length && l+1 < size) {
                        r = r + af + '\n';
                        this.caret.setTextAfter('');
                        arg = arg - af.length - 1;
                        nextdl = dl.next();
                        af = this.convertToSpaces(nextdl.text);
                        this.document.remove(nextdl, l+1);
                    }
                    this.caret.setTextAfter(af.substr(arg));
                    this.caret.refresh();
                }
                r = r + af.substring(0, arg);
            }
            if (r) {
                this.emit('changed', { line: this.caret.line(), column: this.caret.column(true), text: r, added: false });
            }
        },
        isEmpty: function() {
            return this.document.lines() === 1 && !this.document.get(0).text;
        },
        getValue: function(withTabs) {
            var self = this, r = []
            , fn = withTabs
            ? function(obj) { return obj.text; }
            : function(obj) { return self.convertToSpaces(obj.text); };
            
            this.document.each(function() {
                r.push(fn(this));
            });
            return r.join(this.getLineEnding());
        },
        createHighlightOverlay: function(/* arrays, ... */) {
            if (this.highlightOverlay) this.highlightOverlay.remove();
            var self = this, args = arguments
            , overlay = this.highlightOverlay = new CodePrinter.Overlay(this, 'cp-highlight-overlay', false);
            overlay.on('refresh', function(a) { /^(blur|changed)$/.test(a) && overlay.remove(); });
            for (var i = 0; i < arguments.length; i++) {
                var dl = this.document.get(arguments[i][0]), pos;
                if (dl) {
                    pos = this.document.measureRect(dl, arguments[i][1], arguments[i][1] + arguments[i][2].length);
                    var sp = span.cloneNode().addClass('cp-highlight');
                    sp.style.top = dl.getOffset() + this.sizes.paddingTop + 'px';
                    sp.style.left = pos.offset + 'px';
                    sp.style.width = pos.width + 'px';
                    sp.style.height = dl.height + 'px';
                    overlay.node.append(sp);
                }
            }
            overlay.reveal();
            return this;
        },
        search: function(find, scroll) {
            if (find) {
                var search = this.searches = this.searches || {};
                
                if (!search.value || find.toString() != search.value.toString() || !search.results || !search.results.length) {
                    var self = this, sizes = this.sizes, isregexp = find instanceof RegExp;
                    search.results = $([]);
                    
                    if (!(search.overlay instanceof CodePrinter.Overlay)) {
                        search.overlay = new CodePrinter.Overlay(this, 'cp-search-overlay', false);
                        search.mute = false;
                        
                        search.overlay.on({
                            refresh: function(a) {
                                if (a == 'caret') {
                                    for (var j = 0; j < search.results.length; j++) {
                                        search.results[j].style.opacity == "0" && search.results[j].fadeIn();
                                    }
                                } else if (!search.mute) {
                                    search.results.length = 0;
                                    search.overlay.node.innerHTML = '';
                                    self.search(search.value, false);
                                }
                            },
                            removed: function() {
                                delete self.searches;
                            }
                        });
                        search.overlay.node.delegate('mousedown', 'span', function(e) {
                            var pos = this.position;
                            if (pos) {
                                search.mute = true;
                                self.document.setSelectionRange(pos._sl, pos._sc, pos._el, pos._ec);
                                self.caret.position(pos._el, pos._ec);
                                this.fadeOut();
                                search.mute = false;
                            }
                            return e.cancel();
                        });
                    } else {
                        search.overlay.node.innerHTML = '';
                    }
                    
                    this.intervalIterate(function(dl, line, offset) {
                        var text = this.convertToSpaces(dl.text)
                        , ln = 0, i;
                        
                        while (text && (i = text.search(find)) !== -1) {
                            ln += i;
                            var match = isregexp ? RegExp.lastMatch : find
                            , node = span.cloneNode().addClass('cp-search-occurrence')
                            , rect = this.document.measureRect(dl, ln, ln + match.length);
                            
                            node.position = { _sl: line, _sc: ln, _el: line, _ec: ln + match.length }
                            node.style.top = sizes.paddingTop + offset + 'px';
                            node.style.left = rect.offset + 'px';
                            node.style.width = rect.width + 2 + 'px';
                            node.style.height = dl.height + 1 + 'px';
                            
                            search.results.push(node);
                            search.overlay.node.append(node);
                            ln += match.length;
                            text = text.substr(i + match.length);
                        }
                        return dl;
                    }, function() {
                        search.overlay.reveal();
                        search.value = find;
                        search.results.removeClass('active').get(0).addClass('active');
                        scroll !== false && scrollToCurrentSearchResult.call(this);
                    }, {
                        interval: 5,
                        queue: 500
                    });
                } else {
                    this.nextOccurrence();
                }
            }
            return this;
        },
        searchEnd: function() {
            if (this.searches) {
                this.searches.overlay.remove();
            }
        },
        nextOccurrence: function() {
            if (this.searches) {
                this.searches.results.removeClass('active').getNext().addClass('active');
                scrollToCurrentSearchResult.call(this);
            }
        },
        prevOccurrence: function() {
            if (this.searches) {
                this.searches.results.removeClass('active').getPrev().addClass('active');
                scrollToCurrentSearchResult.call(this);
            }
        },
        replace: function(replaceWith, vol, offset) {
            if ('string' === typeof replaceWith && this.searches) {
                var search = this.searches
                , results = search.results
                , lastline = 0, cmv = 0;
                
                if (results.length) {
                    vol = Math.min(Math.max(0, vol || results.length), results.length);
                    offset = offset || results.g || 0;
                    
                    while (vol-- > 0) {
                        var node = results[offset], value = node.text();
                        if (node.position) {
                            cmv = node.position.el == lastline ? cmv : 0;
                            search.results.remove(node);
                            search.overlay.node.removeChild(node);
                            search.mute = true;
                            this.caret.position(node.position.el, node.position.ec - cmv);
                            this.removeBeforeCursor(value);
                            this.insertText(replaceWith);
                            search.mute = false;
                            cmv = replaceWith.length - value.length;
                        }
                        lastline = node.position.el;
                        results.get(offset);
                    }
                    search.overlay.emit('refresh');
                }
            }
        },
        findSnippet: function(trigger) {
            if (trigger) {
                var f = function(snippets) {
                    for (var k in snippets) {
                        if (k.startsWith(trigger)) {
                            return 'string' === typeof snippets[k] ? { content: snippets[k] } : snippets[k];
                        }
                    }
                }
                , result = f(this.snippets);
                if (result) return result;
                
                if (this.parser) {
                    if (this.parser.snippets) {
                        result = f(this.parser.snippets);
                        if (result) return result;
                    }
                    var cc = this.parser.codeCompletion.call(this, this.memory, this.parser);
                    if (cc && cc instanceof Array) {
                        for (var i = 0; i < cc.length; i++) {
                            if (cc[i] instanceof Array) {
                                for (var j = 0; j < cc[i].length; j++) {
                                    if (cc[i][j].startsWith(trigger)) {
                                        return { trigger: trigger, content: cc[i][j], cursorMove: 0 }
                                    }
                                }
                            } else {
                                if (cc[i].startsWith(trigger)) {
                                    return { trigger: trigger, content: cc[i], cursorMove: 0 }
                                }
                            }
                        }
                    }
                }
            }
            return null;
        },
        registerSnippet: function() {
            for (var i = 0; i < arguments.length; i++) {
                var snippet = arguments[i];
                if (snippet.content && snippet.trigger) {
                    this.snippets.push(snippet);
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
                if (arguments[i] in this.keyMap) {
                    this.keyMap[arguments[i]] = function() { return false; }
                }
            }
            return this;
        },
        call: function(keyCombination, code, prototype) {
            if (keyCombination) {
                var obj = prototype ? keyMap.prototype : this.keyMap;
                if (keyCombination in obj) {
                    return obj[keyCombination].call(this, {}, code || 0, keyCombination);
                }
            }
        },
        enterFullscreen: function() {
            if (! this.isFullscreen) {
                var main = this.mainElement,
                    b = document.body;
                this.tempnode = document.createTextNode('');
                main.addClass('cp-fullscreen').style.margin = [-b.style.paddingTop, -b.style.paddingRight, -b.style.paddingBottom, -b.style.paddingLeft, ''].join('px ');
                main.style.width = "";
                main.after(this.tempnode);
                document.body.append(main);
                this.isFullscreen = true;
                this.document.fill();
                this.input.focus();
                this.emit('fullscreen:entered');
            }
        },
        exitFullscreen: function() {
            if (this.isFullscreen && this.tempnode) {
                var tmp = this.tempnode;
                this.mainElement.removeClass('cp-fullscreen').style.removeProperty('margin');
                tmp.parentNode.insertBefore(this.mainElement, tmp);
                tmp.parentNode.removeChild(tmp);
                delete this.tempnode;
                this.isFullscreen = false;
                this.setWidth(this.options.width);
                this.document.fill();
                this.input.focus();
                this.emit('fullscreen:leaved');
            }
        },
        openCounter: function() {
            this.counter.removeClass('hidden');
        },
        closeCounter: function() {
            this.counter.addClass('hidden');
        },
        removeOverlays: function() {
            if (this.overlays) {
                for (var i = 0; i < this.overlays.length; i++) {
                    if (this.overlays[i].isRemovable) {
                        this.overlays[i].remove();
                    } else {
                        this.overlays[i].emit('refresh', Array.apply(null, arguments));
                    }
                }
            }
        },
        convertToSpaces: function(text) {
            return text.replace(/\t/g, Array(this.options.tabWidth+1).join(' ')).replace(/\r/g, '');
        },
        convertToTabs: function(text) {
            return text.replace(new RegExp(' {'+this.options.tabWidth+'}','g'), '\t').replace(/\r/g, '');
        },
        prependTo: function(node) { node.prepend(this.mainElement); return this; },
        appendTo: function(node) { node.append(this.mainElement); return this; },
        insertBefore: function(node) { node.before(this.mainElement); return this; },
        insertAfter: function(node) { node.after(this.mainElement); return this; }
    }
    
    Branch = function(leaf) {
        this.parent = this.root = null;
        this.isLeaf = leaf == null ? true : leaf;
        this.size = this.height = 0;
        return this;
    }
    
    Branch.prototype = {
        indexOf: Array.prototype.indexOf,
        splice: function(index, howmany) {
            var size = 0, height = 0, l = Math.min(index + howmany, this.length || 0);
            for (var i = index; i < l; i++) {
                size -= this[i].size;
                height -= this[i].height;
                this[i].parent = this[i].root = null;
            }
            for (var i = 2; i < arguments.length; i++) {
                size += arguments[i].size;
                height += arguments[i].height;
                arguments[i].parent = this;
                arguments[i].root = this.root || this;
            }
            this.resize(this.isLeaf ? arguments.length - 2 - l + index : size, height);
            return Array.prototype.splice.apply(this, arguments);
        },
        push: function() {
            var size = 0, height = 0;
            for (var i = 0; i < arguments.length; i++) {
                size += arguments[i].size;
                height += arguments[i].height;
                arguments[i].parent = this;
                arguments[i].root = this.root || this;
            }
            this.resize(this.isLeaf ? arguments.length : size, height);
            return Array.prototype.push.apply(this, arguments);
        },
        
        get: function(line) {
            if (this.isLeaf) {
                return this[line];
            } else {
                var i = -1;
                while (++i < this.length && line >= this[i].size) {
                    line -= this[i].size;
                }
                return this[i] ? this[i].get(line) : null;
            }
        },
        insert: function(line, height) {
            if (this.isLeaf) {
                var dl = new Line();
                if (height >= 0) dl.height = height;
                this.splice(line, 0, dl);
                return dl;
            } else {
                var b, i = -1;
                while ((b = ++i < this.length) && line > this[i].size) {
                    line -= this[i].size;
                }
                if (b) {
                    if (this[i].length >= BRANCH_OPTIMAL_SIZE) {
                        if (line == this[i].size) {
                            return this[i].fork().insert(0, height);
                        }
                        var next = this[i].split();
                        if (line >= this[i].size) {
                            return next.insert(line - this[i].size, height);
                        }
                    }
                    return this[i].insert(line, height);
                }
                var child = new Branch(true);
                this.push(child);
                return child.insert(0, height);
            }
        },
        append: function(dl) {
            if (this.isLeaf) {
                this.push(dl);
                return dl;
            } else {
                var leaf = this[this.length-1];
                while (leaf && !leaf.isLeaf) {
                    leaf = leaf[leaf.length-1];
                }
                if (leaf) {
                    if (leaf.length >= BRANCH_OPTIMAL_SIZE) {
                        return leaf.fork().append(dl);
                    }
                    return leaf.append(dl);
                }
            }
        },
        remove: function(line, howmany) {
            if (howmany == null) howmany = 1;
            var dl = line instanceof Line ? line : this.get(line), i, r = [];
            if (dl && (i = dl.parent.indexOf(dl)) >= 0) {
                var tmp = dl.parent
                , l = Math.min(howmany, tmp.length - i)
                , next = howmany > l ? tmp.next() : null;
                
                r = tmp.splice(i, l);
                while (tmp.parent && tmp.length === 0) {
                    i = tmp.parent.indexOf(tmp);
                    (tmp = tmp.parent).splice(i, 1);
                }
                if (next) r.push.apply(r, next.remove(0, howmany - r.length));
            }
            return r;
        },
        fall: function(i) {
            if (0 <= i && i < this.length) {
                var tmp = this, dl = this.splice(i, 1)[0];
                while (tmp.parent && tmp.length === 0) {
                    i = tmp.parent.indexOf(tmp);
                    (tmp = tmp.parent).splice(i, 1);
                }
                return dl;
            }
        },
        insertAfter: function(branch) {
            var index = this.parent.indexOf(this);
            this.parent.splice(index + 1, 0, branch);
        },
        split: function() {
            var pivot = Math.floor(this.length / 2)
            , branch = new Branch(this.isLeaf)
            , rmArray = this.splice(pivot, this.length - pivot);
            
            this.insertAfter(branch);
            branch.push.apply(branch, rmArray);
            
            if (this.parent.length > BRANCH_OPTIMAL_SIZE) {
                this.parent.wrapAll();
            }
            return branch;
        },
        fork: function(leaf) {
            var sibling = new Branch(leaf == null ? this.isLeaf : leaf);
            this.insertAfter(sibling);
            
            if (this.parent.length > BRANCH_OPTIMAL_SIZE) {
                this.parent.wrapAll();
            }
            return sibling;
        },
        wrapAll: function() {
            var l = Math.ceil(this.length / 4);
            for (var i = 0; i < 4; i++) {
                var branch = new Branch(false);
                branch.push.apply(branch, this.splice(i, l, branch));
            }
        },
        resize: function(size, height) {
            if (!size) size = 0;
            if (!height) height = 0;
            var tmp = this;
            while (tmp != null) {
                tmp.size += size;
                tmp.height += height;
                tmp = tmp.parent;
            }
        },
        getOffset: function() {
            if (this.parent) {
                var of = 0, i = this.parent.indexOf(this);
                while (--i >= 0) {
                    of += this.parent[i].height;
                }
                return of + this.parent.getOffset();
            }
            return 0;
        },
        getLineWithOffset: function(offset) {
            var h = 0, i = -1;
            while (++i < this.length && h + this[i].height < offset) {
                h += this[i].height;
            }
            if (i == this.length) --i;
            return this.isLeaf ? this[i] : this[i] ? this[i].getLineWithOffset(offset - h) : null;
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
                if (i + 1 < this.parent.length) {
                    return this.parent[i+1];
                } else {
                    var next = this.parent.next();
                    while (next && !next.isLeaf) next = next[0];
                    return next;
                }
            }
            return null;
        },
        prev: function() {
            var i;
            if (this.parent && (i = this.parent.indexOf(this)) >= 0) {
                if (i > 0) {
                    return this.parent[i-1];
                } else {
                    var prev = this.parent.prev();
                    while (prev && !prev.isLeaf) prev = prev[prev.length-1];
                    return prev;
                }
            }
            return null;
        },
        foreach: function(f, tmp) {
            tmp = tmp || 0;
            if (this.isLeaf) {
                for (var i = 0; i < this.length; i++) {
                    f.call(this[i], tmp + i);
                }
            } else {
                for (var i = 0; i < this.length; i++) {
                    this[i].foreach(f, tmp);
                    tmp += this[i].size;
                }
            }
            return this;
        }
    }
    
    Data = function(cp) {
        Branch.call(this, false);
        this.push(new Branch(true));
        this.cp = cp;
        
        return this;
    }
    Data.prototype = Branch.prototype;
    
    Line = function() {
        this.parent = this.root = null;
        this.changed = 0;
        this.height = 0;
        return this;
    }
    
    Line.prototype = {
        getOffset: Branch.prototype.getOffset,
        info: Branch.prototype.info,
        setText: function(str) {
            if (str !== this.text) {
                this.text = str;
                this.changed = 1;
            }
        },
        setParsed: function(str) {
            if (str !== this.parsed) {
                this.parsed = str;
                this.changed = 6;
                this.touch();
            }
        },
        setNode: function(node) {
            this.changed |= 2;
            return this.node = node;
        },
        captureNode: function(dl) {
            dl.node && this.setNode(dl.deleteNode());
            dl.counter && this.setCounter(dl.deleteCounter());
        },
        deleteNode: function() {
            var node = this.node;
            if (node) node.className = null;
            delete this.node;
            return node;
        },
        setCounter: function(counter) {
            counter.style.lineHeight = this.height + 'px';
            counter._dl = this;
            return this.counter = counter;
        },
        deleteCounter: function() {
            var counter = this.counter;
            if (counter) counter.className = '';
            delete this.counter;
            return counter;
        },
        bind: function(node, counter) {
            this.node = node;
            this.counter = counter;
            counter.style.lineHeight = this.height + 'px';
            counter._dl = this;
            this.changed |= 2;
        },
        touch: function() {
            if (this.changed & 2 && this.node) {
                this.node.innerHTML = this.parsed || '&#8203;';
                this.updateHeight();
                this.changed ^= 2;
            }
        },
        updateHeight: function(force) {
            var oh;
            if ((force || this.changed & 4) && (oh = this.node.offsetHeight)) {
                var delta = oh - this.height;
                if (delta) {
                    this.counter.style.lineHeight = oh + 'px';
                    this.height += delta;
                    this.parent && this.parent.resize(0, delta);
                }
                this.changed ^= 4;
            }
        },
        next: function() {
            if (this.parent) {
                var i = this.lastIndex >= 0 && this.parent[this.lastIndex] === this ? this.lastIndex : this.parent.indexOf(this);
                if (i >= 0) {
                    this.lastIndex = i;
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
                var i = this.lastIndex >= 0 && this.parent[this.lastIndex] === this ? this.lastIndex : this.parent.indexOf(this);
                if (i >= 0) {
                    this.lastIndex = i;
                    if (i > 0) {
                        return this.parent[i-1];
                    } else {
                        var prev = this.parent.prev();
                        return prev && prev.length ? prev[prev.length-1] : null;
                    }
                }
            }
            return null;
        },
        remove: function() {
            if (this.parent) {
                this.parent.fall(this.parent.indexOf(this));
            }
        }
    }
    
    Document = function(cp) {
        var counter = cp.container.firstChild
        , ol = counter.firstChild
        , screen = cp.wrapper.lastChild
        , code = screen.firstChild
        , temp = screen.lastChild.firstChild
        , from = 0, to = -1, lastST = 0, lines = []
        , defHeight = 13, firstNumber
        , data, history, selection;
        
        history = new History(cp, cp.options.historyStackSize, cp.options.historyDelay);
        selection = new Selection(cp);
        
        firstNumber = cp.options.firstLineNumber;
        if (cp.options.lineNumberFormatter instanceof Function) {
            formatter = cp.options.lineNumberFormatter;
        }
        
        function desiredHeight(half) {
            return (cp.wrapper.clientHeight || cp.options.height) + (half ? 100 : 200);
        }
        function isFilled(half) {
            return (code.scrollHeight || heightOfLines()) > desiredHeight(half);
        }
        function heightOfLines() {
            var h = 0;
            for (var i = 0; i < lines.length; i++) {
                h += lines[i].height;
            }
            return h;
        }
        function link(dl, index) {
            if (dl.node && dl.counter) {
                dl.counter.innerHTML = formatter(firstNumber + (dl.counter._index = index));
                if (index <= to) {
                    var q = index - from, bef = lines[q];
                    code.insertBefore(dl.node, bef.node);
                    ol.insertBefore(dl.counter, bef.counter);
                    lines.splice(q, 0, dl);
                    var tmp = dl.counter.nextSibling;
                    while (tmp && tmp._index !== index + 1) {
                        tmp.innerHTML = formatter(firstNumber + (tmp._index = ++index));
                        tmp = tmp.nextSibling;
                    }
                } else {
                    code.appendChild(dl.node);
                    ol.appendChild(dl.counter);
                    lines.push(dl);
                }
                cp.parse(dl); dl.touch();
            }
        }
        function insert(dl) {
            dl.bind(pre.cloneNode(), li.cloneNode());
            link(dl, to + 1);
            ++to;
        }
        function prepend(dl) {
            dl.bind(pre.cloneNode(), li.cloneNode());
            link(dl, --from);
        }
        function remove(dl) {
            var tmp = dl.counter.nextSibling;
            while (tmp) {
                tmp.innerHTML = formatter(firstNumber + --tmp._index);
                tmp = tmp.nextSibling;
            }
            code.removeChild(dl.deleteNode());
            ol.removeChild(dl.deleteCounter());
            lines.remove(dl);
            --to;
        }
        function rewind(dl) {
            var tmp = dl, dli = dl.info()
            , offset = dli.offset
            , i = -1;
            
            if (from <= dli.index && dli.index <= to) return false;
            
            from = dli.index;
            to = from - 1;
            
            while (tmp && ++i < lines.length) {
                tmp.captureNode(lines[i]);
                tmp.touch();
                tmp.counter.innerHTML = formatter(firstNumber + (tmp.counter._index = to = from + i));
                lines[i] = tmp;
                tmp = tmp.next();
            }
            if (++i < lines.length) {
                var spliced = lines.splice(i, lines.length - i);
                tmp = dl.prev();
                while (tmp && spliced.length) {
                    tmp.captureNode(spliced.shift());
                    tmp.touch();
                    tmp.counter.innerHTML = formatter(firstNumber + (tmp.counter._index = --from));
                    code.insertBefore(tmp.node, lines[0].node);
                    ol.insertBefore(tmp.counter, lines[0].counter);
                    lines.unshift(tmp);
                    offset -= tmp.height;
                    tmp = tmp.prev();
                }
            }
            code.style.top = ol.style.top = (cp.sizes.scrollTop = Math.max(0, offset)) + 'px';
        }
        function clear() {
            for (var i = 0; i < lines.length; i++) {
                lines[i].deleteNode();
                lines[i].deleteCounter();
            }
            to = -1; from = 0;
            lines.length = 0;
            code.innerHTML = ol.innerHTML = '';
            code.style.top = ol.style.top = (cp.sizes.scrollTop = 0) + 'px';
        }
        function scroll(delta) {
            cp.sizes.scrollTop = Math.max(0, cp.sizes.scrollTop + delta);
            code.style.top = ol.style.top = cp.sizes.scrollTop + 'px';
        }
        function updateCounters(dl, index) {
            var tmp = dl.counter;
            while (tmp) {
                tmp.innerHTML = formatter(firstNumber + (tmp._index = index++));
                tmp = tmp.nextSibling;
            }
        }
        function formatter(i) {
            return i;
        }
        
        this.init = function(source) {
            source = cp.convertToTabs(source || '');
            data = new Data(cp);
            
            if (to !== -1) {
                clear();
                this.clearSelection();
            }
            history.init(source);
            source = source.split('\n');
            
            for (var i = 0; i < source.length; i++) {
                this.append(source[i]);
            }
            this.updateHeight();
            this.fill();
            return this;
        }
        this.debug = function() {
            console.log(JSON.stringify({ from: from, to: to, scrollTop: lastST, offsetTop: cp.sizes.scrollTop, first: lines[0].text, last: lines[lines.length-1].text }));
        }
        this.append = function(text) {
            var dl = new Line();
            dl.setText(text);
            dl.height = defHeight;
            data.append(dl);
            return dl;
        }
        this.insert = function(l, text) {
            var dl = data.insert(l, defHeight);
            dl.setText(text ? cp.convertToTabs(text) : '');
            if (l < from) {
                ++from;
                updateCounters(lines[0], from);
            } else if (l <= to + 1) {
                if (isFilled()) {
                    if (l < (to - from + 1) / 2) {
                        dl.captureNode(lines.pop());
                        link(dl, l);
                    } else {
                        var first = lines.shift();
                        dl.captureNode(first);
                        ++from;
                        link(dl, l);
                        ++to;
                        scroll(first.height);
                    }
                } else {
                    dl.bind(pre.cloneNode(), li.cloneNode());
                    link(dl, l);
                    ++to;
                }
            }
            this.updateHeight();
        }
        this.fill = function() {
            var half, b, dl = (half = !lines.length) ? data.get(0) : lines[lines.length-1].next();
            while (dl && !(b = isFilled(half))) {
                insert(dl);
                dl = dl.next();
            }
            return b;
        }
        this.remove = function(dl, line, howmany) {
            if (howmany == null) howmany = 1;
            var rm, tmp = dl, prev = lines[0].prev(), scrolldelta = 0
            , next = line + howmany <= to ? lines[lines.length-1].next() : data.get(line + howmany), i = -1;
            
            while (tmp && ++i < howmany) {
                if (tmp.node) {
                    remove(tmp);
                    if (next) {
                        insert(next);
                        next = next.next();
                    } else if (prev) {
                        prepend(prev);
                        scrolldelta -= prev.height;
                        prev = prev.prev();
                    }
                } else if (line < from) {
                    --from;
                }
                tmp = tmp.next();
            }
            if (scrolldelta) scroll(scrolldelta);
            rm = data.remove(dl, howmany);
            this.updateHeight();
            return rm;
        }
        this.scrollTo = function(st, arg) {
            var d = st - lastST;
            this.scroll(d, cp.wrapper.scrollHeight - cp.wrapper.clientHeight);
            if (d && arg !== false) counter.scrollTop = cp.wrapper.scrollTop = st;
        }
        this.scroll = function(delta, maxScroll) {
            if (delta) {
                lastST += delta;
                if (lastST < 0) {
                    delta = -lastST + delta;
                    lastST = 0;
                } else if (maxScroll && lastST > maxScroll) {
                    delta = maxScroll - lastST + delta;
                    lastST = maxScroll;
                }
                
                var x = lastST - cp.sizes.scrollTop
                , limit = 100
                , d = x - limit
                , tmpd = d
                , h, dl;
                
                if (d) {
                    if (Math.abs(delta) > code.offsetHeight) {
                        dl = data.getLineWithOffset(Math.max(0, lastST - limit));
                        if (rewind(dl) !== false) {
                            return;
                        }
                    }
                    if (from === 0 && d < 0) {
                        h = lines[0].height;
                        dl = lines[lines.length-1];
                        while (h < x && !isFilled() && (dl = dl.next())) {
                            insert(dl);
                            x -= dl.height;
                        }
                        return;
                    }
                    if (d > 2) {
                        while (lines.length && (h = lines[0].height) < d && (dl = lines[lines.length-1].next())) {
                            var first = lines.shift();
                            dl.captureNode(first);
                            if (dl.active) cp.select(dl);
                            link(dl, to + 1);
                            ++from; ++to;
                            d -= h;
                        }
                    } else if (d < -2) {
                        while (lines.length && -(h = lines[lines.length-1].height) > d && (dl = lines[0].prev())) {
                            var last = lines.pop();
                            dl.captureNode(last);
                            if (dl.active) cp.select(dl);
                            link(dl, --from); --to;
                            d += h;
                        }
                    }
                    if (tmpd !== d) {
                        scroll(tmpd - d);
                    }
                }
            }
        }
        this.eachVisibleLines = function(callback) {
            for (var i = 0; i < lines.length; i++) {
                callback.call(this, lines[i], from + i, i && lines[i-1]);
            }
        }
        this.measureRect = function(dl, offset, to) {
            var childNodes, child, first, l
            , oL, oW, tmp = 0, i = -1
            , node = dl.node, r = {
                column: 0,
                offset: 0,
                width: 0,
                charWidth: 0
            }
            
            if (!node || !node.parentNode) {
                node = temp;
                node.innerHTML = dl.parsed || '<span>'+(dl.text || '')+'</span>';
                dl.node = null;
            }
            childNodes = node.childNodes;
            if (childNodes.length === 1 && (first = childNodes[0]) && first.textContent == '\u200b') {
                if (first.nodeType !== 1) first = wrapTextNode(node, first);
                return { column: 0, offset: first.offsetLeft, width: 0, charWidth: 0 }
            }
            
            if (arguments.length === 3) {
                var boo;
                
                while (++i < childNodes.length) {
                    child = childNodes[i];
                    l = child.textContent.length;
                    if (l === 0) continue;
                    if (child.nodeType !== 1) child = wrapTextNode(node, child);
                    
                    if (boo) {
                        oW = child.offsetWidth;
                        if (to <= tmp + l) {
                            r.width += (to - tmp) * oW / l;
                            break;
                        }
                        r.width += oW;
                    } else if (offset < tmp + l) {
                        oW = child.offsetWidth;
                        oL = child.offsetLeft;
                        r.column = offset;
                        r.offset = Math.round(oL + (offset - tmp) * oW / l);
                        r.charWidth = Math.round(oW / l);
                        boo = true;
                        
                        if (to < offset || 'number' !== typeof to) break;
                        if (to <= tmp + l) {
                            r.width = Math.round((to - offset) * oW / l);
                            break;
                        }
                        r.width = (l + tmp - offset) * oW / l;
                    }
                    tmp += l;
                }
                if (!boo) { r.column = tmp; r.charWidth = child ? Math.round(child.offsetWidth / l) : 0; }
                else if (r.width) r.width = Math.round(r.width);
                if (!r.offset) r.offset = child ? child.offsetLeft + child.offsetWidth : 0;
            } else {
                while (++i < childNodes.length) {
                    child = childNodes[i];
                    l = child.textContent.length;
                    if (l === 0) continue;
                    
                    if (child.nodeType !== 1) child = wrapTextNode(node, child);
                    oL = child.offsetLeft;
                    oW = child.offsetWidth;
                    if (offset < oL + oW) {
                        r.charWidth = Math.round(oW / l);
                        var c = Math.round((offset - oL) * l / oW);
                        r.column = tmp + c;
                        r.offset = Math.round(oL + c * oW / l);
                        break;
                    }
                    tmp += l;
                }
                if (i === childNodes.length) {
                    r.offset = oL + oW;
                    r.column = tmp;
                }
            }
            if (!r.charWidth) {
                var sp = span.cloneNode();
                sp.textContent = sp.innerText = 'A';
                node.appendChild(sp);
                r.charWidth = sp.offsetWidth;
                node.removeChild(sp);
            }
            return r;
        }
        this.updateDefaultHeight = function() {
            var pr = pre.cloneNode();
            pr.style.fontSize = cp.options.fontSize + 'px';
            pr.style.fontFamily = cp.options.fontFamily;
            pr.innerHTML = 'CP';
            document.documentElement.appendChild(pr);
            defHeight = pr.clientHeight;
            document.documentElement.removeChild(pr);
        }
        this.updateHeight = function() {
            screen.style.minHeight = (data.height + cp.sizes.paddingTop * 2) + 'px';
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
                ec = cp.convertToSpaces(data.get(el).text).length;
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
                    return cp.convertToSpaces(dl.text).substring(s.column, e.column);
                } else {
                    var t = [], i = s.line;
                    t.push(cp.convertToSpaces(dl.text).substr(s.column));
                    while ((dl = dl.next()) && ++i < e.line) {
                        t.push(cp.convertToSpaces(dl.text));
                    }
                    if (dl) t.push(cp.convertToSpaces(dl.text).substring(0, e.column));
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
                , dl = data.get(s.line)
                , dloffset = dl.getOffset(), selnode
                , delta = e.line - s.line;
                
                if (delta) {
                    var pos = this.measureRect(dl, s.column, true)
                    , lastdl = data.get(e.line), lastdloffset = lastdl.getOffset();
                    
                    selnode = ov.top = createSelectionNode.call(cp, ov.top || div.cloneNode(), dloffset, pos.offset, null, dl.height + 1, 0);
                    selnode.parentNode || ov.node.appendChild(selnode);
                    
                    if (delta > 1) {
                        selnode = ov.middle = createSelectionNode.call(cp, ov.middle || div.cloneNode(), dloffset + dl.height, cp.sizes.paddingLeft, null, lastdloffset - dloffset - dl.height, 0);
                        selnode.parentNode || ov.node.appendChild(selnode);
                    } else if (ov.middle) {
                        ov.node.removeChild(ov.middle);
                        delete ov.middle;
                    }
                    pos = this.measureRect(lastdl, 0, e.column);
                    selnode = ov.bottom = createSelectionNode.call(cp, ov.bottom || div.cloneNode(), lastdloffset, pos.offset, pos.width, lastdl.height);
                    selnode.parentNode || ov.node.appendChild(selnode);
                } else {
                    var pos = this.measureRect(dl, s.column, e.column);
                    selnode = ov.top = createSelectionNode.call(cp, ov.top || div.cloneNode(), dloffset, pos.offset, pos.width, dl.height);
                    selnode.parentNode || ov.node.appendChild(selnode);
                    if (ov.middle) {
                        ov.node.removeChild(ov.middle);
                        delete ov.middle;
                    }
                    if (ov.bottom) {
                        ov.node.removeChild(ov.bottom);
                        delete ov.bottom;
                    }
                }
                ov.reveal();
                cp.unselect();
            }
        }
        this.removeSelection = function() {
            var range = this.getSelectionRange();
            if (range) {
                if (this.isAllSelected(range)) {
                    cp.emit('changed', { line: 0, column: 0, text: cp.getValue(true), added: false });
                    this.init('').fill();
                    cp.caret.position(0, 0);
                } else {
                    var s = range.start
                    , e = range.end
                    , delta = e.line - s.line
                    , dl = data.get(s.line)
                    , next = dl.next()
                    , t = [], x, y = '';
                    x = cp.convertToSpaces(dl.text);
                    
                    if (delta && next) {
                        t.push(cp.convertToTabs(x.substr(s.column)));
                        
                        if (delta > 1) {
                            var r = this.remove(next, s.line + 1, delta - 1);
                            for (var i = 0; i < r.length; i++) {
                                t.push(r[i].text);
                            }
                            next = dl.next();
                        }
                        if (next) {
                            y = cp.convertToSpaces(next.text);
                            t.push(cp.convertToTabs(y.substring(0, e.column)));
                            this.remove(next, s.line + 1, 1);
                        }
                    } else {
                        t.push(cp.convertToTabs(x.slice(s.column, e.column)));
                        y = x;
                    }
                    cp.dispatch(dl, x.substring(0, s.column) + y.substr(e.column));
                    cp.caret.target(dl, s.column, s.column);
                    cp.emit('changed', { line: cp.caret.line(), column: cp.caret.column(true), text: t.join('\n'), added: false });
                }
                this.clearSelection();
            }
        }
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
        this.undo = function() {
            if (history.index >= 0 && history.index <= history.states.length && history.states.length) {
                history.timeout = clearTimeout(history.timeout);
                (!history.states[history.index] || !history.states[history.index].length) && --history.index;
                history.mute();
                var state = history.states[history.index];
                selection.clear();
                for (var i = state.length - 1; i >= 0; i--) {
                    var a = state[i], dl = data.get(a.line)
                    , t = dl.text.substring(0, a.column);
                    
                    cp.caret.target(dl, a.column + (cp.options.tabWidth-1) * (t.match(/\t/g) || []).length, true);
                    if (a.added) {
                        cp.removeAfterCursor(a.text);
                    } else {
                        cp.insertText(a.text);
                    }
                }
                history.emit('undo', history.states[history.index--]).unmute();
                history.performed = true;
            }
        }
        this.redo = function() {
            history.index < 0 && (history.index = 0);
            if (history.index < history.states.length) {
                history.timeout = clearTimeout(history.timeout);
                history.mute();
                var state = history.states[history.index];
                selection.clear();
                for (var i = 0; i < state.length; i++) {
                    var a = state[i], dl = data.get(a.line)
                    , t = dl.text.substring(0, a.column);
                    
                    cp.caret.target(dl, a.column + (cp.options.tabWidth-1) * (t.match(/\t/g) || []).length, true).savePosition();
                    if (a.added) {
                        cp.insertText(a.text);
                    } else {
                        cp.removeAfterCursor(a.text);
                    }
                }
                cp.caret.restorePosition();
                history.emit('redo', history.states[history.index++]).unmute();
                history.performed = true;
            }
        }
        this.each = function() {
            return data.foreach.apply(data, arguments);
        }
        this.get = function(i) {
            return data.get(i);
        }
        this.lineWithOffset = function(offset) {
            return data.getLineWithOffset(offset);
        }
        this.lines = function() {
            return data.size;
        }
        this.height = function() {
            return data.height;
        }
        
        selection.on({ done: this.showSelection.bind(this, false) });
        cp.onchanged = function(e) {
            if (cp.options.history) {
                history.pushChanges(e.line, e.column, cp.convertToTabs(e.text), e.added);
            }
            cp.removeOverlays('changed');
        }
        return this;
    }
    
    Caret = function(cp) {
        var line, column, currentDL, lastdet
        , before = '', after = '', tmp
        , styles = {
            vertical: function(css) {
                css.height = currentDL.height;
                css.left -= 1;
                return css;
            },
            underline: function(css) {
                css.width = lastdet.charWidth;
                css.height = 1;
                css.top += currentDL.height - 1;
                return css;
            },
            block: function(css) {
                css.width = lastdet.charWidth;
                css.height = currentDL.height;
                return css;
            }
        }
        
        function setPixelPosition(x, y) {
            if (!this.isDisabled) {
                var css = {}, stl = this.style || cp.options.caretStyle;
                
                x >= 0 && (css.left = this.x = x = Math.floor(Math.max(cp.sizes.paddingLeft, x)));
                y >= 0 && (css.top = this.y = y = Math.floor(y + cp.sizes.paddingTop));
                
                stl != this.style && this.setStyle(stl);
                css = this.drawer(css);
                this.emit('beforeMove', x, y, currentDL, line, this.column());
                this.element.css(css);
                cp.input.style.top = this.y + 'px';
                cp.input.style.left = this.x + 'px';
                this.emit('move', x, y, currentDL, line, this.column());
            }
            return this;
        }
        function updateDL() {
            if (currentDL) {
                currentDL.setText(before + after);
                cp.parse(currentDL);
            }
        }
        
        this.dispatch = function(dl, det, c) {
            var t = cp.convertToSpaces(dl.text), dli = dl.info(), b;
            
            if (b = currentDL !== dl) {
                if (currentDL) delete currentDL.active;
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
            before = cp.convertToTabs(t.substring(0, c));
            after = cp.convertToTabs(t.substr(c));
            setPixelPosition.call(this, det.offset, dli.offset);
            cp.select(dl);
        }
        
        this.setTextBefore = function(str) {
            var col = str.length;
            str = cp.convertToTabs(str);
            if (before !== str) {
                before = str;
                updateDL();
                this.target(currentDL, col, true);
            }
            return this;
        }
        this.setTextAfter = function(str) {
            str = cp.convertToTabs(str);
            if (after !== str) {
                after = str;
                updateDL();
            }
            return this;
        }
        this.setTextAtCurrentLine = function(bf, af) {
            var col = bf.length;
            bf = cp.convertToTabs(bf);
            af = cp.convertToTabs(af);
            if (before !== bf || after !== af) {
                before = bf;
                after = af;
                updateDL();
                this.target(currentDL, col, true);
            }
            return this;
        }
        this.textBefore = function() {
            return cp.convertToSpaces(before);
        }
        this.textAfter = function() {
            return cp.convertToSpaces(after);
        }
        this.textAtCurrentLine = function(b) {
            return b ? before + after : this.textBefore() + this.textAfter();
        }
        this.getPosition = function() {
            return { line: line ? line + 1 : 1, column: this.column() + 1 };
        }
        this.position = function(l, c) {
            var dl = cp.document.get(l);
            if (dl) {
                if (c < 0) {
                    var t = cp.convertToSpaces(dl.text);
                    c = t.length + c % t.length + 1;
                }
                this.dispatch(dl, cp.document.measureRect(dl, c, true), c);
            }
            return this;
        }
        this.target = function(dl) {
            if (dl) {
                var det = cp.document.measureRect.apply(cp.document, arguments);
                this.dispatch(dl, det, det.column);
            }
            return this;
        }
        this.moveX = function(mv) {
            var abs, t = '', cl = line
            , size = cp.document.lines()
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
            } else if (mv >= (l = cp.document.lines())) {
                column = -1;
                mv = l-1;
            }
            return this.position(mv, column);
        }
        this.refresh = function() {
            cp.removeOverlays(null);
            return this.position(line, column);
        }
        this.dl = function() {
            return currentDL;
        }
        this.line = function() {
            return line;
        }
        this.column = function(withTabs) {
            return withTabs ? before.length : this.textBefore().length;
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
            this.element.className = 'cp-caret cp-caret-'+style;
            this.drawer = styles[styles[style] ? style : 'vertical'];
            this.refresh();
        }
        this.activate = function() {
            if (!this.isDisabled) {
                if (cp.options.blinkCaret) {
                    var elm = this.element, a = false, fn = function() { a = !a; elm.style.opacity = +a; };
                    this.interval = clearInterval(this.interval) || fn() || setInterval(fn, cp.options.caretBlinkSpeed);
                }
                this.isActive = true;
            }
            return this;
        }
        this.focus = function() {
            this.isVisible || this.show().activate();
            cp.select(currentDL);
        }
        this.blur = function() {
            this.deactivate().hide();
            cp.unselect();
            this.emit('blur');
        }
    }
    Caret.prototype = {
        isActive: false,
        isVisible: false,
        isDisabled: false,
        show: function() {
            if (!this.isDisabled) {
                this.element.style.opacity = "1";
                this.isVisible = true;
            }
            return this;
        },
        hide: function() {
            this.element.style.opacity = "0";
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
            if (this.isActive) {
                this.interval && (this.interval = clearInterval(this.interval));
                this.isActive = false;
            }
            return this;
        },
        move: function(x, y) {
            x && this.moveX(x);
            y && this.moveY(y);
            return this;
        }
    }
    
    CodePrinter.Overlay = function(cp, classes, removable) {
        this.node = div.cloneNode().addClass('cp-overlay '+classes);
        this.isRemovable = !!removable;
        this.root = cp;
        return this;
    }
    CodePrinter.Overlay.prototype = {
        reveal: function() {
            if (!this.node.parentNode) {
                this.root.overlays.push(this);
                this.root.wrapper.append(this.node);
                this.emit('revealed');
            }
        },
        remove: function() {
            var i = this.root.overlays.indexOf(this);
            i != -1 && this.root.overlays.splice(i, 1);
            this.node.remove();
            this.emit('removed');
        },
        removable: function(is) {
            this.isRemovable = !!is;
        }
    }
    
    StreamArray = function() {}
    StreamArray.prototype = {
        push: Array.prototype.push,
        wrapAll: function() {
            for (var i = 0; i < this.length; i++) {
                this[i].wrap.apply(this[i], arguments);
            }
        }
    }
    
    Stream = function(value, extend) {
        if (value) {
            this.pos = this.start = 0;
            this.value = value;
            this.tree = [];
            if (extend) {
                for (var k in extend) {
                    this[k] = extend[k];
                }
            }
        }
        return this;
    }
    Stream.prototype = {
        match: function(rgx, index) {
            this.found && this.cut(this.found.length);
            var f = false, i, v = this.value.substr(this.pos);
            
            if (v) {
                i = v.search(rgx);
                if (i >= 0) {
                    f = RegExp.lastMatch;
                    this.indexOfFound = i;
                    i > 0 && this.cut(i);
                }
            }
            this.found = f;
            return f && index ? RegExp['$'+index] : f;
        },
        capture: function(rgx, index, offset) {
            var v = this.value.substr(this.pos + ('number' === typeof offset ? offset : 0))
            , m = v.match(rgx);
            if (m && m[0]) {
                this.indexOfFound = RegExp.leftContext.length;
                return m['number' === typeof index ? index : 0];
            }
        },
        readline: function(index) {
            return this.found = this.value.substr(this.pos);
        },
        indexOf: function(value) {
            return Math.max(-1, this.value.indexOf(value, this.pos) - this.pos);
        },
        eat: function(from, to, whenNotFound) {
            if (!arguments.length) from = this.found;
            
            if (from) {
                var v = this.value.substr(this.pos)
                , indexFrom = 0, indexTo = 0, eaten;
                
                if (from !== this.found) {
                    if (from instanceof RegExp) {
                        indexFrom = v.search(from);
                        from = RegExp.lastMatch;
                    } else {
                        indexFrom = v.indexOf(from);
                    }
                }
                if (indexFrom >= 0) {
                    if (to) {
                        delete this.unfinished;
                        v = this.value.substr(this.pos + indexFrom + from.length);
                        if (to instanceof RegExp) {
                            indexTo = v.search(to);
                            to = RegExp.lastMatch;
                        } else {
                            indexTo = v.indexOf(to);
                        }
                    }
                    if (indexTo >= 0) {
                        indexTo += indexFrom + from.length + (to ? to.length : 0);
                    } else {
                        if (whenNotFound instanceof Function) {
                            whenNotFound.call(this);
                            return new Stream();
                        } else {
                            indexTo = indexFrom + from.length;
                            if (whenNotFound) {
                                indexTo += v.length;
                                this.unfinished = true;
                            }
                        }
                    }
                    indexFrom > 0 && this.cut(indexFrom - this.pos);
                    eaten = this.cut(indexTo - indexFrom);
                    this.found = null;
                    return eaten;
                }
            }
            return new Stream();
        },
        eatGreedily: function(from, to) {
            return this.eat(from, to, true);
        },
        eatWhile: function(to, until) {
            var eaten, v, i;
            if (to) {
                v = this.value.substr(this.pos);
                if (to instanceof RegExp) {
                    i = v.search(to);
                    to = RegExp.lastMatch;
                } else {
                    i = v.indexOf(to);
                }
                if (i >= 0) {
                    eaten = this.cut(i + (until ? 0 : to.length));
                }
            }
            if (this.unfinished = !eaten) {
                eaten = this.tear();
            }
            this.found = null;
            return eaten;
        },
        eatUntil: function(to) {
            return this.eatWhile(to, true);
        },
        eatEach: function(rgx) {
            var sa = new StreamArray, found;
            while (found = this.match(rgx)) {
                sa.push(this.eat(found));
            }
            return sa;
        },
        eatAll: function(from) {
            var i = 0;
            if (from !== this.found) {
                i = from instanceof RegExp ? v.search(from) : v.indexOf(from);
            }
            i > 0 && this.cut(i);
            return i >= 0 ? this.tear() : new Stream();
        },
        wrap: function(/*, .. styles */) {
            if (this.found) {
                var e = this.eat(this.found);
                return e.wrap.apply(e, arguments);
            } else if (!this.styles) {
                this.styles = Array.apply(null, arguments);
            }
            return this;
        },
        unwrap: function() {
            this.styles = null;
            return this;
        },
        applyWrap: function(array) {
            return this.wrap.apply(this, array);
        },
        isWrapped: function() {
            return !!(this.styles && this.styles.length);
        },
        cut: function(length) {
            if (length < 0 || 'number' !== typeof length) length = 1;
            if (length) {
                var v = this.value.substring(this.pos, this.pos + length), ss = v && new Stream(v, { start: this.pos });
                if (ss) {
                    this.tree.push(this.lastEaten = ss);
                    this.pos += length;
                    return ss;
                }
            }
            return new Stream();
        },
        tear: function() {
            return this.cut(this.value.length - this.pos);
        },
        skip: function(found) {
            found = found || this.found;
            if (found && this.value.indexOf(found, this.pos) === this.pos) {
                this.pos += found.length;
                this.found = false;
            }
        },
        reset: function() {
            this.found = false;
            if (this.isAborted) delete this.isAborted;
            return this;
        },
        revert: function() {
            if (this.tree.length) {
                var last = this.tree.pop();
                this.pos = last.start;
            }
        },
        abort: function() {
            this.isAborted = true;
            return this;
        },
        save: function() {
            if (!this.savedPos) this.savedPos = [];
            this.savedPos.push(this.pos);
        },
        restore: function() {
            if (this.savedPos && this.savedPos.length) {
                var pos = this.savedPos.pop(), last;
                if (this.tree.length) {
                    while (this.tree.length && (last = this.tree[this.tree.length-1]).start >= pos) {
                        this.tree.pop();
                        this.pos = last.start;
                    }
                    if (this.tree.length) {
                        if (last.start + last.value.length < pos) {
                            last.value = last.value.substring(0, pos - last.start);
                        }
                    }
                }
                this.pos = Math.max(0, Math.min(pos, this.value.length));
            }
        },
        before: function(l) {
            return this.value.substring(l != null ? this.pos - l : 0, this.pos);
        },
        after: function(l) {
            return this.value.substr(this.pos + (this.found ? this.found.length : 0), l);
        },
        isAfter: function(s) {
            var af = this.after();
            return s instanceof RegExp ? af.search(s) === 0 : af.trim().indexOf(s) === 0;
        },
        isBefore: function(s) {
            var bf = this.before(), t, i;
            return s instanceof RegExp ? s.test(bf) : (t = bf.trim()) && t.endsWith(s);
        },
        isEmpty: function() {
            return this.value == null;
        },
        peek: function(q) {
            q = q || 0;
            return this.value.charAt(this.pos + q);
        },
        eol: function() {
            return this.pos === this.value.length;
        },
        sol: function() {
            return this.pos === 0;
        },
        isStillHungry: function() {
            return this.eol() && this.unfinished === true;
        },
        setStateAfter: function(arg) {
            if ('string' === typeof arg) {
                var str = arg;
                arg = {};
                arg[str] = true;
            }
            if (arg) {
                if (!this.stateAfter) this.stateAfter = {}
                for (var k in arg) {
                    this.stateAfter[k] = arg[k];
                }
            }
        },
        continueState: function(/*, .. keys */) {
            if (this.stateBefore) {
                if (!this.stateAfter) this.stateAfter = {};
                if (arguments.length) {
                    for (var i = 0; i < arguments.length; i++) {
                        var k = arguments[i];
                        if (this.stateBefore[k]) {
                            this.stateAfter[k] = this.stateBefore[k];
                        }
                    }
                } else {
                    for (var k in this.stateBefore) {
                        this.stateAfter[k] = this.stateBefore[k];
                    }
                }
            }
        },
        toString: function() {
            var v = this.value, tree = this.tree, node
            , tmp = 0, r = [], hasStyle = !!this.styles;
            
            hasStyle && r.push('<span class="cpx-', this.styles.join(' cpx-'), '">');
            
            for (var i = 0; i < tree.length; i++) {
                node = tree[i];
                if (tmp < node.start) {
                    r.push(hasStyle ? v.substring(tmp, node.start).encode() : '<span>'+v.substring(tmp, node.start).encode()+'</span>');
                }
                r.push(node.toString());
                tmp = node.start + node.value.length;
            }
            tmp < v.length && r.push(hasStyle ? v.substr(tmp).encode() : '<span>'+v.substr(tmp).encode()+'</span>');
            hasStyle && r.push('</span>');
            return r.join('');
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
            '(': ['(', ')'], '[': ['[', ']'], '{': ['{', '}'], '"': ['"', '"'], "'": ["'", "'"]
        }
        this.indentIncrements = ['(', '[', '{', ':'];
        this.indentDecrements = [')', ']', '}'];
        this.brackets = {
            '{': ['bracket', 'bracket-curly', 'bracket-open'],
            '}': ['bracket', 'bracket-curly', 'bracket-close'],
            '[': ['bracket', 'bracket-square', 'bracket-open'],
            ']': ['bracket', 'bracket-square', 'bracket-close'],
            '(': ['bracket', 'bracket-round', 'bracket-open'],
            ')': ['bracket', 'bracket-round', 'bracket-close']
        }
        this.expressions = {
            '//': { ending: /$/, classes: ['comment', 'line-comment'] }, 
            '/*': { ending: '*/', classes: ['comment', 'block-comment'] },
            "'": { ending: /(^'|[^\\]'|\\{2}')/, classes: ['string', 'single-quote'] },
            '"': { ending: /(^"|[^\\]"|\\{2}")/, classes: ['string', 'double-quote'] }
        }
        this.punctuations = {
            '.': 'dot',
            ',': 'comma',
            ':': 'colon',
            ';': 'semicolon',
            '?': 'question',
            '!': 'exclamation'
        }
        this.operators = {
            '=': 'equal',
            '!': 'negation',
            '-': 'minus',
            '+': 'plus',
            '*': 'multiply',
            '/': 'divider',
            '^': 'power',
            '%': 'percentage',
            '<': 'lower',
            '>': 'greater',
            '&': 'ampersand',
            '|': 'verticalbar'
        }
        this.keyMap[')'] = this.keyMap[']'] = this.keyMap['}'] = function(e, k, ch) {
            if (!this.caret.textBefore().trim()) {
                var line = this.caret.line()
                , indent = this.getNextLineIndent(line-1);
                this.caret.setTextBefore(this.tabString(indent-1) + this.caret.textBefore().trim());
            }
        }
        $.extend(this, extend instanceof Function ? extend.call(this) : extend);
        this.extension && this.extend(this.extension);
        this.init();
    }
    CodePrinter.Mode.prototype = {
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        lineComment: '//',
        init: function() {},
        memoryAlloc: function() {
            return {};
        },
        parse: function(stream, memory) {
            return stream;
        },
        compile: function(string, memory) {
            return this.parse(new Stream(string), memory || this.memoryAlloc()).toString();
        },
        indentation: function(textBefore, textAfter, line, indent, parser) {
            var charBefore = textBefore.slice(-1)
            , charAfter = textAfter.slice(0, 1);
            if (parser.indentIncrements.indexOf(charBefore) >= 0) {
                if (parser.indentDecrements.indexOf(charAfter) >= 0) {
                    return [1, 0];
                }
                return 1;
            }
            if (parser.controls) {
                var word = (textBefore.match(/^\w+/) || [])[0];
                if (word && parser.controls.test(word)) {
                    return 1;
                }
                var i = 0, prevline = this.getTextAtLine(line - 1).trim();
                while (prevline && !/\{$/.test(prevline) && (word = (prevline.match(/^\w+/) || [])[0]) && parser.controls.test(word)) {
                    i++;
                    prevline = this.getTextAtLine(line - i - 1).trim();
                }
                return -i;
            }
            return 0;
        },
        codeCompletion: function(memory) {
            return [];
        },
        parseBy: function(helper, stream) {
            return helper.parse(stream, helper.memoryAlloc(), true);
        }
    }
    
    keyMap = function() {}
    keyMap.prototype = {
        'Backspace': function() {
            if (this.document.issetSelection()) {
                this.document.removeSelection();
            } else {
                var bf = this.caret.textBefore()
                , af = this.caret.textAfter()
                , chbf = bf.slice(-1), m = bf.match(/ +$/)
                , r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? '\t' : 1;
                
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
                this.removeBeforeCursor(r);
            }
            return false;
        },
        'Ctrl+Backspace': function() {
            this.caret.setTextBefore('');
            return false;
        },
        'Alt+Backspace': function() {
            this.caret.setTextAtCurrentLine('', '');
            return false;
        },
        'Tab': function() {
            if (this.document.issetSelection()) {
                this.indent();
            } else {
                var bf = this.caret.textBefore();
                if (this.options.tabTriggers) {
                    var match = bf.match(/(?:^|[^\w])(\w+)$/), snippet = match && this.findSnippet(match[1]);
                    if (snippet) {
                        this.removeBeforeCursor(match[1]);
                        this.insertText(snippet.content, snippet.cursorMove);
                        return false;
                    }
                }
                this.insertText(' '.repeat(this.options.tabWidth - bf.length % this.options.tabWidth));
            }
            return false;
        },
        'Alt+Tab': CodePrinter.prototype.indent,
        'Shift+Tab': CodePrinter.prototype.unindent,
        'Enter': function() {
            if (this.options.indentNewLines) {
                var rest = '', line = this.caret.line(), indent = this.getIndentAtLine(line)
                , dl = this.caret.dl(), parser = dl.stateAfter && dl.stateAfter.parser || this.parser
                , af = this.caret.textAfter(), spacesAfter = 0;
                
                if (parser && parser.indentation) {
                    var i = parser.indentation.call(this, this.caret.textBefore().trim(), af.trim(), line, indent, parser);
                    if (i instanceof Array) {
                        var first = i.shift();
                        while (i.length) {
                            rest += '\n' + this.tabString(indent + i.shift());
                        }
                        indent += first;
                    } else {
                        indent += parseInt(i) || 0;
                    }
                }
                if (af && af.match(/^( +)/) && RegExp.$1) {
                    spacesAfter = RegExp.$1.length;
                }
                this.insertText('\n' + this.tabString(indent).slice(spacesAfter) + rest, -rest.length + spacesAfter);
            } else {
                this.insertText('\n');
            }
            return false;
        },
        'Esc': function() {
            this.isFullscreen ? this.exitFullscreen() : this.searchEnd();
            return false;
        },
        'PageUp': function() {
            if (keyMap.__disable !== true) {
                this.caret.moveY(-50);
                keyMap.__disable = true;
                setTimeout(function() { delete keyMap.__disable; }, 50);
            }
        },
        'PageDown': function() {
            if (keyMap.__disable !== true) {
                this.caret.moveY(50);
                keyMap.__disable = true;
                setTimeout(function() { delete keyMap.__disable; }, 50);
            }
        },
        'End': function() {
            this.caret.position(this.document.lines() - 1, -1);
        },
        'Home': function() {
            this.caret.position(0, 0);
        },
        'Left': function(e, c) {
            c % 2 ? this.caret.move(c - 38, 0) : this.caret.move(0, c - 39);
            this.document.clearSelection();
            return false;
        },
        'Del': function() {
            if (this.document.issetSelection()) {
                this.document.removeSelection();
            } else {
                var bf = this.caret.textBefore()
                , af = this.caret.textAfter()
                , chaf = af.charAt(0), m = af.match(/^ +/)
                , r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? '\t' : 1;
                
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
                this.insertText(complementBracket(ch), -1);
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
        'Ctrl+Left': function() {
            this.caret.position(this.caret.line(), 0);
            return false;
        },
        'Alt+Up': CodePrinter.prototype.prevOccurrence,
        'Alt+Ctrl+Up': CodePrinter.prototype.swapLineUp,
        'Ctrl+Right': function() {
            this.caret.position(this.caret.line(), -1);
            return false;
        },
        'Alt+Down': CodePrinter.prototype.nextOccurrence,
        'Alt+Ctrl+Down': CodePrinter.prototype.swapLineDown,
        'Ctrl+F': function(e) {
            this.search(prompt('Find...'));
        },
        'Shift+Ctrl+F': function() {
            this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
        },
        'Ctrl+J': function() {
            this.setCursorPosition(parseInt(prompt("Jump to line..."), 10) - 1, 0);
        },
        'Ctrl+N': function() {
            this.counter.hasClass('hidden') ? this.openCounter() : this.closeCounter();
        },
        'Ctrl+R': function() {
            this.forcePrint();
        },
        'Ctrl+Z': function() {
            this.document.undo();
        },
        'Shift+Ctrl+Z': function(e) {
            this.document.redo();
        },
        'Ctrl++': CodePrinter.prototype.increaseFontSize,
        'Ctrl+-': CodePrinter.prototype.decreaseFontSize,
        'Ctrl+/': function() {
            if (this.parser && this.parser.lineComment) {
                var start, end, is, sm = 0, comment = this.parser.lineComment.split('[text content]');
                
                if (is = this.document.issetSelection()) {
                    start = this.selection.start.line;
                    end = this.selection.end.line;
                } else {
                    start = end = this.caret.line();
                }
                
                for (var line = end; line >= start; line--) {
                    var text = this.getTextAtLine(line)
                    , i = text.search(/[^ ]/);
                    if (i >= 0) {
                        if (text.search(new RegExp('(^ *'+comment[0].escape()+')')) == 0) {
                            var r1 = RegExp.$1;
                            sm = -comment[0].length;
                            this.erase(comment[0].length, line, r1.length);
                            comment[1] && text.match(new RegExp('(\\s*'+comment[1].escape()+'\\s*)$')) && this.erase(RegExp.$1.length, line, text.length - r1.length);
                        } else {
                            sm = comment[0].length;
                            this.put(comment[0], line, 0);
                            comment[1] && this.put(comment[1], line, text.length + comment[0].length);
                        }
                    }
                }
                is && this.selection.move(sm);
                this.showSelection();
            }
        },
        'Shift+Left': function(e, c) {
            if (!this.document.issetSelection()) {
                this.document.beginSelection();
            }
            c % 2 ? this.caret.move(c - 38, 0) : this.caret.move(0, c - 39);
            this.document.endSelection();
        }
    }
    keyMap.prototype['Down'] = keyMap.prototype['Right'] = keyMap.prototype['Up'] = keyMap.prototype['Left'];
    keyMap.prototype['Shift+Down'] = keyMap.prototype['Shift+Right'] = keyMap.prototype['Shift+Up'] = keyMap.prototype['Shift+Left'];
    keyMap.prototype['`'] = keyMap.prototype['\''] = keyMap.prototype['"'];
    keyMap.prototype['['] = keyMap.prototype['{'] = keyMap.prototype['('];
    keyMap.prototype[']'] = keyMap.prototype['}'] = keyMap.prototype[')'];
    keyMap.prototype['Ctrl+Up'] = keyMap.prototype['Home'];
    keyMap.prototype['Ctrl+Down'] = keyMap.prototype['End'];
    
    commands = {
        'A': function(e) {
            if (!this.document.isAllSelected()) {
                this.document.selectAll();
                this.emit('cmd.selectAll');
            }
            return false;
        },
        'C': function(e) {
            if (this.document.issetSelection()) {
                this.emit('cmd.copy');
            }
            return -1;
        },
        'V': function(e) {
            this.document.removeSelection();
            this.emit('cmd.paste');
            setImmediate(this.input.emit.bind(this.input, 'keyup'));
            return true;
        },
        'X': function() {
            if (this.document.issetSelection()) {
                this.document.removeSelection();
                this.emit('cmd.cut');
            }
            return -1;
        },
        'Z': function(e) {
            e.shiftKey ? this.document.redo() : this.document.undo();
            return false;
        }
    }
    
    History = function(cp, stackSize, delay) {
        this.pushChanges = function(line, column, text, added) {
            if (!this.muted && arguments.length == 4) {
                var self = this
                , changes = { line: line, column: column, text: text, added: added };
                
                if (this.index < this.states.length - 1) {
                    ++this.index;
                    this.states.splice(this.index, this.states.length - this.index);
                }
                if (this.performed) {
                    this.states = [];
                    this.performed = false;
                }
                if (!this.states[this.index]) {
                    this.states[this.index] = [changes];
                } else {
                    var last = this.states[this.index].last(), b = false;
                    if (last.line == line && added == last.added) {
                        if (b = (last.column + (added ? last.text.length : '') == column)) {
                            last.text += text;
                        } else if (b = (column + text.length == last.column)) {
                            last.text = text + last.text;
                            last.column = column;
                        }
                    }
                    !b && this.states[this.index].push(changes);
                }
                this.timeout = clearTimeout(this.timeout) || setTimeout(function() {
                    self.save();
                }, delay);
            }
            return this;
        }
        this.save = function() {
            ++this.index;
            while (this.states.length >= stackSize) {
                this.shift();
            }
            return this;
        }
    }
    History.prototype = {
        init: function(content) {
            this.states = [];
            this.initialState = [{ line: 0, column: 0, text: content, added: true }];
            this.index = 0;
            this.muted = false;
        },
        getState: function(index) {
            return this.states[index];
        },
        shift: function() {
            if (this.states[0]) {
                this.initialState.push.apply(this.initialState, this.states[0]);
                this.states.shift();
                --this.index;
            }
        },
        mute: function() {
            this.muted = true;
            return this;
        },
        unmute: function() {
            this.muted = false;
            return this;
        }
    }
    
    Selection = function(cp) {
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
        this.overlay = new CodePrinter.Overlay(cp, 'cp-selection-overlay', false);
        
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
            coords[1] = [line, column];
            make.call(this);
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
        moveStart: function(mv) {
            this.start.column += mv;
            this.emit('done', this.start, this.end);
        },
        moveEnd: function(mv) {
            this.end.column += mv;
            this.emit('done', this.start, this.end);
        },
        move: function(start, end) {
            this.start.column += start;
            this.end.column += end;
            this.emit('done', this.start, this.end);
        }
    }
    
    tracking = function() {}
    tracking.prototype = {
        '(': function(key, textline, details) {
            var states = ['bracket'];
            if (this.options.highlightBrackets && this.isState(states, details.line, details.columnStart+1)) {
                var sec = key === '(' ? ')' : String.fromCharCode(key.charCodeAt(0)+2)
                , counter = 1
                , line = details.line
                , col = details.columnEnd;
                
                do {
                    var a = this.searchRight(sec, line, col, states)
                    , b = this.searchRight(key, line, col, states);
                    
                    if (a[0] >= 0 && a[1] >= 0) {
                        if (b[0] >= 0 && b[1] >= 0 && (b[0] < a[0] || b[0] == a[0] && b[1] < a[1])) {
                            ++counter;
                            a = b;
                        } else {
                            --counter;
                        }
                        line = a[0];
                        col = a[1] + 1;
                    } else {
                        counter = 0;
                    }
                } while (counter != 0);
                
                this.createHighlightOverlay(
                    [details.line, details.columnStart, key],
                    [line, col - 1, sec]
                );
            }
        },
        ')': function(key, textline, details) {
            var states = ['bracket'];
            if (this.options.highlightBrackets && this.isState(states, details.line, details.columnStart+1)) {
                var sec = key === ')' ? '(' : String.fromCharCode(key.charCodeAt(0)-2)
                , counter = 1
                , line = details.line
                , col = details.columnStart;
                
                do {
                    var a = this.searchLeft(sec, line, col, states)
                    , b = this.searchLeft(key, line, col, states);
                    
                    if (a[0] >= 0 && a[1] >= 0) {
                        if (b[0] >= 0 && b[1] >= 0 && (b[0] > a[0] || b[0] == a[0] && b[1] > a[1])) {
                            ++counter;
                            a = b;
                        } else {
                            --counter;
                        }
                        line = a[0];
                        col = a[1];
                    } else {
                        counter = 0;
                    }
                } while (counter != 0);
                
                this.createHighlightOverlay(
                    [line, col, sec],
                    [details.line, details.columnStart, key]
                );
            }
        }
    }
    tracking.prototype['{'] = tracking.prototype['['] = tracking.prototype['('];
    tracking.prototype['}'] = tracking.prototype[']'] = tracking.prototype[')'];
    
    lineendings = { 'LF': '\n', 'CR': '\r', 'LF+CR': '\n\r', 'CR+LF': '\r\n' }
    
    extensions = {
        'js': 'javascript',
        'json': 'javascript',
        'htm': 'html',
        'less': 'css',
        'h': 'cpp',
        'c++': 'cpp',
        'rb': 'ruby',
        'pl': 'perl',
        'sh': 'bash',
        'adb': 'ada',
        'coffee': 'coffeescript'
    }
    
    CodePrinter.requireMode = function(req, cb, del) {
        return $.scripts.require('CodePrinter/'+req.toLowerCase(), cb, del);
    }
    CodePrinter.defineMode = function(name, obj, req) {
        if (obj instanceof Array) {
            req = arguments[1];
            obj = arguments[2];
        }
        if (req) {
            for (var i = 0; i < req.length; i++) {
                req[i] = 'CodePrinter/'+(extensions[req[i]] || req[i].toLowerCase());
            }
        }
        $.scripts.define('CodePrinter/'+name.toLowerCase(), obj, req);
    }
    CodePrinter.hasMode = function(name) {
        return $.scripts.has('CodePrinter/'+name.toLowerCase());
    }
    CodePrinter.registerExtension = function(ext, parserName) {
        extensions[ext.toLowerCase()] = parserName.toLowerCase();
    }
    CodePrinter.issetExtension = function(ext) {
        if (extensions[ext]) return true;
        for (var k in extensions) {
            if (extensions[k] == ext) {
                return true;
            }
        }
        return false;
    }
    
    var buildDOM = (function(){
        var m = div.cloneNode().addClass('codeprinter')
        , b = div.cloneNode().addClass('cp-body')
        , c = div.cloneNode().addClass('cp-container')
        , w = div.cloneNode().addClass('cp-wrapper')
        , s = div.cloneNode().addClass('cp-screen')
        , l = div.cloneNode().addClass('cp-codelines')
        , t = div.cloneNode().addClass('cp-templine')
        , u = div.cloneNode().addClass('cp-caret')
        , n = div.cloneNode().addClass('cp-counter');
        
        w.appendChild(document.createElement('textarea').addClass('cp-input'));
        w.appendChild(u);
        s.appendChild(l);
        t.appendChild(pre.cloneNode());
        s.appendChild(t);
        w.appendChild(s);
        n.appendChild(document.createElement('ol'));
        c.appendChild(n);
        c.appendChild(w);
        b.appendChild(c);
        m.appendChild(b);
        
        return function(cp) {
            cp.caret = new Caret(cp);
            cp.mainElement = m.cloneNode(true);
            cp.container = cp.mainElement.firstChild.lastChild;
            cp.wrapper = cp.container.lastChild;
            cp.input = cp.wrapper.firstChild;
            cp.input.tabIndex = cp.options.tabIndex;
            cp.input.autofocus = cp.options.autofocus;
            cp.caret.element = cp.input.nextSibling;
            cp.counter = cp.container.firstChild;
        }
    })();
    function createSelectionNode(node, top, left, width, height, right) {
        node.addClass('cp-selection');
        node.style.top = top + this.sizes.paddingTop + 'px';
        node.style.left = left + 'px';
        node.style.width = (width != null ? width + 'px' : null);
        node.style.height = (height != null ? height + 'px' : null);
        node.style.right = (right != null ? right + this.sizes.paddingLeft + 'px' : null);
        return node;
    }
    function wrap(text, classes, filter) {
        if (classes instanceof Array) {
            for (var i = 0; i < classes.length; i++) classes[i] = 'cpx-'+classes[i];
            classes = classes.join(' ');
        }
        var helper = function(a, b) {
            if ('string' === typeof arguments[1]) {
                arguments[1] = 'cpx-'+b.lbreak('cpx-');
            }
            return '</span>' + wrap.apply(this, arguments) + '<span class="'+classes+'">';
        }
        helper.wrap = wrap;
        return '<span class="'+classes+'">' + (filter instanceof Function ? filter.call(text.encode(), helper) : text.encode()) + '</span>';
    }
    function wrapTextNode(parent, textnode) {
        var sp = span.cloneNode();
        sp.textContent = sp.innerText = textnode.textContent;
        parent.replaceChild(sp, textnode);
        return sp;
    }
    function getStates(text, length) {
        var i = 0, cur, el = pre.cloneNode();
        if (text) {
            el.innerHTML = text;
            if (el.childNodes.length) {
                do {
                    cur = el.childNodes[i];
                    length -= cur.textContent.length;
                } while (length > 0 && ++i < el.childNodes.length);
                
                if (length <= 0 && cur.nodeType !== 3) {
                    return cur.className.replace(/cpx\-/g, '').split(' ');
                }
            }
        }
        return null;
    }
    function complementBracket(ch) {
        var obj = { '(':')', '{':'}', '[':']', '<':'>' }
        return obj[ch];
    }
    function swapLines(cp, line) {
        var spaces = cp.tabString()
        , x = cp.convertToSpaces(cp.document.get(line).text)
        , y = cp.convertToSpaces(cp.document.get(line+1).text);
        cp.caret.savePosition(true);
        cp.caret.position(line+1, -1);
        cp.removeBeforeCursor(x + '\n' + y);
        cp.insertText(y + '\n' + x);
        cp.caret.restorePosition();
    }
    function scrollToCurrentSearchResult() {
        if (this.searches && this.searches.results && this.searches.results.length > 0) {
            var x = Math.max(0, parseInt(this.searches.results.css('left') - this.wrapper.clientWidth/2))
            , y = Math.max(0, parseInt(this.searches.results.css('top') - this.wrapper.clientHeight/2));
            $(this.wrapper).scrollTo(x, y, this.options.autoScrollSpeed);
        }
    }
    
    return window.CodePrinter = CodePrinter;
});