/* CodePrinter JS File */

(function(window, $) {
    
    var CodePrinter = function(object, options) {
        if (!(this instanceof CodePrinter)) {
            return new CodePrinter(object, options);
        }
        
        this.options = {}.extend(CodePrinter.defaults, options, $.parseData(object.data('codeprinter')));
        
        var mainElement = $.create('div.codeprinter'),
            wrapper = $.create('div.cp-wrapper'),
            overlay = $.create('div.cp-overlay');
        
        object.wrap(wrapper);
        wrapper.wrap(mainElement);
        wrapper.append(overlay);
        
        this.mainElement = mainElement;
        this.wrapper = wrapper;
        this.overlay = overlay;
        this.source = object.addClass('cp-source');
        
        this.prepare();
        this.print();
        
        return this;
    };
    
    CodePrinter.version = '0.1.0';
    
    CodePrinter.prototype = {}.extend({
        sizes: {},
        prepare: function() {
            var self = this,
                source = self.source,
                overlay = self.overlay,
                options = self.options,
                sizes = self.sizes,
                id = $.random(options.randomIDLength);
            
            if (options.counter) {
                self.counter = $.create('ol.cp-counter');
                self.wrapper.prepend(self.counter);
            }
            if (options.infobar) {
                self.prepareInfobar();
            }
            
            self.measureSizes();
            
            self.mainElement.attr({ id: id });
            self.id = id;
            $.stylesheet.insert('#'+id+' .cp-overlay pre', 'min-height:'+sizes.lineHeight+'px;');
            $.stylesheet.insert('#'+id+' .cp-counter li', 'min-height:'+sizes.lineHeight+'px;');
            
            if (self.counter) {
                self.counter.css({ position: 'absolute', width: self.counter.width() });
            }
            self.wrapper.css({ width: sizes.offsetWidth, height: sizes.offsetHeight });
            overlay.inheritStyle(['width','height','line-height'], source);
            overlay.add(source).css({ position: 'absolute', top: 0, left: sizes.counterWidth });
            overlay.html(source.value());
            if (self.counter && options.scrollable) {
                self.wrapper.on('scroll', function(e) {
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
            
            infobar.html('<span class="mode">'+ self.options.mode +'</span><span class="options"><a href="">copy</a><a href="#" class="plaintext">plaintext</a></span><span class="countChars"></span>');
            infobar.find('a.plaintext').click(function() {
                var newWindow = window.open('', '_blank');
                newWindow.document.writeln('<pre>' + parseEntities(self.source.value()) + '</pre>');
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
    
                for( ; amp != 0; ) {
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
        getSourceValue: function() {
            return this.source.html().replace(/\t/g, Array(this.options.tabWidth+1).join(' '));
        },
        print: function(mode, line) {
            if (!mode) {
                mode = this.options.mode;
            }
            
            var source = this.source,
                overlay = this.overlay,
                value = this.getSourceValue();
            
            source.html(value);
            this.value = value = parseEntities(value);
            this.parsed = CodePrinter[mode].fn(value).split(/\n/g);
            
            overlay.html('');
            
            for (var j = 0; j < this.parsed.length; j++) {
                if (this.options.showIndent) {
                    this.parsed[j] = indentGrid(this.parsed[j], this.options.tabWidth);
                }
                overlay.append($.create('pre').html(this.parsed[j]));
            }
            
            this.reloadCounter();
            this.reloadInfoBar();
            
            if (this.options.scrollable && this.wrapper.height() > this.options.maxHeight) {
                this.wrapper.add(this.source, this.counter).css({ height: this.options.maxHeight });
            }
        }
    });
    
    CodePrinter.defaults = {
        mode: 'javascript',
        tabWidth: 4,
        counter: true,
        infobar: true,
        infobarOnTop: true,
        showIndent: true,
        scrollable: true,
        maxHeight: 300,
        randomIDLength: 7
    };
    
    function parseEntities(text) {
        return text ? text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
    };
    function indentGrid(text, width) {
        var pos = text.search(/[^\s]/);
        if(pos == -1) pos = text.length;
        var tmp = [ text.substring(0, pos), text.substr(pos) ];
        tmp[0] = tmp[0].replace(new RegExp("(\\s{"+ width +"})", "g"), '<span class="tab">$1</span>');
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