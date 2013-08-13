/* CodePrinter - Main JavaScript Document */

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
    
    CodePrinter.version = '0.3.3';
    
    CodePrinter.defaults = {
        path: '',
        mode: 'javascript',
        theme: 'default',
        caretStyle: 'vertical',
        tabWidth: 4,
        fontSize: 12,
        lineHeight: 16,
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
        shortcuts: true,
        width: 'auto',
        height: 'auto',
        randomIDLength: 7
    };
    
    CodePrinter.prototype = {}.extend({
        sizes: {},
        prepare: function() {
            var self = this,
                source = self.source,
                overlay = self.overlay.element,
                options = self.options,
                sizes = self.sizes,
                id = $.random(options.randomIDLength);
            
            if (typeof options.theme === 'string' && options.theme !== 'default') {
                self.requireStyle(options.theme);
            } else {
                options.theme = 'default';
            }
            self.mainElement.addClass('cps-'+options.theme.toLowerCase().replace(' ', '-'));
            
            self.counter = new Counter(self);
            options.lineNumbers ? self.counter.show() : self.counter.hide();
            
            self.infobar = new InfoBar(self);
            options.infobar ? self.infobar.show() : self.infobar.hide();
            
            self.measureSizes();
            self.activeLine = {};
            
            self.mainElement.attr({ id: id });
            self.id = id;
            
            if (options.fontSize != 12 && options.fontSize > 0) {
                overlay.add(source, self.counter.element).css({ fontSize: parseInt(options.fontSize) });
            }
            if (options.lineHeight != 16 && options.lineHeight > 0) {
                id = '#'+id+' .cp-';
                $.stylesheet.insert(id+'overlay pre, '+id+'counter, '+id+'source', 'line-height:'+options.lineHeight+'px;');
            }
            if (options.width > 0) {
                self.mainElement.css({ width: parseInt(options.width) });
            }
            if (options.height > 0) {
                self.container.css({ height: parseInt(options.height) });
            }
            if (source.tag() === 'textarea') {
                self.prepareWriter();
            }
            
            overlay.addClass('cp-'+options.mode.toLowerCase());
            source.html(encodeEntities(this.getSourceValue()));
            self.adjust();
            
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
            
            caret.on({
                reloaded: function(e) {
                    if (self.options.autoScroll) {
                        var wrapper = self.wrapper.item(),
                            x = e.position.x, y = e.position.y;
                        
                        x - 30 < wrapper.scrollLeft ? wrapper.scrollLeft -= 50 : x + 30 > wrapper.clientWidth + wrapper.scrollLeft ? wrapper.scrollLeft += 50 : null;
                        y - 30 < wrapper.scrollTop ? wrapper.scrollTop -= 50 : y + 30 > wrapper.clientHeight + wrapper.scrollTop ? wrapper.scrollTop += 50 : null;
                    }
                },
                'line.changed': function(e) {
                    if (self.options.highlightCurrentLine) {
                        self.selectLine(e.current);
                    }
                }
            });
            
            self.source.on({
                click: function() {
                    caret.reload();
                },
                focus: function() {
                    var a = true;
                    caret.element.show();
                    if (self.options.blinkCaret) {
                        this.interval = setInterval(function() {
                            if (a) {
                                caret.element.hide();
                                a = false;
                            } else {
                                caret.element.show();
                                a = true;
                            }
                        }, 400);
                    }
                },
                blur: function() {
                    if (this.interval) {
                        this.interval = clearInterval(this.interval);
                    }
                    caret.element.hide();
                    self.unselectLine();
                },
                keydown: function(e) {
                    var k = e.keyCode ? e.keyCode : e.charCode ? e.charCode : e.which;
                    if (e.ctrlKey && self.options.shortcuts && self.shortcuts[k]) {
                        self.shortcuts[k].call(self, e, this);
                        return e.cancel();
                    }
                    if (k >= 16 && k <= 20 || k >= 91 && k <= 95 || k >= 112 && k <= 145) {
                        return e.cancel();
                    }
                    if (k >= 37 && k <= 40) {
                        setTimeout(function() {
                            caret.reload();
                        }, 1);
                        return true;
                    }
                    return self.keydownMap.touch(k, self, e);
                },
                keypress: function(e) {
                    var k = e.charCode ? e.charCode : e.keyCode,
                        ch = String.fromCharCode(k);
                    
                    self.keypressMap.touch(e, self, ch) !== false ? self.insertText(ch) : null;
                    self.print();
                    return e.cancel();
                }
            });
            
            self.caret = caret;
            self.isWritable = true;
            self.extend(Writer);
        },
        measureSizes: function() {
            var sizes = this.sizes,
                source = this.source;
            
            sizes.width = source.width();
            sizes.height = source.height();
            sizes.offsetWidth = source.offsetWidth();
            sizes.offsetHeight = source.offsetHeight();
            sizes.lineHeight = source.css('lineHeight');
        },
        getTextSize: function(text) {
            var tx = text || 'C',
                h = 0, w = 0,
                styles = ['fontSize','fontStyle','fontWeight','fontFamily','textTransform', 'letterSpacing', 'whiteSpace'],
                tmpdiv = $(document.createElement('div'));
            
            this.mainElement.append(tmpdiv.text(tx));
            tmpdiv.css({ whiteSpace: 'pre', position: 'absolute', left: -1000, top: -1000, display: 'inline-block' });
            tmpdiv.inheritStyle(styles, this.source);
            h = tmpdiv.height();
            tmpdiv.text(text);
            w = tmpdiv.width();
            tmpdiv.remove();
            
            return { height: h, width: w };
        },
        adjust: function() {
            if (this.isWritable) {
                var wrapper = this.wrapper,
                    source = this.source,
                    sW, sH, wW, wH;
                
                source.css({ width: 0, height: 0 });
                sW = source.scrollWidth() - source.paddingWidth()/2;
                sH = source.scrollHeight() - source.paddingHeight();
                wW = wrapper.clientWidth() - source.paddingWidth();
                wH = wrapper.clientHeight() - source.paddingHeight();
                source.css({ width: sW < wW ? wW : sW, height: sH < wH ? wH : sH });
            }
        },
        unselectLine: function() {
            if (this.activeLine.pre) {
                this.activeLine.pre.add(this.activeLine.li).removeClass('cp-activeLine');
            }
        },
        selectLine: function(l) {
            this.unselectLine();
            this.activeLine.pre = this.overlay.lines.eq(l).addClass('cp-activeLine');
            this.activeLine.li = this.counter.list.eq(l).addClass('cp-activeLine');
        },
        getSourceValue: function() {
            var value = this.isWritable ? this.source.value() : decodeEntities(this.source.html());
            return value.replace(/\t/g, this.tabString());
        },
        print: function(mode) {
            if (!mode) {
                mode = this.options.mode;
            }
            
            CodePrinter.requireMode(mode, function(ModeObject) {
                var overlay = this.overlay,
                    value = this.getSourceValue(),
                    pre = overlay.lines,
                    parsed, j = -1;
                
                parsed = ModeObject.parse(value);
                
                while (parsed[++j] != null) {
                    if (this.options.showIndent) {
                        parsed[j] = indentGrid(parsed[j], this.options.tabWidth);
                    }
                    overlay.set(j, parsed[j]);
                }
                
                if (parsed.length < pre.length) {
                    for (var i = parsed.length; i < pre.length; i++) {
                        overlay.remove(i);
                    }
                }
                
                this.lines = j;
                this.value = value;
                this.parsed = parsed;
                this.counter.reload(j);
                this.infobar.reload(value.length, j);
                this.adjust();
            }, this);
        },
        requireStyle: function(style, callback) {
            $.require(this.options.path+'theme/'+style+'.css', callback);
        },
        requireMode: function(mode, callback) {
            $.require(this.options.path+'mode/'+mode+'.js', callback);
        },
        tabString: function() {
            return Array(this.options.tabWidth+1).join(' ');
        }
    });
    
    var Writer = {
        getCurrentLine: function() {
            return this.textBeforeCursor(true).split('\n').length - 1;
        },
        getTextAtLine: function(line) {
            var array = this.getSourceValue().split('\n');
            return array[line];
        },
        textBeforeCursor: function(all) {
            var ta = this.source.item(),
                v = ta.value.substring(0, ta.selectionStart);
            
            if (!all) {
                return v.substring(v.lastIndexOf('\n')+1);
            }
            return v;
        },
        textAfterCursor: function(all) {
            var ta = this.source.item(),
                v = ta.value.substr(ta.selectionStart);
            
            if (!all) {
                return v.substring(0, v.indexOf('\n'));
            }
            return v;
        },
        insertText: function(text, mv) {
            var ta = this.source.item(),
                v = ta.value,
                s = ta.selectionStart,
                e = ta.selectionEnd;
            
            mv = typeof mv === 'number' ? mv : 0;
            
            if (mv <= 0) {
                v = v.substring(0, s + mv) + text + v.substring(s + mv, s) + v.substr(e);
                s = s + text.length;
            } else {
                --mv;
                v = v.substring(0, s) + v.substring(e, e + mv) + text + v.substr(e + mv);
            }
            ta.value = v;
            ta.setSelectionRange(s, s);
            this.caret.reload();
        },
        removeBeforeCursor: function(text) {
            var ta = this.source.item(),
                s = ta.selectionStart,
                e = ta.selectionEnd,
                v = ta.value.substring(0, e),
                d = v.length - text.length,
                t = 1;
            
            if (s !== e) {
                text = ta.value.substring(s, e);
                d = v.length - text.length;
            }
            
            if (typeof text === 'string' && v.lastIndexOf(text) === d) {
                ta.value = v.substring(0, d) + ta.value.substr(e);
                ta.setSelectionRange(e - text.length, e - text.length);
            } else if (typeof text === 'number') {
                ta.value = v.substring(0, s - text) + ta.value.substr(s);
                ta.setSelectionRange(s - text, s - text);
            } else {
                t = 0;
            }
            
            if (t) {
                ta.focus();
                this.print();
                this.caret.reload();
                return true;
            }
            return false;
        },
        removeAfterCursor: function(text) {
            var ta = this.source.item(),
                s = ta.selectionStart,
                v = ta.value.substr(s),
                t = 1;
            
            if (s !== ta.selectionEnd) {
                text = ta.value.substring(s, ta.selectionEnd);
            }
            if (typeof text === 'string' && v.indexOf(text) === 0) {
                ta.value = ta.value.substring(0, s) + v.substr(text.length);
            } else if (typeof text === 'number') {
                ta.value = ta.value.substring(0, s) + v.substr(text);
            } else {
                t = 0;
            }
            
            if (t) {
                ta.setSelectionRange(s, s);
                ta.focus();
                this.print();
                this.caret.reload();
                return true;
            }
            return false;
        },
        registerInputAction: function(code, fn, onpress) {
            if (typeof code === 'number' && fn instanceof Function) {
                onpress !== true ? keyDownEvent[code] = fn : keyPressEvent[code] = fn;
            }
            return keyPressEvent;
        },
        update: function() {
            this.print();
            this.caret.reload();
        }
    };
    
    var Caret = function(cp) {
        this.element = $(document.createElement('div')).addClass('cp-caret cp-caret-'+cp.options.caretStyle);
        this.root = cp;
        cp.wrapper.append(this.element);
        
        return this;
    };
    Caret.styles = {
        underline: function(css, pos) {
            css.width = pos.width+2;
            css.top = css.top + pos.height;
            css.left = css.left - 1;
            return css;
        },
        block: function(css, pos) {
            css.width = pos.width;
            css.height = pos.height;
            return css;
        }
    };
    Caret.prototype = {
        reload: function() {
            var root = this.root,
                stl = root.options.caretStyle,
                pos = this.getPosition(),
                css = { left: pos.x, top: pos.y };
            
            Caret.styles[stl] instanceof Function ? css = Caret.styles[stl].call(root, css, pos) : css.height = pos.height;
            this.element.show().css(css);
            
            this.line != pos.line ? this.emit('line.changed', { last: this.line, current: pos.line }) : null;
            this.line = pos.line;
            
            this.emit('reloaded', { position: pos });
        },
        getPosition: function() {
            var root = this.root,
                source = root.source,
                text = root.textBeforeCursor(),
                y = 0, x = 0, line, tsize;
            
            source.focus();
            line = root.getCurrentLine();
            tsize = root.getTextSize(text);
            x = tsize.width + source.total('paddingLeft', 'borderLeftWidth');
            y = line * (root.sizes.lineHeight) + source.total('paddingTop', 'borderTopWidth');
            return { x: parseInt(x), y: parseInt(y), width: parseInt(root.getTextSize(text.charAt(text.length-1)).width), height: parseInt(tsize.height), line: line };
        },
        moveTo: function(pos, len) {
            var l = this.root.value.length;
            pos = (pos || 0) % (l + 1);
            while (pos < 0) {
                pos = pos + (l + 1);
            }
            this.root.source.item().setSelectionRange(pos, pos + (len || 0));
            this.reload();
        }
    };
    
    var Overlay = function(cp) {
        this.element = $(document.createElement('div')).addClass('cp-overlay');
        this.lines = $([]);
        this.root = cp;
        cp.wrapper.append(this.element);
        
        return this;
    };
    Overlay.prototype = {
        set: function(eq, content) {
            eq < this.lines.length ? this.lines.eq(eq).html(content || ' ') : this.insert(this.lines.length, content || ' ');
        },
        insert: function(eq, content) {
            var pre = document.createElement('pre');
            pre.innerHTML = content || ' ';
            
            if (typeof eq === 'number' && eq > 0) {
                eq = parseInt(Math.min(eq, this.lines.length));
                this.lines.eq(-1).after(pre);
                this.lines.splice(this.lines.length, 0, pre);
            } else {
                this.lines.push(pre);
                this.element.append(pre);
            }
            if (this.root.counter) {
                this.root.counter.increase();
            }
        },
        remove: function(eq) {
            this.lines.get(eq || 0).remove(true);
            this.root.counter.decrease();
        }
    };
    
    var Counter = function(cp) {
        var self = this;
        self.element = $(document.createElement('ol')).addClass('cp-counter');
        self.list = $([]);
        self.root = cp;
        cp.container.prepend(this.element);
        
        cp.wrapper.on('scroll', function() {
            self.element.current().scrollTop = this.scrollTop;
        });
        
        this.element.delegate('mousedown', 'li', function() {
            var index = self.list.indexOf(this);
            cp.selectLine(index);
        });
        
        return this;
    };
    Counter.prototype = {
        reload: function(lines) {
            var amp = !isNaN(lines) ? lines - this.list.length : 0;
            
            while (amp != 0) {
                if (amp < 0) {
                    this.decrease();
                    amp++;
                } else {
                    this.increase();
                    amp--;
                }
            }
        },
        increase: function() {
            var li = $(document.createElement('li'));
            this.list.push(li.item());
            this.element.append(li);
        },
        decrease: function() {
            this.list.get(0).remove(true);
        },
        show: function() {
            this.element.show();
            this.root.wrapper.css({ marginLeft: this.element.offsetWidth() });
        },
        hide: function() {
            this.element.hide();
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
        
        if (cp.options.infobarOnTop) {
            this.element.prependTo(cp.mainElement);
        } else {
            this.element.appendTo(cp.mainElement);
        }
        
        this.actions = {
            plaintext: {
                func: function() {
                    var newWindow = window.open('', '_blank');
                    newWindow.document.writeln('<pre style="font-size:14px;">' + encodeEntities(cp.getSourceValue()) + '</pre>');
                }
            }
        };
        
        for (var k in this.actions) {
            this.addAction(k, this.actions[k].func, this.actions[k].text);
        }
        
        return this;
    };
    InfoBar.prototype = {
        reload: function(a, b, c) {
            var html = (a && b) ? a+' characters, '+b+' lines' : a ? a+' selected characters' : '';
            this.element.characters.html(html);
        },
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
            this.element.show();
        },
        hide: function() {
            this.element.hide();
        }
    };
    
    var Stream = function(string) {
        if (!(this instanceof Stream)) {
            return new Stream(string);
        }
        return this.init(string);
    };
    Stream.prototype = {
        init: function(str) {
            this.base = str;
            this.eaten = '';
            this.final = '';
            return this;
        },
        eat: function(from, to) {
            var str = this.base,
                indexFrom = from instanceof RegExp ? str.search(from) : str.indexOf(from),
                indexTo = 0;
            
            if (to === "\n") {
                indexTo = str.indexOf(to) - 1;
            } else if (from === to) {
                indexTo = str.indexOf(to, 1);
                if (indexTo === -1) indexTo = str.length;
            } else {
                if(!to) to = from;
                indexTo = to instanceof RegExp ? str.search(to) : str.indexOf(to);
                if (indexTo === -1) indexTo = indexFrom;
            }
            
            this.eaten = encodeEntities(str.substring(indexFrom, indexTo + to.length));
            this.base = str.substr(indexTo + to.length);
            return this;
        },
        wrap: function(suffix, tag) {
            var result = '',
                tmp = this.eaten.split(/\n/g);
            
            suffix = (suffix instanceof Array) ? suffix.slice(0) : [suffix];
            tag = tag ? tag : 'span';
            
            for (var i = 0; i < suffix.length; i++) {
                suffix[i] = 'cp-'+suffix[i];
            }
            
            for (var i = 0; i < tmp.length; i++) {
                result = result + '<'+tag+' class="'+suffix.join(' ')+'">';
                result = result + tmp[i] +'</'+tag+'>';
                if (i !== tmp.length - 1) {
                    result = result + "\n";
                }
            }
            return this.final = this.final + result;
        },
        tear: function(pos) {
            var s = '';
            if (!isNaN(pos)) {
                s = this.base.substring(0, pos);
                this.final = this.final + s;
                this.base = this.base.substr(pos);
            }
            return s;
        },
        toString: function() {
            return this.final + this.base;
        }
    };
    
    $.each(['substr','substring','replace','search','match','split'], function(v) {
        Stream.prototype[v] = function() {
            return this.base[v].apply(this.base, arguments);
        };
    });
    
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
            "'": { end: "'", cls: ['string', 'single-quote'] },
            '"': { end: '"', cls: ['string', 'double-quote'] }
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
        
        setStream: function(str) {
            if (typeof str === 'string') {
                str = new Stream(str);
            }
            if (str instanceof Stream) {
                this.stream = str;
            }
            return this;
        },
        parse: function(str) {
            str = typeof str === 'string' ? new Stream(str) : str instanceof Stream ? str : this.stream != null ? this.stream : new Stream('');
            var p = this.fn(str);
            return p instanceof Stream ? p.toString().split(/\n/g) : typeof p === 'string' ? p.split(/\n/g) : '';
        },
        fn: function(stream) {
            stream = stream || this.stream;
            return stream.final;
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
            var t = this.textBeforeCursor(),
                m = t.match(/ +$/),
                r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? this.tabString() : 1;
            
            this.removeBeforeCursor(r);
            this.update();
            return e.cancel();
        },
        9: function(e) {
            this.insertText(this.tabString());
            return e.cancel();
        },
        13: function(e) {
            var t = this.textBeforeCursor().match(/^ +/),
                a = '\n' + (this.options.indentNewLines && t && t[0] ? t[0] : '');
            
            this.insertText(a);
            this.update();
            return e.cancel();
        },
        27: function(e) {
            return e.cancel();
        },
        46: function(e) {
            var t = this.textAfterCursor(),
                m = t.match(/^ +/),
                r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? this.tabString() : 1;
            
            this.removeAfterCursor(r);
            this.update();
            return e.cancel();
        }
    };
    
    var keypressMap = function() {};
    keypressMap.prototype = {
        touch: function(code, self, event) {
            if (this[code]) {
                return this[code].call(self, event, code);
            }
        },
        40: function() {
            this.options.insertClosingBrackets ? this.insertText(')', 1) : null;
        },
        91: function() {
            this.options.insertClosingBrackets ? this.insertText(']', 1) : null;
        },
        123: function() {
            this.options.insertClosingBrackets ? this.insertText('}', 1) : null;
        }
    };
    
    var shortcuts = function() {};
    shortcuts.prototype = {
        37: function() {
            this.wrapper.item().scrollLeft = 0;
        },
        38: function() {
            this.wrapper.item().scrollTop = 0;
            this.caret.moveTo(0);
        },
        39: function() {
            var w = this.wrapper.item();
            w.scrollLeft = w.scrollWidth;
        },
        40: function() {
            var w = this.wrapper.item();
            w.scrollTop = w.scrollHeight;
            this.caret.moveTo(-1);
        },
        73: function() {
            this.infobar.element.item().style.display == 'none' ? this.infobar.show() : this.infobar.hide();
        },
        78: function() {
            this.counter.element.item().style.display == 'none' ? this.counter.show() : this.counter.hide();
        },
        82: function() {
            this.print();
        }
    };
    
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