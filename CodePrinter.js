/* CodePrinter - Main JavaScript Document */

"use strict";

window.CodePrinter = (function($) {
    
    var CodePrinter, Data, DataLine, Caret,
        Screen, Overlay, Counter, InfoBar, Finder, Stream,
        keydownMap, keypressMap, shortcuts, commands, history, selection,
        tracking, extensions, eol, div, li_clone, pre_clone, span_clone,
        DATA_RATIO = 10,
        DATA_MASTER_RATIO = 100;
    
    $.scripts.registerNamespace('CodePrinter', 'mode/');
    
    CodePrinter = function(element, options) {
        if (!(this instanceof CodePrinter)) {
            return new CodePrinter(element, options);
        }
        
        var self = this, screen, sizes, data = '', id, d, pr;
        
        options = self.options = {}.extend(CodePrinter.defaults, options, element && element.nodeType ? $.parseData(element.data('codeprinter'), ',') : null);
        
        buildDOM(self);
        
        self.mainElement.CodePrinter = self;
        id = self.mainElement.id = $.random(options.randomIDLength);
        sizes = self.sizes = { lineHeight: options.lineHeight };
        self.activeLine = {};
        self.overlays = [];
        self.selection.overlay = new Overlay(self, 'cp-selection-overlay', false);
        
        options.lineNumbers && self.openCounter();
        options.infobar && self.openInfobar();
        options.showFinder && self.openFinder();
        
        options.fontSize != 11 && options.fontSize > 0 && this.setFontSize(options.fontSize);
        options.lineHeight != 15 && options.lineHeight > 0 && (id = '#'+id+' .cp-') && (options.ruleIndex = $.stylesheet.insert(id+'screen pre, '+id+'counter, '+id+'selection', 'line-height:'+options.lineHeight+'px;'));
        self.setWidth(options.width);
        self.setHeight(options.height);
        self.setTheme(options.theme);
        self.setMode(options.mode);
        
        var mouseController = function(e) {
            if (e.button > 0 || e.which > 1)
                return false;
            
            var sl = this.scrollLeft,
                st = this.scrollTop,
                o = this.bounds(),
                x = Math.max(0, sl + e.pageX - o.x - self.sizes.paddingLeft),
                y = st + e.pageY - o.y - self.sizes.paddingTop,
                l = Math.min(Math.max(1, Math.ceil(y / self.sizes.lineHeight)), self.data.lines) - 1,
                s = self.getTextAtLine(l),
                c = Math.min(Math.max(0, Math.round(x / self.sizes.charWidth)), s.length);
            
            if (e.type === 'mousedown') {
                var th = this;
                d = true;
                self.input.value = '';
                self.selection.setStart(l, c);
                self.caret.deactivate().show();
                this.on('mousemove', mouseController);
                document.one('mouseup', function(e) {
                    !self.selection.isset() && self.selection.clear();
                    th.off('mousemove', mouseController);
                    self.caret.activate();
                    document.activeElement != self.input && ($.browser.firefox ? setTimeout(function() { self.input.focus() }, 0) : self.input.focus());
                    return d = e.cancel();
                });
            } else {
                self.unselectLine();
                self.selection.setEnd(l, c);
                self.showSelection();
                self.removeOverlays();
            }
            
            self.caret.position(l, c);
        };
        
        self.wrapper.listen({
            scroll: function() {
                var lv = parseInt(self.options.linesOutsideOfView),
                    x = Math.ceil((this.scrollTop - self.sizes.scrollTop) / self.sizes.lineHeight);
                
                if (x > lv) {
                    do self.screen.shift(); while (--x > lv);
                } else if (x < lv) {
                    do self.screen.unshift(); while (++x < lv);
                }
                self.selectLine(self.caret.line());
                this.timeout = clearTimeout(this.timeout) || setTimeout(function() { self.counter && (self.counter.parent.scrollTop = self.wrapper.scrollTop); }, 5);
            },
            dblclick: function() {
                var bf = self.caret.textBefore(),
                    af = self.caret.textAfter(),
                    line = self.caret.line(),
                    c = self.caret.column(),
                    l = 1, r = 0, rgx = /[^\w\s]/;
                
                rgx = bf[c-l] == ' ' || af[r] == ' ' ? /\s/ : !isNaN(bf[c-l]) || !isNaN(af[r]) ? /\d/ : /^\w$/.test(bf[c-l]) || /^\w$/.test(af[r]) ? /\w/ : rgx;
                
                while (l <= c && rgx.test(bf[c-l])) l++;
                while (r < af.length && rgx.test(af[r])) r++;
                
                if (c-l+1 != c+r) {
                    self.selection.setStart(line, c-l+1).setEnd(line, c+r);
                    self.showSelection();
                }
            },
            mousedown: mouseController
        });
        
        self.input.listen({
            focus: function() {
                !self.caret.isActive && self.caret.show().activate();
                self.selectLine(self.caret.line());
            },
            blur: function(e) {
                if (d) {
                    this.focus();
                } else {
                    self.caret.deactivate().hide();
                    self.unselectLine();
                    self.selection.clear();
                    self.removeOverlays();
                }
            },
            keydown: function(e) {
                var k = e.getCharCode();
                self.caret.deactivate().show();
                pr = true;
                
                if (isCommandKey(e) && commands[k]) {
                    pr = commands[k].call(self, this, e, k);
                    return pr;
                }
                if (e.ctrlKey && self.options.shortcuts && self.shortcuts[k]) {
                    self.shortcuts[k].call(self, e, this);
                    return pr = e.cancel();
                }
                if (k >= 17 && k <= 20 || k >= 91 && k <= 95 || k >= 112 && k <= 145 || k == 224) {
                    return pr = e.cancel();
                } else {
                    if (self.parser.keydownMap[k]) {
                        pr = self.parser.keydownMap[k].call(self, e, k);
                    } else {
                        pr = self.keydownMap.touch(k, self, e);
                    }
                    pr = pr == -1 ? true : pr;
                    if (pr && self.selection.isset()) {
                        self.removeSelection();
                    }
                }
                return pr;
            },
            keypress: function(e) {
                var k = e.getCharCode(),
                    ch = String.fromCharCode(k);
                
                if (pr && e.ctrlKey != true && e.metaKey != true) {
                    if (self.parser.keypressMap[k]) {
                        self.parser.keypressMap[k].call(self, e, ch) && self.insertText(ch);
                    } else {
                        self.keypressMap.touch(k, self, e, ch) !== false && self.insertText(ch);
                    }
                    self.emit('keypress:'+k, { code: k, char: ch, event: e });
                    this.value = '';
                    return e.cancel();
                }
            },
            keyup: function(e) {
                self.caret.activate();
                
                if (this.value.length && pr) {
                    self.insertText(this.value);
                    this.value = '';
                }
            }
        });
        
        self.caret.on({
            'text:changed': function(line) {
                line == null && (line = this.line());
                self.data.getLine(line).setText(this.textAtCurrentLine(true));
                self.finder && self.finder.find();
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
        
        self.on({
            'removed.before': function(t) {
                var p = self.parser;
                if (p && p.onRemovedBefore && p.onRemovedBefore[t]) {
                    p = p.onRemovedBefore[t];
                    if (typeof p === 'string' || typeof p === 'number') {
                        self.removeAfterCursor(p);
                    } else if (p instanceof Function) {
                        p.call(self, t);
                    }
                }
            },
            'removed.after': function(t) {
                var p = self.parser;
                if (p && p.onRemovedAfter && p.onRemovedAfter[t]) {
                    p = p.onRemovedAfter[t];
                    if (typeof p === 'string' || typeof p === 'number') {
                        self.removeBeforeCursor(p);
                    } else if (p instanceof Function) {
                        p.call(self, t);
                    }
                }
            }
        });
        
        self.mainElement.on({ nodeInserted: function() {
            this.removeClass('cp-animation');
            var s = window.getComputedStyle(self.screen.element, null);
            sizes.paddingTop = parseInt(s.getPropertyValue('padding-top'));
            sizes.paddingLeft = parseInt(s.getPropertyValue('padding-left'));
            sizes.scrollTop = parseInt(s.getPropertyValue('top'));
            calculateCharDimensions(self);
            
            self.print();
        }});
        
        if (element) {
            if (element.nodeType) {
                self.init((element.tagName.toLowerCase() === 'textarea' ? element.value : element.innerHTML).decode());
                element.before(self.mainElement).remove();
                return self;
            } else if (element.toLowerCase) {
                return self.init(element);
            }
        }
        
        return self.init(data);
    };
    
    CodePrinter.version = '0.5.7';
    
    CodePrinter.defaults = {
        path: '',
        mode: 'plaintext',
        theme: 'default',
        caretStyle: 'vertical',
        width: 'auto',
        height: 300,
        tabWidth: 4,
        fontSize: 11,
        minFontSize: 8,
        maxFontSize: 40,
        lineHeight: 15,
        linesOutsideOfView: 12,
        caretBlinkSpeed: 400,
        autoScrollSpeed: 20,
        historyStackSize: 50,
        historyDelay: 500,
        parserLoadingTimeout: 1000,
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
        highlightBrackets: true,
        highlightCurrentLine: true,
        blinkCaret: true,
        autoScroll: true,
        indentNewLines: true,
        insertClosingBrackets: true,
        insertClosingQuotes: true,
        shortcuts: true,
        showFinder: false,
        searchOnTheFly: false
    };
    
    div = document.createElement('div');
    li_clone = document.createElement('li');
    pre_clone = document.createElement('pre');
    span_clone = document.createElement('span');
    
    CodePrinter.prototype = {
        isFullscreen: false,
        init: function(source) {
            this.data = new Data();
            this.history = new history(this.options.historyStackSize, this.options.historyDelay);
            source = source.split('\n');
            this.screen.lastLine !== -1 && this.screen.removeLines();
            
            var self = this, i = -1, fn,
                l = source.length,
                tab = this.tabString();
            
            while (++i < l) {
                this.data.addLine(i, source[i].replaceAll(tab, '\t'));
            }
            
            self.data.on({
                'text:changed': function(dl) {
                    self.parse(dl);
                    self.caret.refresh();
                },
                'line:added': (fn = function() {
                    var s = self.screen.parent;
                    s.style.minHeight = (this.lines * self.sizes.lineHeight + self.sizes.paddingTop * 2) + 'px';
                }),
                'line:removed': fn
            });
            
            self.history.on({
                undo: function() {
                    var a, i = arguments.length;
                    while (i--) {
                        a = arguments[i];
                        self.caret.position(a.line, a.column);
                        if (a.added) {
                            self.removeAfterCursor(a.text);
                        } else {
                            self.insertText(a.text);
                        }
                    }
                },
                redo: function() {
                    var a, i = arguments.length;
                    while (i--) {
                        a = arguments[i];
                        self.caret.position(a.line, a.column);
                        if (a.added) {
                            self.insertText(a.text);
                        } else {
                            self.removeAfterCursor(a.text);
                        }
                    }
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
            if (this.options.highlightCurrentLine && !this.selection.isset()) {
                this.unselectLine();
                if (l >= this.screen.firstLine && l <= this.screen.lastLine) {
                    this.activeLine.pre = this.screen.getLine(l).addClass('cp-activeLine');
                    this.counter && (this.activeLine.li = this.counter.getLine(l).addClass('cp-activeLine'));
                }
            }
        },
        getSourceValue: function() {
            var value = this.isWritable ? this.source.value() : this.source.innerHTML.decode();
            return value.replace(/\t/g, this.tabString());
        },
        print: function(mode, source) {
            mode && this.setMode(mode);
            mode = this.options.mode;
            source && this.init(source);
            this.screen.removeLines();
            
            var self = this, timeout,
                sT = document.body.scrollTop,
                sL = document.body.scrollLeft,
                callback = function(ModeObject) {
                    timeout = clearTimeout(timeout);
                    self.defineParser(ModeObject);
                    self.screen.fill();
                    
                    var data = self.data,
                        l = self.screen.lastLine+1,
                        p = getDataLinePosition(l),
                        u = p[0], t = p[1], h = p[2],
                        I = clearInterval(I) || setInterval(function() {
                            t >= DATA_RATIO && ++h && (t = 0);
                            if (!data[h] || !data[h][t]) {
                                I = clearInterval(I);
                                return false;
                            }
                            while (u < data[h][t].length) {
                                self.parse(data.getLine(l));
                                l++; u++;
                            }
                            t++;
                            u = 0;
                        }, 10);
                    
                    document.body.scrollTop = sT;
                    document.body.scrollLeft = sL;
                    self.options.autofocus && self.caret.position(0, 0);
                };
            
            if (mode == 'plaintext') {
                callback.call(this, new CodePrinter.Mode());
            } else {
                timeout = setTimeout(function() {
                    callback.call(self, new CodePrinter.Mode());
                }, self.options.parserLoadingTimeout);
                CodePrinter.requireMode(mode, callback, this);
            }
            
            return this;
        },
        forcePrint: function() {
            var self = this;
            this.data.foreach(function() {
                self.parse(this, true);
            });
        },
        defineParser: function(parser) {
            if (parser instanceof CodePrinter.Mode) {
                this.parser = parser;
                this.keydownMap = (new keydownMap).extend(parser.keydownMap);
                this.keypressMap = (new keypressMap).extend(parser.keypressMap);
                this.options.tracking && (this.caret.tracking = (new tracking(this)).extend(parser.tracking));
            }
        },
        parse: function(line, force) {
            var dl, data = this.data;
            line instanceof DataLine && (dl = line) && (line = this.data.indexOf(line));
            (line == null) && (line = this.caret.line());
            
            if (line >= 0 && this.parser) {
                !dl && (dl = data.getLine(line));
                if (!dl.parsed || dl.changed || force) {
                    if (dl.startPoint) {
                        return this.parse(dl.startPoint, true);
                    }
                    var tmp = line, tabString = this.tabString(),
                        stream = new Stream(dl.text),
                        i = -1, p, ndl;
                    
                    stream.getNextLine = function() {
                        var nl = data.getLine(++tmp);
                        if (nl) {
                            nl.setStartPoint(dl);
                            this.value.push(nl.text);
                            return this;
                        } else {
                            return false;
                        }
                    };
                    
                    p = this.parser.fn(stream).parsed;
                    while (++i < p.length) {
                        p[i] = p[i].replaceAll('\t', tabString);
                        p[i] = this.options.showIndentation ? indentGrid(p[i], this.options.tabWidth) : p[i];
                        data.getLine(line+i).setParsed(p[i]);
                    }
                    while (i < data.lines && (ndl = data.getLine(line+i)) && ndl.startPoint == dl) {
                        delete ndl.startPoint;
                        this.parse(ndl, true);
                        i++;
                    }
                }
            }
            return this;
        },
        update: function(line) {
            line = line >= 0 ? line : this.caret.line();
            this.parse(line);
            return this;
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
                
                self.data.foreach(function() {
                    self.parse(this, true);
                });
            }
            return this;
        },
        setTheme: function(name) {
            typeof name === 'string' && name !== 'default' ? this.requireStyle(name) : name = 'default';
            this.mainElement.removeClass('cps-'+this.options.theme.toLowerCase()).addClass('cps-'+(this.options.theme = name.replace(' ', '-')).toLowerCase());
            return this;
        },
        setMode: function(mode) {
            mode = extensions[mode.toLowerCase()] || 'plaintext';
            this.mainElement.removeClass('cp-'+this.options.mode.toLowerCase()).addClass('cp-'+mode);
            this.options.mode = mode;
            return this;
        },
        setFontSize: function(size) {
            if (size >= this.options.minFontSize && size <= this.options.maxFontSize) {
                var id = this.mainElement.id;
                this.sizes.scrollTop = this.sizes.scrollTop / this.sizes.lineHeight;
                this.counter && (this.counter.parent.style.fontSize = size+'px') && this.counter.emit('width:changed');
                size > this.options.fontSize ? ++this.sizes.lineHeight : size < this.options.fontSize ? --this.sizes.lineHeight : 0;
                this.sizes.scrollTop *= this.sizes.lineHeight;
                this.wrapper.style.top = this.sizes.scrollTop + 'px';
                id = '#'+id+' .cp-';
                this.options.ruleIndex != null && $.stylesheet.delete(this.options.ruleIndex);
                this.options.ruleIndex = $.stylesheet.insert(id+'screen pre, '+id+'counter, '+id+'selection', 'line-height:'+this.sizes.lineHeight+'px;');
                this.wrapper.style.fontSize = (this.options.fontSize = size)+'px';
                calculateCharDimensions(this);
                this.screen.fix();
                this.caret.refresh();
            }
            return this;
        },
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
        getCurrentLine: function() {
            return this.caret.line();
        },
        getTextAtLine: function(line) {
            var l = this.data.getLine(line);
            return l ? l.text.replaceAll('\t', this.tabString()) : '';
        },
        getIndentAtLine: function(line) {
            var i = -1, dl = this.data.getLine(line);
            if (dl) {
                while (dl.text[++i] === '\t');
                return i;
            }
            return 0;
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
        insertText: function(text, mx) {
            var pos, s = text.split(eol),
                bf = this.caret.textBefore(),
                af = this.caret.textAfter();
            
            text.length && this.history.pushChanges(this.caret.line(), bf.length, text, true);
            this.caret.setTextBefore(bf + s[0]);
            
            if (s.length > 1) {
                for (var i = 1; i < s.length; i++) {
                    this.caret.setTextAfter('');
                    this.insertNewLine();
                    this.caret.position(this.caret.line() + 1, 0).setTextBefore(s[i]);
                }
                this.caret.setTextAfter(af);
            }
            
            mx && this.caret.moveX(mx);
            return this;
        },
        insertNewLine: function(l) {
            l == null && (l = this.caret.line()+1);
            var dl = this.data.addLine(l, '');
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
        removeBeforeCursor: function(arg) {
            var r = '', bf = this.caret.textBefore();
            if (typeof arg === 'string') {
                arg = arg.split(eol);
                var i = arg.length - 1, x,
                    af = this.caret.textAfter(),
                    l = this.caret.line();
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
                    var af = this.caret.textAfter(),
                        l = this.caret.line();
                    
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
                this.history.pushChanges(this.caret.line(), this.caret.column(), r, false);
                this.emit('removed.before', r);
            }
        },
        removeAfterCursor: function(arg) {
            var r = '', af = this.caret.textAfter();
            if (typeof arg === 'string') {
                var i = 0,
                    bf = this.caret.textBefore(),
                    l = this.caret.line();
                arg = arg.split(eol);
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
                    var bf = this.caret.textBefore(),
                        l = this.caret.line();
                    
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
                this.history.pushChanges(this.caret.line(), this.caret.column(), r, false);
                this.emit('removed.after', r);
            }
        },
        getValue: function() {
            var t, r = [], h = 0, tabString = this.tabString();
            for (; h < this.data.length; h++) {
                for (t = 0; t < this.data[h].length; t++) {
                    r.push.apply(r, this.data[h][t].map(function(obj) {
                        return obj.text.replaceAll('\t', tabString);
                    }));
                }
            }
            return r.join(eol);
        },
        getSelection: function() {
            if (this.selection.isset()) {
                var s = this.selection.getStart(),
                    e = this.selection.getEnd();
                
                if (s.line != e.line) {
                    var t = this.getTextAtLine(s.line).substr(s.column) + eol
                    for (var i = s.line + 1; i < e.line; i++) {
                        t = t + this.getTextAtLine(i) + eol;
                    }
                    return t + this.getTextAtLine(e.line).substring(0, e.column);
                } else {
                    return this.getTextAtLine(s.line).substring(s.column, e.column);
                }
            }
            return '';
        },
        showSelection: function() {
            var span, sel, ov = this.selection.overlay,
                s = this.selection.getStart(),
                e = this.selection.getEnd();
            
            if (s && e) {
                sel = this.getSelection();
                this.input.value = sel;
                this.input.setSelectionRange(0, sel.length);
                sel = sel.split(eol);
                ov.node.innerHTML = '';
                
                for (var i = 0; i < sel.length; i++) {
                    var pos = getPositionOf(this, s.line+i, i === 0 ? s.column : 0);
                    span = createSpan(sel[i] || i === 0 ? sel[i] : ' ', 'cp-selection', pos.y, pos.x);
                    ov.node.append(span);
                }
                ov.reveal();
                this.selection.isInversed() ? this.caret.position(s.line, s.column) : this.caret.position(e.line, e.column);
            }
        },
        removeSelection: function() {
            var l = this.getSelection().length;
            this.selection.isInversed() ? this.removeAfterCursor(l) : this.removeBeforeCursor(l);
            this.selection.clear();
            this.selectLine(this.caret.line());
        },
        registerKeydown: function(arg) {
            if (!(arg instanceof Object)) { var t = arguments[0]; arg = {}; arg[t] = arguments[1]; }
            this.keydownMap.extend(arg);
            return this;
        },
        registerKeypress: function(arg) {
            if (!(arg instanceof Object)) { var t = arguments[0]; arg = {}; arg[t] = arguments[1]; }
            this.keypressMap.extend(arg);
            return this;
        },
        registerShortcut: function(arg) {
            if (!(arg instanceof Object)) { var t = arguments[0]; arg = {}; arg[t] = arguments[1]; }
            this.shortcuts.extend(arg);
            return this;
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
            this.container.prepend(this.counter.parent);
            this.counter.parent.scrollTop = this.wrapper.scrollTop;
            this.counter.emit('width:changed');
        },
        closeCounter: function() {
            this.counter && this.counter.parent.remove();
            this.counter.emit('width:changed');
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
        },
        closeFinder: function() {
            this.finder && this.finder.close();
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
            var h = 0, t, i;
            for (; h < this.length; h++) {
                for (t = 0; t < this[h].length; t++) {
                    for (i = 0; i < this[h][t].length; i++) {
                        f.call(this[h][t][i], this.data);
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
        var line = 0, column = 0, before = '', after = '', tmp;
        
        this.root = cp;
        
        return this.extend({
            setTextBefore: function(str) {
                var l = str.length;
                str.indexOf('@') !== -1 && (str = str.replaceAll(['@a','@b'], [after, before]));
                str = str.replaceAll(cp.tabString(), '\t');
                if (before !== str) {
                    before = str;
                    this.emit('text:changed', line);
                    this.position(line, l);
                }
                return this;
            },
            setTextAfter: function(str) {
                str.indexOf('@') !== -1 && (str = str.replaceAll(['@a','@b'], [after, before]));
                str = str.replaceAll(cp.tabString(), '\t');
                if (after !== str) {
                    after = str;
                    this.emit('text:changed', line);
                }
                return this;
            },
            setTextAtCurrentLine: function(bf, af) {
                var l = bf.length;
                bf.indexOf('@') !== -1 && (bf = bf.replaceAll(['@a','@b'], [after, before]));
                af.indexOf('@') !== -1 && (af = af.replaceAll(['@a','@b'], [after, before]));
                bf = bf.replaceAll(cp.tabString(), '\t');
                af = af.replaceAll(cp.tabString(), '\t');
                if (before !== bf || after !== af) {
                    before = bf;
                    after = af;
                    this.emit('text:changed', line);
                    this.position(line, l);
                }
                return this;
            },
            textBefore: function() {
                return before.replaceAll('\t', cp.tabString());
            },
            textAfter: function() {
                return after.replaceAll('\t', cp.tabString());
            },
            textAtCurrentLine: function(b) {
                return b ? before + after : this.textBefore() + this.textAfter();
            },
            getPosition: function() {
                return { line: line ? line + 1 : 1, column: this.column() + 1 };
            },
            position: function(l, c, t) {
                typeof l !== 'number' && (l = line || 0);
                l = Math.max(Math.min(l, cp.data.lines - 1), 0);
                typeof t !== 'string' && (t = cp.getTextAtLine(l));
                typeof c !== 'number' && (c = column || 0);
                c < 0 && (c = t.length + c + 1);
                
                var tabString = cp.tabString(),
                    x = cp.sizes.charWidth * Math.min(c, t.length),
                    y = cp.sizes.lineHeight * l;
                
                if (line !== l) {
                    this.emit('line:changed', { current: l, last: line });
                    line = l;
                }
                if (column !== c) {
                    this.emit('column:changed', { current: c, last: column });
                    column = c;
                }
                
                before = t.substring(0, c).replaceAll(tabString, '\t');
                after = t.substr(c).replaceAll(tabString, '\t');
                this.setPixelPosition(x, y);
                
                if (cp.options.tracking) {
                    for (var s in this.tracking) {
                        var a = before.endsWith(s), b = after.startsWith(s);
                        if (a + b) {
                            var r = this.tracking[s].call(this, cp, s, { isBefore: b, isAfter: a, line: l, column: this.column() + s.length * b });
                            if (!r) {
                                break;
                            }
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
                mv = mv < 0 ? 0 : mv > this.root.data.lines ? this.root.data.lines : mv;
                return this.position(mv, column);
            },
            refresh: function() {
                return this.setPixelPosition(cp.sizes.charWidth * Math.min(column, this.textBefore().length), cp.sizes.lineHeight * line);
            },
            line: function() {
                return line;
            },
            column: function() {
                return this.textBefore().length;
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
                            r = f.call(this, t[i], line + n, ++i, cp);
                        }
                        i = 0;
                        n++;
                    }
                }
            },
            saveColumn: function() {
                tmp = column;
            },
            restoreColumn: function() {
                tmp != null && this.position(null, tmp);
                tmp = null;
            }
        });
    };
    Caret.styles = {
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
            this.element.style.opacity = 1;
            return this;
        },
        hide: function() {
            this.element.style.opacity = 0;
            return this;
        },
        activate: function() {
            if (this.root.options.blinkCaret) {
                var elm = this.element, a = true;
                this.interval = clearInterval(this.interval) || setInterval(function() {
                    a = !a;
                    elm.style.opacity = +a;
                }, this.root.options.caretBlinkSpeed);
            }
            this.isActive = true;
            return this;
        },
        deactivate: function() {
            this.interval && (this.interval = clearInterval(this.interval));
            this.isActive = false;
            return this;
        },
        setPixelPosition: function(x, y) {
            var css = {},
                stl = this.style || this.root.options.caretStyle;
            
            x >= 0 && (css.left = x = x + this.root.sizes.paddingLeft);
            y >= 0 && (css.top = y = y + this.root.sizes.paddingTop);
            
            Caret.styles[stl] instanceof Function ? css = Caret.styles[stl].call(this.root, css) : css.height = this.root.sizes.lineHeight;
            this.element.css(css);
            this.show().activate();
            this.emit('position:changed', x, y);
            return this;
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
        
        return this;
    };
    Screen.prototype = {
        firstLine: 0,
        lastLine: -1,
        fill: function() {
            var r = this.root, w = r.wrapper,
                lv = parseInt(r.options.linesOutsideOfView),
                x = Math.min(Math.ceil(w.clientHeight / r.sizes.lineHeight) + 2 * lv, r.data.lines-1),
                i = this.length();
            
            for (; i <= x; i++) this.insert();
            this.fix();
            return this;
        },
        insert: function() {
            if (this.lastLine < this.root.data.lines - 1) {
                var dl = this.root.data.getLine(++this.lastLine),
                    pre = dl.pre = pre_clone.cloneNode();
                
                this.root.parse(dl, true) && dl.touch();
                this.element.append(pre);
                this.root.counter && this.root.counter.increase();
            }
        },
        splice: function(dl, i) {
            if (dl instanceof DataLine && i >= this.firstLine && i <= this.lastLine+1) {
                var q = i - this.firstLine;
                
                if (this.length() < this.root.wrapper.clientHeight / this.root.sizes.lineHeight + this.root.options.linesOutsideOfView * 2) {
                    dl.pre = pre_clone.cloneNode();
                    this.lastLine++;
                    this.root.counter && this.root.counter.increase();
                } else if (i + this.root.options.linesOutsideOfView >= this.root.data.lines) {
                    this.root.data.getLine(this.firstLine++).deleteNodeProperty();
                    dl.pre = this.element.firstChild.next();
                    q--; this.lastLine++;
                    this.element.style.top = (this.root.sizes.scrollTop += this.root.sizes.lineHeight) + 'px';
                    this.root.counter && this.root.counter.shift();
                } else {
                    this.root.data.getLine(this.lastLine).deleteNodeProperty();
                    dl.pre = this.element.lastChild;
                }
                this.root.parse(dl) && dl.touch();
                q === 0 ? this.element.prepend(dl.pre) : this.element.kids()[q].after(dl.pre);
            }
        },
        remove: function(i) {
            if (i >= this.firstLine && i <= this.lastLine) {
                var r = this.root,
                    q = i - this.firstLine;
                if (this.firstLine == 0) {
                    if (this.lastLine < r.data.lines) {
                        var dl = r.data.getLine(this.lastLine);
                        dl.pre = this.element.kids()[q+1];
                        this.link(dl, true);
                    } else {
                        this.element.kids()[q+1].untie();
                        this.lastLine--;
                        r.counter && r.counter.decrease();
                    }
                } else {
                    var dl = r.data.getLine(--this.firstLine);
                    dl.pre = this.element.kids()[q+1];
                    this.link(dl);
                    this.element.style.top = (this.root.sizes.scrollTop -= this.root.sizes.lineHeight) + 'px';
                    this.lastLine--;
                    r.counter && r.counter.unshift();
                }
            }
        },
        shift: function() {
            if (this.lastLine + 1 < this.root.data.lines) {
                this.root.data.getLine(this.firstLine).deleteNodeProperty();
                var dl = this.root.data.getLine(++this.lastLine);
                dl.pre = this.element.firstChild.next();
                this.link(dl, true);
                this.element.style.top = (this.root.sizes.scrollTop += this.root.sizes.lineHeight) + 'px';
                this.firstLine++;
                this.root.counter && this.root.counter.shift();
            }
        },
        unshift: function() {
            if (this.firstLine - 1 >= 0) {
                this.root.data.getLine(this.lastLine).deleteNodeProperty();
                var dl = this.root.data.getLine(--this.firstLine);
                dl.pre = this.element.lastChild;
                this.link(dl);
                this.element.style.top = (this.root.sizes.scrollTop -= this.root.sizes.lineHeight) + 'px';
                this.lastLine--;
                this.root.counter && this.root.counter.unshift();
            }
        },
        link: function(dl, append) {
            this.element.removeChild(dl.pre);
            this.root.parse(dl) && dl.touch();
            this.element.insertBefore(dl.pre, append ? null : this.element.firstChild.next());
        },
        getLine: function(line) {
            return line >= this.firstLine && line <= this.lastLine ? this.element.kids().item(line - this.firstLine + 1) : null;
        },
        length: function() {
            return this.lastLine - this.firstLine + 1;
        },
        removeLines: function() {
            this.element.innerHTML = '';
            this.firstLine = 0;
            this.lastLine = -1;
            this.root.counter && this.root.counter.removeLines();
        },
        fix: function() {
            if (this.root.data) {
                this.parent.style.minHeight = (this.root.data.lines * this.root.sizes.lineHeight + this.root.sizes.paddingTop * 2) + 'px';
                this.fixer.untie().css({ width: this.root.wrapper.clientWidth - 2 * this.root.sizes.paddingLeft }).prependTo(this.element);
            }
            return this;
        }
    };
    
    Overlay = function(cp, classes, removable) {
        this.node = div.cloneNode().addClass('cp-overlay '+classes);
        this.isRemovable = !!removable;
        this.root = cp;
        return this;
    };
    Overlay.prototype = {
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
        }
    };
    
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
        increase: function() {
            var li = li_clone.cloneNode(false),
                f = this.formatter(++this.lastLine);
            li.innerHTML = f;
            this.element.appendChild(li, null);
            f.toString().length > this.formatter(this.lastLine-1).toString().length && this.emit('width:changed');
        },
        decrease: function() {
            var n = this.lastLine--;
            this.element.lastChild.untie();
            this.formatter(n-1).toString().length < this.formatter(n).toString().length && this.emit('width:changed');
        },
        shift: function() {
            var fi = this.element.firstChild,
                c = ++this.lastLine,
                f = this.formatter(c);
            
            this.element.removeChild(fi);
            fi.innerHTML = f;
            this.element.insertBefore(fi, null);
            this.element.style.top = this.root.sizes.scrollTop + 'px';
            f.toString().length > this.formatter(c-1).toString().length && this.emit('width:changed');
        },
        unshift: function() {
            var la = this.element.lastChild,
                c = this.lastLine-- - this.element.kids().length;
            
            this.element.removeChild(la);
            la.innerHTML = this.formatter(c);
            this.element.insertBefore(la, this.element.firstChild);
            this.element.style.top = this.root.sizes.scrollTop + 'px';
            this.formatter(this.lastLine+1).toString().length > this.formatter(this.lastLine).toString().length && this.emit('width:changed');
        },
        removeLines: function() {
            this.lastLine = this.root.options.firstLineNumber - 1;
            this.element.innerHTML = '';
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
        var mode = span_clone.cloneNode().addClass('cpi-mode'),
            act = span_clone.cloneNode().addClass('cpi-actions'),
            info = span_clone.cloneNode().addClass('cpi-info');
        
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
            overlay = new Overlay(cp, 'cpf-overlay', false),
            keyMap = {
                13: function() {
                    if (self.searched === this.value) {
                        self.next();
                    } else {
                        self.find(this.value);
                    }
                },
                27: function() {
                    self.close();
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
        closebutton.on({ click: function(e) { self.close(); }});
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
    };
    Finder.prototype = {
        close: function() {
            this.bar.remove();
            this.overlay.remove();
        },
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
                        var span = span_clone.cloneNode().addClass('cpf-occurrence');
                        span.textContent = span.innerText = span.innerHTML = find;
                        ln = ln + index;
                        span.extend({ position: {
                            ls: line, 
                            cs: ln,
                            le: line,
                            ce: ln + find.length
                        }});
                        span.style.extend({
                            width: (siz.charWidth * find.length) + 'px',
                            height: siz.lineHeight + 'px',
                            top: (siz.paddingTop + line * siz.lineHeight + 1) + 'px',
                            left: (siz.paddingLeft + siz.charWidth * ln + 1) + 'px'
                        });
                        this.push(span);
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
            this.root.wrapper.scrollTo( 
                parseInt(this.searchResults.css('left') - this.root.wrapper.clientWidth/2),
                parseInt(this.searchResults.css('top') - this.root.wrapper.clientHeight/2),
                this.root.options.autoScrollSpeed
            );
        }
    };
    
    Stream = function(value) {
        if (!(this instanceof Stream)) {
            return new Stream(value);
        }
        this.value = value instanceof Array ? value : typeof value === 'string' ? [value] : [];
        this.parsed = [];
        this.row = 0;
        this.pos = 0;
        return this;
    };
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
        match: function(rgx) {
            var s = this.current().substr(this.pos),
                f = false;
            
            if (s.length > 0) {
                var m = rgx.exec(s), i;
                if (m && m[0]) {
                    f = m[0];
                    i = s.indexOf(f);
                    this.append(s.substring(0, i));
                    this.pos = this.pos + i;
                }
            }
            !f && this.tear();
            return this.found = f;
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
        wrap: function(suffix, fn) {
            if (!this.eaten.length) {
                if (this.found) {
                    this.eat(this.found);
                } else {
                    return this;
                }
            }
            var i = 0,
                tmp = this.eaten,
                span = function(txt) {
                    txt = txt.encode();
                    fn instanceof Function && (txt = fn.call(txt, suffix));
                    return '<span class="'+suffix+'">' + txt + '</span>';
                };
            
            suffix = (suffix instanceof Array) ? suffix.slice(0) : [suffix];
            
            for (i = 0; i < suffix.length; i++) {
                suffix[i] = 'cpx-'+suffix[i];
            }
            suffix = suffix.join(' ');
            this.wrapped = [];
            tmp.length > 1 && (this.row = this.row - tmp.length + 1);
            i = 0;
            
            while (true) {
                this.wrapped[i] = this.append(tmp[i] ? span(tmp[i]) : '');
                if (++i < tmp.length) {
                    this.parsed[++this.row] = '';
                } else {
                    break;
                }
            }
            return this.reset();
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
            return this.parsed.join(eol);
        }
    };
    
    CodePrinter.Mode = function() {
        if (!(this instanceof CodePrinter.Mode)) {
            return new CodePrinter.Mode();
        }
        this.keydownMap = {};
        this.keypressMap = {};
        this.onRemovedBefore = {'{':'}','(':')','[':']','"':'"',"'":"'"};
        this.onRemovedAfter = {'}':'{',')':'(',']':'[','"':'"',"'":"'"};
        return this;
    };
    
    CodePrinter.Mode.prototype = {
        brackets: {
            '{': ['bracket', 'bracket-curly', 'bracket-open'],
            '}': ['bracket', 'bracket-curly', 'bracket-close'],
            '[': ['bracket', 'bracket-square', 'bracket-open'],
            ']': ['bracket', 'bracket-square', 'bracket-close'],
            '(': ['bracket', 'bracket-round', 'bracket-open'],
            ')': ['bracket', 'bracket-round', 'bracket-close']
        },
        chars: { 
            '//': { end: '\n', cls: ['comment', 'line-comment'] }, 
            '/*': { end: '*/', cls: ['comment', 'multiline-comment'] },
            "'": { end: /(^'|[^\\]')/, cls: ['string', 'single-quote'] },
            '"': { end: /(^"|[^\\]")/, cls: ['string', 'double-quote'] }
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
            '%': 'percentage',
            '<': 'lower',
            '>': 'greater',
            '&': 'ampersand',
            '|': 'verticalbar'
        },
        parse: function(text, toString) {
            var s = this.fn(new Stream(text));
            return toString ? s.toString() : s;
        },
        fn: function(stream) {
            stream.parsed = stream.value;
            return stream;
        }
    };
    
    keydownMap = function() {};
    keydownMap.prototype = {
        touch: function(code, self, event) {
            if (this[code]) {
                return this[code].call(self, event, code);
            }
            return -1;
        },
        8: function(e) {
            var t = this.caret.textBefore(),
                m = t.match(/ +$/),
                r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? this.tabString() : 1;
            
            this.selection.isset() ? this.removeSelection() : this.removeBeforeCursor(r);
            return e && e.cancel();
        },
        9: function(e) {
            if (this.selection.isset()) {
                var t = '\t', w = this.options.tabWidth,
                    s = this.selection, i, l;
                
                s.correct();
                this.caret.position(s.start.line, s.start.column);
                i = s.start.line;
                l = s.end.line;
                
                if (e.shiftKey) {
                    var dl = this.data.getLine(i);
                    if (dl.text.indexOf(t) === 0) {
                        dl.setText(dl.text.substr(w));
                        s.start.column -= w;
                        this.caret.moveX(-w);
                    }
                    if (l - i++) {
                        for (; i < l; i++) {
                            this.data.getLine(i).lbreak(t);
                        }
                        dl = this.data.getLine(i);
                        if (dl.text.indexOf(t) === 0) {
                            dl.setText(dl.text.substr(w));
                            s.end.column -= w;
                        }
                    }
                } else {
                    for (; i <= l; i++) {
                        this.data.getLine(i).prepend(t);
                    }
                    s.start.column += w;
                    s.end.column += w;
                    this.caret.moveX(w);
                }
                this.showSelection();
            } else {
                !e.ctrlKey && (e.shiftKey ? this.removeBeforeCursor(this.tabString()) : this.insertText(this.tabString()));
            }
            return e.cancel();
        },
        13: function(e) {
            var t = this.caret.textBefore().match(/^ +/),
                a = '\n' + (this.options.indentNewLines && t && t[0] ? t[0].substring(0, t[0].length - t[0].length % this.options.tabWidth) : '');
            
            if (this.textBeforeCursor(1) === '{') {
                this.insertText(a + this.tabString());
                this.textAfterCursor(1) === '}' && this.insertText(a, -a.length);
            } else {
                this.insertText(a);
            }
            return e.cancel();
        },
        16: function() {
            if (this.selection.start.line == null) {
                this.selection.setStart(this.caret.line(), this.caret.column());
            }
        },
        27: function(e) {
            this.isFullscreen && this.exitFullscreen();
            return e.cancel();
        },
        33: function() {
            this.wrapper.scrollTop -= this.wrapper.clientHeight;
        },
        34: function() {
            this.wrapper.scrollTop += this.wrapper.clientHeight;
        },
        35: function() {
            this.caret.position(this.data.lines - 1, -1);
        },
        36: function() {
            this.caret.position(0, 0);
        },
        37: function(e, c) {
            c%2 ? this.caret.move(c-38, 0) : this.caret.move(0, c-39);
            if (e.shiftKey && this.selection.start.line >= 0) {
                this.selection.setEnd(this.caret.line(), this.caret.column());
                this.showSelection();
                this.unselectLine();
            } else {
                this.selection.clear();
            }
            return e.cancel();
        },
        46: function(e) {
            var t = this.caret.textAfter(),
                m = t.match(/^ +/),
                r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? this.tabString() : 1;
            
            this.selection.isset() ? this.removeSelection() : this.removeAfterCursor(r);
            return e.cancel();
        }
    };
    keydownMap.prototype[40] = keydownMap.prototype[39] = keydownMap.prototype[38] = keydownMap.prototype[37];
    
    keypressMap = function() {};
    keypressMap.prototype = {
        touch: function(code, self, event, char) {
            if (this[code]) {
                return this[code].call(self, event, code, char);
            }
        },
        34: function(e, k, ch) {
            if (this.options.insertClosingQuotes) {
                this.textAfterCursor(1) !== ch ? this.insertText(ch + ch, -1) : this.caret.moveX(1);
                return false;
            }
        },
        40: function(e, k, ch) {
            if (this.options.insertClosingBrackets) {
                this.insertText(ch + (k === 40 ? String.fromCharCode(41) : String.fromCharCode(k+2)), -1);
                return false;
            }
        },
        41: function(e, k, ch) {
            if (this.options.insertClosingBrackets && this.textAfterCursor(1) == ch) {
                this.caret.moveX(1);
                return false;
            }
        }
    };
    keypressMap.prototype[39] = keypressMap.prototype[34];
    keypressMap.prototype[91] = keypressMap.prototype[123] = keypressMap.prototype[40];
    keypressMap.prototype[93] = keypressMap.prototype[125] = keypressMap.prototype[41];
    
    shortcuts = function() {};
    shortcuts.prototype = {
        37: function() {
            this.caret.position(this.caret.line(), 0);
        },
        38: function(e) {
            e.altKey ? this.swapLineUp() : (this.wrapper.scrollTop = 0 && this.caret.position(0, 0));
        },
        39: function() {
            this.caret.position(this.caret.line(), -1);
        },
        40: function(e) {
            e.altKey ? this.swapLineDown() : this.caret.position(this.data.lines - 1, -1);
        },
        70: function(e) {
            if (e.shiftKey) {
                this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
            } else {
                !this.finder || this.finder.bar.parentNode == null ? this.openFinder() : this.finder.input.focus();
            }
        },
        73: function() {
            !this.infobar || this.infobar.element.parentNode == null ? this.openInfobar() : this.closeInfobar();
        },
        74: function() {
            var self = this, l = parseInt(prompt("Jump to line..."), 10) - 1;
            setTimeout(function() {
                self.caret.position(l, 0);
            }, 1);
        },
        78: function() {
            !this.counter || this.counter.parent.parentNode == null ? this.openCounter() : this.closeCounter();
        },
        82: function() {
            this.forcePrint();
        },
        90: function(e) {
            e.shiftKey ? this.history.redo() : this.history.undo();
        },
        187: function() {
            this.setFontSize(this.options.fontSize+1);
        },
        189: function() {
            this.setFontSize(this.options.fontSize-1);
        },
        191: function() {
            if (this.parser && this.parser.comment) {
                var c = this.parser.comment,
                    m = '[text content]',
                    i = c.indexOf(m), j,
                    s = c, e = '', x,
                    t = this.caret.textAtCurrentLine(),
                    l = this.caret.column();
                
                if (i !== -1) {
                    s = c.substr(0, i);
                    e = c.substr(i+m.length);
                }    
                j = t.indexOf(s);
                if (j !== -1) {
                    var k = e ? t.indexOf(e, j+s.length) : t.length;
                    t = t.substring(0, j) + t.substring(j+s.length, k);
                    x = l > j ? l > j+s.length ? -s.length : -l+j : 0;
                } else {
                    var k = -1;
                    while (t[++k] == ' ');
                    t = t.substring(0, k) + s + t.substr(k) + e;
                    x = l >= k ? s.length : 0;
                }
                this.data.getLine(this.caret.line()).setText(t);
                x && this.caret.moveX(x);
            }
        }
    };
    shortcuts.prototype[229] = shortcuts.prototype[191];
    
    commands = {
        65: function() {
            var ls = this.data.lines - 1;
            this.selection.setStart(0, 0).setEnd(ls, this.getTextAtLine(ls).length);
            this.showSelection();
            this.emit('cmd.selectAll');
            return false;
        },
        67: function() {
            this.emit('cmd.copy');
            return false;
        },
        86: function() {
            this.removeSelection();
            this.emit('cmd.paste');
            return true;
        },
        88: function() {
            if (this.selection.isset()) {
                this.removeSelection();
                this.emit('cmd.cut');
            }
            return true;
        },
        90: function(e) {
            e.shiftKey ? this.history.redo() : this.history.undo();
            return false;
        }
    };
    
    history = function(stackSize, delay) {
        this.states = [];
        this.initialState = [];
        this.index = 0;
        this.muted = false;
        
        this.pushChanges = function(line, column, text, added) {
            if (!this.muted && arguments.length == 4) {
                var self = this,
                    changes = { line: line, column: column, text: text, added: added };
                
                if (this.index < this.states.length - 1) {
                    ++this.index;
                    this.states.splice(this.index, this.states.length - this.index);
                }
                if (!this.states[this.index] || this.toRemove) {
                    this.states[this.index] = [changes];
                    this.toRemove = false;
                } else {
                    var last = this.states[this.index].last(),
                        b = false;
                    if (last.line == line && added == last.added) {
                        if (b = (last.column + last.text.length == column)) {
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
        };
        this.save = function() {
            ++this.index;
            while (this.states.length >= stackSize) {
                this.shift();
            }
            return this;
        };
    };
    history.prototype = {
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
            if (this.index >= 0 && this.index <= this.states.length) {
                this.timeout = clearTimeout(this.timeout);
                (!this.states[this.index] || !this.states[this.index].length) && --this.index;
                this.mute().emit('undo', this.states[this.index--]).unmute();
                this.toRemove = true;
            }
        },
        redo: function() {
            this.index < 0 && (this.index = 0);
            if (this.index < this.states.length) {
                this.timeout = clearTimeout(this.timeout);
                this.mute().emit('redo', this.states[this.index++]).unmute();
                this.toRemove = true;
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
    };
    
    selection = function() {
        this.start = {};
        this.end = {};
        return this;
    };
    selection.prototype = {
        clear: function() {
            this.overlay.node.innerHTML = '';
            this.overlay.isRemovable = true;
            this.start = {};
            this.end = {};
            this.emit('canceled');
            return this;
        },
        setStart: function(line, column) {
            this.overlay.node.innerHTML != '' && this.clear();
            this.overlay.isRemovable = false;
            this.start.line = line;
            this.start.column = column;
            this.emit('started');
            return this;
        },
        setEnd: function(line, column) {
            this.end.line = line;
            this.end.column = column;
            return this;
        },
        setRange: function(sl, sc, el, ec) {
            this.setStart(sl, sc);
            this.setEnd(el, ec);
            return this;
        },
        getStart: function() {
            return this.isInversed() ? this.end : this.start;
        },
        getEnd: function() {
            return this.isInversed() ? this.start : this.end;
        },
        isInversed: function() {
            return this.end.line < this.start.line || (this.start.line === this.end.line && this.end.column < this.start.column);
        },
        correct: function() {
            if (this.isInversed()) {
                var t = this.start;
                this.start = this.end;
                this.end = t;
            }
        },
        isset: function() {
            return this.start.line >= 0 && this.end.line >= 0;
        }
    };
    
    tracking = function() {};
    tracking.prototype = {
        '(': function(cp, key, details) {
            if (cp.options.highlightBrackets) {
                var c = details.isAfter, sec = key === '(' ? ')' : String.fromCharCode(key.charCodeAt(0)+2);
                
                this.eachCharacter(function(ch, line, column, cp) {
                    ch == key ? c++ : ch == sec && c--;
                    if (!c) {
                        var overlay = new Overlay(cp, 'cp-highlight-overlay', true),
                            pos0 = getPositionOf(cp, details.line, details.column-1),
                            pos1 = getPositionOf(cp, line, column-1),
                            span0 = createSpan(key, 'cp-highlight', pos0.y, pos0.x, ch.length * cp.sizes.charWidth, cp.sizes.lineHeight),
                            span1 = createSpan(ch, 'cp-highlight', pos1.y, pos1.x, ch.length * cp.sizes.charWidth, cp.sizes.lineHeight);
                        
                        overlay.node.append(span0, span1);
                        overlay.reveal();
                        return false;
                    }
                });
            }
        },
        ')': function(cp, key, details) {
            if (cp.options.highlightBrackets) {
                var c = details.isBefore, sec = key === ')' ? '(' : String.fromCharCode(key.charCodeAt(0)-2);
                
                this.eachCharacter(function(ch, line, column, cp) {
                    ch == key ? c++ : ch == sec && c--;
                    if (!c) {
                        var overlay = new Overlay(cp, 'cp-highlight-overlay', true),
                            pos0 = getPositionOf(cp, line, column-1),
                            pos1 = getPositionOf(cp, details.line, details.column-1),
                            span0 = createSpan(ch, 'cp-highlight', pos0.y, pos0.x, ch.length * cp.sizes.charWidth, cp.sizes.lineHeight),
                            span1 = createSpan(key, 'cp-highlight', pos1.y, pos1.x, ch.length * cp.sizes.charWidth, cp.sizes.lineHeight);
                        
                        overlay.node.append(span0, span1);
                        overlay.reveal();
                        return false;
                    }
                }, true);
            }
        }
    };
    tracking.prototype['{'] = tracking.prototype['['] = tracking.prototype['('];
    tracking.prototype['}'] = tracking.prototype[']'] = tracking.prototype[')'];
    
    extensions = {
        'js': 'javascript',
        'json': 'javascript',
        'javascript': 'javascript',
        'php': 'php',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'less': 'css',
        'h': 'c',
        'c': 'c',
        'cpp': 'c',
        'ruby': 'ruby',
        'rb': 'ruby'
    };
    
    eol = $.browser.windows ? '\r\n' : '\n';
    
    CodePrinter.requireMode = function(req, cb, del) {
        return $.scripts.require('CodePrinter.'+req.toLowerCase(), cb, del);
    };
    CodePrinter.defineMode = function(name, obj, req) {
        var m = (new CodePrinter.Mode()).extend(obj);
        m.init instanceof Function && m.init();
        $.scripts.define('CodePrinter.'+name.toLowerCase(), m, req);
    };
    CodePrinter.getMode = function(name) {
        return $.scripts.get('CodePrinter.'+name.toLowerCase());
    };
    CodePrinter.hasMode = function(name) {
        return $.scripts.has('CodePrinter.'+name.toLowerCase());
    };
    CodePrinter.registerExtension = function(ext, parserName) {
        extensions[ext.toLowerCase()] = parserName.toLowerCase();
    };
    
    var buildDOM = (function(){
        var m = div.cloneNode().addClass('codeprinter cp-animation'),
            c = div.cloneNode().addClass('cp-container'),
            w = div.cloneNode().addClass('cp-wrapper'),
            s = div.cloneNode().addClass('cp-screen'),
            l = div.cloneNode().addClass('cp-codelines');
        w.appendChild(div.cloneNode().addClass('cp-caret'));
        m.appendChild(document.createElement('textarea').addClass('cp-input'));
        l.appendChild(div.cloneNode().addClass('cp-fixer'));
        s.appendChild(l);
        w.appendChild(s);
        c.appendChild(w);
        m.appendChild(c);
        return function(cp) {
            cp.shortcuts = new shortcuts;
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
            cp.screen.fixer = cp.screen.element.firstChild;
        }
    })();
    function calculateCharDimensions(cp, text) {
        var h = 0, w = 0, cr,
            pre = pre_clone.cloneNode().addClass('cp-templine'),
            span = span_clone.cloneNode();
        
        text = text != null ? text : 'C';
        span.textContent = span.innerText = text;
        pre.appendChild(span);
        cp.screen.parent.appendChild(pre);
        cr = span.getBoundingClientRect();
        pre.parentNode.removeChild(pre);
        cp.sizes.charWidth = cr.width;
        cp.sizes.charHeight = cr.height;
        return cr;
    };
    function getPositionOf(cp, line, column)
    {
        return {
            x: cp.sizes.paddingLeft + column * cp.sizes.charWidth,
            y: cp.sizes.paddingTop + line * cp.sizes.lineHeight
        };
    };
    function createSpan(text, classes, top, left, width, height)
    {
        var s = span_clone.cloneNode().addClass(classes);
        s.textContent = text;
        s.style.extend({
            top: top + 'px',
            left: left + 'px',
            width: width + 'px',
            height: height + 'px'
        });
        return s;
    };
    function getDataLinePosition(line) {
        return [line % DATA_RATIO, (line - line % DATA_RATIO) % DATA_MASTER_RATIO / DATA_RATIO, (line - line % DATA_MASTER_RATIO) / DATA_MASTER_RATIO ];
    };
    function indentGrid(text, width) {
        var pos = text.search(/[^ ]/), tmp;
        pos == -1 && (pos = text.length); 
        tmp = [text.substring(0, pos), text.substr(pos)];
        tmp[0] = tmp[0].replace(new RegExp("( {"+ width +"})", "g"), '<span class="cpx-tab">$1</span>');
        return tmp[0] + tmp[1];
    };
    function swapLines(cp, line) {
        var spaces = cp.tabString()
        , x = cp.data.getLine(line).text.replace(/\t/g, spaces)
        , y = cp.data.getLine(line+1).text.replace(/\t/g, spaces);
        cp.caret.saveColumn();
        cp.caret.position(line+1, -1);
        cp.removeBeforeCursor(x + '\n' + y);
        cp.insertText(y + '\n' + x);
        cp.caret.restoreColumn();
    };
    function isCommandKey(e) {
        return ($.browser.macosx && e.metaKey) || (!$.browser.macosx && e.ctrlKey);
    };
    
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
    };
    
    return CodePrinter;
})(Selector);