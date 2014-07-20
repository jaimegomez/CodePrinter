/* CodePrinter - Markdown Mode */

CodePrinter.defineMode('Markdown', function() {
    
    var italicRgx = /[^\\\*](\*|\_)(?!\1)/
    , boldRgx = /[^\\](\*\*|\_\_)/;
    
    return {
        regexp: /([\~\*\_]){1,2}|\`+/,
        
        parse: function(stream, memory) {
            var line, trim, found, _found;
            
            while (line = stream.read()) {
                trim = line.trim();
                
                if (trim[0] === '>') {
                    stream.wrap('string', 'blockquote');
                } else if (/^\-+\s*\-+\s*\-+$/.test(trim) || /^\*+\s*\*+\s*\*+$/.test(trim)) {
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
                    
                    while (found = stream.match(this.regexp, false)) {
                        if (found[0] === '*' || found[0] === '_') {
                            var ss, rest, lasti = 0, isbold = found[0] === found[1]
                            , base = isbold ? 'bold' : 'italic'
                            , s = stream.search(isbold ? boldRgx : italicRgx)
                            , rgx = isbold ? italicRgx : boldRgx;
                            
                            if (s >= 0) {
                                stream.wrap('comment');
                                ss = rest = stream.substring(0, s+1);
                                
                                while ((s = rest.search(rgx)) >= 0) {
                                    var s2, _found = RegExp.$1
                                    , leftContext = RegExp.leftContext
                                    , lastMatch = RegExp.lastMatch;
                                    
                                    if ((s2 = rest.substr(leftContext.length + 1 + _found.length).search(rgx)) >= 0) {
                                        var wrapped = RegExp.leftContext + RegExp.lastMatch[0];
                                        if (s > 0) {
                                            stream.eat(leftContext + lastMatch[0]).wrap('parameter', base);
                                            lasti += leftContext.length + 1;
                                        }
                                        stream.eat(_found).wrap('comment');
                                        stream.eat(wrapped).wrap('parameter', 'bold', 'italic');
                                        stream.eat(_found).wrap('comment');
                                        rest = ss.substr(lasti += 2 * _found.length + wrapped.length);
                                    } else {
                                        break;
                                    }
                                }
                                
                                if (rest.length) stream.eat(rest).wrap('parameter', base);
                                stream.eat(found).wrap('comment');
                            } else {
                                stream.skip();
                            }
                        } else if (found[0] === '`') {
                            if (found.length > 1) stream.eatWhile(found, found);
                            else stream.eat(found, found);
                            stream.wrap('comment', 'code');
                        } else {
                            stream.wrap('other');
                        }
                    }
                }
            }
            
            return stream;
        }
    }
});