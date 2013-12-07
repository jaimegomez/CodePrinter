/* CodePrinter - Main JavaScript Document */

"use strict";

window.CodePrinter = (function($) {
    
    var CodePrinter, Data, DataLine, Caret,
        Screen, Counter, InfoBar, Finder, Stream,
        keydownMap, keypressMap, shortcuts, commands,
        selection, eol, li_clone, pre_clone, selection_span,
        DATA_RATIO = 10,
        DATA_MASTER_RATIO = 100;
    
    $.scripts.registerNamespace('CodePrinter', 'mode/');
    
    CodePrinter = function(element, options) {
        if (!(this instanceof CodePrinter)) {
            return new CodePrinter(element, options);
        }
        
        var self = this, screen, sizes, data, id, d, pr;
        
        self.keydownMap = new keydownMap;
        self.keypressMap = new keypressMap;
        self.shortcuts = new shortcuts;
        self.selection = new selection;
        
        options = self.options = {}.extend(CodePrinter.defaults, options);
        
        self.caret = new Caret(self);
        buildDOM(self);
        self.mainElement.codeprinter = self;
        
        self.data = new Data();
        self.screen = new Screen(self);
        self.activeLine = {};
        self.sizes = {};
        
        if (element.nodeType) {
            element.before(self.mainElement);
            options.extend($.parseData(element.data('codeprinter'), ','));
            data = element.tagName.toLowerCase() === 'textarea' ? element.value : decodeEntities(element.innerHTML);
            element.parentNode.removeChild(element);
        } else if (typeof element === 'string') {
            data = decodeEntities(element);
            options.appendTo && options.appendTo.append(self.mainElement);
        } else {
            return false;
        }
        
        screen = self.screen.element.addClass('cp-'+options.mode.toLowerCase());
        sizes = self.sizes;
        id = $.random(options.randomIDLength);
        
        self.setTheme(options.theme);
        self.mainElement.id = id;
        
        options.lineNumbers && self.openCounter();
        options.infobar && self.openInfobar();
        options.showFinder && self.openFinder();
        
        options.fontSize != 11 && options.fontSize > 0 && (screen.style.fontSize = parseInt(options.fontSize) + 'px');
        options.lineHeight != 15 && options.lineHeight > 0 && (id = '#'+id+' .cp-') && $.stylesheet.insert(id+'screen pre, '+id+'counter, '+id+'selection', 'line-height:'+options.lineHeight+'px;');
        options.width > 0 && (self.wrapper.style.width = parseInt(options.width) + 'px');
        options.height > 0 && (self.wrapper.style.height = parseInt(options.height) + 'px');
        self.measureSizes();
        
        self.data.init(data.replace(/\t/g, this.tabString()));
        
        var mouseController = function(e) {
            if (e.button > 0 || e.which > 1)
                return false;
            
            var sl = this.scrollLeft,
                st = this.scrollTop,
                o = this.bounds(),
                x = Math.max(0, sl + e.pageX - o.x - self.sizes.paddingLeft),
                y = st + e.pageY - o.y - self.sizes.paddingTop,
                l = Math.min(Math.max(1, Math.ceil(y / self.sizes.lineHeight)), self.data.lines) - 1,
                s = self.data.getLine(l).getElementText(),
                c = Math.min(Math.max(0, Math.round(x / self.sizes.charWidth)), s.length);
            
            if (e.type === 'mousedown') {
                var th = this;
                d = true;
                self.caret.deactivate().show();
                self.selection.setStart(l, c);
                self.emit('caret:initialized');
                this.on('mousemove', mouseController);
                document.one('mouseup', function(e) {
                    !self.selection.isset() && self.selection.clear();
                    th.off('mousemove', mouseController);
                    self.emit('caret:stabilized');
                    self.caret.activate();
                    return d = e.cancel();
                });
            } else {
                self.selection.setEnd(l, c);
                self.showSelection();
                self.emit('caret:moved');
            }
            $.browser.firefox ? setTimeout(function() { self.input.focus() }, 0) : self.input.focus();
            
            self.caret.position(l, c);
        };
        
        self.wrapper.listen({
            scroll: function() {
                self.counter && (self.counter.parent.scrollTop = this.scrollTop);
                self.render();
            },
            mousedown: mouseController
        });
        
        self.input.listen({
            blur: function(e) {
                if (d) {
                    this.focus();
                } else {
                    self.caret.deactivate().hide();
                    self.unselectLine();
                    self.selection.clear();
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
                if (k >= 17 && k <= 20 || k >= 91 && k <= 95 || k >= 112 && k <= 145) {
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
            'text:changed': function() {
                self.data.getLine(this.line()).setText(this.textAtCurrentLine());
                self.finder && self.finder.find();
            },
            'position:changed': function(x, y) {
                document.activeElement != self.input && self.input.focus();
                if (self.options.autoScroll) {
                    var wrapper = self.wrapper,
                        sL = wrapper.scrollLeft, sT = wrapper.scrollTop,
                        cW = sL + wrapper.clientWidth, cH = sT + wrapper.clientHeight,
                        ix = wrapper.clientWidth / 4, iy = wrapper.clientHeight / 4;
                    
                    x = x + ix > cW ? sL + x + ix - cW : x - ix < sL ? x - ix : sL;
                    y = y + iy > cH ? sT + y + iy - cH : y - iy < sT ? y - iy : sT;
                    
                    wrapper.scrollTo(x, y, self.options.autoScrollSpeed);
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
                self.caret.refresh();
            },
            'line:added': function() {
                var s = self.screen.element;
                s.style.height = (this.lines * self.sizes.lineHeight + self.sizes.paddingTop * 2) + 'px';
            },
            'line:removed': function() {
                var s = self.screen.element;
                s.style.height = (this.lines * self.sizes.lineHeight + self.sizes.paddingTop * 2) + 'px';
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
        
        self.print();
        
        return self;
    };
    
    CodePrinter.version = '0.5.4';
    
    CodePrinter.defaults = {
        path: '',
        mode: 'javascript',
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
    
    CodePrinter.prototype = {
        isFullscreen: false,
        prepare: function() {
            if (options.highlightBrackets) {
                screen.delegate('click', '.cp-bracket', function() {
                    overlay.find('.cp-highlight').removeClass('cp-highlight');
                    
                    var spans = screen.find('span.cp-bracket'),
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
        measureSizes: function() {
            var sizes = this.sizes,
                s = window.getComputedStyle(this.screen.element, null);
            
            sizes.lineHeight = this.options.lineHeight;
            sizes.fontSize = parseInt(s.getPropertyValue('font-size'));
            sizes.paddingTop = parseInt(s.getPropertyValue('padding-top'));
            sizes.paddingLeft = parseInt(s.getPropertyValue('padding-left'));
            sizes.scrollTop = parseInt(s.getPropertyValue('top'));
            sizes.charWidth = getTextSize(this, 'c').width;
            sizes.counterWidth = 0;
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
                this.activeLine.pre = this.data.getLine(l).getElement().addClass('cp-activeLine');
                this.counter && (this.activeLine.li = this.counter.list.filter(function(item) { return item.innerHTML == l+1; }).addClass('cp-activeLine'));
            }
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
            var screen = this.screen,
                wst = this.wrapper.scrollTop,
                wch = this.wrapper.clientHeight,
                lh = this.sizes.lineHeight,
                lv = parseInt(this.options.linesOutsideOfView),
                x = Math.min(Math.ceil(wch / lh) + lv + (wst > 2 * lh ? lv : 0), this.data.lines-1),
                i = screen.lastLine - screen.firstLine;
            
            if (i < x) {
                for (; i < x; i++) {
                    screen.insert();
                    this.parse(screen.lastLine);
                }
            } else {
                x = Math.ceil((wst - this.sizes.scrollTop) / lh);
                
                if (x > lv + 2) {
                    while (x > lv) {
                        screen.shift();
                        x--;
                    }
                } else if (x < lv - 2) {
                    while (x < lv) {
                        screen.unshift();
                        x++;
                    }
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
                    
                    var p = this.parser.fn(stream).parsed, i = -1;
                    while (++i < p.length) {
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
            var s = this.screen,
                dl = this.data.addLine(l, ''),
                pre = dl.getElement(),
                q = l - s.firstLine;
            
            if (q >= 0 && l <= s.lastLine+1) {
                q === 0 ? s.element.prepend(pre) : s.lines.eq(q-1).after(pre);
                s.lines.splice(q, 0, pre);
                s.lastLine++;
                this.counter.increase();
            }
            return this;
        },
        removeLine: function(l) {
            l == null && (l = this.caret.line());
            var s = this.screen,
                q = l - s.firstLine;
            
            this.data.removeLine(l);
            
            if (q >= 0 && l <= s.lastLine) {
                s.lines.get(q).remove(true);
                s.lastLine--;
                this.counter.decrease();
            }
            return this;
        },
        removeBeforeCursor: function(arg) {
            var r, bf = this.caret.textBefore();
            if (typeof arg === 'string') {
                var l = bf.length - arg.length;
                if (bf.lastIndexOf(arg) === l) {
                    this.caret.setTextBefore(bf.substring(0, l));
                    r = arg;
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
                r = bf.substr(bf.length - arg);
            }
            r && this.emit('removed.before', r);
        },
        removeAfterCursor: function(arg) {
            var r, af = this.caret.textAfter();
            if (typeof arg === 'string') {
                if (af.indexOf(arg) === 0) {
                    this.caret.setTextAfter(af.substr(arg.length));
                    r = arg;
                }
            } else if (typeof arg === 'number') {
                if (arg <= af.length) {
                    this.caret.setTextAfter(af.substr(arg));
                } else {
                    var bf = this.caret.textBefore(),
                        l = this.caret.line();
                    
                    while (arg > af.length && l+1 < this.data.lines) {
                        this.caret.setTextAfter('');
                        arg = arg - af.length - 1;
                        af = this.data.getTextAtLine(l+1);
                        this.removeLine(l+1);
                    }
                    this.caret.setTextAtCurrentLine(bf, af.substr(arg));
                }
                r = af.substring(0, arg);
            }
            r && this.emit('removed.after', r);
        },
        getSelection: function() {
            if (this.selection.isset()) {
                var s = this.selection.getStart(),
                    e = this.selection.getEnd();
                
                if (s.line != e.line) {
                    var t = this.data.getTextAtLine(s.line).substr(s.column) + eol
                    for (var i = s.line + 1; i < e.line; i++) {
                        t = t + this.data.getTextAtLine(i) + eol;
                    }
                    return t + this.data.getTextAtLine(e.line).substring(0, e.column);
                } else {
                    return this.data.getTextAtLine(s.line).substring(s.column, e.column);
                }
            }
            return '';
        },
        showSelection: function() {
            var span, sel, el = this.selection.element,
                s = this.selection.getStart(),
                e = this.selection.getEnd();
            
            if (s && e) {
                sel = this.getSelection();
                this.input.value = sel;
                this.input.setSelectionRange(0, sel.length);
                sel = sel.split(eol);
                el.innerHTML = '';
                
                for (var i = 0; i < sel.length; i++) {
                    span = selection_span.cloneNode(false);
                    span.textContent = sel[i];
                    span.style.top = ((s.line + i) * this.sizes.lineHeight + this.sizes.paddingTop + this.sizes.scrollTop) + 'px';
                    span.style.left = ((i === 0 ? s.column * this.sizes.charWidth : 0) + this.sizes.paddingLeft) + 'px';
                    el.append(span);
                }
                el.parentNode == null && this.wrapper.append(el);
                this.selection.isInversed() ? this.caret.position(s.line, s.column) : this.caret.position(e.line, e.column);
            }
        },
        removeSelection: function() {
            var l = this.getSelection().length;
            this.selection.isInversed() ? this.removeAfterCursor(l) : this.removeBeforeCursor(l);
            this.selection.clear();
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
                main.after(this.tempnode);
                document.body.append(main);
                this.isFullscreen = true;
                this.render();
                this.caret.refresh();
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
                this.render();
                this.caret.refresh();
            }
        },
        openCounter: function() {
            if (!this.counter) {
                var self = this;
                this.counter = new Counter(this);
                this.counter.on('width:changed', function() {
                    self.wrapper.style.marginLeft = (self.sizes.counterWidth = self.counter.parent.offsetWidth) + 'px';
                });
            }
            this.container.prepend(this.counter.parent);
            this.wrapper.style.marginLeft = (this.sizes.counterWidth = this.counter.parent.offsetWidth) + 'px';
        },
        closeCounter: function() {
            this.counter && this.counter.parent().remove();
            this.wrapper.style.marginLeft = (this.sizes.counterWidth = 0) + 'px';
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
            this.wrapper.append(this.finder.overlay);
            this.finder.input.focus();
        },
        closeFinder: function() {
            this.finder && this.finder.close();
        }
    };
    
    Data = function() {
        return this;
    };
    Data.prototype = [].extend({
        lines: 0,
        init: function(value) {
            value = value.split(eol);
            var i = -1, l = value.length;
            
            while (++i < l) {
                this.addLine(i, value[i]);
            }
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
                if (b[u].pre && b[u].pre.parentNode) {
                    b[u].pre.parentNode.removeChild(b[u].pre);
                }
                var dl = b.splice(u, 1);
                this.lines--;
                this.emit('line:removed', { dataLine: dl[0], line: line });
                
                if (b.length === DATA_RATIO - 1) {
                    var n, r;
                    
                    t === DATA_RATIO - 1 && (t = -1) && h++;
                    n = this[h][++t];
                    
                    while (n) {
                        r = n.shift();
                        b.push(r);
                        b = n;
                        t === DATA_RATIO - 1 && (t = -1) && h++;
                        n = this[h][++t];
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
        getTextAtLine: function(line) {
            var l = this.getLine(line);
            return l ? l.text : false;
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
            var h , d, i = -1;
            for (h = 0; h < this.length; h++) {
                for (d = 0; d < this[h].length; d++) {
                    if ((i = this[h][d].indexOf(dl)) !== -1) {
                        return h * DATA_MASTER_RATIO + d * DATA_RATIO + i;
                    }
                }
            }
            return i;
        },
        toString: function() {
            var r = [], h = 0, t = 0, i = 0;
            for (; h < this.length; h++) {
                for (; t < this[h].length; t++) {
                    r.push.apply(r, this[h][t].map('text'));
                }
            }
            return r.join(eol);
        }
    });
    
    pre_clone = document.createElement('pre');
    
    DataLine = function(parent) {
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
            !this.pre && this.getElement();
            var tc = this.pre.textContent != null ? this.pre.textContent : this.pre.innerText;
            return tc === ' ' && this.text === '' ? '' : tc;
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
        var line, column, before, after;
        
        this.root = cp;
        
        return this.extend({
            setTextBefore: function(str) {
                str.indexOf('@') !== -1 && (str = str.replaceAll(['@a','@b'], [after, before]));
                if (before !== str) {
                    before = str;
                    this.emit('text:changed');
                    this.position(line, str.length);
                }
                return this;
            },
            setTextAfter: function(str) {
                str.indexOf('@') !== -1 && (str = str.replaceAll(['@a','@b'], [after, before]));
                if (after !== str) {
                    after = str;
                    this.emit('text:changed');
                }
                return this;
            },
            setTextAtCurrentLine: function(bf, af) {
                bf.indexOf('@') !== -1 && (bf = bf.replaceAll(['@a','@b'], [after, before]));
                af.indexOf('@') !== -1 && (af = af.replaceAll(['@a','@b'], [after, before]));
                if (before !== bf || after !== af) {
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
                    l = Math.max(Math.min(l, cp.data.lines - 1), 0);
                    typeof t !== 'string' && (t = cp.data.getLine(l).getElementText());
                    typeof c !== 'number' && (c = column);
                    c < 0 && (c = t.length + c + 1);
                    
                    var x = cp.sizes.charWidth * Math.min(c, t.length),
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
                    if (l != null) {
                        t = l.getElementText();
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
                cp.sizes.charWidth = getTextSize(cp, 'c').width;
                return this.position(line, column);
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
            return this;
        },
        deactivate: function() {
            this.interval && (this.interval = clearInterval(this.interval));
            return this;
        },
        setPixelPosition: function(x, y) {
            var css = {},
                stl = this.style || this.root.options.caretStyle;
            
            x >= 0 && (css.left = x + this.root.sizes.paddingLeft);
            y >= 0 && (css.top = y + this.root.sizes.paddingTop);
            
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
        }
    };
    
    Screen = function(cp) {
        var self = this;
        this.parent = document.createElement('div').addClass('cp-screen');
        this.element = document.createElement('div').addClass('cp-codelines');
        this.lines = $([]);
        this.root = cp;
        cp.wrapper.append(this.parent.append(this.element));
        
        return this;
    };
    Screen.prototype = {
        firstLine: 0,
        lastLine: -1,
        insert: function() {
            var pre = this.root.data.getLine(++this.lastLine).getElement();
            this.lines.push(pre);
            this.element.append(pre);
            this.root.counter && this.root.counter.increase();
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
                this.element.append(pre);
                this.element.style.top = (this.root.sizes.scrollTop += this.root.sizes.lineHeight) + 'px';
                this.firstLine++;
                this.root.parse(this.lastLine);
                this.root.counter && this.root.counter.shift();
            }
        },
        unshift: function() {
            if (this.firstLine - 1 >= 0) {
                var pre = this.root.data.getLine(--this.firstLine).getElement();
                this.lines.get(-1).remove(true).unshift(pre);
                this.element.prepend(pre);
                this.element.style.top = (this.root.sizes.scrollTop -= this.root.sizes.lineHeight) + 'px';
                this.lastLine--;
                this.root.parse(this.firstLine);
                this.root.counter && this.root.counter.unshift();
            }
        }
    };
    
    li_clone = document.createElement('li');
    
    Counter = function(cp) {
        var self = this, ln = cp.screen.lines.length;
        self.element = document.createElement('ol');
        self.parent = document.createElement('div').addClass('cp-counter').append(self.element);
        self.list = $([]);
        self.root = cp;
        cp.container.prepend(self.parent);
        
        this.element.delegate('click', 'li', function() {
            var l = parseInt(this.innerHTML) - 1;
            cp.caret.position(l, 0);
            cp.selection.setRange(l, 0, l, cp.caret.textAtCurrentLine().length);
            cp.showSelection();
        });
        
        while (ln--) {
            self.increase(cp.screen.firstLine+1);
        }
        return this;
    };
    Counter.prototype = {
        increase: function(sL) {
            var li = li_clone.cloneNode(false),
                n = this.list.length > 0 ? parseInt(this.list.item(-1).innerHTML) + 1 : sL >= 0 ? sL : 1;
            li.innerHTML = n;
            this.list.push(li);
            this.element.append(li);
            n.toString().length > (n-1).toString().length && this.emit('width:changed');
        },
        decrease: function() {
            var n = parseInt(this.list.get(-1).html());
            this.list.remove(true);
            (n-1).toString().length < n.toString().length && this.emit('width:changed');
        },
        shift: function() {
            var fi = this.list.item(0),
                c = parseInt(fi.innerHTML) + this.list.length;
            
            fi.innerHTML = c;
            this.root.options.highlightCurrentLine && (c === this.root.caret.line() + 1 ? fi.addClass('cp-activeLine') : fi.removeClass('cp-activeLine'));
            this.element.append(fi);
            this.list.get(0).remove(true).push(fi);
            this.element.append(fi).style.marginTop = this.root.sizes.scrollTop + 'px';
        },
        unshift: function() {
            var la = this.list.item(-1),
                c = parseInt(la.innerHTML) - this.list.length;
            
            la.innerHTML = c;
            this.root.options.highlightCurrentLine && (c === this.root.caret.line() + 1 ? la.addClass('cp-activeLine') : la.removeClass('cp-activeLine'));
            this.element.prepend(la);
            this.list.get(-1).remove(true).unshift(la);
            this.element.prepend(la).style.marginTop = this.root.sizes.scrollTop + 'px';
        }
    };
    
    InfoBar = function(cp) {
        var mode = document.createElement('span').addClass('cpi-mode'),
            act = document.createElement('span').addClass('cpi-actions'),
            info = document.createElement('span').addClass('cpi-info');
        
        mode.innerHTML = cp.options.mode;
        this.element = document.createElement('div').addClass('cpi-bar').append(mode, act, info);
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
                    newWindow.document.writeln('<pre style="font-size:12px;">' + encodeEntities(cp.data.toString()) + '</pre>');
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
            leftbox = document.createElement('div').addClass('cpf-leftbox'),
            flexbox = document.createElement('div').addClass('cpf-flexbox'),
            input = document.createElement('input').addClass('cpf-input'),
            bar = document.createElement('div').addClass('cpf-bar'),
            overlay = document.createElement('div').addClass('cpf-overlay cp-overlay'),
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
        overlay.delegate('click', 'span', function(e) {
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
            this.overlay.remove()
        },
        clear: function() {
            this.searched = null;
            this.searchResults.length = 0;
            this.overlay.innerHTML = '';
        },
        push: function(span) {
            this.searchResults.push(span);
            this.overlay.append(span);
        },
        find: function(find) {
            var root = this.root,
                siz = root.sizes,
                value, index, line = 0, ln = 0, last, bf;
            
            find = find || this.input.value;
            this.clear();
            
            if (find) {
                for (; line < root.data.lines; line++) {
                    value = root.data.getTextAtLine(line);
                    ln = 0;
                    
                    while (value && (index = value.indexOf(find)) !== -1) {
                        var span = document.createElement('span').addClass('cpf-occurrence');
                        span.textContent = span.innerText = span.innerHTML = find;
                        span.extend({ position: {
                            ls: line, 
                            cs: ln+index,
                            le: line,
                            ce: ln+index + find.length
                        }});
                        span.style.extend({
                            width: (siz.charWidth * find.length) + 'px',
                            height: siz.lineHeight + 'px',
                            top: (siz.paddingTop + line * siz.lineHeight + 1) + 'px',
                            left: (siz.paddingLeft + siz.charWidth * (ln + index) + 1) + 'px'
                        });
                        this.push(span);
                        value = value.substr((ln = index + find.length));
                    }
                }
                this.searched = find;
                this.searchResults.removeClass('active').get(0).addClass('active');
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
                            if (str2) {
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
                            } else {
                                this.row--;
                                this.pos = this.value[this.row].length;
                                return this;
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
            this.teared = this.current().substr(this.pos);
            this.append(this.teared);
            this.forward();
        },
        restore: function() {
            if (this.teared) {
                var p = this.parsed[this.row];
                this.backward();
                this.parsed[this.row] = p.substr(0, p.length - this.teared.length);
                this.pos = this.value[this.row].length - this.teared.length;
                this.teared = null;
            }
        },
        revert: function() {
            if (this.found) {
                this.pos = this.pos - this.found.length;
                this.found = false;
            }
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
            var t = this.tabString();
            if (this.selection.isset()) {
                var s = this.selection, i, l;
                
                s.correct();
                this.caret.position(s.start.line, s.start.column);
                i = s.start.line;
                l = s.end.line;
                
                if (e.shiftKey) {
                    var dl = this.data.getLine(i);
                    if (dl.text.indexOf(t) === 0) {
                        dl.setText(dl.text.substr(t.length));
                        s.start.column -= t.length;
                        this.caret.moveX(-t.length);
                    }
                    if (l - i++) {
                        for (; i < l; i++) {
                            this.data.getLine(i).lbreak(t);
                        }
                        dl = this.data.getLine(i);
                        if (dl.text.indexOf(t) === 0) {
                            dl.setText(dl.text.substr(t.length));
                            s.end.column -= t.length;
                        }
                    }
                } else {
                    for (; i <= l; i++) {
                        this.data.getLine(i).prepend(t);
                    }
                    s.start.column += t.length;
                    s.end.column += t.length;
                    this.caret.moveX(t.length);
                }
                this.showSelection();
            } else {
                e.shiftKey ? this.removeBeforeCursor(t) : this.insertText(t);
            }
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
        16: function() {
            if (this.selection.start.line == null) {
                this.selection.setStart(this.caret.line(), this.caret.column());
            }
        },
        27: function(e) {
            return e.cancel();
        },
        37: function(e, c) {
            c%2 ? this.caret.move(c-38, 0) : this.caret.move(0, c-39);
            if (e.shiftKey && this.selection.start.line >= 0) {
                this.selection.setEnd(this.caret.line(), this.caret.column());
                this.showSelection();
            } else {
                this.selection.clear();
            }
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
            this.wrapper.scrollLeft = 0;
        },
        38: function() {
            this.wrapper.scrollTop = 0;
            this.caret.position(0, 0);
        },
        39: function() {
            var w = this.wrapper;
            w.scrollLeft = w.scrollWidth;
        },
        40: function() {
            var w = this.wrapper;
            w.scrollTop = w.scrollHeight;
            this.caret.position(this.data.lines - 1, -1);
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
        187: function() {
            var id = this.mainElement.id;
            if (this.sizes.fontSize < this.options.maxFontSize) {
                this.wrapper.style.fontSize = (++this.sizes.fontSize)+'px';
                this.counter && (this.counter.parent.style.fontSize = this.sizes.fontSize+'px') && this.counter.emit('width:changed');
                (id = '#'+id+' .cp-') && $.stylesheet.insert(id+'screen pre, '+id+'counter, '+id+'selection', 'line-height:'+(++this.sizes.lineHeight)+'px;');
                this.caret.refresh();
            }
        },
        189: function() {
            var id = this.mainElement.id;
            if (this.sizes.fontSize > this.options.minFontSize) {
                this.wrapper.style.fontSize = (--this.sizes.fontSize)+'px';
                this.counter && (this.counter.parent.style.fontSize = this.sizes.fontSize+'px') && this.counter.emit('width:changed');
                (id = '#'+id+' .cp-') && $.stylesheet.insert(id+'screen pre, '+id+'counter, '+id+'selection', 'line-height:'+(--this.sizes.lineHeight)+'px;');
                this.caret.refresh();
            }
        },
        229: function() {
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
    
    commands = {
        65: function() {
            var ls = this.data.lines - 1;
            this.selection.setStart(0, 0).setEnd(ls, this.data.getTextAtLine(ls).length);
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
            this.keydownMap.touch(8, this, null);
            this.selection.clear();
            this.emit('cmd.cut');
            return true;
        }
    };

    selection_span = document.createElement('span').addClass('cp-selection');
    
    selection = function() {
        this.element = document.createElement('div').addClass('cp-selection-overlay cp-overlay');
        this.start = {};
        this.end = {};
        return this;
    };
    selection.prototype = {
        clear: function() {
            this.element.innerHTML = '';
            this.start = {};
            this.end = {};
            return this;
        },
        setStart: function(line, column) {
            this.clear();
            this.start.line = line;
            this.start.column = column;
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
    
    eol = $.browser.windows ? '\r\n' : '\n';
    
    CodePrinter.requireMode = function(req, cb, del) {
        return $.scripts.require('CodePrinter.'+req, cb, del);
    };
    CodePrinter.defineMode = function(name, obj, req) {
        var m = (new CodePrinter.Mode()).extend(obj);
        m.init instanceof Function && m.init();
        $.scripts.define('CodePrinter.'+name, m, req);
    };
    CodePrinter.getMode = function(name) {
        return $.scripts.get('CodePrinter.'+name);
    };
    CodePrinter.hasMode = function(name) {
        return $.scripts.has('CodePrinter.'+name);
    };
    
    var buildDOM = (function(){
        var m = document.createElement('div').addClass('codeprinter'),
            c = document.createElement('div').addClass('cp-container'),
            w = document.createElement('div').addClass('cp-wrapper'),
            i = document.createElement('textarea').addClass('cp-input'),
            r = document.createElement('div').addClass('cp-caret');
        w.appendChild(r);
        c.appendChild(w);
        m.appendChild(i);
        m.appendChild(c);
        return function(cp) {
            cp.mainElement = m.cloneNode(true);
            cp.input = cp.mainElement.firstChild;
            cp.container = cp.input.nextSibling;
            cp.wrapper = cp.container.firstChild;
            cp.caret.element = cp.wrapper.firstChild.addClass('cp-caret-'+cp.options.caretStyle);
        }
    })();
    function getTextSize(cp, text) {
        var h = 0, w = 0, cr,
            pre = document.createElement('pre').addClass('cp-templine'),
            span = document.createElement('span');
        
        text = text != null ? text : 'C';
        span.textContent = span.innerText = text;
        pre.appendChild(span);
        cp.screen.parent.appendChild(pre);
        cr = span.getBoundingClientRect();
        pre.parentNode.removeChild(pre);
        return cr;
    };
    function getDataLinePosition(line) {
        return [line % DATA_RATIO, (line - line % DATA_RATIO) % DATA_MASTER_RATIO / DATA_RATIO, (line - line % DATA_MASTER_RATIO) / DATA_MASTER_RATIO ];
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
    function isCommandKey(e) {
        return ($.browser.macosx && e.metaKey) || (!$.browser.macosx && e.ctrlKey);
    };
    
    $.prototype.CodePrinter = function(opt) {
        var k = -1;
        while (++k < this.length) {
            this[k].CodePrinter = new CodePrinter(this[k], opt);
        }
        return this;
    };
    
    return CodePrinter;
})(Selector);