/* CodePrinter - Markdown Mode */

CodePrinter.defineMode('Markdown', function() {
    
    var italicRgx = /(^|[^\\])(\*|\_)(?!\2)/
    , boldRgx = /(^|[^\\])(\*\*|\_\_)/;
    
    return new CodePrinter.Mode({
        name: 'Markdown',
        regexp: /([\~\*\_]){1,2}|\`+/,
        
        parse: function(stream, memory) {
            var sb = stream.stateBefore
            , line, trim, found, _found;
            
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
            } else if (/^\s*\d+\.\s/.test(line)) {
                stream.wrap('numeric', 'ordered-list');
            } else if (/^[\*\+\-]\s/.test(trim)) {
                stream.wrap('numeric', 'hex', 'unordered-list');
            } else if (/^(\#+)/.test(trim)) {
                var c = Math.max(4, 16 - RegExp.$1.length);
                stream.wrap('namespace', 'header', 'font-'+c+'0');
            } else if (/^(\=+|\-+)$/.test(trim)) {
                stream.wrap('operator', 'header-rule');
            } else if (stream.testNextLine(/^\s*(\=|\-){2,}\s*$/)) {
                stream.wrap('namespace', 'header', 'font-' + (RegExp.$1 === '=' ? '150' : '140'));
            } else {
                stream.reset();
                
                while (found = stream.match(this.regexp)) {
                    if (found[0] === '*' || found[0] === '_') {
                        var begin = found
                        , isbold = found[0] === found[1]
                        , cls = isbold ? 'bold' : 'italic'
                        , rgx = isbold ? italicRgx : boldRgx
                        , i, _found, _rgx;
                        
                        stream.save();
                        stream.wrap('comment');
                        
                        while (found = stream.capture(rgx, 2)) {
                            i = stream.indexOfFound + RegExp.$1.length;
                            var escape = found.escape();
                            _rgx = new RegExp(isbold ? '(^|[^\\\\'+escape+'])('+escape+')(?=[^\\2][^\\2])' : '(^|[^\\\\'+found[0].escape()+'])('+escape+')');
                            
                            if (_found = stream.capture(_rgx, 2, i + found.length)) {
                                i > 0 && stream.cut(i).wrap('parameter', cls);
                                stream.eat(found).wrap('comment');
                                stream.cut(stream.indexOfFound + RegExp.$1.length).wrap('parameter', 'bold', 'italic');
                                stream.eat(_found).wrap('comment');
                            } else {
                                break;
                            }
                        }
                        if (found = stream.capture(new RegExp(isbold ? '(^|[^\\\\])('+begin[0].escape()+')\\2(?!\\2)' : '(^|[^\\\\])('+begin.escape()+')(?!\\2)'), 2)) {
                            stream.cut(stream.indexOfFound + RegExp.$1.length).wrap('parameter', cls);
                            stream.eat(isbold ? found + found : found).wrap('comment');
                        } else {
                            stream.restore();
                            stream.skip(begin);
                        }
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
        }
    });
});