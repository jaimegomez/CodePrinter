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
        insertClosingQuotes: true,
        shortcuts: true,
        showFinder: false,
        searchOnTheFly: false,
        width: 'auto',
        height: 'auto',
        randomIDLength: 7
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
            
            self.infobar = new InfoBar(self);
            options.infobar ? self.infobar.show() : self.infobar.hide();
            
            self.measureSizes();
            self.activeLine = {};
            
            self.mainElement.attr({ id: id });
            self.id = id;
            
            options.fontSize != 12 && options.fontSize > 0 ? overlay.add(source, self.counter.element).css({ fontSize: parseInt(options.fontSize) }) : 0;
            options.lineHeight != 16 && options.lineHeight > 0 ? id = '#'+id+' .cp-' && $.stylesheet.insert(id+'overlay pre, '+id+'counter, '+id+'source', 'line-height:'+options.lineHeight+'px;') : 0;
            options.width > 0 ? self.mainElement.css({ width: parseInt(options.width) }) : 0;
            options.height > 0 ? self.container.css({ height: parseInt(options.height) }) : 0;
            source.tag() === 'textarea' ? self.prepareWriter() : 0;
            
            overlay.addClass('cp-'+options.mode.toLowerCase());
            source.html(encodeEntities(this.getSourceValue()));
            self.adjust();
            
            options.showFinder ? this.finder = new Finder(self) : 0;
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
                    caret.activate().reload();
                },
                blur: function() {
                    caret.deactivate();
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
                    
                    self.keypressMap.touch(k, self, e, ch) !== false ? self.insertText(ch, 0) : null;
                    self.emit('keypress:'+k, { code: k, char: ch, event: e });
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
                    sW, sH;
                
                source.css({ width: 0, height: 0 });
                sW = source.scrollWidth() + source.css('paddingRight');
                sH = source.scrollHeight();
                source.css({ width: sW < wrapper.clientWidth() ? null : sW, height: sH < wrapper.clientHeight() ? null : sH });
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
            var self = this,
                sT = document.body.scrollTop,
                sL = document.body.scrollLeft,
                stream = this.stream = this.stream || new Stream(),
                old = stream.parsed.slice(0),
                h = CodePrinter.hasMode(mode);
            
            CodePrinter.requireMode(mode, function(ModeObject) {
                if (h === false) {
                    ModeObject.keydownMap ? this.keydownMap.extend(ModeObject.keydownMap) : null;
                    ModeObject.keypressMap ? this.keypressMap.extend(ModeObject.keypressMap) : null;
                }
                
                stream.on({
                    'substream:parsed': function() {
                        self.render(this);
                    }
                });
                stream.defineParser(ModeObject);
                stream.parse(this.getSourceValue());
                this.render(stream, old);
                document.body.scrollTop = sT;
                document.body.scrollLeft = sL;
            }, this);
        },
        forcePrint: function() {
            this.stream = null;
            this.print();
        },
        render: function(stream, old) {
            stream = stream || this.stream;
            
            var ov = this.overlay,
                ln = ov.lines.length,
                parsed = stream.parsed,
                j = -1;
            
            while (parsed[++j] != null) {
                if (!old || old[j] == null || parsed[j] !== old[j]) {
                    ov.set(j, this.options.showIndent ? indentGrid(parsed[j], this.options.tabWidth) : parsed[j]);
                }
            }
            if (parsed.length < ln) {
                for (var i = parsed.length; i < ln; i++) {
                    ov.remove(i);
                }
            }
            
            this.lines = j;
            this.counter.reload(j);
            this.infobar.reload(stream.startLength, j);
            this.adjust();
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
        setSelection: function(from, to) {
            this.source.item().setSelectionRange(from, to != null ? to : from);
            this.caret.reload();
        },
        textBeforeCursor: function(all) {
            var ta = this.source.item(),
                v = ta.value.substring(0, ta.selectionStart);
            
            return (typeof all === 'number' ? v.substr(v.length - all) : all !== true ? v.substring(v.lastIndexOf('\n')+1) : v);
        },
        textAfterCursor: function(all) {
            var ta = this.source.item(),
                v = ta.value.substr(ta.selectionStart);
            
            return (typeof all === 'number' ? v.substring(0, all) : all !== true ? v.substring(0, v.indexOf('\n')) : v);
        },
        insertText: function(text, mv, j) {
            var ta = this.source.item(),
                v = ta.value,
                s = ta.selectionStart,
                e = ta.selectionEnd;
            
            mv = typeof mv === 'number' ? mv : 0;
            j = typeof j === 'number' ? j : 0;
            
            if (mv <= 0) {
                v = v.substring(0, s + mv) + text + v.substring(s + mv, s) + v.substr(e);
                s = s + text.length;
            } else {
                --mv;
                v = v.substring(0, s) + v.substring(e, e + mv) + text + v.substr(e + mv);
            }
            ta.value = v;
            ta.setSelectionRange(s + j, s + j);
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
        update: function() {
            this.print();
            this.caret.reload();
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
        },
        moveCursor: function(dst) {
            dst = !isNaN(dst) ? parseInt(dst) : 1;
            var s = this.source.item().selectionStart;
            this.setSelection(s + dst, s + dst);
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
            css.width = this.getTextSize(this.textBeforeCursor(1)).width + 2;
            css.height = 1;
            css.top = css.top + this.sizes.lineHeight - 1;
            css.left = css.left - 1;
            return css;
        },
        block: function(css, pos) {
            css.width = this.getTextSize(this.textBeforeCursor(1)).width;
            css.height = this.sizes.lineHeight;
            return css;
        }
    };
    Caret.prototype = {
        activate: function() {
            this.element.show();
            if (this.root.options.blinkCaret) {
                var elm = this.element, a = true;
                this.interval = setInterval(function() {
                    a === true ? elm.hide() : elm.show();
                    a = !a;
                }, 400);
            }
            return this;
        },
        deactivate: function() {
            if (this.interval) {
                this.interval = clearInterval(this.interval);
            }
            this.element.hide();
            this.line = -1;
            return this;
        },
        reload: function() {
            var root = this.root,
                stl = root.options.caretStyle,
                pos = this.getPosition(),
                css = { left: pos.x, top: pos.y };
            
            Caret.styles[stl] instanceof Function ? css = Caret.styles[stl].call(root, css, pos) : css.height = root.sizes.lineHeight;
            this.element.show().css(css);
            
            this.line != pos.line ? this.emit('line.changed', { last: this.line, current: pos.line }) : null;
            this.line = pos.line;
            
            this.emit('reloaded', { position: pos });
            return this;
        },
        getPosition: function() {
            var root = this.root,
                source = root.source,
                y = 0, x = 0, line, tsize;
            
            source.focus();
            line = root.getCurrentLine();
            tsize = root.getTextSize(root.textBeforeCursor());
            x = tsize.width + source.total('paddingLeft', 'borderLeftWidth');
            y = line * (root.sizes.lineHeight) + source.total('paddingTop', 'borderTopWidth');
            return { x: parseInt(x), y: parseInt(y), line: line };
        },
        moveTo: function(pos, len) {
            var l = this.root.value.length;
            pos = (pos || 0) % (l + 1);
            while (pos < 0) {
                pos = pos + (l + 1);
            }
            this.root.source.item().setSelectionRange(pos, pos + (len || 0));
            return this.reload();
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
                amp < 0 ? this.decrease() && amp++ : this.increase() && amp--;
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
            this.root.container.prepend(this.element);
            this.root.wrapper.css({ marginLeft: this.element.offsetWidth() });
        },
        hide: function() {
            this.element.remove();
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
                    bf = root.getTextAtLine(line).substring(0, ln);
                    ln = bf.length + find.length;
                    span.css(root.getTextSize(find).extend({ top: pdy + line * root.sizes.lineHeight, left: pdx + root.getTextSize(bf).width }));
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
    
    var Stream = function() {
        if (!(this instanceof Stream)) {
            return new Stream();
        }
        this.value = [];
        this.parsed = [];
        return this;
    };
    Stream.prototype = {
        found: '',
        eaten: '',
        row: 0,
        pos: 0,
        defineParser: function(parser) {
            if (parser instanceof CodePrinter.Mode) {
                this.parser = parser;
            }
        },
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
        parse: function(str) {
            var v = this.value.slice(0),
                d = this.parsed.length - this.value.length;
            
            this.value = typeof str === 'string' ? $.browser.windows ? str.split('\r\n') : str.split('\n') : str;
            this.startLength = str.length;
            
            if (d > 0) {
                this.parsed.splice(this.value.length, d);
            }
            
            for (var i = 0; i < this.value.length; i++) {
                this.setRow(i, 0);
                if (v[i] == null || this.value[i] !== v[i]) {
                    this.parsed[i] = '';
                    this.parser.fn(this);
                }
                if (this.row > i+1) {
                    i = this.row - 1;
                }
            }
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
                        
                        while (++this.row < this.value.length) {
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
                        this.pos = str2.length;
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
                    this.eat();
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
            if (typeof this.parsed[this.row] === 'string' && txt.length) {
                this.parsed[this.row] = this.parsed[this.row] + txt;
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
        parse: function(text) {
            var ns = new Stream();
            ns.defineParser(this);
            ns.parse(text);
            return ns;
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
            var t = this.textBeforeCursor(),
                m = t.match(/ +$/),
                r = m && m[0] && m[0].length % this.options.tabWidth === 0 ? this.tabString() : 1;
            
            this.removeBeforeCursor(r);
            this.update();
            return e.cancel();
        },
        9: function(e) {
            this.insertText(this.tabString());
            this.update();
            return e.cancel();
        },
        13: function(e) {
            var t = this.textBeforeCursor().match(/^ +/),
                a = '\n' + (this.options.indentNewLines && t && t[0] ? t[0] : '');
            
            this.overlay.insert();
            if (this.textBeforeCursor(1) === '{') {
                this.insertText(a + this.tabString());
                this.textAfterCursor(1) === '}' && this.insertText(a, 1);
            } else {
                this.insertText(a);
            }
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
        touch: function(code, self, event, char) {
            if (this[code]) {
                return this[code].call(self, event, code, char);
            }
        },
        34: function(e, k, ch) {
            if (this.options.insertClosingQuotes) {
                this.textAfterCursor(1) !== ch ? this.insertText(ch + ch, 0, -1) : this.moveCursor(1);
                return false;
            }
        },
        40: function(e, k, ch) {
            if (this.options.insertClosingBrackets) {
                this.insertText(ch + (k === 40 ? String.fromCharCode(41) : String.fromCharCode(k+2)), 0, -1);
                return false;
            }
        },
        41: function(e, k, ch) {
            if (this.options.insertClosingBrackets && this.textAfterCursor(1) == ch) {
                this.moveCursor(1);
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
            this.counter.element.item().parentNode == null ? this.counter.show() : this.counter.hide();
        },
        82: function() {
            this.forcePrint();
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