/* CodePrinter - Main JavaScript Document */

(function(window, $) {
    
    $.scripts.registerNamespace('CodePrinter', 'mode/');
    
    var CodePrinter = function(object, options) {
        if (!(this instanceof CodePrinter)) {
            return new CodePrinter(object, options);
        }
        
        var self = this,
            mainElement = $.create('div.codeprinter'),
            container = $.create('div.cp-container'),
            wrapper = $.create('div.cp-wrapper'),
            overlay = $.create('div.cp-overlay');
        
        self.options = {}.extend(CodePrinter.defaults, options, $.parseData(object.data('codeprinter'), ','));
        
        object.wrap(wrapper);
        wrapper.wrap(container);
        container.wrap(mainElement);
        wrapper.append(overlay);
        
        self.mainElement = mainElement;
        self.container = container;
        self.wrapper = wrapper;
        self.overlay = overlay;
        self.source = object.addClass('cp-source');
        
        self.prepare();
        self.print();
        
        return self;
    };
    
    CodePrinter.version = '0.2.3';
    
    CodePrinter.defaults = {
        path: '',
        mode: 'javascript',
        theme: 'default',
        tabWidth: 4,
        fontSize: 12,
        lineHeight: 16,
        counter: true,
        infobar: true,
        infobarOnTop: true,
        showIndent: true,
        scrollable: true,
        highlightBrackets: false,
        width: 'auto',
        maxHeight: null,
        randomIDLength: 7
    };
    
    CodePrinter.prototype = {}.extend({
        sizes: {},
        prepare: function() {
            var self = this,
                source = self.source,
                overlay = self.overlay,
                options = self.options,
                sizes = self.sizes,
                id = $.random(options.randomIDLength);
            
            if (typeof options.theme === 'string' && options.theme !== 'default') {
                self.requireStyle(options.theme);
            } else {
                options.theme = 'default';
            }
            self.mainElement.addClass('cps-'+options.theme.toLowerCase().replace(' ', '-'));
            
            if (options.counter) {
                self.counter = new Counter(self);
            }
            if (options.infobar) {
                self.infobar = new InfoBar(self);
            }
            
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
            if (options.width != 'auto') {
                self.mainElement.css({ width: parseInt(options.width) });
            }
            if (options.maxHeight > 0) {
                self.wrapper.add(self.counter.element).css({ height: parseInt(options.maxHeight) });
            }
            
            overlay.inheritStyle(['line-height'], source);
            overlay.css({ position: 'absolute' }).addClass('cp-'+options.mode.toLowerCase());
            source.html(this.getSourceValue());
            self.adjustTextareaSize();
            
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
        measureSizes: function() {
            var sizes = this.sizes,
                source = this.source;
            
            sizes.width = source.width();
            sizes.height = source.height();
            sizes.offsetWidth = source.offsetWidth();
            sizes.offsetHeight = source.offsetHeight();
            sizes.lineHeight = source.css('lineHeight');
            sizes.infobarHeight = this.infobar ? this.infobar.element.offsetHeight() : 0;
            sizes.counterWidth = this.counter ? this.counter.element.offsetWidth() : 0;
        },
        getTextSize: function(text) {
            if (text == null) text = 'c';
            var h = 0, w = 0,
                styles = ['fontSize','fontStyle','fontWeight','fontFamily','textTransform', 'letterSpacing', 'whiteSpace'],
                tmpdiv = $.create('div');
            
            this.mainElement.append(tmpdiv.text(text));
            tmpdiv.css({ whiteSpace: 'pre', position: 'absolute', left: -1000, top: -1000, display: 'inline-block' });
            tmpdiv.inheritStyle(styles, this.source);
            h = tmpdiv.height(),
            w = tmpdiv.width();
            tmpdiv.remove();
            
            return { height: h, width: w };
        },
        adjustTextareaSize: function() {
            var tx = this.source, item = tx.item();
            if (tx.tag() === 'textarea') {
                tx.width(0);
                tx.width(item.scrollWidth - tx.paddingWidth());
                tx.height(0);
                tx.height(item.scrollHeight - tx.paddingHeight());
            }
        },
        unselectLine: function() {
            if (this.activeLine.pre) {
                this.activeLine.pre.add(this.activeLine.li).removeClass('cp-activeLine');
            }
        },
        selectLine: function(l) {
            this.unselectLine();
            this.activeLine.pre = this.overlay.children().eq(l).addClass('cp-activeLine');
            if (this.counter) {
                this.activeLine.li = this.counter.list.eq(l).addClass('cp-activeLine');
            }
        },
        getSourceValue: function() {
            return this.source.html().replace(/\t/g, Array(this.options.tabWidth+1).join(' '));
        },
        print: function(mode) {
            if (!mode) {
                mode = this.options.mode;
            }
            
            var source = this.source,
                overlay = this.overlay,
                value = decodeEntities(this.getSourceValue()),
                pre = overlay.children('pre'),
                parsed, j = -1;
            
            CodePrinter.requireMode(mode, function(ModeObject) {
                parsed = ModeObject.parse(value);
                
                while (parsed[++j] != null) {
                    if (this.options.showIndent) {
                        parsed[j] = indentGrid(parsed[j], this.options.tabWidth);
                    }
                    if (j < pre.length) {
                        pre.eq(j).html(parsed[j] || ' ');
                    } else {
                        var p = $.create('pre').html(parsed[j] || ' ');
                        pre.push(p);
                        overlay.append(p);
                    }
                }
                
                if (parsed.length < pre.length) {
                    for (var i = parsed.length; i < pre.length; i++) {
                        pre.eq(i).remove();
                    }
                }
                
                this.lines = j;
                this.value = value;
                this.parsed = parsed;
                if (this.counter) {
                    this.counter.reload(j);
                }
                if (this.infobar) {
                    this.infobar.reload(value.length, j);
                }
            }, this);
        },
        requireStyle: function(style, callback) {
            $.require(this.options.path+'theme/'+style+'.css', callback);
        },
        requireMode: function(mode, callback) {
            $.require(this.options.path+'mode/'+mode+'.js', callback);
        }
    });
    
    var Counter = function(cp) {
        var self = this;
        self.element = $.create('ol.cp-counter');
        self.list = $([]);
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
            var li = $.create('li');
            this.list.push(li.item());
            this.element.append(li);
        },
        decrease: function() {
            this.list.get(0).remove(true);
        }
    };
    
    var InfoBar = function(cp) {
        var mode = $.create('span.cp-mode').html(cp.options.mode),
            act = $.create('span.cp-actions'),
            ch = $.create('span.cp-characters');
        
        this.element = $.create('div.cp-infobar').append(mode, act, ch);
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
            },
            reprint: {
                func: function() {
                    cp.print();
                }
            },
            scrollup: {
                func: function() {
                    cp.wrapper.item().scrollTop = 0;
                },
                text: 'scroll up'
            },
            scrolldown: {
                func: function() {
                    var w = cp.wrapper.item();
                    w.scrollTop = w.scrollHeight;
                },
                text: 'scroll down'
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
            var el = $.create('a.cp-'+name, typeof text === 'string' ? text : name);
            el.on('click', func).appendTo(this.element.actions);
            this.actions[name] = {
                func: func,
                element: el
            };
            return el;
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
        return $.create('div').html(text).text();
    }
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
    
    window.CodePrinter = CodePrinter;
})(window, Selector);