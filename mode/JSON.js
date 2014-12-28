/* CodePrinter - JSON Mode */

CodePrinter.defineMode('JSON', function() {
    
    var rgx = /\b(0|\d+)(\.\d+)?([eE][\-\+]\d+)?\b|[^\w\s]|true|false|null/
    , invalidCharacters = /'|\(|\)|\//
    , brackets = /\{|\}|\[|\]/;
    
    return new CodePrinter.Mode({
        regexp: rgx,
        blockCommentStart: null,
        blockCommentEnd: null,
        lineComment: null,
        
        parse: function(stream) {
            var found;
            
            while (found = stream.match(rgx)) {
                if (found.length === 1) {
                    if (invalidCharacters.test(found)) {
                        stream.wrap('invalid');
                    } else if (found === '"') {
                        var str = stream.eat(found, this.expressions[found].ending, function() {
                            this.tear().wrap('invalid');
                        });
                        str.applyWrap(this.expressions[found].classes);
                        str.eatEach(/\\(["\\\/bfnrt]|u[0-9a-fA-F]{4})/).wrapAll('escaped');
                        str.eatEach(/\\(?!(["\\\/bfnrt]|u[0-9a-fA-F]{4}))/).wrapAll('invalid');
                    } else if (brackets.test(found)) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (found === ',' || found === ':') {
                        stream.wrap('punctuation');
                    } else if (/\d/.test(found)) {
                        stream.wrap('numeric', 'int');
                    }
                } else if (found === 'true' || found === 'false') {
                    stream.wrap('builtin', 'boolean');
                } else if (found === 'null') {
                    stream.wrap('builtin');
                } else if (!isNaN(found)) {
                    if (found.indexOf('.') === -1) {
                        stream.wrap('numeric', 'int');
                    } else {
                        stream.wrap('numeric', 'float');
                    }
                }
            }
            return stream;
        },
        codeCompletion: function(bf, af, cp) {
            return ['true', 'false', 'null'];
        }
    });
});