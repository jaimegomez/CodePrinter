/* CodePrinter - XML Mode */

CodePrinter.defineMode('XML', function() {
    var matchTagNameRgx = /<\s*(\w+)\s*[^>]*>?$/
    , isOpenTag = /<[^\/!][^<>]+[^\/\s]\s*>$/
    , isCloseTag = /^<\//;
    
    return new CodePrinter.Mode({
        mainRegExp: /<!--|<(\?|\/?)(?=\w+)|<!|&[^;]+;/,
        innerTagRegExp: /[a-z\-]+|=|"|'|\/?\s*>|</i,
        blockCommentStart: '<!--',
        blockCommentEnd: '-->',
        
        parse: function(stream) {
            var sb = stream.stateBefore, found;
            
            if (sb) {
                if (sb.comment) {
                    stream.eatWhile(this.blockCommentEnd).wrap('comment');
                } else if (sb.innerTag) {
                    this.innerTagParse(stream);
                } else if (sb.processingTag) {
                    stream.eatWhile('>').wrap('special');
                } else if (sb.directive) {
                    stream.eatWhile('>').wrap('directive');
                } else if (sb.builtin) {
                    stream.eatWhile(']]>').wrap('builtin');
                }
                stream.isStillHungry() && stream.continueState();
            }
            
            while (found = stream.match(this.mainRegExp)) {
                if (found[0] === '<') {
                    if (found === this.blockCommentStart) {
                        stream.eatGreedily(found, this.blockCommentEnd).wrap('comment');
                        stream.isStillHungry() && stream.setStateAfter('comment');
                    } else if (found[1] === '?') {
                        stream.eatGreedily(found, '>').wrap('special');
                        stream.isStillHungry() && stream.setStateAfter('processingTag');
                    } else if (found[1] === '!') {
                        var state = 'directive';
                        if (stream.isAfter('[CDATA[')) {
                            state = 'builtin';
                        }
                        stream.eatGreedily(found, '>').wrap(state);
                        stream.isStillHungry() && stream.setStateAfter(state);
                    } else {
                        stream.wrap('bracket', 'bracket-angle');
                        
                        if (found = stream.match(/^[a-z\-\:\.]+/i)) {
                            stream.wrap('keyword');
                            this.innerTagParse(stream);
                        } else {
                            stream.wrap('invalid');
                        }
                    }
                } else if (found[0] === '&') {
                    stream.wrap('escaped');
                }
            }
            return stream;
        },
        innerTagParse: function(stream) {
            var found, closed;
            while (found = stream.match(this.innerTagRegExp)) {
                if (found === '<') {
                    break;
                }
                if (/^[\w\-]+$/.test(found)) {
                    stream.wrap('property');
                } else if (found === '=') {
                    stream.wrap('operator', 'equal');
                } else if (this.expressions[found]) {
                    stream.eat(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                } else if (found[found.length-1] === '>') {
                    stream.wrap('bracket', 'bracket-angle');
                    closed = true;
                    break;
                }
            }
            closed || stream.setStateAfter('innerTag');
        },
        indentation: function(textBefore, textAfter, line, indent, parser) {
            var isOpenTagBefore = isOpenTag.test(textBefore)
            , isCloseTagAfter = isCloseTag.test(textAfter);
            if (isOpenTagBefore) {
                if (matchTagNameRgx.test(textBefore)) {
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
                    
                    if (m && m[1] && !/(\/\s*|>)$/.test(bf)) {
                        var z = m[1].trim();
                        if (z[z.length-1] !== '/') {
                            this.insertText('></'+m[1]+'>', -m[1].length - 3);
                            return false;
                        }
                    }
                }
            }
        }
    });
});