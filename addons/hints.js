CodePrinter.defineAddon('hints', function() {
    
    var defaults = {
        word: /[\w$]+/,
        range: 500,
        maxWidth: 300,
        maxHeight: 100
    }
    , li_clone = document.createElement('li');
    
    var Hints = function(cp, options) {
        var that = this, active, container, visible;
        
        this.options = options = {}.extend(defaults, options); 
        cp.hints = this;
        
        this.overlay = cp.document.createOverlay('cp-hint-overlay', false);
        container = document.createElement('div');
        container.className = 'cp-hint-container';
        this.overlay.node.appendChild(container);
        
        this.overlay.on('refresh', function(a) {
            if (a !== 'changed') {
                that.hide();
            } else {
                that.show(false);
            }
        });
        
        options.maxWidth != 300 && container.css('maxWidth', options.maxWidth);
        options.maxHeight != 100 && container.css('maxHeight', options.maxHeight);
        
        this.search = function() {
            var list = [], seen = {}
            , word = options.word, range = options.range
            , rgx = new RegExp(word.source, 'g')
            , caret = cp.caret
            , line = caret.line()
            , col = caret.column(true)
            , curDL = caret.dl()
            , text = curDL.text
            , lines = cp.document.lines()
            , end = col, dl, text, m, curWord
            , nextFn, hasOwnProperty, fn;
            
            while (col && word.test(text.charAt(col - 1))) --col;
            curWord = col != end && text.slice(col, end); 
            
            hasOwnProperty = Object.prototype.hasOwnProperty;
            fn = curWord
            ? function(match) {
                if (!hasOwnProperty.call(seen, match)) {
                    var det = determinant(curWord, match);
                    if (det) {
                        seen[match] = det;
                        list.push(match);
                    } else {
                        seen[match] = null;
                    }
                }
            }
            : function(match) {
                if (hasOwnProperty.call(seen, match)) {
                    ++seen[match];
                } else {
                    seen[match] = 1;
                    list.push(match);
                }
            }
            
            for (var dir = -1; dir <= 1; dir += 2) {
                end = Math.min(Math.max(0, line + dir * range), lines);
                nextFn = dir < 0 ? curDL.prev : curDL.next;
                dl = curDL;
                
                for (var i = line; i != end; i += dir) {
                    text = dl.text;
                    while (m = rgx.exec(text)) {
                        if (i == line && m[0] === curWord) continue;
                        fn(m[0]);
                    }
                    dl = nextFn.call(dl);
                }
            }
            return list.sort(function(a, b) { return seen[b] - seen[a]; });
        }
        this.show = function(autocomplete) {
            var list = this.search(), ul;
            
            container.innerHTML = '<ul></ul>';
            ul = container.firstChild;
            
            if (list.length) {
                if (list.length == 1 && autocomplete !== false) {
                    return this.choose(list[0]);
                }
                for (var i = 0; i < list.length; i++) {
                    var li = li_clone.cloneNode();
                    li.innerHTML = list[i];
                    ul.appendChild(li);
                }
                this.overlay.reveal();
                refreshPosition();
                setActive(ul.children[0]);
                visible = true;
            }
            return this;
        }
        this.hide = function() {
            this.overlay.remove();
            visible = active = undefined;
        }
        this.choose = function(value) {
            var word = this.options.word;
            cp.removeWordBefore(word);
            cp.insertText(value);
            return this;
        }
        
        cp.on({
            '@Up': function(e) {
                if (visible) {
                    var last = container.children[0].lastChild;
                    setActive(active && active.prev() || last);
                    return e.cancel();
                }
            },
            '@Down': function(e) {
                if (visible) {
                    var first = container.children[0].firstChild;
                    setActive(active && active.next() || first);
                    return e.cancel();
                }
            },
            '@Enter': function(e) {
                if (visible && active) {
                    that.choose(active.innerHTML);
                    that.hide();
                    return e.cancel();
                }
            },
            '@Esc': function(e) {
                if (visible) {
                    that.hide();
                    return e.cancel();
                }
            }
        });
        
        cp.registerKey({
            'Ctrl+Space': function() {
                this.hints.show();
            }
        });
        
        container.delegate('li', {
            mousedown: function(e) {
                that.choose(this.innerHTML);
                that.hide();
                return e.cancel();
            },
            mouseover: function(e) {
                setActive(this);
            },
            mouseout: function(e) {
                setActive(null);
            }
        });
        
        function determinant(current, match) {
            var j, k = 0, det = 0;
            for (var i = 0, l = current.length; i < l; i++) {
                if ((j = match.indexOf(current[i], k)) >= k) {
                    det += (i + 1) / (j - k + 1);
                    k = j + 1;
                }
            }
            return det;
        }
        function refreshPosition() {
            var x = cp.caret.offsetX() - 4
            , y = cp.caret.offsetY(true) + cp.sizes.paddingTop;
            
            if (y + container.clientHeight > cp.wrapper.scrollHeight) {
                y = cp.caret.offsetY() - container.clientHeight;
            }
            if (x + container.clientWidth > cp.wrapper.scrollWidth) {
                x = x - container.clientWidth;
            }
            
            container.style.top = y+'px';
            container.style.left = x+'px';
        }
        function setActive(li) {
            if (active) active.removeClass('active');
            if (li) {
                active = li.addClass('active');
                container.scrollTop = scrollTop(li);
            } else {
                active = null;
            }
        }
        function scrollTop(li) {
            var ot = li.offsetTop, st = container.scrollTop, loh = li.offsetHeight, ch = container.clientHeight;
            return ot < st ? ot : ot + loh < st + ch ? st : ot - ch + loh;
        }
        return this;
    }
    
    Hints.prototype = {
        setRange: function(range) {
            this.options.range = range;
        },
        setWordPattern: function(word) {
            this.options.word = word;
        }
    }
    
    return Hints;
});