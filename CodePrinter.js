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
    , Caret, Screen, Counter, Stream
    , keyMap, commands, history, selection, tracking
    , lineendings, extensions, div, li, pre, span
    , BRANCH_OPTIMAL_SIZE = 40;
    
    $.scripts.registerNamespace('CodePrinter', 'mode/');
    
    CodePrinter = function(element, options) {
        if (arguments.length === 1 && element == '[object Object]') {
            options = element;
            element = null;
        }
        options = this.options = $.extend({}, CodePrinter.defaults, options);
        buildDOM(this);
        this.prepare();
        
        if (element) {
            if (element.nodeType) {
                this.init((element.tagName.toLowerCase() === 'textarea' ? element.value : element.innerHTML).decode());
                element.before(this.mainElement);
                return this;
            } else if ('string' === typeof element) {
                return this.init(element);
            }
        }
        return this.init();
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
        fontSize: 11,
        minFontSize: 6,
        maxFontSize: 60,
        keyupInactivityTimeout: 1500,
        caretBlinkSpeed: 400,
        autoScrollSpeed: 20,
        historyStackSize: 100,
        historyDelay: 500,
        randomIDLength: 7,
        firstLineNumber: 1,
        lineNumbers: true,
        lineNumberFormatter: false,
        autofocus: true,
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
            if (!this.onchanged) {
                var self = this
                , options = this.options
                , lastScrollTop = 0
                , sizes, allowKeyup, T, T2, fn;
                
                this.mainElement.CodePrinter = this;
                sizes = this.sizes = { lineHeight: 13, charWidth: 0 };
                this.overlays = [];
                this.snippets = [];
                this.selection = new selection;
                this.selection.overlay = new CodePrinter.Overlay(this, 'cp-selection-overlay', false);
                this.history = new history(this, options.historyStackSize, options.historyDelay);
                this.keyMap = new keyMap;
                this.setTheme(options.theme);
                this.setMode(options.mode);
                this.caret.setStyle(options.caretStyle);
                
                options.lineNumbers && this.openCounter();
                options.snippets && this.snippets.push.apply(this.snippets, options.snippets);
                options.mode !== 'plaintext' && CodePrinter.requireMode(options.mode);
                options.width !== 'auto' && this.setWidth(options.width);
                options.height !== 300 && this.setHeight(options.height);
                
                self.screen.updateHeight = function() {
                    this.parent.style.minHeight = (self.data.size * sizes.lineHeight) + sizes.paddingTop * 2 + 'px';
                }
                self.screen.getDesiredHeight = function() {
                    return self.wrapper.clientHeight + 300;
                }
                self.counter.updateOffset = function() {
                    return this.element.style.top = sizes.scrollTop + 'px';
                }
                
                this.wrapper.listen({
                    scroll: function(e) {
                        if (Math.abs(lastScrollTop - this.scrollTop) > this.clientHeight * 2) {
                            var line = Math.floor(Math.max(0, this.scrollTop - 150) / sizes.lineHeight);
                            self.screen.rewind(cp.data.get(line), line);
                        } else {
                            var x = this.scrollTop - sizes.scrollTop
                            , limit = 150, delta = 30;
                            
                            if (x > limit + delta) {
                                while (self.screen.shift() && this.scrollTop - sizes.scrollTop > limit + delta);
                            } else if (x < limit - delta) {
                                while (self.screen.unshift() && this.scrollTop - sizes.scrollTop < limit - delta);
                            }
                        }
                        self.selectLine(self.caret.line());
                        self.counter.parent.scrollTop = self.wrapper.scrollTop;
                        lastScrollTop = this.scrollTop;
                    },
                    dblclick: function() {
                        var bf = self.caret.textBefore()
                        , af = self.caret.textAfter()
                        , line = self.caret.line()
                        , c = self.caret.column()
                        , l = 1, r = 0, rgx, timeout;
                        
                        var tripleclick = function() {
                            self.selection.setRange(line, 0, line+1, 0);
                            self.showSelection(true);
                            this.unlisten('click', tripleclick);
                            timeout = clearTimeout(timeout);
                        }
                        this.listen({ 'click': tripleclick });
                        timeout = setTimeout(function() { self.wrapper.unlisten('click', tripleclick); }, 1000);
                        
                        rgx = bf[c-l] == ' ' || af[r] == ' ' ? /\s/ : !isNaN(bf[c-l]) || !isNaN(af[r]) ? /\d/ : /^\w$/.test(bf[c-l]) || /^\w$/.test(af[r]) ? /\w/ : /[^\w\s]/;
                        
                        while (l <= c && rgx.test(bf[c-l])) l++;
                        while (r < af.length && rgx.test(af[r])) r++;
                        
                        if (c-l+1 != c+r) {
                            self.selection.setRange(line, c-l+1, line, c+r);
                            self.showSelection();
                        }
                    },
                    mousedown: mouseController(self)
                });
                
                this.input.listen({
                    focus: function() {
                        self.caret.isActive || self.caret.show().activate();
                        self.selectLine(self.caret.line());
                        this.css({ top: self.caret.y, left: self.caret.x });
                    },
                    blur: function(e) {
                        if (self.isMouseDown) {
                            this.focus();
                        } else {
                            self.caret.deactivate().hide();
                            self.unselectLine();
                            self.removeOverlays('blur');
                            self.selection.clear();
                        }
                    },
                    keydown: function(e) {
                        var kc, code = e.getCharCode()
                        , ch = String.fromCharCode(code)
                        , kc = e.getKeyCombination(options.keyCombinationFlag);
                        
                        self.caret.deactivate().show();
                        allowKeyup = true;
                        
                        if (($.browser.macosx ? e.metaKey : e.ctrlKey) && ch in commands) {
                            allowKeyup = commands[ch].call(self, e, code, ch);
                        } else {
                            if (code < 48 && code != 9 && !(kc in self.keyMap)) {
                                kc = e.getKeyCombination(options.keyCombinationFlag | 4);
                            }
                            if ((!/^[a-zA-Z0-9]+$/.test(ch) || !e.hasModifierKey() || options.shortcuts) && kc in self.keyMap) {
                                allowKeyup = self.keyMap[kc].call(self, e, code, kc);
                            }
                        }
                        if (!allowKeyup || 16 <= code && code <= 20 || 91 <= code && code <= 95 || 112 <= code && code <= 145 || code == 224) {
                            return allowKeyup = e.cancel();
                        }
                        return allowKeyup;
                    },
                    keypress: function(e) {
                        var code = e.getCharCode()
                        , ch = String.fromCharCode(code);
                        
                        if (allowKeyup > 0 && e.ctrlKey != true && e.metaKey != true) {
                            if (ch in self.parser.keyMap) {
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
                        self.caret.activate();
                        allowKeyup && this.value.length && self.insertText(this.value);
                        self.selection.isset() || (this.value = '');
                        T = clearTimeout(T) || setTimeout(function() { self.forcePrint(); }, options.keyupInactivityTimeout);
                    }
                });
                
                this.caret.on({
                    'text:changed': function(line, column) {
                        var dl = self.data.get(line);
                        dl.text = this.textAtCurrentLine(true);
                        self.parse(dl, true);
                    },
                    'line:changed': function(current, last) {
                        self.selectLine(current);
                    },
                    'position:changed': function(x, y, line, column, before, after) {
                        if (options.autoScroll) {
                            var wrapper = self.wrapper
                            , pl = sizes.paddingLeft, pt = sizes.paddingTop
                            , sl = wrapper.scrollLeft, st = wrapper.scrollTop
                            , cw = sl + wrapper.clientWidth, ch = st + wrapper.clientHeight
                            , ix = sizes.charWidth, iy = sizes.lineHeight;
                            wrapper.scrollLeft = x + pl >= cw ? x + pl - cw + sl : x - pl < sl ? x - pl : sl;
                            wrapper.scrollTop = y + iy + pt >= ch ? y + iy + pt - ch + st : y - pt < st ? y - pt : st;
                        }
                        if (options.tracking) {
                            T2 = clearTimeout(T2);
                            var a, b;
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
                
                this.counter.element.delegate('click', 'li', function() {
                    var l = parseInt(this.innerHTML) - 1;
                    self.caret.position(l, 0);
                    self.selection.setRange(l, 0, l, self.caret.textAtCurrentLine().length);
                    self.showSelection();
                });
                
                this.selection.on({ done: this.showSelection.bind(this, false) });
                
                this.onchanged = function(e) {
                    if (options.history) {
                        this.history.pushChanges(e.line, e.column, this.convertToTabs(e.text), e.added);
                    }
                    this.removeOverlays('changed');
                }
                
                this.mainElement.on({ nodeInserted: function() {
                    this.removeClass('cp-animation');
                    
                    var s = window.getComputedStyle(self.screen.element, null);
                    sizes.fontSize = parseInt(s.getPropertyValue('font-size'));
                    sizes.paddingTop = parseInt(s.getPropertyValue('padding-top'));
                    sizes.paddingLeft = parseInt(s.getPropertyValue('padding-left'));
                    sizes.scrollTop = parseInt(s.getPropertyValue('top')) || 0;
                    setTimeout(function() { calculateCharDimensions(self); }, 150);
                    
                    options.fontSize != 11 && options.fontSize > 0 && self.setFontSize(options.fontSize);
                    
                    self.print();
                }});
            }
        },
        init: function(source) {
            source = source || '';
            this.data = new Data(this);
            this.history.init(source);
            this.screen.clear();
            source = source.split('\n');
            
            if (!this.parser) {
                this.defineParser(new CodePrinter.Mode('plaintext'));
            }
            
            for (var i = 0; i < source.length; i++) {
                this.data.add(this.convertToTabs(source[i]));
            }
            
            return this;
        },
        unselectLine: function() {
            if (this.activeLine) {
                this.activeLine.pre.removeClass('cp-activeLine');
                this.activeLine.li.removeClass('cp-activeLine');
                delete this.activeLine;
            }
        },
        selectLine: function(l) {
            if (this.options.highlightCurrentLine) {
                this.unselectLine();
                if (!this.selection.isset()) {
                    if (this.screen.from <= l && l <= this.screen.to) {
                        this.activeLine = {
                            pre: this.screen.get(l).addClass('cp-activeLine'),
                            li: this.counter.get(l).addClass('cp-activeLine'),
                            line: l
                        }
                    }
                }
            }
        },
        print: function(mode, source) {
            mode && this.setMode(mode);
            mode = this.options.mode;
            source && this.init(source);
            
            function callback(ModeObject) {
                this.defineParser(ModeObject);
                this.forcePrint();
                this.screen.fill();
                this.options.autofocus && this.caret.position(0, 0) && this.input.focus();
            }
            
            if (this.parser && this.parser.name.toLowerCase() === mode) {
                callback.call(this, this.parser);
            } else {
                CodePrinter.requireMode(mode, callback, this);
            }
            
            return this;
        },
        forcePrint: function() {
            var self = this, dl = this.data.get(0), fn;
            this.memory = this.parser.memoryAlloc();
            
            (fn = function() {
                var j = 0;
                do {
                    dl = self.parse(dl, true);
                } while (dl && (dl = dl.next()) && ++j < 300);
                
                if (!dl) {
                    self.emit('printed');
                    return false;
                }
                setTimeout(fn, 10);
            })();
        },
        defineParser: function(parser) {
            if (parser instanceof CodePrinter.Mode && this.parser !== parser) {
                this.parser = parser;
                this.tracking = (new tracking(this)).extend(parser.tracking);
            }
        },
        parse: function(dl, force) {
            if (this.parser && dl != null) {
                var data = this.data;
                dl = 'number' === typeof dl ? data.get(dl) : dl;
                
                if (this.parser.name === 'plaintext') {
                    var p = this.convertToSpaces(dl.text);
                    dl.parsed = this.options.showIndentation ? indentGrid(p, this.options.tabWidth) : p;
                    dl.touch();
                } else if (!dl.parsed || dl.changed || force) {
                    if (dl.startPoint) {
                        return this.parse(dl.startPoint, true);
                    }
                    var stream = new Stream(dl.text), i = 0, p
                    , ndl = dl, nl = dl;
                    
                    stream.getNextLine = function() {
                        nl = nl.next();
                        if (nl) {
                            nl.setStartPoint(ndl);
                            this.value.push(nl.text);
                            return this;
                        } else {
                            return false;
                        }
                    }
                    
                    try {
                        p = this.parser.parse(stream, this.memory).parsed;
                        
                        do {
                            p[i] = this.convertToSpaces(p[i]);
                            dl.parsed = this.options.showIndentation ? indentGrid(p[i], this.options.tabWidth) : p[i];
                            dl.touch();
                        } while (++i < p.length && (dl = dl.next()));
                        
                        if (dl && (ndl = dl.next()) && ndl.startPoint) {
                            ndl.clearStartPoint();
                            return this.parse(ndl, true);
                        }
                    } catch (e) {
                        console.error(e.message);
                    }
                }
            }
            return dl;
        },
        focus: function() {
            setTimeout($.invoke(this.input.focus, this.input), 1);
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
                
                self.data.foreach(function(line) {
                    self.parse(this, true);
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
                this.sizes.scrollTop = this.sizes.scrollTop / this.sizes.lineHeight;
                this.wrapper.style.fontSize = this.counter.parent.style.fontSize = (this.options.fontSize = this.sizes.fontSize = size)+'px';
                calculateCharDimensions(this);
                this.screen.element.style.top = (this.sizes.scrollTop *= this.sizes.lineHeight) + 'px';
                this.caret.refresh();
                this.emit('fontsize:changed', size);
            }
            return this;
        },
        increaseFontSize: function() { this.setFontSize(this.options.fontSize+1); },
        decreaseFontSize: function() { this.setFontSize(this.options.fontSize-1); },
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
                this.container.style.height = (this.options.height = parseInt(size)) + 'px';
            }
            this.emit('height:changed');
            return this;
        },
        getLineEnding: function() {
            return lineendings[this.options.lineEndings] || this.options.lineEndings || lineendings['LF'];
        },
        getCurrentLine: function() {
            return this.caret.line();
        },
        getTextAtLine: function(line) {
            var l = this.data.get(line < 0 ? this.data.size + line : line);
            return l ? this.convertToSpaces(l.text) : '';
        },
        getIndentAtLine: function(line, dl) {
            var i = -1;
            dl = dl || this.data.get(line);
            if (dl) {
                while (dl.text[++i] === '\t');
                return i;
            }
            return 0;
        },
        setIndentAtLine: function(line, indent) {
            indent = Math.max(0, indent);
            var dl = this.data.get(line), old, diff;
            if (dl) {
                old = this.getIndentAtLine(old, dl);
                diff = indent - old;
                dl.setText('\t'.repeat(indent) + dl.text.replace(/^\t*/g, ''));
                this.caret.line() == line && this.caret.moveX(diff * this.options.tabWidth);
                this.emit('changed', { line: line, column: 0, text: '\t'.repeat(Math.abs(diff)), added: diff > 0 });
            }
        },
        increaseIndentAtLine: function(line) {
            var dl = this.data.get(line);
            if (dl) {
                dl.text = '\t' + dl.text;
                this.parse(dl, true);
                this.caret.line() == line && this.caret.moveX(this.options.tabWidth);
                this.emit('changed', { line: line, column: 0, text: '\t', added: true });
            }
        },
        decreaseIndentAtLine: function(line) {
            var dl = this.data.get(line);
            if (dl && dl.text.indexOf('\t') === 0) {
                dl.text = dl.text.substr(1);
                this.parse(dl, true);
                this.caret.line() == line && this.caret.moveX(-this.options.tabWidth);
                this.emit('changed', { line: line, column: 0, text: '\t', added: false });
            }
        },
        increaseIndentOfSelection: function() {
            var w = this.options.tabWidth
            , s = this.selection, i, l;
            
            this.caret.position(i = s.start.line, s.start.column);
            l = s.end.line;
            
            s.start.column += w;
            s.end.column += w;
            do this.increaseIndentAtLine(i); while (++i <= l);
            this.showSelection();
        },
        decreaseIndentOfSelection: function() {
            var w = this.options.tabWidth
            , s = this.selection, i, l;
            
            this.caret.position(i = s.start.line, s.start.column);
            l = s.end.line;
            
            if (this.data.get(i).text.indexOf('\t') === 0) {
                s.start.column -= w;
            }
            do this.decreaseIndentAtLine(i); while (++i <= l);
            this.showSelection();
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
            var states = getStates.call(this, this.data.get(line).parsed, column);
            return states || [];
        },
        statesAfter: function(line, column) {
            line = line >= 0 ? line : this.caret.line();
            column = column >= 0 ? column : this.caret.column();
            var states = getStates.call(this, this.data.get(line).parsed, column+1);
            return states || [];
        },
        cursorIsBeforePosition: function(line, column) {
            var l = this.caret.line(), c = this.caret.column();
            return l == line ? c < column : l < line;
        },
        searchLeft: function(pattern, line, column, states) {
            var i = -1, dl;
            pattern = pattern instanceof RegExp ? pattern : new RegExp(pattern.isAlpha() ? '\\b'+pattern+'\\b(?!\\b'+pattern+'\\b).*$' : pattern.escape()+'(?!.*'+pattern.escape()+').*$');
            line = Math.max(0, Math.min(line, this.data.size - 1));
            while ((dl = this.data.get(line--)) && ((i = this.convertToSpaces(dl.text).substring(0, column).search(pattern)) === -1 || !this.isState(states, line+1, i + 1))) {
                column = Infinity;
            }
            return [line + 1, i];
        },
        searchRight: function(pattern, line, column, states) {
            var i = -1, dl;
            pattern = pattern instanceof RegExp ? pattern : new RegExp(pattern.isAlpha() ? '\\b'+pattern+'\\b' : pattern.escape());
            line = Math.max(0, Math.min(line, this.data.size - 1));
            while ((dl = this.data.get(line++)) && ((i = this.convertToSpaces(dl.text).substr(column).search(pattern)) === -1 || !this.isState(states, line-1, i + column + 1))) {
                column = 0;
            }
            return [line - 1, i + column];
        },
        substring: function(from, to) {
            var str = '';
            while (from[0] < to[0]) {
                str += this.convertToSpaces(this.data.get(from[0]++).text).substr(from[1]) + '\n';
                from[1] = 0;
            }
            return str += this.convertToSpaces(this.data.get(to[0]).text).substring(from[1], to[1]);
        },
        charAt: function(line, column) {
            return line < this.data.size ? this.getTextAtLine(line).charAt(column) : '';
        },
        isState: function(state, line, col, all) {
            if (state && state.length) {
                state = 'string' === typeof state ? [state] : state;
                var gs = getStates.call(this, this.data.get(line).parsed, col);
                return gs ? all ? gs.diff(state).length === 0 && gs.length == state.length : gs.diff(state).length !== gs.length : false;
            }
            return false;
        },
        insertText: function(text, mx) {
            this.selection.isset() && this.removeSelection();
            var pos, s = this.convertToSpaces(text).split('\n')
            , bf = this.caret.textBefore()
            , af = this.caret.textAfter()
            , line = this.caret.line();
            
            this.caret.setTextBefore(bf + s[0]);
            if (s.length > 1) {
                for (var i = 1; i < s.length; i++) {
                    this.caret.setTextAfter('');
                    this.insertNewLine(line + i);
                    this.caret.moveX(1).setTextBefore(s[i]);
                }
                this.caret.setTextAfter(af);
            }
            mx && this.caret.moveX(mx);
            text.length && this.emit('changed', { line: line, column: this.caret.column(true), text: text, added: true });
            return this;
        },
        insertSelectedText: function(text, mx) {
            this.selection.setStart(this.caret.line(), this.caret.column());
            this.insertText(text, mx);
            this.selection.setEnd(this.caret.line(), this.caret.column());
            return this;
        },
        put: function(text, line, column, mx) {
            text = this.convertToSpaces(text);
            if (text.length && line < this.data.size) {
                var s = text.split('\n')
                , dl = this.data.get(line)
                , dlt = this.convertToSpaces(dl.text)
                , bf = dlt.substring(0, column), af = dlt.substr(column)
                , isb = this.cursorIsBeforePosition(line, bf.length);
                
                this.emit('changed', { line: line, column: this.convertToTabs(bf).length, text: text, added: true });
                
                if (s.length > 1) {
                    var i = s.length - 1;
                    this.insertNewLine(line+1, s[i] + af);
                    af = '';
                    while (--i > 0) {
                        this.insertNewLine(line+1, s[i]);
                    }
                }
                this.dispatch(dl, bf + s[0] + af);
                this.caret.refresh(true);
                !isb && this.caret.moveX(text.length);
                mx && this.caret.moveX(mx);
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
            dl.text = this.convertToTabs(text);
            return this.parse(dl, true);
        },
        appendText: function(text) {
            var dl, text = this.convertToTabs(text);
            (this.data.size == 1 && (dl = this.data.get(0)).text.length == 0) ? dl.setText(text) : this.data.add(text);
            this.screen.fill();
            return this;
        },
        insertNewLine: function(l, text) {
            var old = this.data.get(l-1);
            var dl = this.data.insert(l);
            dl.text = text || '';
            this.screen.insert(dl, l);
            if (old && old.startPoint) {
                dl.setStartPoint(old.startPoint);
            }
            return this;
        },
        removeLine: function(l) {
            l == null && (l = this.caret.line());
            this.data.remove(l);
            this.screen.remove(l);
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
            if (l < this.data.size - 1) {
                swapLines(this, l);
            }
        },
        removeBeforeCursor: function(arg) {
            var r = '', bf = this.caret.textBefore();
            if (typeof arg === 'string') {
                arg = this.convertToSpaces(arg).split('\n');
                var i = arg.length - 1, x
                , af = this.caret.textAfter()
                , l = this.caret.line();
                while ((x = bf.length - arg[i].length) >= 0 && i && (bf.lastIndexOf(arg[i--]) === x || !arg.length)) {
                    r = '\n' + bf.substr(x) + r;
                    this.caret.setTextBefore(bf.substring(0, x));
                    this.removeLine(l);
                    bf = this.caret.position(--l, -1).textBefore();
                }
                if (bf.lastIndexOf(arg[i]) === x) {
                    this.caret.setTextAtCurrentLine(bf.substring(0, x), af);
                    r = arg[i] + r;
                } else {
                    this.caret.setTextAtCurrentLine(bf, af);
                }
            } else if (typeof arg === 'number') {
                if (arg <= bf.length) {
                    this.caret.setTextBefore(bf.substring(0, bf.length - arg));
                } else {
                    var af = this.caret.textAfter()
                    , l = this.caret.line();
                    
                    while (arg > bf.length && l-1 >= 0) {
                        r = '\n' + bf + r;
                        this.removeLine();
                        arg = arg - bf.length - 1;
                        bf = this.caret.position(--l, -1).textBefore();
                    }
                    this.caret.setTextAtCurrentLine(bf.substring(0, bf.length - arg), af);
                }
                r = bf.substr(bf.length - arg) + r;
            }
            if (r) {
                this.emit('changed', { line: this.caret.line(), column: this.caret.column(true), text: r, added: false });
            }
        },
        removeAfterCursor: function(arg) {
            var r = '', af = this.caret.textAfter();
            if (typeof arg === 'string') {
                var i = 0, l = this.caret.line()
                , bf = this.caret.textBefore();
                arg = this.convertToSpaces(arg).split('\n');
                while (i < arg.length - 1 && (af.indexOf(arg[i]) === 0 || !arg[i].length)) {
                    r = r + arg[i] + '\n';
                    this.caret.setTextAfter(af.substr(arg[i++].length));
                    af = this.getTextAtLine(l+1);
                    this.removeLine(l+1);
                }
                if (af.indexOf(arg[i]) === 0) {
                    this.caret.setTextAfter(af.substr(arg[i].length));
                    r = r + af.substring(0, arg[i].length);
                } else {
                    this.caret.setTextAfter(af);
                }
            } else if (typeof arg === 'number') {
                if (arg <= af.length) {
                    this.caret.setTextAfter(af.substr(arg));
                } else {
                    var bf = this.caret.textBefore()
                    , l = this.caret.line();
                    
                    while (arg > af.length && l+1 < this.data.size) {
                        r = r + af + '\n';
                        this.caret.setTextAfter('');
                        arg = arg - af.length - 1;
                        af = this.getTextAtLine(l+1);
                        this.removeLine(l+1);
                    }
                    this.caret.setTextAfter(af.substr(arg));
                }
                r = r + af.substring(0, arg);
            }
            if (r) {
                this.emit('changed', { line: this.caret.line(), column: this.caret.column(true), text: r, added: false });
            }
        },
        isEmpty: function() {
            return this.data.size === 1 && !this.data.get(0).text;
        },
        getValue: function(withTabs) {
            var self = this, r = []
            , fn = withTabs
            ? function(obj) { return obj.text; }
            : function(obj) { return self.convertToSpaces(obj.text); };
            
            this.data.foreach(function() {
                r.push(fn(this));
            });
            return r.join(this.getLineEnding());
        },
        getSelection: function() {
            if (this.selection.isset()) {
                if (this.isAllSelected()) {
                    return this.getValue();
                }
                var c = this.selection.coords();
                
                if (c[0][0] != c[1][0]) {
                    var t = this.getTextAtLine(c[0][0]).substr(c[0][1]) + this.getLineEnding();
                    for (var i = c[0][0] + 1; i < c[1][0]; i++) {
                        t = t + this.getTextAtLine(i) + this.getLineEnding();
                    }
                    return t + this.getTextAtLine(c[1][0]).substring(0, c[1][1]);
                } else {
                    return this.getTextAtLine(c[0][0]).substring(c[0][1], c[1][1]);
                }
            }
            return '';
        },
        isAllSelected: function() {
            if (this.selection.isset()) {
                var c = this.selection.coords();
                return c && c[0][0] === 0 && c[0][1] === 0 && c[1][0] === this.data.size-1 && c[1][1] === this.getTextAtLine(-1).length;
            }
            return false;
        },
        showSelection: function(moveCursorToEnd) {            
            if (this.selection.isset()) {
                var sp, s = this.selection.start
                , e = this.selection.end
                , ov = this.selection.overlay
                , sel = this.getSelection();
                
                this.unselectLine();
                this.input.value = sel;
                this.input.setSelectionRange(0, sel.length);
                sel = sel.split(this.getLineEnding());
                ov.node.innerHTML = '';
                
                for (var i = 0; i < sel.length; i++) {
                    var pos = getPositionOf(this, s.line+i, i === 0 ? s.column : 0);
                    sp = createSpan(i+1 < sel.length ? sel[i] + ' ' : sel[i], 'cp-selection', pos.y, pos.x);
                    ov.node.append(sp);
                }
                moveCursorToEnd && this.caret.position(this.selection.end.line, this.selection.end.column);
                ov.reveal();
            }
        },
        removeSelection: function() {
            if (this.selection.isset()) {
                if (this.isAllSelected()) {
                    this.emit('changed', { line: 0, column: 0, text: this.getValue(true), added: false });
                    this.init('');
                    this.caret.position(0, 0);
                    this.screen.fill();
                } else {
                    this.caret.position(this.selection.start.line, this.selection.start.column);
                    this.removeAfterCursor(this.getSelection());
                }
                this.selection.clear();
                this.selectLine(this.caret.line());
            }
        },
        selectAll: function() {
            var ls = this.data.size - 1;
            this.selection.setRange(0, 0, ls, this.getTextAtLine(ls).length);
            this.showSelection();
            this.caret.deactivate().hide();
        },
        jumpTo: function(line, column) {
            this.caret.position(line, column || 0);
            return this;
        },
        createHighlightOverlay: function(/* arrays, ... */) {
            if (this.highlightOverlay) this.highlightOverlay.remove();
            var self = this, args = arguments
            , overlay = this.highlightOverlay = new CodePrinter.Overlay(this, 'cp-highlight-overlay', false);
            overlay.on('refresh', function(a) { /^(blur|changed)$/.test(a) && overlay.remove(); });
            for (var i = 0; i < arguments.length; i++) {
                var pos = getPositionOf(this, arguments[i][0], arguments[i][1]);
                overlay.node.append(createSpan(arguments[i][2], 'cp-highlight', pos.y, pos.x, arguments[i][2].length * this.sizes.charWidth + 1, this.sizes.lineHeight));
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
                            if (this.position) {
                                search.mute = true;
                                self.selection.setRange(this.position.sl, this.position.sc, this.position.el, this.position.ec);
                                self.caret.position(this.position.el, this.position.ec);
                                this.fadeOut();
                                search.mute = false;
                            }
                            return e.cancel();
                        });
                    } else {
                        search.overlay.node.innerHTML = '';
                    }
                    
                    for (var line = 0; line < this.data.size; line++) {
                        var i, ln = 0, value = this.getTextAtLine(line);
                        
                        while (value && (i = value.search(find)) !== -1) {
                            var match = isregexp ? value.match(find)[0] : find
                            , node = span.cloneNode().addClass('cp-search-occurrence');
                            
                            node.textContent = node.innerText = node.innerHTML = match;
                            ln = ln + i;
                            node.extend({ position: {
                                sl: line,
                                sc: ln,
                                el: line,
                                ec: ln + match.length
                            }});
                            node.style.extend({
                                top: parseInt(sizes.paddingTop + line * sizes.lineHeight + 1) + 'px',
                                left: parseInt(sizes.paddingLeft + sizes.charWidth * ln) + 'px'
                            });
                            search.results.push(node);
                            search.overlay.node.append(node);
                            ln = ln + match.length;
                            value = value.substr(i + match.length);
                        }
                    }
                    search.overlay.reveal();
                    search.value = find;
                    search.results.removeClass('active').get(0).addClass('active');
                    scroll !== false && scrollToCurrentSearchResult.call(this);
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
                this.screen.fill();
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
                this.screen.fill();
                this.input.focus();
                this.emit('fullscreen:leaved');
            }
        },
        openCounter: function() {
            this.counter.isVisible = true;
            this.counter.parent.scrollTop = this.wrapper.scrollTop;
            this.counter.parent.removeClass('hidden');
        },
        closeCounter: function() {
            this.counter.isVisible = false;
            this.counter.parent.addClass('hidden');
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
        this.size = 0;
        return this;
    }
    
    Branch.prototype = {
        indexOf: Array.prototype.indexOf,
        splice: function(index, howmany) {
            var delta = 0, l = Math.min(index + howmany, this.length || 0);
            for (var i = index; i < l; i++) {
                delta -= this[i].size;
                this[i].parent = this[i].root = null;
            }
            for (var i = 2; i < arguments.length; i++) {
                delta += arguments[i].size;
                arguments[i].parent = this;
                arguments[i].root = this.root || this;
            }
            this.resize(this.isLeaf ? arguments.length - 2 - l + index : delta);
            return Array.prototype.splice.apply(this, arguments);
        },
        push: function() {
            var delta = 0;
            for (var i = 0; i < arguments.length; i++) {
                delta += arguments[i].size;
                arguments[i].parent = this;
                arguments[i].root = this.root || this;
            }
            this.resize(this.isLeaf ? arguments.length : delta);
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
        insert: function(line) {
            if (this.isLeaf) {
                var dl = new Line();
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
                            return this[i].fork().insert(0);
                        }
                        var next = this[i].split();
                        if (line >= this[i].size) {
                            return next.insert(line - this[i].size);
                        }
                    }
                    return this[i].insert(line);
                }
                var child = new Branch(true);
                this.push(child);
                return child.insert(0);
            }
        },
        remove: function(line) {
            var dl = this.get(line), i;
            if (dl && (i = dl.parent.indexOf(dl)) >= 0) {
                var tmp = dl.parent;
                tmp.splice(i, 1);
                while (tmp.parent && tmp.length == 0) {
                    i = tmp.parent.indexOf(tmp);
                    (tmp = tmp.parent).splice(i, 1);
                }
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
        resize: function(delta) {
            if (delta) {
                var tmp = this;
                while (tmp != null) {
                    tmp.size += delta;
                    tmp = tmp.parent;
                }
            }
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
        
        this.add = function(text) {
            var dl = this.insert(this.size);
            dl.text = text;
            return dl;
        }
        return this;
    }
    Data.prototype = Branch.prototype;
    
    Line = function() {
        this.parent = this.root = null;
        this.changed = false;
        return this;
    }
    
    Line.prototype = {
        setText: function(str) {
            if (str !== this.text) {
                this.text = str;
                this.changed = true;
                this.root.emit('changed', this);
            }
        },
        setParsed: function(str) {
            if (str !== this.parsed) {
                this.parsed = str;
                this.changed = false;
                this.touch();
            }
        },
        setStartPoint: function(sp) {
            if (sp instanceof Line) {
                this.startPoint = sp;
            }
        },
        clearStartPoint: function() {
            delete this.startPoint;
        },
        setNode: function(node) {
            this.pre = node;
            this.touch();
            return this.pre;
        },
        captureNode: function(dl) {
            dl.pre && this.setNode(dl.deleteNode());
        },
        deleteNode: function() {
            var node;
            if (node = this.pre) {
                delete this.pre;
            }
            return node;
        },
        touch: function() {
            if (this.pre instanceof HTMLElement) {
                this.pre.innerHTML = this.parsed || ' ';
            }
        },
        next: function() {
            var i;
            if (this.parent && (i = this.parent.indexOf(this)) >= 0) {
                if (i + 1 < this.parent.length) {
                    return this.parent[i+1];
                } else {
                    var next = this.parent.next();
                    return next && next.length ? next[0] : null;
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
                    return prev && prev.length ? prev[prev.length-1] : null;
                }
            }
            return null;
        }
    }
    
    Caret = function(cp) {
        var line = 0, column = 0, before = '', after = '', tmp, timeout;
        
        this.root = cp;
        
        return this.extend({
            setTextBefore: function(str) {
                var l = str.length;
                str = cp.convertToTabs(str);
                if (before !== str) {
                    before = str;
                    this.emit('text:changed', line, column);
                    this.position(line, l);
                }
                return this;
            },
            setTextAfter: function(str) {
                str = cp.convertToTabs(str);
                if (after !== str) {
                    after = str;
                    this.emit('text:changed', line, column);
                }
                return this;
            },
            setTextAtCurrentLine: function(bf, af) {
                var l = bf.length;
                bf = cp.convertToTabs(bf);
                af = cp.convertToTabs(af);
                if (before !== bf || after !== af) {
                    before = bf;
                    after = af;
                    this.emit('text:changed', line, column);
                    this.position(line, l);
                }
                return this;
            },
            textBefore: function() {
                return cp.convertToSpaces(before);
            },
            textAfter: function() {
                return cp.convertToSpaces(after);
            },
            textAtCurrentLine: function(b) {
                return b ? before + after : this.textBefore() + this.textAfter();
            },
            getPosition: function() {
                return { line: line ? line + 1 : 1, column: this.column() + 1 };
            },
            position: function(l, c, t) {
                timeout = clearTimeout(timeout);
                typeof l !== 'number' && (l = line || 0);
                l = Math.max(Math.min(l, cp.data.size - 1), 0);
                typeof t !== 'string' && (t = cp.getTextAtLine(l));
                typeof c !== 'number' && (c = column || 0);
                c < 0 && (c = t.length + c + 1);
                
                var x = cp.sizes.charWidth * Math.min(c, t.length)
                , y = cp.sizes.lineHeight * l;
                
                if (line !== l) {
                    this.emit('line:changed', l, line);
                    line = l;
                }
                if (column !== c) {
                    this.emit('column:changed', c, column);
                    column = c;
                }
                
                before = cp.convertToTabs(t.substring(0, c));
                after = cp.convertToTabs(t.substr(c));
                this.setPixelPosition(x, y);
                return this;
            },
            moveX: function(mv) {
                var abs, t = '', cl = line,
                    bf = this.textBefore(),
                    af = this.textAfter();
                
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
                    if (cl < cp.data.size) {
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
            },
            moveY: function(mv) {
                mv = line + mv;
                mv = mv < 0 ? (column = 0) : mv >= this.root.data.size ? (column = -1) && this.root.data.size-1 : mv;
                return this.position(mv, column);
            },
            refresh: function(force) {
                cp.removeOverlays(null);
                return force ? this.position(line, column) : this.setPixelPosition(cp.sizes.charWidth * Math.min(column, this.textBefore().length), cp.sizes.lineHeight * line);
            },
            line: function() {
                return line;
            },
            column: function(withTabs) {
                return withTabs ? before.length : this.textBefore().length;
            },
            eachCharacter: function(f, bf) {
                var i = this.textBefore().length, n = 0, r = true,
                    tabString = cp.tabString();
                
                if (bf) {
                    i--;
                    while (r !== false && line - n >= 0) {
                        var t = cp.getTextAtLine(line - n);
                        n > 0 && (i = t.length - 1);
                        while (r !== false && i >= 0) {
                            r = f.call(this, t[i], line - n, 1+i--, cp);
                        }
                        n++;
                    }
                } else {
                    while (r !== false && line + n < cp.data.size) {
                        var t = cp.getTextAtLine(line + n);
                        while (r !== false && i < t.length) {
                            r = f.call(this, t[i], line + n, i++, cp);
                        }
                        i = 0;
                        n++;
                    }
                }
            },
            savePosition: function(onlycolumn) {
                return tmp = [onlycolumn ? null : line, column];
            },
            restorePosition: function(save) {
                if (save instanceof Array && save.length == 2) {
                    this.position(save[0], save[1]);
                } else {
                    tmp != null && this.position(tmp[0], tmp[1]);
                    tmp = null;
                }
            }
        });
    };
    Caret.styles = {
        vertical: function(css) {
            css.height = this.sizes.lineHeight;
            return css;
        },
        underline: function(css) {
            css.width = this.sizes.charWidth + 2;
            css.height = 1;
            css.top = css.top + this.sizes.lineHeight - 1;
            css.left = css.left - 1;
            return css;
        },
        block: function(css) {
            css.width = this.sizes.charWidth;
            css.height = this.sizes.lineHeight;
            css.left += 1;
            return css;
        }
    };
    Caret.prototype = {
        isActive: false,
        show: function() {
            this.element.style.opacity = "1";
            return this;
        },
        hide: function() {
            this.element.style.opacity = "0";
            return this;
        },
        activate: function() {
            if (this.root.options.blinkCaret) {
                var elm = this.element, a = false, fn = function() { a = !a; elm.style.opacity = +a; };
                this.interval = clearInterval(this.interval) || fn() || setInterval(fn, this.root.options.caretBlinkSpeed);
            }
            this.isActive = true;
            return this;
        },
        deactivate: function() {
            if (this.isActive) {
                this.interval && (this.interval = clearInterval(this.interval));
                this.isActive = false;
            }
            return this;
        },
        setPixelPosition: function(x, y) {
            var css = {},
                stl = this.style || this.root.options.caretStyle;
            
            x >= 0 && (css.left = this.x = x = Math.floor(x + this.root.sizes.paddingLeft));
            y >= 0 && (css.top = this.y = y = Math.floor(y + this.root.sizes.paddingTop));
            
            css = this.drawer.call(this.root, css);
            this.element.css(css);
            this.emit('position:changed', x, y, this.line(), this.column(), this.textBefore(), this.textAfter());
            return this;
        },
        setStyle: function(style) {
            this.style = style;
            this.element.className = 'cp-caret cp-caret-'+style;
            this.drawer = Caret.styles[Caret.styles[style] ? style : 'vertical'];
            this.refresh();
        },
        move: function(x, y) {
            x && this.moveX(x);
            y && this.moveY(y);
            return this;
        },
        registerTracker: function(key, callback) {
            if (this.tracking) {
                this.tracking[key] = callback;
            }
        }
    }
    
    Screen = function(cp, counter) {
        this.cp = cp;
        this.counter = counter;
        this.lines = [];
        
        return this;
    }
    Screen.prototype = {
        from: 0,
        to: -1,
        fill: function(startDL) {
            var height = this.getDesiredHeight()
            , dl = startDL || (this.lines.length ? this.lines[this.lines.length-1].next() : this.cp.data.get(0));
            
            while (dl != null && this.element.clientHeight < height) {
                dl.setNode(pre.cloneNode());
                this.link(dl, this.lines.length);
                ++this.to;
                this.counter.increase();
                dl = dl.next();
            }
            this.updateHeight();
        },
        rewind: function(dl, line) {
            this.element.style.top = (this.cp.sizes.scrollTop = line * this.cp.sizes.lineHeight) + 'px';
            this.clear();
            this.from = this.to = line;
            this.counter.startFrom(line);
            this.fill(dl);
        },
        insert: function(dl, index) {
            if (dl instanceof Line && this.from <= index && index <= this.to+1) {
                var q = index - this.from;
                
                if (this.element.clientHeight < this.getDesiredHeight()) {
                    dl.setNode(pre.cloneNode());
                    ++this.to;
                    this.counter.increase();
                } else if (index > this.lines.length / 2) {
                    dl.captureNode(this.lines.shift());
                    ++this.from; ++this.to;
                    this.element.style.top = (this.cp.sizes.scrollTop += this.cp.sizes.lineHeight) + 'px';
                    this.counter.shift();
                    this.element.removeChild(dl.pre);
                    --q;
                } else {
                    dl.captureNode(this.lines.pop());
                }
                this.link(dl, q);
                this.updateHeight();
            }
        },
        remove: function(index) {
            if (this.from <= index && index <= this.to) {
                var q = index - this.from
                , dl = this.lines[this.lines.length-1].next()
                , rmdl = this.lines.splice(q, 1)[0];
                
                if (dl) {
                    dl.captureNode(rmdl);
                    this.link(dl, this.lines.length);
                } else {
                    this.element.removeChild(rmdl.pre);
                    --this.to;
                    dl = this.lines[0].prev();
                    if (dl) {
                        dl.captureNode(rmdl);
                        --this.from;
                        this.element.style.top = (this.cp.sizes.scrollTop -= this.cp.sizes.lineHeight) + 'px';
                        this.link(dl, 0);
                        this.counter.unshift();
                    } else {
                        this.counter.decrease();
                    }
                }
                this.updateHeight();
            }
        },
        shift: function() {
            var dl = this.lines[this.lines.length-1].next();
            if (dl) {
                dl.captureNode(this.lines[0]);
                this.element.style.top = (this.cp.sizes.scrollTop += this.cp.sizes.lineHeight) + 'px';
                this.link(dl, this.lines.length);
                this.lines.shift();
                ++this.from; ++this.to;
                this.counter.shift();
                return dl;
            }
        },
        unshift: function() {
            var dl = this.lines[0].prev();
            if (dl) {
                dl.captureNode(this.lines[this.lines.length-1]);
                this.element.style.top = (this.cp.sizes.scrollTop -= this.cp.sizes.lineHeight) + 'px';
                this.link(dl, 0);
                this.lines.pop();
                --this.to; --this.from;
                this.counter.unshift();
                return dl;
            }
        },
        link: function(dl, index) {
            this.element.insertBefore(dl.pre, index < this.lines.length ? this.lines[index].pre : null);
            this.lines.put(dl, index);
            this.cp.parse(dl);
        },
        clear: function() {
            this.to = -1;
            this.from = this.lines.length = 0;
            this.element.innerHTML = '';
            this.counter.clear();
        },
        get: function(i) {
            i = i - this.from;
            return i >= 0 && i < this.lines.length ? this.lines[i].pre : null;
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
    
    Counter = function(cp) {
        this.lastLine = (this.startNumber = cp.options.firstLineNumber) - 1;
        if (cp.options.lineNumberFormatter instanceof Function) {
            this.formatter = cp.options.lineNumberFormatter;
        }
        return this;
    }
    Counter.prototype = {
        isVisible: false,
        increase: function() {
            var node = li.cloneNode(false);
            node.innerHTML = this.formatter(++this.lastLine);
            this.element.appendChild(node);
        },
        decrease: function() {
            this.lastLine--;
            this.element.removeChild(this.element.lastChild);
        },
        shift: function() {
            if (this.element.childNodes.length) {
                var fi = this.element.firstChild
                this.element.removeChild(fi);
                fi.innerHTML = this.formatter(++this.lastLine);
                this.element.appendChild(fi);
                this.updateOffset();
            }
        },
        unshift: function() {
            if (this.element.childNodes.length) {
                var la = this.element.lastChild;
                this.element.removeChild(la);
                la.innerHTML = this.formatter(--this.lastLine - this.element.childNodes.length);
                this.element.insertBefore(la, this.element.firstChild);
                this.updateOffset();
            }
        },
        startFrom: function(line) {
            this.lastLine = this.startNumber + line - 1;
        },
        clear: function() {
            this.lastLine = this.startNumber - 1;
            this.element.innerHTML = '';
            this.updateOffset();
        },
        get: function(line) {
            var kids = this.element.kids();
            return line >= this.lastLine - kids.length && line <= this.lastLine ? kids.item(line - this.lastLine - kids.length) : null;
        },
        formatter: function(i) {
            return i;
        }
    }
    
    Stream = function(value) {
        this.value = value instanceof Array ? value : typeof value === 'string' ? [value] : [];
        this.parsed = [];
        this.row = 0;
        this.pos = 0;
        return this;
    }
    Stream.prototype = {
        found: '',
        eaten: '',
        wrapped: '',
        setRow: function(r, p) {
            if (r < 0 || r >= this.value.length) {
                return false;
            }
            this.row = r;
            this.pos = (p || 0);
            return this;
        },
        forward: function() {
            return this.setRow(this.row + 1);
        },
        backward: function() {
            return this.setRow(this.row - 1);
        },
        current: function() {
            return this.row < this.value.length ? this.value[this.row || 0] : '';
        },
        match: function(rgx, index) {
            this.found.length && this.skip();
            var m, i, s = this.current().substr(this.pos)
            , f = false;
            
            if (s.length > 0) {
                m = rgx.exec(s);
                if ((this.lastMatches = m) && m[0]) {
                    f = m[0];
                    i = s.indexOf(f);
                    this.append(s.substring(0, i));
                    this.pos = this.pos + i;
                }
            }
            !f && this.tear();
            this.found = f;
            return m && index ? this.lastMatches[index] : f;
        },
        eat: function(from, to, req, force) {
            this.eaten = [];
            var str = this.current().substr(this.pos),
                indexFrom = 0, indexTo = 0, pos = 0;
            
            from = from || this.found;
            
            if (from instanceof RegExp) {
                if ((indexFrom = str.search(from)) !== -1) {
                    from = str.match(from)[0];
                } else
                    return this;
            } else if ((indexFrom = str.indexOf(from)) === -1) {
                return this;
            }
            pos = indexFrom + from.length;
            this.append(str.substring(0, indexFrom));
            this.pos = this.pos + indexFrom;
            
            if (to) {
                var str2 = str.substr(pos);
                if (to === '\n') {
                    indexTo = str2.length;
                } else if (to instanceof RegExp) {
                    if ((indexTo = str2.search(to)) !== -1) {
                        to = to.exec(str2)[0];
                    }
                } else {
                    indexTo = str2.indexOf(to);
                }
                if (indexTo === -1) {
                    if (force) {
                        this.eaten = [str.substr(indexFrom)];
                        this.pos += pos + str2.length;
                        
                        while (this.getNextLine()) {
                            this.row++;
                            this.pos = 0;
                            str2 = this.current();
                            if (str2 != null) {
                                if (to instanceof RegExp) {
                                    if ((indexTo = str2.search(to)) !== -1) {
                                        to = to.exec(str2)[0];
                                    }
                                } else {
                                    indexTo = str2.indexOf(to);
                                }
                                if (indexTo !== -1) {
                                    this.eaten.push(str2.substring(0, indexTo + to.length));
                                    this.pos = indexTo + to.length;
                                    return this;
                                } else {
                                    this.eaten.push(str2);
                                    this.pos = str2.length;
                                }
                            } else {
                                this.row--;
                                this.pos = this.value[this.row].length;
                                return this;
                            }
                        }
                        return this;
                    } else if (req) {
                        indexTo = pos + str2.length;
                        if (req instanceof Function) {
                            this.eaten = [str.substring(indexFrom, indexTo)];
                            this.pos = this.pos + (indexTo - indexFrom);
                            req.call(this);
                            return this;
                        }
                    }
                } else {
                    indexTo = indexTo + pos + to.length;
                }
            }
            if (indexTo <= 0) {
                indexTo = pos;
            }
            
            this.eaten = [str.substring(indexFrom, indexTo)];
            this.pos = this.pos + (indexTo - indexFrom);
            return this;
        },
        eatWhile: function(from, to) {
            return this.eat(from, to, true, true);
        },
        wrap: function() {
            if (!this.eaten.length) {
                if (this.found) {
                    this.eat(this.found);
                } else {
                    return this;
                }
            }
            var tmp = this.eaten, args = Array.apply(null, arguments), classes, filter;
            if (args[args.length-1] instanceof Function) {
                filter = args.pop();
            }
            classes = 'cpx-'+args.join(' cpx-');
            
            this.wrapped = [];
            tmp.length > 1 && (this.row = this.row - tmp.length + 1);
            var i = -1;
            
            while (++i < tmp.length) {
                var ls = (tmp[i].match(/^\s*/) || [])[0];
                this.wrapped[i] = this.append((ls || '') + (tmp[i] ? wrap(tmp[i].replace(/^\s*/, ''), classes, filter) : ''));
                if (i < tmp.length - 1) {
                    this.parsed[++this.row] = '';
                }
            }
            return this.reset();
        },
        applyWrap: function(array) {
            return this.wrap.apply(this, array);
        },
        unwrap: function() {
            if (this.wrapped.length) {
                var p = this.parsed[this.row];
                if (p.endsWith(this.wrapped[0])) {
                    this.parsed[this.row] = p.substr(0, p.length - this.wrapped[0].length);
                }
                this.eaten = this._eaten;
                delete this._eaten;
                this.wrapped = [];
            }
            return this;
        },
        isWrapped: function() {
            return this.wrapped && this._eaten && !this.found;
        },
        append: function(txt) {
            if (typeof txt === 'string') {
                if (typeof this.parsed[this.row] !== 'string') {
                    this.parsed[this.row] = txt;
                } else {
                    this.parsed[this.row] = this.parsed[this.row] + txt;
                }
            }
            return txt;
        },
        push: function() {
            var e = this.eaten;
            if (e.length) {
                for (var i = this.row - e.length + 1, j = 0; j < e.length; i++, j++) {
                    if (this.parsed[i] == null) {
                        this.parsed[i] = '';
                    }
                    this.parsed[i] += e[j].encode();
                }
            }
        },
        before: function(l) {
            return this.current().substring(l != null ? this.pos - l : 0, this.pos);
        },
        after: function(l) {
            return this.current().substr(this.pos + (this.found.length || 0), l);
        },
        isAfter: function(s) {
            var af = this.after();
            return s instanceof RegExp ? af.search(s) === 0 : af.trim().indexOf(s) === 0;
        },
        isBefore: function(s) {
            var bf = this.before(), t, i;
            return s instanceof RegExp ? s.test(bf) : (t = bf.trim()) && t.endsWith(s);
        },
        cut: function(index) {
            if (this.found && index >= 0) {
                this.found = this.found.substring(0, index);
            }
            return this;
        },
        back: function() {
            if (this.eaten.length) {
                this.row = this.row - this.eaten.length + 1;
                this.pos = this.eaten.length > 1 ? this.value[this.row].rbreak(this.eaten[0]).length : this.pos - this.eaten[0].length;
                this.eaten = [];
            }
            return this;
        },
        reset: function() {
            this.found = false;
            this._eaten = this.eaten;
            this.eaten = [];
            return this;
        },
        tear: function() {
            this.teared = this.current().substr(this.pos);
            this.append(this.teared ? '<span>'+this.teared+'</span>' : '');
            this.forward();
            return this;
        },
        restore: function() {
            if (this.teared) {
                var p = this.parsed[this.row];
                this.backward();
                this.parsed[this.row] = p.substr(0, p.length - this.teared.length - 13);
                this.pos = this.value[this.row].length - this.teared.length;
                this.teared = null;
            }
            return this;
        },
        revert: function() {
            if (this.found) {
                this.pos = this.pos - this.found.length;
                this.found = false;
            }
            return this;
        },
        skip: function(found) {
            var str = this.current().substr(this.pos);
            found = found || this.found;
            if (found && str.indexOf(found) === 0) {
                this.append('<span>'+found+'</span>');
                this.pos = this.pos + found.length;
                this.found = false;
            }
            return this;
        },
        peek: function(q) {
            q = q || 0;
            return this.current().charAt(this.pos + q);
        },
        eol: function() {
            return this.pos === this.current().length;
        },
        sol: function() {
            return this.pos === 0;
        },
        toString: function() {
            return this.parsed.join('\n');
        }
    }
    
    CodePrinter.Mode = function(name, extend) {
        this.name = name;
        this.keyMap = {};
        this.onLeftRemoval = {
            '{': '}', '(': ')', '[': ']', '"': '"', "'": "'"
        }
        this.onRightRemoval = {
            '}': '{', ')': '(', ']': '[', '"': '"', "'": "'"
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
            '//': { ending: '\n', classes: ['comment', 'line-comment'] }, 
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
            stream.parsed = stream.value;
            return stream;
        },
        compile: function(string, memory) {
            return this.parse(new Stream(string), memory).parsed;
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
        }
    }
    
    keyMap = function() {}
    keyMap.prototype = {
        'Backspace': function() {
            if (this.selection.isset()) {
                this.removeSelection();
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
            if (this.selection.isset()) {
                this.increaseIndentOfSelection();
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
        'Alt+Tab': function() {
            this.selection.isset() ? this.increaseIndentOfSelection() : this.increaseIndentAtLine(this.caret.line());
            return false;
        },
        'Shift+Tab': function(e) {
            this.selection.isset() ? this.decreaseIndentOfSelection() : this.decreaseIndentAtLine(this.caret.line());
            return false;
        },
        'Enter': function() {
            if (this.options.indentNewLines) {
                var rest = '', line = this.caret.line(), indent = this.getIndentAtLine(line)
                , af = this.caret.textAfter(), spacesAfter = 0;
                
                if (this.parser && this.parser.indentation) {
                    var i = this.parser.indentation.call(this, this.caret.textBefore().trim(), af.trim(), line, indent, this.parser);
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
            this.isFullscreen && this.exitFullscreen();
            return false;
        },
        'PageUp': function() {
            this.caret.moveY(-50);
        },
        'PageDown': function() {
            this.caret.moveY(50);
        },
        'End': function() {
            this.caret.position(this.data.size - 1, -1);
        },
        'Home': function() {
            this.caret.position(0, 0);
        },
        'Left': function(e, c) {
            c % 2 ? this.caret.move(c - 38, 0) : this.caret.move(0, c - 39);
            this.selection.clear();
            return false;
        },
        'Del': function() {
            if (this.selection.isset()) {
                this.removeSelection();
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
        'Ctrl+Up': function(e) {
            this.wrapper.scrollTop = 0;
            this.caret.position(0, 0);
            return false;
        },
        'Alt+Up': CodePrinter.prototype.prevOccurrence,
        'Alt+Ctrl+Up': CodePrinter.prototype.swapLineUp,
        'Ctrl+Right': function() {
            this.caret.position(this.caret.line(), -1);
            return false;
        },
        'Ctrl+Down': function(e) {
            this.caret.position(this.data.size - 1, -1);
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
            var self = this, l = parseInt(prompt("Jump to line..."), 10) - 1;
            setTimeout(function() {
                self.caret.position(l, 0);
            }, 1);
        },
        'Ctrl+N': function() {
            this.counter.isVisible ? this.closeCounter() : this.openCounter();
        },
        'Ctrl+R': function() {
            this.forcePrint();
        },
        'Ctrl+Z': function() {
            this.history.undo();
        },
        'Shift+Ctrl+Z': function(e) {
            this.history.redo();
        },
        'Ctrl++': CodePrinter.prototype.increaseFontSize,
        'Ctrl+-': CodePrinter.prototype.decreaseFontSize,
        'Ctrl+/': function() {
            if (this.parser && this.parser.lineComment) {
                var start, end, is, sm = 0, comment = this.parser.lineComment.split('[text content]');
                
                if (is = this.selection.isset()) {
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
        'Ctrl+[': function() {
            this.selection.isset() ? this.decreaseIndentOfSelection() : this.decreaseIndentAtLine(this.caret.line());
        },
        'Ctrl+]': function() {
            this.selection.isset() ? this.increaseIndentOfSelection() : this.increaseIndentAtLine(this.caret.line());
        },
        'Shift+Left': function(e, c) {
            if (!this.selection.isset()) {
                this.selection.setStart(this.caret.line(), this.caret.column());
            }
            c % 2 ? this.caret.move(c - 38, 0) : this.caret.move(0, c - 39);
            this.selection.setEnd(this.caret.line(), this.caret.column());
        }
    }
    keyMap.prototype['Down'] = keyMap.prototype['Right'] = keyMap.prototype['Up'] = keyMap.prototype['Left'];
    keyMap.prototype['Shift+Down'] = keyMap.prototype['Shift+Right'] = keyMap.prototype['Shift+Up'] = keyMap.prototype['Shift+Left'];
    keyMap.prototype['`'] = keyMap.prototype['\''] = keyMap.prototype['"'];
    keyMap.prototype['['] = keyMap.prototype['{'] = keyMap.prototype['('];
    keyMap.prototype[']'] = keyMap.prototype['}'] = keyMap.prototype[')'];
    
    commands = {
        'A': function(e) {
            if (!this.isAllSelected()) {
                this.selectAll();
                this.emit('cmd.selectAll');
            }
            return false;
        },
        'C': function(e) {
            this.input.focus();
            this.input.setSelectionRange(0, this.input.value.length);
            this.emit('cmd.copy');
            return -1;
        },
        'V': function(e) {
            this.removeSelection();
            this.emit('cmd.paste');
            setTimeout(this.input.emit.bind(this.input, 'keyup'), 5);
            return true;
        },
        'X': function() {
            if (this.selection.isset()) {
                this.removeSelection();
                this.emit('cmd.cut');
            }
            return true;
        },
        'Z': function(e) {
            e.shiftKey ? this.history.redo() : this.history.undo();
            return false;
        }
    }
    
    history = function(cp, stackSize, delay) {
        this.onundo = function() {
            var a, i = arguments.length;
            cp.selection.clear();
            while (i--) {
                a = arguments[i];
                var t = cp.data.get(a.line).text.substring(0, a.column);
                cp.caret.position(a.line, a.column + (cp.options.tabWidth-1) * (t.match(/\t/g) || []).length).savePosition();
                if (a.added) {
                    cp.removeAfterCursor(a.text);
                } else {
                    cp.insertText(a.text);
                }
            }
            cp.caret.restorePosition();
        }
        this.onredo = function() {
            var a, i = -1;
            cp.selection.clear();
            while (++i < arguments.length) {
                a = arguments[i];
                var t = cp.data.get(a.line).text.substring(0, a.column);
                cp.caret.position(a.line, a.column + (cp.options.tabWidth-1) * (t.match(/\t/g) || []).length).savePosition();
                if (a.added) {
                    cp.insertText(a.text);
                } else {
                    cp.removeAfterCursor(a.text);
                }
            }
            cp.caret.restorePosition();
        }
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
    history.prototype = {
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
        undo: function() {
            if (this.index >= 0 && this.index <= this.states.length && this.states.length) {
                this.timeout = clearTimeout(this.timeout);
                (!this.states[this.index] || !this.states[this.index].length) && --this.index;
                this.mute().emit('undo', this.states[this.index--]).unmute();
                this.performed = true;
            }
        },
        redo: function() {
            this.index < 0 && (this.index = 0);
            if (this.index < this.states.length) {
                this.timeout = clearTimeout(this.timeout);
                this.mute().emit('redo', this.states[this.index++]).unmute();
                this.performed = true;
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
    
    selection = function() {
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
        this.clear = function() {
            this.overlay.node.innerHTML = '';
            this.overlay.remove();
            coords = [];
            return this;
        }
        this.setStart = function(line, column) {
            coords[0] = [line, column];
            this.overlay.isRemovable = false;
            this.emit('started', { line: line, column: column });
        }
        this.setEnd = function(line, column) {
            coords[1] = [line, column];
            make.call(this);
        }
        this.move = function(mv) {
            coords[0][1] += mv;
            coords[1][1] += mv;
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
    selection.prototype = {
        setRange: function(sl, sc, el, ec) {
            this.setStart(sl, sc);
            this.setEnd(el, ec);
            return this;
        },
        inSelection: function(line, column) {
            var c = this.coords();
            return line == Math.max(c[0][0], Math.min(line, c[1][0]))
            && (line != c[0][0] || column >= c[0][1])
            && (line != c[1][0] || column <= c[1][1]);
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
        $.scripts.define('CodePrinter/'+name.toLowerCase(), new CodePrinter.Mode(name, obj), req);
    }
    CodePrinter.getMode = function(name) {
        return $.scripts.get('CodePrinter/'+name.toLowerCase());
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
        var m = div.cloneNode().addClass('codeprinter cp-animation')
        , b = div.cloneNode().addClass('cp-body')
        , c = div.cloneNode().addClass('cp-container')
        , w = div.cloneNode().addClass('cp-wrapper')
        , s = div.cloneNode().addClass('cp-screen')
        , l = div.cloneNode().addClass('cp-codelines')
        , u = div.cloneNode().addClass('cp-caret')
        , n = div.cloneNode().addClass('cp-counter');
        
        w.appendChild(document.createElement('textarea').addClass('cp-input'));
        w.appendChild(u);
        s.appendChild(l);
        w.appendChild(s);
        n.appendChild(document.createElement('ol'));
        c.appendChild(n);
        c.appendChild(w);
        b.appendChild(c);
        m.appendChild(b);
        
        return function(cp) {
            cp.caret = new Caret(cp);
            cp.counter = new Counter(cp);
            cp.screen = new Screen(cp, cp.counter);
            cp.mainElement = m.cloneNode(true);
            cp.container = cp.mainElement.firstChild.lastChild;
            cp.wrapper = cp.container.lastChild;
            cp.input = cp.wrapper.firstChild;
            cp.caret.element = cp.input.nextSibling;
            cp.screen.parent = cp.caret.element.nextSibling;
            cp.screen.element = cp.screen.parent.firstChild;
            cp.counter.parent = cp.container.firstChild;
            cp.counter.element = cp.counter.parent.firstChild;
        }
    })();
    var mouseController = function(self) {
        var moveevent, moveselection = false
        , fn = function(e) {
            if (e.button > 0 || e.which > 1 || e.defaultPrevented)
                return false;
            
            var sl = self.wrapper.scrollLeft
            , st = self.wrapper.scrollTop
            , o = self.sizes.bounds = self.sizes.bounds || self.wrapper.bounds()
            , x = Math.max(0, sl + e.pageX - o.x - self.sizes.paddingLeft)
            , y = e.pageY < o.y ? 0 : e.pageY <= o.y + self.wrapper.clientHeight ? st + e.pageY - o.y - self.sizes.paddingTop : self.wrapper.scrollHeight
            , m = Math.ceil(y / self.sizes.lineHeight)
            , l = Math.min(Math.max(1, m), self.data.size) - 1
            , s = self.getTextAtLine(l)
            , c = y === 0 ? 0 : y === self.wrapper.scrollHeight || m > self.data.size ? s.length : Math.min(Math.max(0, Math.round(x / self.sizes.charWidth)), s.length);
            
            if (e.type === 'mousedown') {
                self.isMouseDown = true;
                if (self.selection.isset() && self.selection.inSelection(l, c)) {
                    moveselection = true;
                    window.on('mousemove', fn);
                    window.once('mouseup', function() {
                        window.off('mousemove', fn);
                        if (moveselection && self.selection.isset() && !self.selection.inSelection(self.caret.line(), self.caret.column())) {
                            var selection = self.getSelection()
                            , savedpos = self.caret.savePosition()
                            , isbf = self.cursorIsBeforePosition(self.selection.start.line, self.selection.start.column);
                            
                            self.caret.position(self.selection.end.line, self.selection.end.column);
                            if (!isbf) {
                                savedpos[0] -= self.selection.end.line - self.selection.start.line;
                            }
                            self.removeSelection();
                            self.caret.restorePosition(savedpos);
                            self.insertSelectedText(selection);
                        } else {
                            self.selection.clear();
                            fn.call(window, arguments[0]);
                        }
                        return self.isMouseDown = moveselection = e.cancel();
                    });
                } else {
                    self.input.value = '';
                    self.selection.clear().setStart(l, c);
                    self.caret.deactivate().show().position(l, c);
                    window.on('mousemove', fn);
                    window.once('mouseup', function(e) {
                        !self.selection.isset() && self.selection.clear();
                        window.off('mousemove', fn);
                        self.caret.activate();
                        self.sizes.bounds = moveevent = null;
                        document.activeElement != self.input && ($.browser.firefox ? setTimeout(function() { self.input.focus() }, 0) : self.input.focus());
                        return self.isMouseDown = e.cancel();
                    });
                }
            } else if (moveselection) {
                self.caret.position(l, c);
            } else {
                moveevent = e;
                self.unselectLine();
                self.selection.setEnd(l, c);
                
                if (e.pageY > o.y && e.pageY < o.y + self.wrapper.clientHeight) {
                    var i = e.pageY <= o.y + 2 * self.sizes.lineHeight ? -1 : e.pageY >= o.y + self.wrapper.clientHeight - 2 * self.sizes.lineHeight ? 1 : 0;
                    i && setTimeout(function() {
                        if (moveevent) {
                            self.wrapper.scrollTop += i * self.sizes.lineHeight / 2;
                            fn.call(window, moveevent);
                        }
                    }, 50);
                    return e.cancel();
                }
            }
        }
        return fn;
    }
    function calculateCharDimensions(cp, text) {
        var h = 0, w = 0, cr,
            pr = pre.cloneNode().addClass('cp-templine'),
            sp = span.cloneNode();
        
        text = text != null ? text : 'C';
        sp.textContent = sp.innerText = text;
        pr.appendChild(sp);
        cp.screen.parent.appendChild(pr);
        cr = sp.getBoundingClientRect();
        pr.parentNode.removeChild(pr);
        cp.sizes.charWidth = cr.width;
        cp.sizes.charHeight = cp.sizes.lineHeight = cr.height;
        return cr;
    }
    function getPositionOf(cp, line, column) {
        return {
            x: cp.sizes.paddingLeft + column * cp.sizes.charWidth,
            y: cp.sizes.paddingTop + line * cp.sizes.lineHeight
        }
    }
    function createSpan(text, classes, top, left, width, height) {
        var s = span.cloneNode().addClass(classes);
        s.textContent = text;
        s.style.extend({
            top: parseInt(top) + 'px',
            left: parseInt(left) + 'px',
            width: parseInt(width) + 'px',
            height: parseInt(height) + 'px'
        });
        return s;
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
    function indentGrid(text, width) {
        var pos = text.search(/[^ ]/), tmp;
        pos == -1 && (pos = text.length); 
        tmp = [text.substring(0, pos), text.substr(pos)];
        tmp[0] = tmp[0].replace(new RegExp("( {"+ width +"})", "g"), '<span class="cpx-tab">$1</span>');
        return tmp[0] + tmp[1];
    }
    function complementBracket(ch) {
        var obj = { '(':')', '{':'}', '[':']', '<':'>' }
        return obj[ch];
    }
    function swapLines(cp, line) {
        var spaces = cp.tabString()
        , x = cp.convertToSpaces(cp.data.get(line).text)
        , y = cp.convertToSpaces(cp.data.get(line+1).text);
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
    
    $.registerEvent({
        type: 'nodeInserted',
        setupEvents: 'animationstart MSAnimationStart webkitAnimationStart',
        setup: function(self) {
            this.on(self.setupEvents, (self.handler = function(e) {
                if (e.animationName == self.type) {
                    $.callObservers(self.type, this);
                }
            }), $.flags.EVENT_DONT_OBSERVE | $.flags.EVENT_DONT_OFF_REPEATS);
        },
        teardown: function(self) {
            this.off(self.setupEvents, self.handler);
        }
    });
    
    $.prototype.CodePrinter = function(opt) {
        var k = -1;
        while (++k < this.length) {
            this[k].CodePrinter = new CodePrinter(this[k], opt);
        }
        return this;
    }
    
    return window.CodePrinter = CodePrinter;
});