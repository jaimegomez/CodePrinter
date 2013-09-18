/* CodePrinter - Main JavaScript Document */

"use strict";

window.CodePrinter = (function($) {
    
    $.scripts.registerNamespace('CodePrinter', 'mode/');
    
    var CodePrinter = function(object, options) {
        if (!(this instanceof CodePrinter)) {
            return new CodePrinter(object, options);
        }
        
        var self = this,
            mainElement = $(document.createElement('div')).addClass('codeprinter'),
            container = $(document.createElement('div')).addClass('cp-container'),
            wrapper = $(document.createElement('div')).addClass('cp-wrapper');
        
        self.options = {}.extend(CodePrinter.defaults, options, $.parseData(object.data('codeprinter'), ','));
        
        object.wrap(wrapper);
        wrapper.wrap(container);
        container.wrap(mainElement);
        
        self.mainElement = mainElement;
        self.container = container;
        self.wrapper = wrapper;
        self.source = object.addClass('cp-source');
        self.overlay = new Overlay(self);
        
        self.prepare();
        self.print();
        
        return self;
    };
    
    CodePrinter.version = '0.4.3';
    
    CodePrinter.defaults = {
        path: '',
        mode: 'javascript',
        theme: 'default',
        caretStyle: 'vertical',
        width: 'auto',
        height: 300,
        tabWidth: 4,
        fontSize: 11,
        lineHeight: 15,
        linesOutsideOfView: 12,
        caretBlinkSpeed: 300,
        autoScrollSpeed: 20,
        randomIDLength: 7,
        lineNumbers: true,
        infobar: false,
        infobarOnTop: true,
        showIndent: true,
        scrollable: true,
        highlightBrackets: false,
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
    
    CodePrinter.prototype = {}.extend({
        sizes: {},
        isFullscreen: false,
        prepare: function() {
            var self = this,
                source = self.source,
                overlay = self.overlay.element,
                options = self.options,
                sizes = self.sizes,
                id = $.random(options.randomIDLength);
            
            self.setTheme(options.theme);
            
            self.counter = new Counter(self);
            options.lineNumbers ? self.counter.show() : self.counter.hide();
            
            self.mainElement.attr({ id: id });
            self.id = id;
            
            options.fontSize != 11 && options.fontSize > 0 && overlay.add(source, self.counter.element).css({ fontSize: parseInt(options.fontSize) });
            options.lineHeight != 15 && options.lineHeight > 0 && (id = '#'+id+' .cp-') && $.stylesheet.insert(id+'overlay pre, '+id+'counter', 'line-height:'+options.lineHeight+'px;');
            options.width > 0 && self.mainElement.css({ width: parseInt(options.width) });
            options.height > 0 && self.wrapper.css({ height: parseInt(options.height) });
            self.measureSizes().clearSelection();
            self.activeLine = {};
            
            overlay.addClass('cp-'+options.mode.toLowerCase());
            self.data = new Data();
            source.tag() === 'textarea' && self.prepareWriter();
            self.data.init(source.value().replace(/\t/g, this.tabString()));
            
            options.showFinder && (this.finder = new Finder(self));
            self.infobar = new InfoBar(self);
            options.infobar ? self.infobar.show() : self.infobar.hide();
            
            self.caret.onclick = function(e) {
                var sl = this.scrollLeft,
                    st = this.scrollTop,
                    x = Math.max(0, sl + e.layerX - self.sizes.paddingLeft + 3),
                    y = e.layerY - self.sizes.paddingTop + overlay.css('margin-top'),
                    l = Math.min(Math.ceil(y / self.sizes.lineHeight), self.data.lines) - 1,
                    s = self.data.getLine(l).getElementText(),
                    c = Math.min(Math.floor(x / self.sizes.charWidth), s.length);
                
                if (e.type === 'mousedown') {
                    self.selection.startLine = l;
                    self.selection.startColumn = c;
                    return this;
                } else {
                    self.selection.endLine = l;
                    self.selection.endColumn = c;
                }
                
                self.caret.position(l, c).activate();
            };
            
            self.wrapper.on({
                scroll: function() {
                    self.counter.parent.current().scrollTop = this.scrollTop;
                    self.render();
                },
                mousedown: self.caret.onclick,
                mouseup: self.caret.onclick
            });
            
            if (options.highlightBrackets) {
                overlay.delegate('click', '.cp-bracket', function() {
                    overlay.find('.cp-highlight').removeClass('cp-highlight');
                    
                    var spans = overlay.find('span.cp-bracket'),
                        cls = this.hasClass('cp-curly') ? 'cp-curly' : this.hasClass('cp-round') ? 'cp-round' : this.hasClass('cp-square') ? 'cp-square' : false,
                        index = 0, j = 0, span;
                    
                    if (cls === false) {
                        return false;
                    }
                    spans = spans.filter('.'+cls);
                    
                    index = spans.indexOf(this);
                    if (index === -1) {
                        return false;
                    }
                    
                    if (this.hasClass('cp-open')) {
                        for (var i = index+1; i < spans.length; i++) {
                            span = spans.eq(i);
                            if (span.hasClass('cp-close')) {
                                if (j === 0) {
                                    span.addClass('cp-highlight');
                                    break;
                                } else {
                                    j--;
                                }
                            } else {
                                j++;
                            }
                        }
                    } else {
                        for (var i = index-1; i >= 0; i--) {
                            span = spans.eq(i);
                            if (span.hasClass('cp-open')) {
                                if (j === 0) {
                                    span.addClass('cp-highlight');
                                    break;
                                } else {
                                    j--;
                                }
                            } else {
                                j++;
                            }
                        }
                    }
                    this.addClass('cp-highlight');
                });
            }
        },
        prepareWriter: function() {
            var self = this,
                caret = new Caret(self);
            
            self.keydownMap = new keydownMap;
            self.keypressMap = new keypressMap;
            self.shortcuts = new shortcuts;
            
            self.input = $(document.createElement('textarea')).addClass('cp-input');
            self.mainElement.prepend(self.input);
            
            self.input.on({
                blur: function() {
                    caret.deactivate().hide();
                    self.unselectLine();
                },
                keydown: function(e) {
                    caret.deactivate().show();
                    
                    var k = e.keyCode ? e.keyCode : e.charCode ? e.charCode : 0;
                    if (e.ctrlKey && self.options.shortcuts && self.shortcuts[k]) {
                        self.shortcuts[k].call(self, e, this);
                        return e.cancel();
                    }
                    if (k >= 16 && k <= 20 || k >= 91 && k <= 95 || k >= 112 && k <= 145) {
                        return e.cancel();
                    } else {
                        return self.keydownMap.touch(k, self, e);
                    }
                },
                keypress: function(e) {
                    var k = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0,
                        ch = String.fromCharCode(k);
                    
                    if (!e.ctrlKey && !e.metaKey) {
                        self.keypressMap.touch(k, self, e, ch) !== false && self.insertText(ch);
                        self.emit('keypress:'+k, { code: k, char: ch, event: e });
                        this.value = '';
                        return e.cancel();
                    }
                },
                keyup: function(e) {
                    caret.activate();
                    
                    if (this.value.length) {
                        self.insertText(this.value);
                        this.value = '';
                    }
                }
            });
            
            caret.on({
                'text:changed': function() {
                    self.data.getLine(this.line()).setText(this.textAtCurrentLine());
                },
                'position:changed': function(x, y) {
                    self.input.focus();
                    if (self.options.autoScroll) {
                        var wrapper = self.wrapper.item(),
                            sL = wrapper.scrollLeft, sT = wrapper.scrollTop,
                            cW = sL + wrapper.clientWidth, cH = sT + wrapper.clientHeight,
                            ix = wrapper.clientWidth / 4, iy = wrapper.clientHeight / 4;
                        
                        x = x + ix > cW ? sL + x + ix - cW : x - ix < sL ? x - ix : sL;
                        y = y + iy > cH ? sT + y + iy - cH : y - iy < sT ? y - iy : sT;
                        
                        self.wrapper.scrollTo(x, y, self.options.autoScrollSpeed);
                    }
                },
                'line:changed': function(e) {
                    if (self.options.highlightCurrentLine) {
                        self.selectLine(e.current);
                    }
                }
            });
            
            self.data.on({
                'text:changed': function(e) {
                    self.parse(e.dataLine);
                }
            });
            
            self.caret = caret;
            self.isWritable = true;
        },
        measureSizes: function() {
            var sizes = this.sizes,
                ov = this.overlay.element;
            
            sizes.lineHeight = this.options.lineHeight;
            sizes.paddingTop = ov.css('paddingTop');
            sizes.paddingLeft = ov.css('paddingLeft');
            sizes.charWidth = getTextSize(this).width;
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
            this.unselectLine();
            this.activeLine.pre = this.data.getLine(l).getElement().addClass('cp-activeLine');
            this.activeLine.li = this.counter.list.filter(function(item) { return item.innerHTML == l+1; }).addClass('cp-activeLine');
        },
        getSourceValue: function() {
            var value = this.isWritable ? this.source.value() : decodeEntities(this.source.html());
            return value.replace(/\t/g, this.tabString());
        },
        print: function(mode) {
            if (!mode) {
                mode = this.options.mode;
            }
            var self = this,
                sT = document.body.scrollTop,
                sL = document.body.scrollLeft,
                h = CodePrinter.hasMode(mode);
            
            CodePrinter.requireMode(mode, function(ModeObject) {
                self.defineParser(ModeObject);
                self.render();
                
                document.body.scrollTop = sT;
                document.body.scrollLeft = sL;
            }, this);
        },
        forcePrint: function() {
            this.stream = null;
            this.print();
        },
        render: function() {
            var overlay = this.overlay,
                wst = this.wrapper.scrollTop(),
                wch = this.wrapper.clientHeight(),
                lh = this.sizes.lineHeight,
                lv = parseInt(this.options.linesOutsideOfView),
                x = Math.min(Math.ceil(wch / lh) + lv + (wst > 2 * lh ? lv : 0), this.data.lines-1),
                i = overlay.lastLine - overlay.firstLine;
            
            overlay.element.item().style.height = (this.data.lines * lh) + 'px';
            
            if (i < x) {
                for (; i < x; i++) {
                    overlay.insert();
                    this.parse(overlay.lastLine);
                }
                this.source.item().style.display = 'none';
            } else {
                x = Math.ceil((wst - parseInt(overlay.element.getStyle('margin-top'))) / lh);
                
                while (x > lv) {
                    overlay.shift();
                    x--;
                }
                while (x < lv) {
                    overlay.unshift();
                    x++;
                }
            }
        },
        defineParser: function(parser) {
            if (parser instanceof CodePrinter.Mode) {
                this.parser = parser;
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
                    var tmp = line, p,
                        stream = new Stream(dl.text);
                    
                    stream.getNextLine = function() {
                        var nl = data.getLine(++tmp);
                        if (nl) {
                            nl.setStartPoint(dl);
                            this.value.push(nl.text);
                        }
                        return this;
                    };
                
                    var p = this.parser.fn(stream).parsed;
                    for (var i = 0; i < p.length; i++) {
                        p[i] = this.options.showIndent ? indentGrid(p[i], this.options.tabWidth) : p[i];
                        data.getLine(line+i).setParsed(p[i]);
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
            $.require(this.options.path+'theme/'+style+'.css', callback);
        },
        tabString: function() {
            return Array(this.options.tabWidth+1).join(' ');
        },
        setTheme: function(name) {
            typeof name === 'string' && name !== 'default' ? this.requireStyle(name) : name = 'default';
            name = name.toLowerCase().replace(' ', '-');
            this.theme ? this.mainElement.removeClass('cps-'+this.theme) : 0;
            this.mainElement.addClass('cps-'+name);
            this.theme = name;
        },
        getCurrentLine: function() {
            return this.caret.line();
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
            var ov = this.overlay,
                dl = this.data.addLine(l, ''),
                pre = dl.getElement(),
                q = l - ov.firstLine;
            
            if (q >= 0 && l <= ov.lastLine+1) {
                q === 0 ? ov.element.prepend(pre) : ov.lines.eq(q-1).after(pre);
                ov.lines.splice(q, 0, pre);
                ov.lastLine++;
                this.counter.increase();
            }
            return this;
        },
        removeLine: function(l) {
            l == null && (l = this.caret.line());
            var ov = this.overlay,
                q = l - ov.firstLine;
            
            this.data.removeLine(l);
            
            if (q >= 0 && l <= ov.lastLine) {
                ov.lines.get(q).remove(true);
                ov.lastLine--;
                this.counter.decrease();
            }
            return this;
        },
        removeBeforeCursor: function(arg) {
            var bf = this.caret.textBefore();
            if (typeof arg === 'string') {
                var l = bf.length - arg.length;
                if (bf.lastIndexOf(arg) === l) {
                    this.caret.setTextBefore(bf.substring(0, l));
                }
            } else if (typeof arg === 'number') {
                if (arg <= bf.length) {
                    this.caret.setTextBefore(bf.substring(0, bf.length - arg));
                } else {
                    var af = this.caret.textAfter(),
                        l = this.caret.line();
                    
                    while (arg > bf.length && l-1 >= 0) {
                        this.removeLine();
                        arg = arg - bf.length - 1;
                        bf = this.caret.position(--l, -1).textBefore();
                    }
                    this.caret.setTextAtCurrentLine(bf.substring(0, bf.length - arg), af);
                }
            }
        },
        removeAfterCursor: function(arg) {
            var af = this.caret.textAfter();
            if (typeof arg === 'string') {
                if (af.indexOf(arg) === 0) {
                    this.caret.setTextAfter(af.substr(arg.length));
                }
            } else if (typeof arg === 'number') {
                if (arg <= af.length) {
                    this.caret.setTextAfter(af.substr(arg));
                } else {
                    var bf = this.caret.textBefore(),
                        l = this.caret.line();
                    
                    while (arg > af.length && l+1 < this.data.lines) {
                        this.caret.setTextAfter('');
                        arg = arg - af.length;
                        af = this.data.getTextAtLine(l+1);
                        this.removeLine(l+1);
                    }
                    this.caret.setTextAtCurrentLine(bf, af.substr(arg));
                }
            }
        },
        getSelection: function() {
            var s = this.selection;
            
            if (s.startLine >= 0 && s.endLine >= 0) {
                if (s.startLine != s.endLine) {
                    var t, max, min = Math.min(s.startLine, s.endLine);
                    
                    if (min !== s.startLine) {
                        max = s.startLine;
                        var c = s.endColumn;
                        s.endColumn = s.startColumn;
                        s.startColumn = c;
                    } else {
                        max = s.endLine;
                    }
                    t = this.data.getTextAtLine(min).substr(s.startColumn) + eol
                    for (var i = min+1; i < max; i++) {
                        t = t + this.data.getTextAtLine(i) + eol;
                    }
                    return t + this.data.getTextAtLine(max).substring(0, s.endColumn);
                } else {
                    return this.data.getTextAtLine(s.startLine).substring(s.startColumn, s.endColumn);
                }
            }
            return false;
        },
        clearSelection: function() {
            this.selection = {};
            return this;
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
                main.addClass('cp-fullscreen').css({ margin: [-b.style.paddingTop, -b.style.paddingRight, -b.style.paddingBottom, -b.style.paddingLeft, ''].join('px ') });
                main.after(this.tempnode).appendTo(document.body);
                this.source.focus();
                this.isFullscreen = true;
            }
        },
        exitFullscreen: function() {
            if (this.isFullscreen && this.tempnode) {
                var tmp = this.tempnode;
                this.mainElement.removeClass('cp-fullscreen').css({ margin: null }).insertBefore(tmp);
                tmp.parentNode.removeChild(tmp);
                delete this.tempnode;
                this.source.focus();
                this.isFullscreen = false;
            }
        }
    });
    
    var Data = function() {
        return this;
    };
    Data.prototype = [].extend({
        lines: 0,
        init: function(value) {
            var i = 0, j = -1, c, r,
                pos = value.indexOf(eol);
            
            pos === -1 && (pos = value.length);
            
            do {
                this.addLine(i, value.substring(0, pos));
                value = value.substr(pos + eol.length);
                i++;
            } while ((pos = value.indexOf(eol)) !== -1);
            this.addLine(i, value);
            return this;
        },
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
            
            if (b.length > 10) {
                var r;
                while ((r = b.splice(10, b.length - 10)) && r.length > 0) {
                    t === 9 && (t = -1) && h++;
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
                if (b[u].pre && b[u].pre.parentNode) {
                    b[u].pre.parentNode.removeChild(b[u].pre);
                }
                var dl = b.splice(u, 1);
                this.lines--;
                this.emit('line:removed', { dataLine: dl[0], line: line });
                
                if (b.length === 9) {
                    var n, r;
                    
                    t === 9 && (t = -1) && h++;
                    n = this[h][++t];
                    
                    while (n) {
                        r = n.shift();
                        b.push(r);
                        b = n;
                        t === 9 && (t = -1) && h++;
                        n = this[h][++t];
                    }
                }
            }
        },
        getLine: function(line) {
            if (typeof line === 'number') {
                var p = getDataLinePosition(line);
                return this[p[2]][p[1]][p[0]] || null;
            }
        },
        getTextAtLine: function(line) {
            var l = this.getLine(line);
            return l ? l.text : false;
        },
        count: function() {
            var h = this.length, t;
            t = this[--h].length - 1;
            return parseInt(''+ h + t + (this[h][t].length - 1));
        },
        indexOf: function(dl) {
            var h = 0, d = 0, i = -1;
            for (; h < this.length; h++) {
                for (; d < this[h].length; d++) {
                    if ((i = this[h][d].indexOf(dl)) !== -1) {
                        return h * 100 + d * 10 + i;
                    }
                }
            }
            return i;
        },
        toString: function() {
            var r = [], h = 0, t = 0, i = 0;
            for (; h < this.length; h++) {
                for (; t < this[h].length; t++) {
                    r.push.apply(r, $(this[h][t]).map('text'));
                }
            }
            return r.join(eol);
        }
    });
    
    var pre_clone = document.createElement('pre');
    
    var DataLine = function(parent) {
        this.extend({
            setText: function(str) {
                if (this.text !== str) {
                    this.text = str;
                    this.changed = true;
                    parent.emit('text:changed', { dataLine: this });
                }
            },
            setParsed: function(str) {
                if (this.parsed !== str) {
                    this.parsed = str;
                    this.changed = false;
                    this.getElement() && (this.pre.innerHTML = str || ' ');
                    parent.emit('parsed:changed', { dataLine: this });
                }
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
        getElement: function() {
            if (!this.pre) {
                this.pre = pre_clone.cloneNode(false);
                this.pre.innerHTML = this.parsed || this.text || ' ';
            }
            return this.pre;
        },
        getElementText: function() {
            if (this.pre) {
                var tc = this.pre.textContent != null ? this.pre.textContent : this.pre.innerText;
                return tc === ' ' && this.text === '' ? '' : tc;
            }
            return false;
        }
    };
    
    var Caret = function(cp) {
        var line, column, before, after;
        
        this.element = $(document.createElement('div')).addClass('cp-caret cp-caret-'+cp.options.caretStyle);
        this.root = cp;
        cp.wrapper.append(this.element);
        
        return this.extend({
            setTextBefore: function(str) {
                if (before != str) {
                    before = str;
                    this.emit('text:changed');
                    this.position(line, str.length);
                }
                return this;
            },
            setTextAfter: function(str) {
                if (after != str) {
                    after = str;
                    this.emit('text:changed');
                }
                return this;
            },
            setTextAtCurrentLine: function(bf, af) {
                if (before != bf || after != af) {
                    before = bf;
                    after = af;
                    this.emit('text:changed');
                    this.position(line, bf.length);
                }
                return this;
            },
            textBefore: function() {
                return before;
            },
            textAfter: function() {
                return after;
            },
            textAtCurrentLine: function() {
                return before + after;
            },
            position: function(l, c, t) {
                if (l == null && c == null) {
                    return { line: line + 1, column: before.length + 1 };
                } else {
                    typeof l !== 'number' && (l = line);
                    l = Math.max(Math.min(l, cp.data.lines), 0);
                    typeof t !== 'string' && (t = cp.data.getLine(l).getElementText());
                    typeof c !== 'number' && (c = column);
                    c < 0 && (c = t.length + c + 1);
                    
                    var x = getTextSize(cp, t.substring(0, c)).width,
                        y = cp.sizes.lineHeight * l;
                    
                    if (line != l) {
                        this.emit('line:changed', { current: l, last: line });
                        line = l;
                    }
                    if (column != c) {
                        this.emit('column:changed', { current: c, last: column });
                        column = c;
                    }
                    
                    before = t.substring(0, c);
                    after = t.substr(c);
                    cp.selectLine(l);
                    
                    return this.setPixelPosition(x, y);
                }
                return this;
            },
            moveX: function(mv) {
                var abs, l, t, cl = line;
                
                mv >= 0 || cl === 0 ? (abs = mv) && (t = after) : (abs = Math.abs(mv)) && (t = before);
                
                if (abs <= t.length) {
                    return this.position(cl, Math.max(0, Math.min((before + after).length, column + mv)));
                }
                while (abs > t.length) {
                    abs = abs - t.length - 1;
                    cl = cl + (mv > 0) - (mv < 0);
                    l = cp.data.getLine(cl);
                    if (l) {
                        t = l.getElementText();
                    } else {
                        mv >= 0 ? --cl : cl = 0;
                        abs = 0;
                        break;
                    }
                }
                return this.position(cl, mv >= 0 ? abs : t.length - abs, t);
            },
            moveY: function(mv) {
                mv = line + mv;
                mv = mv < 0 ? 0 : mv > this.root.data.lines ? this.root.data.lines : mv;
                return this.position(mv, column);
            },
            line: function() {
                return line;
            },
            column: function() {
                return before.length;
            }
        });
    };
    Caret.styles = {
        underline: function(css, pos) {
            css.width = getTextSize(this, this.textBeforeCursor(1)).width + 2;
            css.height = 1;
            css.top = css.top + this.sizes.lineHeight - 1;
            css.left = css.left - 1;
            return css;
        },
        block: function(css, pos) {
            css.width = getTextSize(this, this.textBeforeCursor(1)).width;
            css.height = this.sizes.lineHeight;
            return css;
        }
    };
    Caret.prototype = {
        show: function() {
            this.element.show();
            return this;
        },
        hide: function() {
            this.element.hide();
            return this;
        },
        activate: function() {
            if (this.root.options.blinkCaret) {
                var elm = this.element, a = false;
                this.interval = clearInterval(this.interval) || setInterval(function() {
                    a === true ? elm.hide() : elm.show();
                    a = !a;
                }, this.root.options.caretBlinkSpeed);
            }
            return this;
        },
        deactivate: function() {
            this.interval && (this.interval = clearInterval(this.interval));
            return this;
        },
        setPixelPosition: function(x, y) {
            var css = {},
                stl = this.style || this.root.options.caretStyle;
            
            x >= 0 && (css.left = x + this.root.sizes.paddingLeft - 1);
            y >= 0 && (css.top = y + this.root.sizes.paddingTop);
            
            Caret.styles[stl] instanceof Function ? css = Caret.styles[stl].call(this.root, css) : css.height = this.root.sizes.lineHeight;
            this.element.css(css);
            this.emit('position:changed', x, y);
            return this;
        },
        move: function(x, y) {
            x && this.moveX(x);
            y && this.moveY(y);
            return this;
        }
    };
    
    var Overlay = function(cp) {
        var self = this;
        this.element = $(document.createElement('div')).addClass('cp-overlay');
        this.lines = $([]);
        this.root = cp;
        cp.wrapper.append(this.element);
        
        return this;
    };
    Overlay.prototype = {
        firstLine: 0,
        lastLine: -1,
        insert: function() {
            var pre = this.root.data.getLine(++this.lastLine).getElement();
            this.lines.push(pre);
            this.element.append(pre);
            this.root.counter.increase();
        },
        splice: function(dl, i) {
            if (dl instanceof DataLine && i >= this.firstLine && i <= this.lastLine) {
                var pre = dl.getElement(),
                    q = i - this.firstLine;
                this.lines.splice(q, 0, pre);
                q === 0 ? this.element.prepend(pre) : this.lines.eq(q-1).after(pre);
            }
        },
        shift: function() {
            if (this.lastLine + 1 < this.root.data.lines) {
                var pre = this.root.data.getLine(++this.lastLine).getElement();
                this.lines.get(0).remove(true).push(pre);
                this.element.append(pre).css({ marginTop: '++' + this.root.sizes.lineHeight });
                this.firstLine++;
                this.root.parse(this.lastLine);
                this.root.counter.shift();
            }
        },
        unshift: function() {
            if (this.firstLine - 1 >= 0) {
                var pre = this.root.data.getLine(--this.firstLine).getElement();
                this.lines.get(-1).remove(true).unshift(pre);
                this.element.prepend(pre).css({ marginTop: '--' + this.root.sizes.lineHeight });
                this.lastLine--;
                this.root.parse(this.firstLine);
                this.root.counter.unshift();
            }
        }
    };
    
    var li_clone = document.createElement('li');
    
    var Counter = function(cp) {
        var self = this;
        self.element = $(document.createElement('ol'));
        self.parent = $(document.createElement('div')).addClass('cp-counter').append(self.element);
        self.list = $([]);
        self.root = cp;
        cp.container.prepend(self.parent);
        
        this.element.delegate('mousedown', 'li', function() {
            var index = parseInt(this.innerHTML) + 1;
            cp.selectLine(index);
        });
        
        return this;
    };
    Counter.prototype = {
        increase: function() {
            var li = li_clone.cloneNode(false);
            li.innerHTML = this.list.length > 0 ? parseInt(this.list.item(-1).innerHTML) + 1 : 1;
            this.list.push(li);
            this.element.append(li);
        },
        decrease: function() {
            this.list.get(-1).remove(true);
        },
        shift: function() {
            var fi = this.list.item(0),
                c = parseInt(fi.innerHTML) + this.list.length;
            
            fi.innerHTML = c;
            this.root.options.highlightCurrentLine && (c === this.root.caret.line() + 1 ? fi.addClass('cp-activeLine') : fi.removeClass('cp-activeLine'));
            this.element.append(fi);
            this.list.get(0).remove(true).push(fi);
            this.element.append(fi).css({ marginTop: '++' + this.root.sizes.lineHeight });
        },
        unshift: function() {
            var la = this.list.item(-1),
                c = parseInt(la.innerHTML) - this.list.length;
            
            la.innerHTML = c;
            this.root.options.highlightCurrentLine && (c === this.root.caret.line() + 1 ? la.addClass('cp-activeLine') : la.removeClass('cp-activeLine'));
            this.element.prepend(la);
            this.list.get(-1).remove(true).unshift(la);
            this.element.prepend(la).css({ marginTop: '--' + this.root.sizes.lineHeight });
        },
        show: function() {
            this.root.container.prepend(this.parent);
            this.root.wrapper.css({ marginLeft: this.parent.offsetWidth() });
        },
        hide: function() {
            this.parent.remove();
            this.root.wrapper.css({ marginLeft: 0 });
        }
    };
    
    var InfoBar = function(cp) {
        var mode = $(document.createElement('span')).addClass('cp-mode').html(cp.options.mode),
            act = $(document.createElement('span')).addClass('cp-actions'),
            ch = $(document.createElement('span')).addClass('cp-characters');
        
        this.element = $(document.createElement('div')).addClass('cp-infobar').append(mode, act, ch);
        this.element.actions = act;
        this.element.characters = ch;
        this.root = cp;
        
        this.actions = {
            plaintext: {
                func: function() {
                    var newWindow = window.open('', '_blank');
                    newWindow.document.writeln('<pre style="font-size:14px;">' + encodeEntities(cp.data.toString()) + '</pre>');
                }
            }
        };
        
        for (var k in this.actions) {
            this.addAction(k, this.actions[k].func, this.actions[k].text);
        }
        
        if (cp.caret) {
            cp.caret.on({
                'position:changed': function() {
                    ch.html('Line ' + (this.line()+1) + ', Column ' + (this.textBefore().length+1));
                }
            })
        }
        
        return this;
    };
    InfoBar.prototype = {
        addAction: function(name, func, text) {
            if (this.actions[name] && this.actions[name].element) {
                this.actions[name].element.off('click', this.actions[name].func);
            }
            var el = $(document.createElement('a')).addClass('cp-'+name).html(typeof text === 'string' ? text : name);
            el.on('click', func).appendTo(this.element.actions);
            this.actions[name] = {
                func: func,
                element: el
            };
            return el;
        },
        show: function() {
            var r = this.root;
            r.options.infobarOnTop ? this.element.prependTo(r.mainElement) : this.element.appendTo(r.mainElement);
        },
        hide: function() {
            this.element.remove();
        }
    };
    
    var Finder = function(cp) {
        var self = this,
            findnext = $(document.createElement('button')).addClass('cpf-button cpf-findnext').html('Next'),
            findprev = $(document.createElement('button')).addClass('cpf-button cpf-findprev').html('Prev'),
            closebutton = $(document.createElement('button')).addClass('cpf-button cpf-close').html('Close'),
            leftbox = $(document.createElement('div')).addClass('cpf-leftbox'),
            flexbox = $(document.createElement('div')).addClass('cpf-flexbox'),
            input = $(document.createElement('input')).addClass('cpf-input').attr({ type: 'text' }),
            bar = $(document.createElement('div')).addClass('cpf-bar').append(leftbox.append(closebutton, findprev, findnext), flexbox.append(input)),
            overlay = $(document.createElement('div')).addClass('cp-overlay cpf-overlay'),
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
        
        cp.mainElement.append(bar);
        
        input.on({ keydown: function(e) {
            var k = e.keyCode ? e.keyCode : e.charCode ? e.charCode : 0;
            return keyMap[k] ? (keyMap[k].call(this) && e.cancel()) : true;
        }, keyup: function(e) {
            cp.options.searchOnTheFly && this.value !== self.searched ? self.find(this.value) : 0;
        }});
        findnext.on({ click: function(e) { self.next(); }});
        findprev.on({ click: function(e) { self.prev(); }});
        closebutton.on({ click: function(e) { self.close(); }});
        overlay.delegate('click', 'span', function() {
            var index = self.searchResults.indexOf(this)+1;
            if (index !== 0) {
                var v = cp.getSourceValue(),
                    f = this.textContent || this.innerText,
                    c = 0, i = 0;
                
                while (c < index && (i = v.indexOf(f, i)+1)){
                    c++;
                }
                cp.setSelection(i-1, i-1+f.length);
                this.style.display = 'none';
            }
        });
        cp.source.on({
            keyup: function() {
                if (!self.isClosed && self.searched) {
                    self.reload();
                }
            }
        });
        
        self.displayValue = bar.css('display');
        self.root = cp;
        self.input = input;
        self.bar = bar;
        self.overlay = overlay;
        self.searchResults = $([]);
        self.open();
        
        return self;
    };
    Finder.prototype = {
        isClosed: false,
        open: function() {
            this.isClosed = false;
            this.clear();
            this.bar.show(this.displayValue);
            this.input.focus();
        },
        close: function() {
            this.isClosed = true;
            this.bar.hide();
            this.overlay.remove();
            this.root.source.focus();
        },
        clear: function() {
            this.searched = null;
            this.searchResults.length = 0;
            this.overlay.html('').appendTo(this.root.wrapper);
        },
        push: function(span) {
            this.searchResults.push(span.item());
            this.overlay.append(span);
        },
        find: function(find) {
            var root = this.root,
                value = root.getSourceValue(),
                pdx = root.source.total('paddingLeft', 'borderLeftWidth'),
                pdy = root.source.total('paddingTop', 'borderTopWidth'),
                index, line = 0, ln = 0, last, bf;
            
            find = find || this.input.value();
            this.clear();
            
            if (find) {
                while ((index = value.indexOf(find)) !== -1) {
                    var span = $(document.createElement('span')).addClass('cpf-occurrence').text(find);
                    bf = value.substring(0, index);
                    line += bf.split('\n').length-1;
                    last = bf.lastIndexOf('\n')+1;
                    ln = last > 0 ? index - last : ln + index;
                    bf = root.data.getTextAtLine(line).substring(0, ln);
                    ln = bf.length + find.length;
                    span.css(getTextSize(root, find).extend({ top: pdy + line * root.sizes.lineHeight, left: pdx + getTextSize(root, bf).width }));
                    this.push(span);
                    value = value.substr(index+find.length);
                }
                this.searched = find;
                this.searchResults.removeClass('active').get(0).addClass('active');
            }
        },
        reload: function() {
            return this.find(this.searched);
        },
        next: function() {
            this.searchResults.length > 0 ? this.searchResults.removeClass('active').getNext().addClass('active') : this.find();
        },
        prev: function() {
            this.searchResults.length > 0 ? this.searchResults.removeClass('active').getPrev().addClass('active') : this.find();
        }
    };
    
    var Stream = function(value) {
        if (!(this instanceof Stream)) {
            return new Stream();
        }
        this.value = value instanceof Array ? value : typeof value === 'string' ? [value] : [];
        this.parsed = [];
        return this;
    };
    Stream.prototype = {
        found: '',
        eaten: '',
        row: 0,
        pos: 0,
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
                        this.pos = 0;
                        
                        while (this.getNextLine()) {
                            this.row++;
                            str2 = this.current();
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
                            }
                        }
                        this.row--;
                        this.pos = pos + str2.length;
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
                    txt = encodeEntities(txt);
                    fn instanceof Function && (txt = fn.call(txt, suffix));
                    return '<span class="'+suffix+'">' + txt + '</span>';
                };
            
            suffix = (suffix instanceof Array) ? suffix.slice(0) : [suffix];
            
            for (i = 0; i < suffix.length; i++) {
                suffix[i] = 'cp-'+suffix[i];
            }
            suffix = suffix.join(' ');
            
            tmp.length > 1 && (this.row = this.row - tmp.length + 1);
            i = 0;
            
            while (true) {
                this.append(tmp[i] ? span(tmp[i]) : '');
                if (++i < tmp.length) {
                    this.parsed[++this.row] = '';
                } else {
                    break;
                }
            }
            return this.reset();
        },
        append: function(txt) {
            if (typeof txt === 'string') {
                if (typeof this.parsed[this.row] !== 'string') {
                    this.parsed[this.row] = txt;
                } else {
                    this.parsed[this.row] = this.parsed[this.row] + txt;
                }
            }
        },
        push: function() {
            var e = this.eaten;
            if (e.length) {
                for (var i = this.row - e.length + 1, j = 0; j < e.length; i++, j++) {
                    if (this.parsed[i] == null) {
                        this.parsed[i] = '';
                    }
                    this.parsed[i] += encodeEntities(e[j]);
                }
            }
        },
        createSubstream: function() {
            var e = this.eaten,
                sr = this.row - e.length + 1,
                ss = {
                    startRow: sr,
                    startPosition: this.parsed[sr].length,
                    endPosition: encodeEntities(e[e.length-1]).length,
                    rows: e
                };
            e.length === 1 && (ss.endPosition = ss.endPosition + ss.startPosition);
            this.push();
            return ss;
        },
        parseSubstream: function(ss, parser) {
            if (ss) {
                var i = 0,
                    sr = ss.startRow,
                    content = parser.parse(ss.rows).parsed;
                
                if (content[i]) {
                    if (content.length > 1) {
                        this.parsed[sr] = this.parsed[sr].substring(0, ss.startPosition) + content[i];
                        for (i = 1; i < content.length-1; i++) {
                            this.parsed[sr+i] = content[i];
                        }
                        this.parsed[sr+i] = content[i] + (this.parsed[sr+i] ? this.parsed[sr+i].substr(ss.endPosition) : '');
                    } else {
                        this.parsed[sr] = this.parsed[sr].substring(0, ss.startPosition) + content[i] + this.parsed[sr].substr(ss.endPosition);
                    }
                }
                this.emit('substream:parsed', { substream: ss });
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
            var bf = this.before(), t;
            return s instanceof RegExp ? s.test(bf) : (t = bf.trim()) && t.lastIndexOf(s) === t.length - s.length;
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
            this.eaten = [];
            return this;
        },
        tear: function() {
            this.append(this.current().substr(this.pos));
            this.forward();
        },
        skip: function(found) {
            var str = this.current().substr(this.pos);
            found = found || this.found;
            if (found && str.indexOf(found) === 0) {
                this.append(found);
                this.pos = this.pos + found.length;
                this.found = false;
            }
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
            return $.browser.windows ? this.parsed.join('\r\n') : this.parsed.join('\n');
        }
    };
    
    CodePrinter.Mode = function() {
        if (!(this instanceof CodePrinter.Mode)) {
            return new CodePrinter.Mode();
        }
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
            '-': 'minus',
            '+': 'plus',
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
            return stream;
        }
    };
    
    var keydownMap = function() {};
    keydownMap.prototype = {
        touch: function(code, self, event) {
            if (this[code]) {
                return this[code].call(self, event, code);
            }
        },
        8: function(e) {
            var t = this.caret.textBefore(),
                m = t.match(/ +$/),
                r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? this.tabString() : 1;
            
            this.removeBeforeCursor(r);
            return e.cancel();
        },
        9: function(e) {
            this.insertText(this.tabString());
            return e.cancel();
        },
        13: function(e) {
            var t = this.caret.textBefore().match(/^ +/),
                a = '\n' + (this.options.indentNewLines && t && t[0] ? t[0] : '');
            
            if (this.textBeforeCursor(1) === '{') {
                this.insertText(a + this.tabString());
                this.textAfterCursor(1) === '}' && this.insertText(a, -a.length);
            } else {
                this.insertText(a);
            }
            return e.cancel();
        },
        27: function(e) {
            return e.cancel();
        },
        37: function() {
            this.caret.moveX(-1);
        },
        38: function() {
            this.caret.moveY(-1);
        },
        39: function() {
            this.caret.moveX(1);
        },
        40: function() {
            this.caret.moveY(1);
        },
        46: function(e) {
            var t = this.caret.textAfter(),
                m = t.match(/^ +/),
                r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? this.tabString() : 1;
            
            this.removeAfterCursor(r);
            return e.cancel();
        }
    };
    
    var keypressMap = function() {};
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
    
    var shortcuts = function() {};
    shortcuts.prototype = {
        37: function() {
            this.wrapper.item().scrollLeft = 0;
        },
        38: function() {
            this.wrapper.item().scrollTop = 0;
            this.caret.position(0, 0);
        },
        39: function() {
            var w = this.wrapper.item();
            w.scrollLeft = w.scrollWidth;
        },
        40: function() {
            var w = this.wrapper.item();
            w.scrollTop = w.scrollHeight;
            this.caret.position(this.data.lines - 1, -1);
        },
        70: function(e) {
            if (e.shiftKey) {
                this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
            } else {
                this.finder ? this.finder.isClosed ? this.finder.open() : this.finder.input.focus() : this.finder = new Finder(this);
            }
        },
        73: function() {
            this.infobar.element.item().parentNode == null ? this.infobar.show() : this.infobar.hide();
        },
        78: function() {
            this.counter.parent.item().parentNode == null ? this.counter.show() : this.counter.hide();
        },
        82: function() {
            this.forcePrint();
        }
    };
    
    var eol = $.browser.windows ? '\r\n' : '\n';
    
    CodePrinter.requireMode = function(req, cb, del) {
        return $.scripts.require('CodePrinter.'+req, cb, del);
    };
    CodePrinter.defineMode = function(name, obj) {
        $.scripts.define('CodePrinter.'+name, (new CodePrinter.Mode()).extend(obj));
    };
    CodePrinter.getMode = function(name) {
        return $.scripts.get('CodePrinter.'+name);
    };
    CodePrinter.hasMode = function(name) {
        return $.scripts.has('CodePrinter.'+name);
    };
    
    function getTextSize(cp, text) {
        var h = 0, w = 0, cr,
            pre = document.createElement('pre').addClass('cp-templine'),
            span = document.createElement('span');
        
        text = text != null ? text : 'C';
        span.textContent = span.innerText = text;
        pre.appendChild(span);
        cp.overlay.parent.item().appendChild(pre);
        cr = span.getBoundingClientRect();
        pre.parentNode.removeChild(pre);
        return cr;
    };
    function getDataLinePosition(line) {
        return [line % 10, (line - line % 10) % 100 / 10, (line - line % 100) / 100 ];
    };
    function insertAfter(node, newNode) {
        node.parentNode.insertBefore(newNode, node.nextSibling);
    };
    function decodeEntities(text) {
        var d = document.createElement('div');
        d.innerHTML = text;
        return d.innerText || d.textContent;
    };
    function encodeEntities(text) {
        return text ? text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
    };
    function indentGrid(text, width) {
        var pos = text.search(/[^\s]/);
        if(pos == -1) pos = text.length;
        var tmp = [ text.substring(0, pos), text.substr(pos) ];
        tmp[0] = tmp[0].replace(new RegExp("(\\s{"+ width +"})", "g"), '<span class="cp-tab">$1</span>');
        return tmp[0] + tmp[1];
    };
    
    $.prototype.CodePrinter = function(opt) {
        var c;
        if ((c = this.current()) && c.CodePrinter) {
            return c.CodePrinter;
        } else {
            $.each(this, function(n) {
                n.CodePrinter = new CodePrinter(this, opt);
            });
        }
        return this;
    };
    
    return CodePrinter;
})(Selector);