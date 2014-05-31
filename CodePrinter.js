/* CodePrinter - Main JavaScript Document */

"use strict";

var loader = function(fn) {
    if (typeof define != 'undefined') {
        define('CodePrinter', ['Selector'], function($) { return window.CodePrinter = fn($); });
    } else if (typeof module != 'undefined') {
        module.exports = fn(Selector);
    } else {
        window.CodePrinter = fn(Selector);
    }
}

loader(function($) {
    var CodePrinter, Data, DataLine, Caret
    , Screen, Counter, InfoBar, Finder, Stream
    , keyMap, commands, history, selection, tracking
    , lineendings, extensions, div, li, pre, span
    , DATA_RATIO = 10
    , DATA_MASTER_RATIO = 100;
    
    $.scripts.registerNamespace('CodePrinter', 'mode/');
    
    CodePrinter = function(element, options) {
        var self = this, sizes, data = '', id, allowKeyup, fn, T, s = 0;
        
        options = this.options = {}.extend(CodePrinter.defaults, options, element && element.nodeType ? $.parseData(element.data('codeprinter'), ',') : null);
        
        buildDOM(this);
        
        this.mainElement.CodePrinter = this;
        id = this.mainElement.id = $.random(options.randomIDLength);
        sizes = this.sizes = { lineHeight: options.lineHeight, charWidth: 0 };
        this.activeLine = {};
        this.overlays = [];
        this.snippets = [];
        this.selection.overlay = new CodePrinter.Overlay(this, 'cp-selection-overlay', false);
        this.history = new history(options.historyStackSize, options.historyDelay);
        this.keyMap = new keyMap;
        this.setTheme(options.theme);
        this.setMode(options.mode);
        this.caret.setStyle(options.caretStyle);
        
        this.wrapper.listen({
            scroll: function() {
                var lv = parseInt(self.options.linesOutsideOfView),
                    x = Math.ceil((this.scrollTop - self.sizes.scrollTop) / self.sizes.lineHeight);
                
                if (x > lv) {
                    do self.screen.shift(); while (--x > lv);
                } else if (x < lv) {
                    do self.screen.unshift(); while (++x < lv);
                }
                ++s > 4 && (s = 0)+1 && self.caret.isActive && self.selectLine(self.caret.line());
                this.timeout = clearTimeout(this.timeout) || setTimeout(function() { self.counter && (self.counter.parent.scrollTop = self.wrapper.scrollTop); }, 2);
            },
            dblclick: function() {
                var bf = self.caret.textBefore()
                , af = self.caret.textAfter()
                , line = self.caret.line()
                , c = self.caret.column()
                , l = 1, r = 0, rgx = /[^\w\s]/, timeout;
                
                var tripleclick = function() {
                    self.selection.setRange(line, 0, line+1, 0);
                    self.showSelection(true);
                    this.unlisten('click', tripleclick);
                    timeout = clearTimeout(timeout);
                }
                this.listen({ 'click': tripleclick });
                timeout = setTimeout(function() { self.wrapper.unlisten('click', tripleclick); }, 1000);
                
                rgx = bf[c-l] == ' ' || af[r] == ' ' ? /\s/ : !isNaN(bf[c-l]) || !isNaN(af[r]) ? /\d/ : /^\w$/.test(bf[c-l]) || /^\w$/.test(af[r]) ? /\w/ : rgx;
                
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
            },
            blur: function(e) {
                if (self.isMouseDown) {
                    this.focus();
                } else {
                    self.caret.deactivate().hide();
                    self.unselectLine();
                    self.removeOverlays();
                }
            },
            keydown: function(e) {
                var kc, code = e.getCharCode()
                , ch = String.fromCharCode(code)
                , kc = e.getKeyCombination(self.options.keyCombinationFlag);
                
                self.caret.deactivate().show();
                allowKeyup = true;
                
                if (($.browser.macosx ? e.metaKey : e.ctrlKey) && ch in commands) {
                    allowKeyup = commands[ch].call(self, e, code, ch);
                } else {
                    if (code < 48 && code != 9 && !(kc in self.keyMap)) {
                        kc = e.getKeyCombination(self.options.keyCombinationFlag | 4);
                    }
                    if (kc in self.keyMap) {
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
                    T = clearTimeout(T) || setTimeout(function() { self.forcePrint(); }, self.options.keydownInactivityTimeout);
                    (ch in self.keyMap ? self.keyMap[ch].call(self, e, code, ch) !== false : true) && self.insertText(ch);
                    this.value = '';
                    return e.cancel();
                }
            },
            keyup: function(e) {
                self.caret.activate();
                allowKeyup && this.value.length && self.insertText(this.value);
                self.selection.isset() || (this.value = '');
            }
        });
        
        this.caret.on({
            'text:changed': function(line, column) {
                var dl = self.data.getLine(line);
                dl.text = this.textAtCurrentLine(true);
                self.parse(line, dl, true);
                self.finder && self.finder.isOpen && self.finder.find();
            },
            'position:changed': function(x, y) {
                document.activeElement != self.input && self.input.focus();
                if (self.options.autoScroll) {
                    var wrapper = self.wrapper,
                        pl = self.sizes.paddingLeft, pt = self.sizes.paddingTop,
                        sl = wrapper.scrollLeft, st = wrapper.scrollTop,
                        cw = sl + wrapper.clientWidth, ch = st + wrapper.clientHeight,
                        ix = self.sizes.charWidth, iy = self.sizes.lineHeight;
                    wrapper.scrollLeft = x + pl >= cw ? x + pl - cw + sl : x - pl < sl ? x - pl : sl;
                    wrapper.scrollTop = y + iy + pt >= ch ? y + iy + pt - ch + st : y - pt < st ? y - pt : st;
                }
                self.removeOverlays();
                self.selectLine(this.line());
            },
            'line:changed': function(e) {
                if (self.options.highlightCurrentLine) {
                    self.selectLine(e.current);
                }
            }
        });
        
        fn = function(b) {
            b = b ? ['Before','After'] : ['After','Before'];
            return function(t) {
                var p = self.parser;
                if (p && p['onRemoved'+b[0]] && p['onRemoved'+b[0]][t]) {
                    p = p['onRemoved'+b[0]][t];
                    typeof p === 'string' || typeof p === 'number' ? self['remove'+b[1]+'Cursor'](p, true) : p instanceof Function && p.call(self, t);
                }
            };
        };
        this.on({
            'changed': function(e) {
                if (this.options.history) {
                    this.history.pushChanges(e.line, e.column, this.convertToTabs(e.text), e.added);
                }
            },
            'removed.before': fn(true),
            'removed.after': fn(false)
        });
        
        this.mainElement.on({ nodeInserted: function() {
            this.removeClass('cp-animation');
            
            options.lineNumbers && self.openCounter();
            options.infobar && self.openInfobar();
            options.showFinder && self.openFinder();
            
            options.fontSize != 11 && options.fontSize > 0 && self.setFontSize(options.fontSize);
            options.lineHeight != 15 && options.lineHeight > 0 && (id = '#'+id+' .cp-') && (options.ruleIndex = $.stylesheet.insert(id+'screen pre, '+id+'counter, '+id+'selection', 'line-height:'+options.lineHeight+'px;'));
            options.snippets && self.snippets.push.apply(self.snippets, options.snippets);
            self.setWidth(options.width);
            self.setHeight(options.height);
            
            var s = window.getComputedStyle(self.screen.element, null);
            sizes.paddingTop = parseInt(s.getPropertyValue('padding-top'));
            sizes.paddingLeft = parseInt(s.getPropertyValue('padding-left'));
            sizes.scrollTop = parseInt(s.getPropertyValue('top'));
            setTimeout(function() { calculateCharDimensions(self); }, 150);
            
            self.print();
        }});
        
        if (element) {
            if (element.nodeType) {
                this.init((element.tagName.toLowerCase() === 'textarea' ? element.value : element.innerHTML).decode());
                element.before(this.mainElement);
                return this;
            } else if (element.toLowerCase) {
                return this.init(element);
            }
        }
        
        return this.init(data);
    };
    
    CodePrinter.version = '0.6.1';
    
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
        minFontSize: 8,
        maxFontSize: 40,
        lineHeight: 15,
        linesOutsideOfView: 12,
        keydownInactivityTimeout: 1500,
        caretBlinkSpeed: 400,
        autoScrollSpeed: 20,
        historyStackSize: 100,
        historyDelay: 500,
        randomIDLength: 7,
        firstLineNumber: 1,
        lineNumbers: true,
        lineNumberFormatter: false,
        infobar: false,
        infobarOnTop: true,
        autofocus: true,
        showIndentation: true,
        scrollable: true,
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
        showFinder: false,
        searchOnTheFly: false,
        keyCombinationFlag: 1
    };
    
    div = document.createElement('div');
    li = document.createElement('li');
    pre = document.createElement('pre');
    span = document.createElement('span');
    
    CodePrinter.prototype = {
        isFullscreen: false,
        init: function(source) {
            this.data = new Data();
            this.history.init(source);
            source = source.split('\n');
            this.screen.lastLine !== -1 && this.screen.removeLines();
            
            var self = this, i = -1, fn
            , l = source.length;
            
            while (++i < l) {
                this.data.addLine(i, this.convertToTabs(source[i]));
            }
            this.screen.fill();
            
            this.data.on({
                'text:changed': function(dl) {
                    self.parseByDataLine(dl);
                    self.caret.refresh();
                },
                'line:added': (fn = function() {
                    var s = self.screen.parent;
                    s.style.minHeight = (this.lines * self.sizes.lineHeight + self.sizes.paddingTop * 2) + 'px';
                }),
                'line:removed': fn
            });
            
            this.history.on({
                undo: function() {
                    var a, i = arguments.length;
                    self.selection.clear();
                    while (i--) {
                        a = arguments[i];
                        var t = self.data.getLine(a.line).text.substring(0, a.column);
                        self.caret.position(a.line, a.column + (self.options.tabWidth-1) * (t.match(/\t/g) || []).length).savePosition();
                        if (a.added) {
                            self.removeAfterCursor(a.text);
                        } else {
                            self.insertText(a.text);
                        }
                    }
                    self.caret.restorePosition();
                },
                redo: function() {
                    var a, i = -1;
                    self.selection.clear();
                    while (++i < arguments.length) {
                        a = arguments[i];
                        var t = self.data.getLine(a.line).text.substring(0, a.column);
                        self.caret.position(a.line, a.column + (self.options.tabWidth-1) * (t.match(/\t/g) || []).length).savePosition();
                        if (a.added) {
                            self.insertText(a.text);
                        } else {
                            self.removeAfterCursor(a.text);
                        }
                    }
                    self.caret.restorePosition();
                }
            });
            
            return this;
        },
        unselectLine: function() {
            if (this.activeLine.pre) {
                this.activeLine.pre.removeClass('cp-activeLine');
            }
            if (this.activeLine.li) {
                this.activeLine.li.removeClass('cp-activeLine');
            }
        },
        selectLine: function(l) {
            if (this.options.highlightCurrentLine) {
                this.unselectLine();
                if (!this.selection.isset()) {
                    if (l >= this.screen.firstLine && l <= this.screen.lastLine) {
                        this.activeLine.pre = this.screen.getLine(l).addClass('cp-activeLine');
                        this.counter && (this.activeLine.li = this.counter.getLine(l).addClass('cp-activeLine'));
                    }
                }
            }
        },
        print: function(mode, source) {
            mode && this.setMode(mode);
            mode = this.options.mode;
            source && this.init(source);
            
            var self = this, timeout
            , sT = document.scrollTop()
            , sL = document.scrollLeft()
            , callback = function(ModeObject, interval) {
                timeout = clearTimeout(timeout);
                self.defineParser(ModeObject);
                self.screen.fill();
                
                var data = self.data, i = -1
                , l = self.screen.lastLine+1;
                
                if (interval !== false) {
                    var p = getDataLinePosition(l)
                    , u = p[0], t = p[1], h = p[2]
                    , I = clearInterval(I) || setInterval(function() {
                        t >= DATA_RATIO && ++h && (t = 0);
                        if (!data[h] || !data[h][t]) {
                            I = clearInterval(I);
                            self.emit('printing:completed');
                            return false;
                        }
                        while (u < data[h][t].length) {
                            self.parse(l, data.getLine(l));
                            l++; u++;
                        }
                        t++;
                        u = 0;
                    }, 10);
                }
                
                while (++i < l) {
                    self.parse(i, data.getLine(i), true);
                }
                document.scrollTop(sT);
                document.scrollLeft(sL);
                self.options.autofocus && self.caret.position(0, 0);
            }
            
            this.screen.removeLines();
            callback.call(this, new CodePrinter.Mode('plaintext'), false);
            
            if (mode != 'plaintext') {
                CodePrinter.requireMode(mode, callback, this);
            }
            
            return this;
        },
        forcePrint: function() {
            var self = this;
            this.memory = this.parser.alloc();
            this.data.foreach(function(line) {
                self.parse(line, this, true);
            });
        },
        defineParser: function(parser) {
            if (parser instanceof CodePrinter.Mode) {
                this.parser = parser;
                this.memory = parser.alloc();
                this.keyMap.extend(parser.keyMap);
                this.options.tracking && (this.caret.tracking = (new tracking(this)).extend(parser.tracking));
            }
        },
        parseByDataLine: function(dl, force) {
            var line = this.data.indexOf(dl);
            line >= 0 && this.parse(line, dl, force);
            return this;
        },
        parse: function(line, dl, force) {
            if (this.parser) {
                var data = this.data;
                dl = dl || data.getLine(line);
                
                if (!dl.parsed || dl.changed || force) {
                    if (dl.startPoint) {
                        return this.parseByDataLine(dl.startPoint, true);
                    }
                    var tmp = line
                    , stream = new Stream(dl.text)
                    , i = -1, p, ndl;
                    
                    stream.getNextLine = function() {
                        var nl = data.getLine(++tmp);
                        if (nl) {
                            nl.setStartPoint(dl);
                            this.value.push(nl.text);
                            return this;
                        } else {
                            return false;
                        }
                    }
                    
                    p = this.parser.fn(stream, this.memory).parsed;
                    while (++i < p.length && line+i < this.data.lines) {
                        p[i] = this.convertToSpaces(p[i]);
                        p[i] = this.options.showIndentation ? indentGrid(p[i], this.options.tabWidth) : p[i];
                        data.getLine(line+i).setParsed(p[i]);
                    }
                    while (i < data.lines && (ndl = data.getLine(line+i)) && ndl.startPoint == dl) {
                        delete ndl.startPoint;
                        this.parse(line+i, ndl, true);
                        i++;
                    }
                }
            }
            return this;
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
                    self.parse(line, this, true);
                });
            }
            return this;
        },
        setLineEndings: function(le) {
            le = le.toUpperCase();
            this.options.lineEndings = lineendings[le] || this.options.lineEndings || '\n';
            return this;
        },
        setTheme: function(name) {
            typeof name === 'string' && name !== 'default' ? this.requireStyle(name) : name = 'default';
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
            if (size != this.options.fontSize) {
                var id = this.mainElement.id;
                this.sizes.scrollTop = this.sizes.scrollTop / this.sizes.lineHeight;
                this.counter && (this.counter.parent.style.fontSize = size+'px') && this.counter.emit('width:changed');
                size > this.options.fontSize ? ++this.sizes.lineHeight : size < this.options.fontSize ? --this.sizes.lineHeight : 0;
                this.screen.element.style.top = (this.sizes.scrollTop *= this.sizes.lineHeight) + 'px';
                id = '#'+id+' .cp-';
                this.options.ruleIndex != null && $.stylesheet.delete(this.options.ruleIndex);
                this.options.ruleIndex = $.stylesheet.insert(id+'screen pre, '+id+'counter, '+id+'selection', 'line-height:'+this.sizes.lineHeight+'px;');
                this.wrapper.style.fontSize = (this.options.fontSize = size)+'px';
                calculateCharDimensions(this);
                this.screen.fix();
                this.caret.refresh();
                this.finder && this.finder.searched && this.finder.reload();
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
            this.screen.fix();
            this.emit('width:changed');
            return this;
        },
        setHeight: function(size) {
            if (size == 'auto') {
                this.wrapper.style.removeProperty('height');
            } else {
                this.wrapper.style.height = (this.options.height = parseInt(size)) + 'px';
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
            var l = this.data.getLine(line < 0 ? this.data.lines + line : line);
            return l ? this.convertToSpaces(l.text) : '';
        },
        getIndentAtLine: function(line) {
            var i = -1, dl = this.data.getLine(line);
            if (dl) {
                while (dl.text[++i] === '\t');
                return i;
            }
            return 0;
        },
        increaseIndentAtLine: function(line) {
            var dl = this.data.getLine(line);
            if (dl) {
                dl.text = '\t' + dl.text;
                this.parse(line, dl, true);
                this.caret.line() == line && this.caret.moveX(this.options.tabWidth);
                this.emit('changed', { line: line, column: 0, text: '\t', added: true });
            }
        },
        decreaseIndentAtLine: function(line) {
            var dl = this.data.getLine(line);
            if (dl && dl.text.indexOf('\t') === 0) {
                dl.text = dl.text.substr(1);
                this.parse(line, dl, true);
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
            
            if (this.data.getLine(i).text.indexOf('\t') === 0) {
                s.start.column -= w;
            }
            do this.decreaseIndentAtLine(i); while (++i <= l);
            this.showSelection();
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
        cursorIsBeforePosition: function(line, column) {
            var l = this.caret.line(), c = this.caret.column();
            return l == line ? c < column : l < line;
        },
        searchLeft: function(pattern, line, column, ignore) {
            var i = -1, dl;
            pattern = pattern instanceof RegExp ? pattern : new RegExp(pattern.isAlpha() ? '\\b'+pattern+'\\b(?!\\b'+pattern+'\\b).*$' : pattern.escape()+'(?!.*'+pattern.escape()+').*$');
            line = Math.max(0, Math.min(line, this.data.lines - 1));
            while ((dl = this.data.getLine(line--)) && ((i = this.convertToSpaces(dl.text).substring(0, column).search(pattern)) === -1 || this.isIgnoredArea(ignore, line+1, i))) {
                column = Infinity;
            }
            return [line + 1, i];
        },
        searchRight: function(pattern, line, column, ignore) {
            var i = -1, dl;
            pattern = pattern instanceof RegExp ? pattern : new RegExp(pattern.isAlpha() ? '\\b'+pattern+'\\b' : pattern.escape());
            line = Math.max(0, Math.min(line, this.data.lines - 1));
            while ((dl = this.data.getLine(line++)) && ((i = this.convertToSpaces(dl.text).substr(column).search(pattern)) === -1 || this.isIgnoredArea(ignore, line-1, i + column))) {
                column = 0;
            }
            return [line - 1, i + column];
        },
        substring: function(from, to) {
            var str = '';
            while (from[0] < to[0]) {
                str += this.convertToSpaces(this.data.getLine(from[0]++).text).substr(from[1]) + '\n';
                from[1] = 0;
            }
            return str += this.convertToSpaces(this.data.getLine(to[0]).text).substring(from[1], to[1]);
        },
        isIgnoredArea: function(ignore, line, col) {
            if (ignore && ignore.length) {
                var i = 0, cur, el = pre.cloneNode()
                , dl = this.data.getLine(line);
                if (dl.parsed) {
                    pre.innerHTML = dl.parsed;
                    if (pre.childNodes.length) {
                        do {
                            cur = pre.childNodes[i];
                            col -= cur.textContent.length;
                        } while (col > 0 && ++i < pre.childNodes.length);
                        
                        if (col <= 0) {
                            if (cur.nodeType === 3) {
                                return false;
                            } else {
                                var classes = cur.className.replaceAll('cpx-', '').split(' ');
                                return classes.diff(ignore).length !== classes.length;
                            }
                        }
                    }
                }
            }
            return false;
        },
        insertText: function(text, mx) {
            this.selection.isset() && this.removeSelection();
            var pos, s = this.convertToSpaces(text).split('\n')
            , bf = this.caret.textBefore()
            , af = this.caret.textAfter()
            , line = this.caret.line();
            
            text.length && this.emit('changed', { line: line, column: this.caret.column(true), text: text, added: true });
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
            if (text.length && line < this.data.lines) {
                var s = text.split('\n')
                , dl = this.data.getLine(line)
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
                this.dispatch(dl, line, bf + s[0] + af);
                this.caret.forceRefresh();
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
        dispatch: function(dl, line, text) {
            dl.text = this.convertToTabs(text);
            return this.parse(line, dl, true);
        },
        appendText: function(text) {
            var dl, text = this.convertToTabs(text);
            (this.data.lines == 1 && (dl = this.data.getFirstLine()).text.length == 0) ? dl.setText(text) : this.data.addLine(this.data.lines, text);
            this.screen.fill();
            return this;
        },
        insertNewLine: function(l, text) {
            var dl = this.data.addLine(l, text || '');
            this.screen.splice(dl, l);
            return this;
        },
        removeLine: function(l) {
            l == null && (l = this.caret.line());
            this.data.removeLine(l);
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
            if (l < this.data.lines - 1) {
                swapLines(this, l);
            }
        },
        removeBeforeCursor: function(arg, emitRemoving) {
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
                    this.caret.setTextBefore(bf.substring(0, x));
                    r = arg[i] + r;
                } else {
                    this.caret.setTextBefore(bf);
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
                emitRemoving != true && this.emit('removed.before', r);
            }
        },
        removeAfterCursor: function(arg, emitRemoving) {
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
                    
                    while (arg > af.length && l+1 < this.data.lines) {
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
                emitRemoving != true && this.emit('removed.after', r);
            }
        },
        isEmpty: function() {
            return this.data.lines === 1 && !this.data.getLine(0).text;
        },
        getValue: function(withTabs) {
            var self = this, t, r = [], h = 0
            , fn = withTabs
            ? function(obj) { return obj.text; }
            : function(obj) { return self.convertToSpaces(obj.text); };
            
            for (; h < this.data.length; h++) {
                for (t = 0; t < this.data[h].length; t++) {
                    r.push.apply(r, this.data[h][t].map(fn));
                }
            }
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
                return c && c[0][0] === 0 && c[0][1] === 0 && c[1][0] === this.data.lines-1 && c[1][1] === this.getTextAtLine(-1).length;
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
                } else {
                    this.caret.position(this.selection.end.line, this.selection.end.column);
                    this.removeBeforeCursor(this.getSelection());
                }
                this.selection.clear();
                this.selectLine(this.caret.line());
            }
        },
        createHighlightOverlay: function(/* arrays, ... */) {
            if (this.highlightOverlay) this.highlightOverlay.remove();
            var overlay = this.highlightOverlay = new CodePrinter.Overlay(this, 'cp-highlight-overlay', false);
            for (var i = 0; i < arguments.length; i++) {
                var pos = getPositionOf(this, arguments[i][0], arguments[i][1]);
                overlay.node.append(createSpan(arguments[i][2], 'cp-highlight', pos.y, pos.x, arguments[i][2].length * this.sizes.charWidth, this.sizes.lineHeight));
            }
            overlay.reveal();
            return this;
        },
        findSnippet: function(trigger) {
            var result, fn = function(snippets, simple) {
                if (snippets) {
                    var b, i = -1;
                    if (simple) {
                        while ((b = ++i < snippets.length) && !snippets[i].startsWith(trigger));
                        if (b) return { trigger: snippets[i], content: snippets[i] }
                    } else {
                        while ((b = ++i < snippets.length) && !snippets[i].trigger.startsWith(trigger));
                        if (b) return snippets[i];
                    }
                }
            }
            if (this.parser) {
                result = fn(this.parser.snippets) || fn(this.parser.keywords, true) || fn(this.parser.controls, true) || fn(this.parser.specials, true) || fn(this.memory.importClasses, true);
            }
            return result || fn(this.snippets);
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
                this.caret.refresh();
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
                this.caret.refresh();
                this.emit('fullscreen:leaved');
            }
        },
        openCounter: function() {
            if (!this.counter) {
                var self = this;
                this.counter = new Counter(this);
                this.counter.on('width:changed', function() {
                    self.wrapper.style.marginLeft = (self.sizes.counterWidth = self.counter.parent.offsetWidth || (self.counter.parent.parentNode ? 37 : 0)) + 'px';
                    self.screen.fix();
                });
            }
            this.counter.isVisible = true;
            this.container.prepend(this.counter.parent);
            this.counter.parent.scrollTop = this.wrapper.scrollTop;
            this.counter.emit('width:changed');
        },
        closeCounter: function() {
            if (this.counter) {
                this.counter.isVisible = false;
                this.counter.parent.remove();
                this.counter.emit('width:changed');
            }
        },
        openInfobar: function() {
            this.infobar = this.infobar || new InfoBar(this);
            this.options.infobarOnTop ? this.mainElement.prepend(this.infobar.element) : this.mainElement.append(this.infobar.element);
        },
        closeInfobar: function() {
            this.infobar && this.infobar.element.remove();
        },
        openFinder: function() {
            this.finder = this.finder || new Finder(this);
            this.finder.clear();
            this.mainElement.append(this.finder.bar);
            this.finder.overlay.reveal();
            this.finder.input.focus();
            this.finder.isOpen = true;
        },
        closeFinder: function() {
            if (this.finder && this.finder.isOpen) {
                this.finder.bar.remove();
                this.finder.overlay.remove();
                this.finder.isOpen = false;
            }
        },
        removeOverlays: function() {
            if (this.overlays) {
                for (var i = 0; i < this.overlays.length; i++) {
                    if (this.overlays[i].isRemovable) {
                        this.overlays[i].remove();
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
    };
    
    Data = function() {
        return this;
    };
    Data.prototype = [].extend({
        lines: 0,
        addLine: function(line, txt) {
            var b, i, p = getDataLinePosition(line),
                u = p[0], t = p[1], h = p[2],
                dl = new DataLine(this);
            
            typeof txt === 'string' && dl.setText(txt);
            !this[h] && this.splice(h, 0, []);
            b = this[h][t] || (this[h][t] = []);
            b.splice(u, 0, dl);
            this.lines++;
            this.emit('line:added', { dataLine: dl, line: line });
            
            if (b.length > DATA_RATIO) {
                var r;
                while ((r = b.splice(DATA_RATIO, b.length - DATA_RATIO)) && r.length > 0) {
                    t === DATA_RATIO - 1 && (t = -1) && h++;
                    !this[h] && this.splice(h, 0, []);
                    b = this[h][++t] || (this[h][t] = []);
                    var a = [0, 0];
                    a.push.apply(a, r);
                    b.splice.apply(b, a);
                }
            }
            return dl;
        },
        removeLine: function(line) {
            var p = getDataLinePosition(line),
                h = p[2], t = p[1], u = p[0],
                b = this[h][t];
            
            if (b && b[u]) {
                var dl = b.splice(u, 1);
                this.lines--;
                this.emit('line:removed', { dataLine: dl[0], line: line });
                
                if (b.length === DATA_RATIO - 1) {
                    var n, r;
                    
                    t === DATA_RATIO - 1 && (t = -1) && h++;
                    n = this[h][++t];
                    
                    while (n) {
                        r = n.shift();
                        if (r) {
                            b.push(r);
                            b = n;
                            t === DATA_RATIO - 1 && (t = -1) && h++;
                            n = this[h] && this[h][++t] || null;
                        } else {
                            n = false;
                        }
                    }
                }
            }
        },
        getLine: function(line) {
            if (typeof line === 'number' && line >= 0 && line < this.lines) {
                var p = getDataLinePosition(line);
                return this[p[2]][p[1]][p[0]] || null;
            }
            return null;
        },
        getFirstLine: function() {
            return this[0][0][0] || null;
        },
        getLastLine: function() {
            return this.last().last().last() || null;
        },
        setParsedAtLine: function(line, str) {
            var l = this.getLine(line);
            l && l.setParsed(str);
        },
        count: function() {
            var h = this.length, t;
            t = this[--h].length - 1;
            return parseInt(''+ h + t + (this[h][t].length - 1));
        },
        indexOf: function(dl) {
            var h, d, i = -1;
            for (h = 0; h < this.length; h++) {
                for (d = 0; d < this[h].length; d++) {
                    if ((i = this[h][d].indexOf(dl)) !== -1) {
                        return h * DATA_MASTER_RATIO + d * DATA_RATIO + i;
                    }
                }
            }
            return i;
        },
        foreach: function(f) {
            var h = 0, t, i, line = 0;
            for (; h < this.length; h++) {
                for (t = 0; t < this[h].length; t++) {
                    for (i = 0; i < this[h][t].length; i++) {
                        f.call(this[h][t][i], line++, this.data);
                    }
                }
            }
            return this;
        }
    });
    
    DataLine = function(parent) {
        this.extend({
            setText: function(str) {
                if (this.text !== str) {
                    this.text = str;
                    this.changed = true;
                    parent.emit('text:changed', this);
                }
            },
            setParsed: function(str) {
                if (this.parsed !== str) {
                    this.parsed = str;
                    this.changed = false;
                    this.touch();
                    parent.emit('parsed:changed', this);
                }
            },
            touch: function() {
                this.pre instanceof HTMLElement && (this.pre.innerHTML = this.parsed || ' ');
            }
        });
        return this;
    };
    
    DataLine.prototype = {
        changed: false,
        setStartPoint: function(sp) {
            if (sp instanceof DataLine) {
                this.startPoint = sp;
            }
        },
        clearStartPoint: function() {
            this.startPoint = null;
        },
        deleteNodeProperty: function() {
            if (this.pre) {
                delete this.pre;
            }
        },
        prepend: function(str) {
            return this.setText(str + this.text);
        },
        append: function(str) {
            return this.setText(this.text + str);
        },
        lbreak: function(str) {
            return this.setText(this.text.lbreak(str));
        },
        rbreak: function(str) {
            return this.setText(this.text.rbreak(str));
        }
    };
    
    Caret = function(cp) {
        var line = 0, column = 0, before = '', after = '', tmp, timeout;
        
        this.root = cp;
        
        return this.extend({
            setTextBefore: function(str) {
                var l = str.length;
                str.indexOf('@') !== -1 && (str = str.replaceAll(['@a','@b'], [after, before]));
                str = cp.convertToTabs(str);
                if (before !== str) {
                    before = str;
                    this.emit('text:changed', line, column);
                    this.position(line, l);
                }
                return this;
            },
            setTextAfter: function(str) {
                str.indexOf('@') !== -1 && (str = str.replaceAll(['@a','@b'], [after, before]));
                str = cp.convertToTabs(str);
                if (after !== str) {
                    after = str;
                    this.emit('text:changed', line, column);
                }
                return this;
            },
            setTextAtCurrentLine: function(bf, af) {
                var l = bf.length;
                bf.indexOf('@') !== -1 && (bf = bf.replaceAll(['@a','@b'], [after, before]));
                af.indexOf('@') !== -1 && (af = af.replaceAll(['@a','@b'], [after, before]));
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
                l = Math.max(Math.min(l, cp.data.lines - 1), 0);
                typeof t !== 'string' && (t = cp.getTextAtLine(l));
                typeof c !== 'number' && (c = column || 0);
                c < 0 && (c = t.length + c + 1);
                
                var x = cp.sizes.charWidth * Math.min(c, t.length)
                , y = cp.sizes.lineHeight * l;
                
                if (line !== l) {
                    this.emit('line:changed', { current: l, last: line });
                    line = l;
                }
                if (column !== c) {
                    this.emit('column:changed', { current: c, last: column });
                    column = c;
                }
                
                before = cp.convertToTabs(t.substring(0, c));
                after = cp.convertToTabs(t.substr(c));
                this.setPixelPosition(x, y);
                
                if (cp.options.tracking) {
                    for (var s in this.tracking) {
                        var a, b, len = s.length, i = 0;
                        do {
                            a = len == i || before.endsWith(s.substring(0, len - i));
                            b = after.startsWith(s.substring(len - i, len));
                        } while ((!a || !b) && ++i <= len);
                        
                        if (a && b) {
                            timeout = setTimeout($.invoke(this.tracking[s], this, [cp, s, { line: l, columnStart: this.column() - len + i, columnEnd: this.column() + i }]), 40);
                            break;
                        } else if (cp.highlightOverlay) {
                            cp.highlightOverlay.remove();
                        }
                    }
                }
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
                    if (cl < cp.data.lines) {
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
                mv = mv < 0 ? (column = 0) : mv >= this.root.data.lines ? (column = -1) && this.root.data.lines-1 : mv;
                return this.position(mv, column);
            },
            refresh: function() {
                return this.setPixelPosition(cp.sizes.charWidth * Math.min(column, this.textBefore().length), cp.sizes.lineHeight * line);
            },
            forceRefresh: function() {
                return this.position(line, column);
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
                    while (r !== false && line + n < cp.data.lines) {
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
            
            x >= 0 && (css.left = x = x + this.root.sizes.paddingLeft);
            y >= 0 && (css.top = y = y + this.root.sizes.paddingTop);
            
            css = this.drawer.call(this.root, css);
            this.element.css(css);
            this.show().emit('position:changed', x, y);
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
    };
    
    Screen = function(cp) {
        var self = this;
        this.root = cp;
        this.lines = [];
        this.counters = [];
        
        return this;
    };
    Screen.prototype = {
        firstLine: 0,
        lastLine: -1,
        fill: function() {
            var r = this.root, w = r.wrapper
            , lv = parseInt(r.options.linesOutsideOfView)
            , x = Math.min(Math.ceil(w.clientHeight / r.sizes.lineHeight) + 2 * lv, r.data.lines-1)
            , i = this.length();
            
            while (i++ <= x) this.insert();
            this.fix();
            return this;
        },
        insert: function() {
            if (this.lastLine < this.root.data.lines - 1) {
                var dl = this.root.data.getLine(++this.lastLine);
                dl.pre = pre.cloneNode();
                this.link(dl, this.lines.length, true);
                this.root.counter && this.root.counter.increase();
            }
        },
        splice: function(dl, i) {
            if (dl instanceof DataLine && i >= this.firstLine && i <= this.lastLine+1) {
                var q = i - this.firstLine;
                
                if (this.length() < this.root.wrapper.clientHeight / this.root.sizes.lineHeight + this.root.options.linesOutsideOfView * 2) {
                    dl.pre = pre.cloneNode();
                    this.lastLine++;
                    this.root.counter && this.root.counter.increase();
                } else if (i + this.root.options.linesOutsideOfView >= this.root.data.lines) {
                    this.root.data.getLine(this.firstLine++).deleteNodeProperty();
                    dl.pre = this.lines.item(0);
                    this.lastLine++;
                    this.element.style.top = (this.root.sizes.scrollTop += this.root.sizes.lineHeight) + 'px';
                    this.root.counter && this.root.counter.shift();
                    
                    this.lines.shift();
                    dl.pre.remove();
                    --q;
                } else {
                    this.root.data.getLine(this.lastLine).deleteNodeProperty();
                    dl.pre = this.lines.item(-1);
                }
                this.link(dl, q);
            }
        },
        remove: function(i) {
            if (i >= this.firstLine && i <= this.lastLine) {
                var r = this.root,
                    q = i - this.firstLine;
                if (this.firstLine == 0) {
                    if (this.lastLine < r.data.lines) {
                        var dl = r.data.getLine(this.lastLine);
                        dl.pre = this.lines[q];
                        this.link(dl, this.lines.length);
                    } else {
                        this.lines[q].remove();
                        this.lines.splice(q, 1);
                        this.lastLine--;
                        r.counter && r.counter.decrease();
                    }
                } else {
                    var dl = r.data.getLine(--this.firstLine);
                    dl.pre = this.lines[q];
                    this.link(dl, 0);
                    this.element.style.top = (this.root.sizes.scrollTop -= this.root.sizes.lineHeight) + 'px';
                    this.lastLine--;
                    r.counter && r.counter.unshift();
                }
            }
        },
        shift: function() {
            if (this.lines.length && this.lastLine + 1 < this.root.data.lines) {
                this.root.data.getLine(this.firstLine).deleteNodeProperty();
                var dl = this.root.data.getLine(++this.lastLine);
                dl.pre = this.lines[0];
                this.link(dl, this.lines.length);
                this.element.style.top = (this.root.sizes.scrollTop += this.root.sizes.lineHeight) + 'px';
                this.firstLine++;
                this.root.counter && this.root.counter.shift();
            }
        },
        unshift: function() {
            if (this.lines.length && this.firstLine - 1 >= 0) {
                this.root.data.getLine(this.lastLine).deleteNodeProperty();
                var dl = this.root.data.getLine(--this.firstLine);
                dl.pre = this.lines.item(-1);
                this.link(dl, 0);
                this.element.style.top = (this.root.sizes.scrollTop -= this.root.sizes.lineHeight) + 'px';
                this.lastLine--;
                this.root.counter && this.root.counter.unshift();
            }
        },
        link: function(dl, index, forceParse) {
            this.element.insertBefore(dl.pre, this.lines[index]);
            this.lines.put(dl.pre, index);
            this.root.parse(this.firstLine + index, dl, forceParse) && dl.touch();
        },
        getLine: function(line) {
            return line >= this.firstLine && line <= this.lastLine ? this.element.kids().item(line - this.firstLine) : null;
        },
        length: function() {
            return this.lastLine - this.firstLine + 1;
        },
        removeLines: function() {
            this.element.innerHTML = '';
            this.element.style.top = (this.root.sizes.scrollTop = 0) + 'px';
            this.firstLine = this.lines.length = 0;
            this.lastLine = -1;
            this.root.counter && this.root.counter.removeLines();
        },
        fix: function() {
            this.root.data && (this.parent.style.minHeight = (this.root.data.lines * this.root.sizes.lineHeight + this.root.sizes.paddingTop * 2) + 'px');
            return this;
        }
    };
    
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
                this.emit('overlay:revealed');
            }
        },
        remove: function() {
            var i = this.root.overlays.indexOf(this);
            i != -1 && this.root.overlays.splice(i, 1);
            this.node.remove();
            this.emit('overlay:removed');
        },
        removable: function(is) {
            this.isRemovable = !!is;
        }
    }
    
    Counter = function(cp) {
        var self = this, ln = cp.screen.length();
        self.element = document.createElement('ol');
        self.parent = div.cloneNode().addClass('cp-counter').append(self.element);
        self.root = cp;
        self.lastLine = cp.options.firstLineNumber - 1;
        cp.container.prepend(self.parent);
        
        if (cp.options.lineNumberFormatter instanceof Function) {
            this.formatter = cp.options.lineNumberFormatter;
        }
        
        this.element.delegate('click', 'li', function() {
            var l = parseInt(this.innerHTML) - 1;
            cp.caret.position(l, 0);
            cp.selection.setRange(l, 0, l, cp.caret.textAtCurrentLine().length);
            cp.showSelection();
        });
        
        while (ln--) {
            self.increase();
        }
        return this;
    };
    Counter.prototype = {
        isVisible: false,
        increase: function() {
            var node = li.cloneNode(false),
                f = this.formatter(++this.lastLine);
            node.innerHTML = f;
            this.element.appendChild(node);
            f.toString().length > this.formatter(this.lastLine-1).toString().length && this.emit('width:changed');
        },
        decrease: function() {
            var n = this.lastLine--;
            this.element.lastChild.remove();
            this.formatter(n-1).toString().length < this.formatter(n).toString().length && this.emit('width:changed');
        },
        shift: function() {
            if (this.element.childNodes.length) {
                var fi = this.element.firstChild,
                    c = ++this.lastLine,
                    f = this.formatter(c);
                
                this.element.removeChild(fi);
                fi.innerHTML = f;
                this.element.appendChild(fi);
                this.element.style.top = this.root.sizes.scrollTop + 'px';
                f.toString().length > this.formatter(c-1).toString().length && this.emit('width:changed');
            }
        },
        unshift: function() {
            if (this.element.childNodes.length) {
                var la = this.element.lastChild,
                    c = this.lastLine-- - this.element.kids().length;
                
                this.element.removeChild(la);
                la.innerHTML = this.formatter(c);
                this.element.insertBefore(la, this.element.firstChild);
                this.element.style.top = this.root.sizes.scrollTop + 'px';
                this.formatter(this.lastLine+1).toString().length > this.formatter(this.lastLine).toString().length && this.emit('width:changed');
            }
        },
        removeLines: function() {
            this.lastLine = this.root.options.firstLineNumber - 1;
            this.element.innerHTML = '';
            this.element.style.top = this.root.sizes.scrollTop + 'px';
            this.emit('width:changed');
        },
        getLine: function(line) {
            var kids = this.element.kids();
            return line >= this.lastLine - kids.length && line <= this.lastLine ? kids.item(line - this.lastLine - kids.length) : null;
        },
        formatter: function(i) {
            return i;
        }
    };
    
    InfoBar = function(cp) {
        var mode = span.cloneNode().addClass('cpi-mode'),
            act = span.cloneNode().addClass('cpi-actions'),
            info = span.cloneNode().addClass('cpi-info');
        
        mode.innerHTML = cp.options.mode;
        this.element = div.cloneNode().addClass('cpi-bar').append(mode, act, info);
        this.root = cp;
        
        this.segments = {
            mode: mode,
            actions: act,
            info: info
        };
        
        this.actions = {
            plaintext: {
                func: function() {
                    var newWindow = window.open('', '_blank');
                    newWindow.document.writeln('<pre style="font-size:12px;">' + cp.getValue().encode() + '</pre>');
                }
            },
            fullscreen: {
                func: function() {
                    cp.isFullscreen ? cp.exitFullscreen() : cp.enterFullscreen();
                }
            }
        };
        
        for (var k in this.actions) {
            this.addAction(k, this.actions[k].func, this.actions[k].text);
        }
        
        if (cp.caret) {
            cp.caret.on({
                'position:changed': function() {
                    info.innerHTML = 'Line ' + (this.line()+1) + ', Column ' + (this.column()+1);
                }
            });
        }
        
        return this;
    };
    InfoBar.prototype = {
        addAction: function(name, func, text) {
            if (this.actions[name] && this.actions[name].element) {
                this.actions[name].element.off('click', this.actions[name].func);
            }
            var el = document.createElement('a').addClass('cp-'+name);
            el.innerHTML = typeof text === 'string' ? text : name;
            this.segments.actions.append(el.on('click', func));
            this.actions[name] = {
                func: func,
                element: el
            };
            return el;
        },
        update: function(str) {
            this.segments.info.innerHTML = str;
        }
    };
    
    Finder = function(cp) {
        var self = this,
            findnext = document.createElement('button').addClass('cpf-button cpf-findnext'),
            findprev = document.createElement('button').addClass('cpf-button cpf-findprev'),
            closebutton = document.createElement('button').addClass('cpf-button cpf-close'),
            leftbox = div.cloneNode().addClass('cpf-leftbox'),
            flexbox = div.cloneNode().addClass('cpf-flexbox'),
            input = document.createElement('input').addClass('cpf-input'),
            bar = div.cloneNode().addClass('cpf-bar'),
            overlay = new CodePrinter.Overlay(cp, 'cpf-overlay', false),
            keyMap = {
                13: function() {
                    if (self.searched === this.value) {
                        self.next();
                    } else {
                        self.find(this.value);
                    }
                },
                27: function() {
                    cp.closeFinder();
                },
                38: function() {
                    self.prev();
                },
                40: function() {
                    self.next();
                }
            };
        
        findnext.innerHTML = 'Next';
        findprev.innerHTML = 'Prev';
        closebutton.innerHTML = 'Close';
        input.type = 'text';
        bar.append(leftbox.append(closebutton, findprev, findnext), flexbox.append(input));
        
        input.on({ keydown: function(e) {
            var k = e.keyCode ? e.keyCode : e.charCode ? e.charCode : 0;
            return keyMap[k] ? (keyMap[k].call(this) || e.cancel()) : true;
        }, keyup: function(e) {
            cp.options.searchOnTheFly && this.value !== self.searched ? self.find(this.value) : 0;
        }});
        findnext.on({ click: function(e) { self.next(); }});
        findprev.on({ click: function(e) { self.prev(); }});
        closebutton.on({ click: function(e) { cp.closeFinder(); }});
        overlay.node.delegate('click', 'span', function(e) {
            if (this.position) {
                cp.selection.setStart(this.position.ls, this.position.cs).setEnd(this.position.le, this.position.ce);
                cp.showSelection();
                this.parentNode.removeChild(this);
                return e.cancel();
            }
        });
        
        self.root = cp;
        self.input = input;
        self.bar = bar;
        self.overlay = overlay;
        self.searchResults = $([]);
        
        return self;
    }
    Finder.prototype = {
        clear: function() {
            this.searched = null;
            this.searchResults.length = 0;
            this.overlay.node.innerHTML = '';
        },
        push: function(span) {
            this.searchResults.push(span);
            this.overlay.node.append(span);
        },
        find: function(find) {
            var root = this.root,
                siz = root.sizes,
                value, index, line = 0, ln = 0, last, bf;
            
            find = find || this.input.value;
            this.clear();
            
            if (find) {
                for (; line < root.data.lines; line++) {
                    value = root.getTextAtLine(line);
                    ln = 0;
                    
                    while (value && (index = value.indexOf(find)) !== -1) {
                        var node = span.cloneNode().addClass('cpf-occurrence');
                        node.textContent = node.innerText = node.innerHTML = find;
                        ln = ln + index;
                        node.extend({ position: {
                            ls: line, 
                            cs: ln,
                            le: line,
                            ce: ln + find.length
                        }});
                        node.style.extend({
                            width: (siz.charWidth * find.length) + 2 + 'px',
                            height: siz.lineHeight + 'px',
                            top: (siz.paddingTop + line * siz.lineHeight + 1) + 'px',
                            left: (siz.paddingLeft + siz.charWidth * ln + 1) + 'px'
                        });
                        this.push(node);
                        ln = ln + find.length;
                        value = value.substr(index + find.length);
                    }
                }
                this.overlay.reveal();
                this.searched = find;
                this.searchResults.removeClass('active').get(0).addClass('active');
                this.scrollToActive();
            }
        },
        reload: function() {
            return this.find(this.searched);
        },
        next: function() {
            if (this.searchResults.length > 0) {
                this.searchResults.removeClass('active').getNext().addClass('active');
                this.scrollToActive();
            } else {
                this.find();
            }
        },
        prev: function() {
            if (this.searchResults.length > 0) {
                this.searchResults.removeClass('active').getPrev().addClass('active');
                this.scrollToActive();
            } else {
                this.find();
            }
        },
        scrollToActive: function() {
            this.root.infobar && this.root.infobar.update(this.searchResults.length ? (this.searchResults.g+1)+' of '+this.searchResults.length+' matches' : 'Unable to find '+this.searched);
            this.searchResults.length > 0 && $(this.root.wrapper).include(this.root.counter && this.root.counter.parent).scrollTo(
                parseInt(this.searchResults.css('left') - this.root.wrapper.clientWidth/2),
                parseInt(this.searchResults.css('top') - this.root.wrapper.clientHeight/2),
                this.root.options.autoScrollSpeed
            );
        }
    }
    
    Stream = function(value) {
        if (!(this instanceof Stream)) {
            return new Stream(value);
        }
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
            return this.value[this.row || 0];
        },
        match: function(rgx, index) {
            this.found.length && this.wrap('other');
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
            var i = 0
            , fn = arguments[arguments.length-1] instanceof Function ? arguments[arguments.length-1] : null
            , tmp = this.eaten
            , suffix = ''
            , spa = function(txt) {
                txt = txt.encode();
                fn instanceof Function && (txt = fn.call(txt, suffix));
                return '<span class="'+suffix+'">' + txt + '</span>';
            }
            
            for (i = 0; i < arguments.length; i++) {
                if (typeof arguments[i] === 'string') {
                    suffix += ' cpx-'+arguments[i];
                }
            }
            suffix = suffix.substr(1);
            
            this.wrapped = [];
            tmp.length > 1 && (this.row = this.row - tmp.length + 1);
            i = -1;
            
            while (++i < tmp.length - 1) {
                this.wrapped[i] = this.append(tmp[i] ? spa(tmp[i]) : '');
                this.parsed[++this.row] = '';
            }
            this.wrapped[i] = this.append(tmp[i] ? spa(tmp[i]) : '');
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
            this.append(this.teared);
            this.forward();
            return this;
        },
        restore: function() {
            if (this.teared) {
                var p = this.parsed[this.row];
                this.backward();
                this.parsed[this.row] = p.substr(0, p.length - this.teared.length);
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
                this.append(found);
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
    
    var templateMode = {
        keyMap: {},
        onRemovedBefore: {'{':'}','(':')','[':']','"':'"',"'":"'"},
        onRemovedAfter: {'}':'{',')':'(',']':'[','"':'"',"'":"'"},
        comment: '//',
        brackets: {
            '{': ['bracket', 'bracket-curly', 'bracket-open'],
            '}': ['bracket', 'bracket-curly', 'bracket-close'],
            '[': ['bracket', 'bracket-square', 'bracket-open'],
            ']': ['bracket', 'bracket-square', 'bracket-close'],
            '(': ['bracket', 'bracket-round', 'bracket-open'],
            ')': ['bracket', 'bracket-round', 'bracket-close']
        },
        expressions: {
            '//': { ending: '\n', classes: ['comment', 'line-comment'] }, 
            '/*': { ending: '*/', classes: ['comment', 'multiline-comment'] },
            "'": { ending: /(^'|[^\\]'|\\{2}')/, classes: ['string', 'single-quote'] },
            '"': { ending: /(^"|[^\\]"|\\{2}")/, classes: ['string', 'double-quote'] }
        },
        punctuations: {
            '.': 'dot',
            ',': 'comma',
            ':': 'colon',
            ';': 'semicolon',
            '?': 'question',
            '!': 'exclamation'
        },
        operators: {
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
    }
    
    CodePrinter.Mode = function(name) { this.name = name; };
    CodePrinter.Mode.prototype = {
        alloc: function() {
            return {};
        },
        parse: function(text, toString) {
            var s = this.fn(new Stream(text), {});
            return toString ? s.toString() : s;
        },
        fn: function(stream) {
            stream.parsed = stream.value;
            return stream;
        }
    }
    
    keyMap = function() {}
    keyMap.prototype = {
        'Backspace': function() {
            var t = this.caret.textBefore()
            , m = t.match(/ +$/)
            , r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? '\t' : 1;
            
            this.selection.isset() ? this.removeSelection() : this.removeBeforeCursor(r);
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
                    var match = bf.match(/\b\w+$/), snippet = match && this.findSnippet(match[0]);
                    if (snippet) {
                        this.removeBeforeCursor(match[0]);
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
            var t = this.caret.textBefore().match(/^ +/)
            , a = '\n' + (this.options.indentNewLines && t && t[0] ? t[0].substring(0, t[0].length - t[0].length % this.options.tabWidth) : '');
            
            if (this.textBeforeCursor(1) === '{') {
                this.insertText(a + this.tabString());
                this.textAfterCursor(1) === '}' && this.insertText(a, -a.length);
            } else {
                this.insertText(a);
            }
            return false;
        },
        'Esc': function() {
            this.isFullscreen && this.exitFullscreen();
            return false;
        },
        'PageUp': function() {
            this.wrapper.scrollTop -= this.wrapper.clientHeight;
        },
        'PageDown': function() {
            this.wrapper.scrollTop += this.wrapper.clientHeight;
        },
        'End': function() {
            this.caret.position(this.data.lines - 1, -1);
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
            var t = this.caret.textAfter(),
                m = t.match(/^ +/),
                r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? '\t' : 1;
            
            this.selection.isset() ? this.removeSelection() : this.removeAfterCursor(r);
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
        'Alt+Ctrl+Up': CodePrinter.prototype.swapLineUp,
        'Ctrl+Right': function() {
            this.caret.position(this.caret.line(), -1);
            return false;
        },
        'Ctrl+Down': function(e) {
            this.caret.position(this.data.lines - 1, -1);
            return false;
        },
        'Alt+Ctrl+Down': CodePrinter.prototype.swapLineDown,
        'Ctrl+F': function(e) {
            if (e.shiftKey) {
                this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
            } else {
                !this.finder || this.finder.bar.parentNode == null ? this.openFinder() : this.finder.input.focus();
            }
        },
        'Ctrl+I': function() {
            !this.infobar || this.infobar.element.parentNode == null ? this.openInfobar() : this.closeInfobar();
        },
        'Ctrl+J': function() {
            var self = this, l = parseInt(prompt("Jump to line..."), 10) - 1;
            setTimeout(function() {
                self.caret.position(l, 0);
            }, 1);
        },
        'Ctrl+N': function() {
            !this.counter || this.counter.parent.parentNode == null ? this.openCounter() : this.closeCounter();
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
            if (this.parser && this.parser.comment) {
                var start, end, is, sm = 0, comment = this.parser.comment.split('[text content]');
                
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
                var ls = this.data.lines - 1;
                this.selection.setRange(0, 0, ls, this.getTextAtLine(ls).length);
                this.showSelection();
                this.caret.deactivate().hide();
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
    
    history = function(stackSize, delay) {
        this.pushChanges = function(line, column, text, added) {
            if (!this.muted && arguments.length == 4) {
                var self = this,
                    changes = { line: line, column: column, text: text, added: added };
                
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
        '(': function(cp, key, details) {
            var ignore;
            if (cp.options.highlightBrackets && !cp.isIgnoredArea(ignore = ['string', 'comment', 'regexp'], details.line, details.columnStart)) {
                var sec = key === '(' ? ')' : String.fromCharCode(key.charCodeAt(0)+2)
                , counter = 1
                , line = details.line
                , col = details.columnEnd;
                
                do {
                    var a = cp.searchRight(sec, line, col, ignore)
                    , b = cp.searchRight(key, line, col, ignore);
                    
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
                
                cp.createHighlightOverlay(
                    [details.line, details.columnStart, key],
                    [line, col - 1, sec]
                );
                return false;
            }
        },
        ')': function(cp, key, details) {
            var ignore;
            if (cp.options.highlightBrackets && !cp.isIgnoredArea(ignore = ['string', 'comment', 'regexp'], details.line, details.columnEnd)) {
                var sec = key === ')' ? '(' : String.fromCharCode(key.charCodeAt(0)-2)
                , counter = 1
                , line = details.line
                , col = details.columnStart;
                
                do {
                    var a = cp.searchLeft(sec, line, col, ignore)
                    , b = cp.searchLeft(key, line, col, ignore);
                    
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
                
                cp.createHighlightOverlay(
                    [line, col, sec],
                    [details.line, details.columnStart, key]
                );
                return false;
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
        'rb': 'ruby',
        'pl': 'perl',
        'sh': 'bash',
        'adb': 'ada'
    }
    
    CodePrinter.requireMode = function(req, cb, del) {
        return $.scripts.require('CodePrinter/'+req.toLowerCase(), cb, del);
    }
    CodePrinter.defineMode = function(name, obj, req) {
        var m = $.extend(new CodePrinter.Mode(name), templateMode, obj);
        obj.extension && m.extend(obj.extension);
        m.init instanceof Function && m.init();
        $.scripts.define('CodePrinter/'+name.toLowerCase(), m, req);
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
    
    var buildDOM = (function(){
        var m = div.cloneNode().addClass('codeprinter cp-animation'),
            c = div.cloneNode().addClass('cp-container'),
            w = div.cloneNode().addClass('cp-wrapper'),
            s = div.cloneNode().addClass('cp-screen'),
            l = div.cloneNode().addClass('cp-codelines');
        w.appendChild(div.cloneNode().addClass('cp-caret'));
        m.appendChild(document.createElement('textarea').addClass('cp-input'));
        s.appendChild(l);
        w.appendChild(s);
        c.appendChild(w);
        m.appendChild(c);
        return function(cp) {
            cp.selection = new selection;
            cp.caret = new Caret(cp);
            cp.screen = new Screen(cp);
            cp.mainElement = m.cloneNode(true);
            cp.input = cp.mainElement.firstChild;
            cp.container = cp.input.nextSibling;
            cp.wrapper = cp.container.firstChild;
            cp.caret.element = cp.wrapper.firstChild;
            cp.screen.parent = cp.caret.element.nextSibling;
            cp.screen.element = cp.screen.parent.firstChild;
            cp.selection.on({ done: cp.showSelection.bind(cp, false) });
        }
    })();
    var mouseController = function(self) {
        var moveevent, moveselection = false
        , fn = function(e) {
            if (e.button > 0 || e.which > 1)
                return false;
            
            var sl = self.wrapper.scrollLeft
            , st = self.wrapper.scrollTop
            , o = self.sizes.bounds = self.sizes.bounds || self.wrapper.bounds()
            , x = Math.max(0, sl + e.clientX - o.x - self.sizes.paddingLeft)
            , y = e.clientY < o.y ? 0 : e.clientY <= o.y + self.wrapper.clientHeight ? st + e.clientY - o.y - self.sizes.paddingTop : self.wrapper.scrollHeight
            , l = Math.min(Math.max(1, Math.ceil(y / self.sizes.lineHeight)), self.data.lines) - 1
            , s = self.getTextAtLine(l)
            , c = y === 0 ? 0 : y === self.wrapper.scrollHeight ? s.length : Math.min(Math.max(0, Math.round(x / self.sizes.charWidth)), s.length);
            
            if (e.type === 'mousedown') {
                self.isMouseDown = true;
                if (self.selection.isset() && self.selection.inSelection(l, c)) {
                    moveselection = true;
                    window.on('mousemove', fn);
                    window.on('mouseup', function(e) {
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
                        }
                        return self.isMouseDown = moveselection = e.cancel();
                    });
                } else {
                    self.input.value = '';
                    self.selection.clear().setStart(l, c);
                    self.caret.deactivate().show().position(l, c);
                    window.on('mousemove', fn);
                    window.one('mouseup', function(e) {
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
                
                if (e.clientY > o.y && e.clientY < o.y + self.wrapper.clientHeight) {
                    var i = e.clientY <= o.y + 2 * self.sizes.lineHeight ? -1 : e.clientY >= o.y + self.wrapper.clientHeight - 2 * self.sizes.lineHeight ? 1 : 0;
                    i && setTimeout(function() {
                        if (moveevent) {
                            self.wrapper.scrollTop += i * self.sizes.lineHeight;
                            fn.call(window, moveevent);
                        }
                    }, 300);
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
        cp.sizes.charHeight = cr.height;
        return cr;
    }
    function getPositionOf(cp, line, column) {
        return {
            x: cp.sizes.paddingLeft + column * cp.sizes.charWidth,
            y: cp.sizes.paddingTop + line * cp.sizes.lineHeight
        };
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
    function getDataLinePosition(line) {
        return [line % DATA_RATIO, (line - line % DATA_RATIO) % DATA_MASTER_RATIO / DATA_RATIO, (line - line % DATA_MASTER_RATIO) / DATA_MASTER_RATIO ];
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
        , x = cp.convertToSpaces(cp.data.getLine(line).text)
        , y = cp.convertToSpaces(cp.data.getLine(line+1).text);
        cp.caret.savePosition(true);
        cp.caret.position(line+1, -1);
        cp.removeBeforeCursor(x + '\n' + y);
        cp.insertText(y + '\n' + x);
        cp.caret.restorePosition();
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
    
    return CodePrinter;
});