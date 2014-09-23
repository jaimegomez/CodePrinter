/* CodePrinter - HTML mode */

CodePrinter.defineMode('HTML', ['JavaScript', 'CSS'], function(JavaScript, CSS) {
    var selfClosingTagsRgx = /^(area|base|br|c(ol|ommand)|embed|hr|i(mg|nput)|keygen|link|meta|param|source|track|wbr)$/i
    , matchTagNameRgx = /<\s*(\w+)\s*[^>]*>?$/;
    
    return new CodePrinter.Mode({
        name: 'HTML',
        regexp: /<!--|<!\w+|<\/?|&[^;]+;/,
        regexp2: /[a-z\-]+|=|"|'|\/?\s*>|</i,
        blockCommentStart: '<!--',
        blockCommentEnd: '-->',
        
        parse: function(stream) {
            var sb = stream.stateBefore, found;
            
            if (sb) {
                if (sb.HTMLComment) {
                    stream.eatWhile('-->').wrap('comment');
                    stream.isStillHungry() && stream.continueState();
                } else if (sb.script || sb.style) {
                    this.parseBy(sb.parser, stream);
                    if (stream.isAborted) {
                        stream.reset();
                    } else {
                        stream.continueState(sb.script ? 'script' : 'style', 'parser');
                    }
                }
            }
            
            while (found = stream.match(this.regexp)) {
                if (found.substr(0, 2) === '<!') {
                    if (found === '<!--') {
                        stream.eatGreedily(found, '-->').wrap('comment');
                        stream.isStillHungry() && stream.setStateAfter('HTMLComment');
                    } else {
                        stream.eat(found, '>').wrap('special', 'doctype');
                    }
                } else if (found[0] === '<') {
                    stream.wrap('bracket', 'bracket-angle', 'bracket-open');
                    
                    if (found = stream.match(/^[a-z]+/i)) {
                        var tag = found.toLowerCase()
                        , isclosetag = stream.isBefore('/');
                        stream.wrap('keyword', found);
                        
                        while (found = stream.match(this.regexp2)) {
                            if (found === '<') {
                                break;
                            }
                            if (/^\w+$/.test(found)) {
                                stream.wrap('property', found);
                            } else if (found === '=') {
                                stream.wrap('operator', 'equal');
                            } else if (this.expressions[found]) {
                                stream.eat(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                            } else if (found[found.length-1] === '>') {
                                stream.wrap('bracket', 'bracket-angle', 'bracket-close');
                                break;
                            }
                        }
                        if (found !== '<' && !isclosetag) {
                            if (tag === 'script') {
                                this.parseBy(JavaScript, stream);
                                
                                if (stream.isAborted) {
                                    stream.reset();
                                } else {
                                    stream.setStateAfter({
                                        script: true,
                                        parser: JavaScript
                                    });
                                }
                            } else if (tag === 'style') {
                                this.parseBy(CSS, stream);
                                
                                if (stream.isAborted) {
                                    stream.reset();
                                } else {
                                    stream.setStateAfter({
                                        style: true,
                                        parser: CSS
                                    });
                                }
                            }
                        }
                    } else {
                        stream.wrap('invalid');
                        continue;
                    }
                } else if (found[0] === '&') {
                    stream.wrap('escaped');
                }
            }
            
            return stream;
        },
        indentation: function(textBefore, textAfter, line, indent, parser) {
            var isOpenTagBefore = /<[^\/!][^<>]+[^\/]>$/.test(textBefore)
            , isCloseTagAfter = /^<\//.test(textAfter);
            if (isOpenTagBefore) {
                var tag = (textBefore.match(matchTagNameRgx) || [])[0];
                if (tag && !selfClosingTagsRgx.test(tag)) {
                    if (isCloseTagAfter) {
                        return [1, 0];
                    }
                    return 1;
                }
            }
            return 0;
        },
        keyMap: {
            '>': function() {
                if (this.options.insertClosingBrackets) {
                    var bf = this.caret.textBefore()
                    , m = bf.match(matchTagNameRgx);
                    
                    if (m && m[1] && bf[bf.length-1] !== '>') {
                        var z = m[1].trim();
                        if (z[z.length-1] !== '/' && !selfClosingTagsRgx.test(m[1])) {
                            this.insertText('></'+m[1]+'>', -m[1].length - 3);
                            return false;
                        }
                    }
                }
            }
        }
    });
});