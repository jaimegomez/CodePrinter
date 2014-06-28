/* CodePrinter - HTML mode */

CodePrinter.defineMode('HTML', function() {
    var selfClosingTagsRgx = /^(area|base|br|c(ol|ommand)|embed|hr|i(mg|nput)|keygen|link|meta|param|source|track|wbr)$/i
    , matchTagNameRgx = /<\s*(\w+)\s*[^>]*$/;
    
    return {
        regexp: /<!--|<!\w+|<\/?|&[^;]+;/,
        regexp2: /[a-zA-Z\-]+|=|"|'|<|\/?\s*>/,
        blockCommentStart: '<!--',
        blockCommentEnd: '-->',
        lineComment: '<!--[text content]-->',
        
        parse: function(stream) {
            var found;
            
            while (found = stream.match(this.regexp)) {
                if (found.substr(0, 2) === '<!') {
                    if (found === '<!--') {
                        stream.eatWhile(found, '-->').wrap('comment');
                    } else {
                        stream.eat(found, '>').wrap('special', 'doctype');
                    }
                } else if (found[0] === '<') {
                    stream.wrap('bracket', 'bracket-angle', 'bracket-open');
                    
                    if (found = stream.match(/^\b[a-zA-Z]+/)) {
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
                            } else {
                                stream.wrap('other');
                            }
                        }
                    } else {
                        stream.restore().unwrap().wrap('invalid');
                        continue;
                    }
                    !found && stream.restore();
                } else if (found[0] === '&') {
                    stream.wrap('escaped');
                } else {
                    stream.wrap('other');
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
                    var m = this.caret.textBefore().match(matchTagNameRgx);
                    
                    if (m && m[1]) {
                        var z = m[1].trim();
                        if (z[z.length-1] !== '/' && !selfClosingTagsRgx.test(m[1])) {
                            this.insertText('></'+m[1]+'>', -m[1].length - 3);
                            return false;
                        }
                    }
                }
            }
        }
    }
});