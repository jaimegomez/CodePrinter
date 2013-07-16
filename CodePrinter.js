/* CodePrinter - Main JavaScript Document */

(function(window, $) {
    
    var CodePrinter = function(object, options) {
        if (!(this instanceof CodePrinter)) {
            return new CodePrinter(object, options);
        }
        
        this.options = {}.extend(CodePrinter.defaults, options, $.parseData(object.data('codeprinter'), ','));
        
        var mainElement = $.create('div.codeprinter'),
            container = $.create('div.cp-container'),
            wrapper = $.create('div.cp-wrapper'),
            overlay = $.create('div.cp-overlay');
        
        object.wrap(wrapper);
        wrapper.wrap(container);
        container.wrap(mainElement);
        wrapper.append(overlay);
        
        this.mainElement = mainElement;
        this.container = container;
        this.wrapper = wrapper;
        this.overlay = overlay;
        this.source = object.addClass('cp-source');
        
        this.prepare();
        this.print();
        
        return this;
    };
    
    CodePrinter.version = '0.1.5';
    
    CodePrinter.Modes = {};
    CodePrinter.defaults = {
        mode: 'javascript',
        theme: 'default',
        tabWidth: 4,
        counter: true,
        infobar: true,
        infobarOnTop: true,
        showIndent: true,
        scrollable: true,
        width: 'auto',
        maxHeight: 300,
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
                $.require('theme/'+options.theme+'.css');
                self.mainElement.addClass('cp-'+options.theme.toLowerCase().replace(' ', '-'));
            }
            
            if (options.counter) {
                self.counter = $.create('ol.cp-counter');
                self.container.prepend(self.counter);
            }
            if (options.infobar) {
                self.prepareInfobar();
            }
            
            self.measureSizes();
            
            self.mainElement.attr({ id: id });
            self.id = id;
            $.stylesheet.insert('#'+id+' .cp-overlay pre', 'min-height:'+sizes.lineHeight+'px;');
            $.stylesheet.insert('#'+id+' .cp-counter li', 'min-height:'+sizes.lineHeight+'px;');
            
            if (options.width != 'auto') {
                self.mainElement.css({ width: parseInt(options.width) });
            }
            
            self.wrapper.css({ width: self.mainElement.width() - self.wrapper.paddingWidth() - sizes.counterWidth });
            self.wrapper.add(self.counter).css({ height: options.maxHeight });
            overlay.inheritStyle(['line-height'], source);
            overlay.css({ position: 'absolute' }).addClass('cp-'+options.mode.toLowerCase()).html(source.value());
            self.adjustTextareaSize();
            
            if (self.counter) {
                self.wrapper.on('scroll', function() {
                    self.counter.current().scrollTop = this.scrollTop;
                });
            }
        },
        prepareInfobar: function() {
            var self = this,
                infobar = self.infobar;
                
            infobar = infobar || $.create('div.cp-infobar');
            
            if (self.options.infobarOnTop) {
                infobar.prependTo(self.mainElement);
            } else {
                infobar.appendTo(self.mainElement);
            }
            
            var mode = $.create('span.cp-mode', self.options.mode),
                actions = $.create('span.cp-actions'),
                plaintext = $.create('a.cp-plaintext', 'plaintext'),
                reprint = $.create('a.cp-reprint', 'reprint'),
                countChars = $.create('span.cp-countChars');
            
            actions.append(plaintext, reprint);
            infobar.append(mode, actions, countChars);
            
            plaintext.click(function() {
                var newWindow = window.open('', '_blank');
                newWindow.document.writeln('<pre style="font-size:14px;">' + parseEntities(self.getSourceValue()) + '</pre>');
            });
            reprint.click(function() {
                self.print();
            });
            self.infobar = infobar;
        },
        measureSizes: function() {
            var sizes = this.sizes,
                source = this.source;
            
            sizes.width = source.width();
            sizes.height = source.height();
            sizes.offsetWidth = source.offsetWidth();
            sizes.offsetHeight = source.offsetHeight();
            sizes.lineHeight = source.css('lineHeight');
            sizes.infobarHeight = this.infobar ? this.infobar.offsetHeight() : 0;
            sizes.counterWidth = this.counter ? this.counter.offsetWidth() : 0;
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
        reloadCounter: function() {
            if (this.counter) {
                var lines = this.parsed.length,
                    liLength = this.counter.children('li').length,
                    amp = lines - liLength;
    
                while (amp != 0) {
                    if (amp < 0) {
                        this.counter.children('li').last().remove();
                        amp++;
                    } else {
                        this.counter.append($.create('li'));
                        amp--;
                    }
                }
            }
        },
        reloadInfoBar: function() {
            if (this.infobar) {
                if (this.source.data('selected-words') == 0 || !this.source.data('selected-words')) {
                    this.infobar.children('span.countChars').html(this.value.length + ' characters, ' + this.parsed.length + ' lines');
                } else {
                    this.infobar.children('span.countChars').html(this.source.data('selected-words') + ' characters selected');
                }
            }
        },
        adjustTextareaSize: function() {
            var tx = this.source, item = tx.item();
            if (tx.tag() === 'textarea') {
                tx.width(0);
                tx.width(item.scrollWidth);
                tx.height(0);
                tx.height(item.scrollHeight);
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
                value = this.getSourceValue(),
                parsed = '',
                cpm;
            
            source.html(value);
            cpm = CodePrinter.getMode(mode);
            parsed = cpm.parse(value);
            
            overlay.html('');
            
            for (var j = 0; j < parsed.length; j++) {
                if (this.options.showIndent) {
                    parsed[j] = indentGrid(parsed[j], this.options.tabWidth);
                }
                overlay.append($.create('pre').html(parsed[j]));
            }
            
            this.value = value;
            this.parsed = parsed;
            this.reloadCounter();
            this.reloadInfoBar();
        }
    });
    
    CodePrinter.Mode = function() {
        if (!(this instanceof CodePrinter.Mode)) {
            return new CodePrinter.Mode(stream);
        }
        return this;
    };
    
    CodePrinter.Mode.prototype = {
        stream: '',
        eaten: '',
        wrap: function(suffix, tag) {
            var result = '',
                tmp = this.eaten.split(/\n/g);
            
            suffix = (suffix instanceof Array) ? suffix : [suffix];
            tag = tag ? tag : 'span';
            
            for (var i = 0; i < suffix.length; i++) {
                suffix[i] = 'cp-'+suffix[i];
            }
            
            for (var i = 0; i < tmp.length; i++) {
                result += '<'+tag+' class="'+suffix.join(' ')+'">'+ tmp[i] +'</'+tag+'>';
                if (i !== tmp.length - 1) {
                    result += "\n";
                }
            }
            return result;
        },
        eat: function(from, to) {
            var str = this.stream,
                indexFrom = str.indexOf(from),
                indexTo = 0;
            
            if (to === "\n") {
                indexTo = str.indexOf(to) - 1;
            } else if (from === to) {
                indexTo = str.indexOf(to, 1);
                if (indexTo === -1) indexTo = str.length;
            } else {
                if(!to) to = from;
                indexTo = str.indexOf(to);
                if (indexTo === -1) indexTo = indexFrom;
            }
            
            this.eaten = str.substring(indexFrom, indexTo + to.length);
            this.stream = str.substr(indexTo + to.length);
            return this;
        },
        setStream: function(text) {
            text = typeof text === 'string' ? text : '';
            this.stream = text;
            return this;
        },
        parse: function(stream) {
            var p = this.setStream(stream).fn();
            return typeof p === 'string' ? p.split(/\n/g) : '';
        },
        fn: function() {
            return this.stream;
        }
    };
    
    $.each(['substr','substring','replace','search','match','split'], function(v) {
        CodePrinter.Mode.prototype[v] = function() {
            return this.stream[v].apply(this.stream, arguments);
        };
    });
    
    CodePrinter.defineMode = function(name, obj) {
        if (name && obj) {
            CodePrinter.Modes[name] = (new CodePrinter.Mode()).extend(obj);
        }
    };
    CodePrinter.getMode = function(name) {
        return CodePrinter.Modes[name] || (new CodePrinter.Mode());
    };
    
    function parseEntities(text) {
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