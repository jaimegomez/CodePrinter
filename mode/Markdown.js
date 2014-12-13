/* CodePrinter - Markdown Mode */

CodePrinter.defineMode('Markdown', function() {
    var listsRegexp = /^\s*([\*\+\-]|\d+\.)(\s|$)/;
    
    function typeOfList(txt) {
        if (listsRegexp.test(txt)) {
            var gr = RegExp.$1;
            return gr.length === 1 ? gr : 'd';
        }
        return false;
    }
    function levelOfParentalItem(type, parent) {
        var p = 0;
        while (parent && type !== typeOfList(parent.text)) {
            ++p;
            parent = parent.parentalListItem;
        }
        return parent ? p : -1;
    }
    
    return new CodePrinter.Mode({
        regexp: /([\~\*\_]){1,2}|\`+|!?\[([^\]]*)\]\(([^\)]*)\)/,
        
        parse: function(stream, memory) {
            var sb = stream.stateBefore
            , line, trim, found;
            
            if (sb && sb.code) {
                var c = sb.code;
                stream.eatWhile(c).wrap('comment', 'code');
                stream.isStillHungry() && stream.continueState();
            }
            
            line = stream.readline();
            trim = line.trim();
            
            if (trim[0] === '>') {
                stream.wrap('string', 'blockquote');
            } else if (/^(\-+\s+){2,}\-+$/.test(trim) || /^(\*+\s+){2,}\*+$/.test(trim)) {
                stream.wrap('escaped', 'horizontal-rule');
            } else if (/^(\#+)/.test(trim)) {
                var c = Math.max(0.4, 1.6 - RegExp.$1.length/10);
                stream.wrap('namespace', 'header').font(c);
            } else if (/^(\=+|\-+)$/.test(trim)) {
                stream.wrap('operator', 'header-rule');
            } else if (stream.testNextLine(/^\s*(\=|\-){2,}\s*$/)) {
                stream.wrap('namespace', 'header');
            } else {
                stream.reset();
                
                if (found = stream.match(listsRegexp)) {
                    var sign = RegExp.$1, eaten = stream.eat(sign);
                    if (isNaN(sign)) {
                        eaten.wrap('numeric', 'hex', 'unordered-list');
                    } else {
                        eaten.wrap('numeric', 'ordered-list');
                    }
                }
                
                while (found = stream.match(this.regexp)) {
                    if (found[0] === '!' || found[0] === '[') {
                        stream.eat('!').wrap('directive');
                        stream.eat('[').wrap('bracket');
                        stream.eat(RegExp.$2).wrap('string');
                        stream.eat('](').wrap('bracket');
                        stream.eat(RegExp.$3).wrap('keyword');
                        stream.eat(')').wrap('bracket');
                    } else if (found[0] === '*' || found[0] === '_' || found[0] === '~') {
                        stream.eat(found, found).wrap('parameter');
                    } else if (found[0] === '`') {
                        var ss;
                        if (found.length > 1) {
                            ss = stream.eatGreedily(found, found);
                            stream.isStillHungry() && stream.setStateAfter({ code: found });
                        } else {
                            ss = stream.eat(found, found);
                        }
                        ss.wrap('comment', 'code');
                    }
                }
            }
            return stream;
        },
        afterEnterKey: function(bf, af) {
            if (listsRegexp.test(bf)) {
                var sign = RegExp.$1;
                if (isNaN(sign)) {
                    this.insertText(sign+' ');
                } else {
                    this.insertText(parseInt(sign)+1 + '. ');
                }
            }
        },
        fixIndent: function(dl, expectedIndent) {
            var txt = dl.text, listType = typeOfList(txt);
            
            if (listType) {
                var prev = dl.prev()
                , bftype = prev && typeOfList(prev.text);
                
                if (bftype) {
                    if (prev.parentalListItem) {
                        if (listType !== bftype) {
                            var p = levelOfParentalItem(listType, prev.parentalListItem);
                            if (p >= 0) {
                                return expectedIndent - p - 1;
                            }
                            dl.parentalListItem = prev;
                            return expectedIndent + 1;
                        }
                        dl.parentalListItem = prev.parentalListItem;
                        return expectedIndent;
                    } else if (listType !== bftype) {
                        dl.parentalListItem = prev;
                        return expectedIndent + 1;
                    }
                }
            }
            if (dl.parentalListItem) delete dl.parentalListItem;
            return 0;
        }
    });
});