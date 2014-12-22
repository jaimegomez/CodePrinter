/* CodePrinter - CSS Mode */

CodePrinter.defineMode('CSS', function() {
    var commentRgxHelper = /\*\/|(^|.)(?=\<\s*\/\s*style\s*>)/i
    , tags = [
        'html','body','div','a','ol','ul','li','span','p',
        'h1','h2','h3','h4','h5','h6','img','input','textarea',
        'button','form','label','select','option','optgroup',
        'main','nav','header','section','aside','footer','code',
        'fieldset','article','pre','table','tr','th','td',
        'thead','tbody','tfoot','frameset','frame','iframe'
    ]
    
    return new CodePrinter.Mode({
        name: 'CSS',
        tags: new RegExp('^('+ tags.join('|') +')$', 'i'),
        regexp: /\/?\*|[#\.\:]\:?[\w\-]+|[\w\-]+|@[\w\-]+|<\s*\/\s*style\s*>|[^\w\s]/,
    	values: /\/\*|\;|,|#[0-9a-f]+|\-?\d+[a-z%]*|\-?\d*\.\d+[a-z%]*|[@!]?[a-z\-]+\b|'|"/i,
        units: /px|%|em|rem|s|ms|in|pt|cm|mm|pc/,
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        
        parse: function(stream, memory, isHTMLHelper) {
            var sb = stream.stateBefore, found;
            
            if (sb && sb.comment) {
                var e = this.expressions['/*'];
                stream.eatWhile(isHTMLHelper ? commentRgxHelper : e.ending).applyWrap(e.classes);
                stream.isStillHungry() && stream.continueState();
            }
            
            while (found = stream.match(this.regexp)) {
                if (this.symbols[found[0]]) {
                    this.symbols[found[0]].call(this, stream, found);
                } else if (/^[\w\-]+$/i.test(found)) {
                    if (this.tags.test(found)) {
                        stream.wrap('keyword', 'css-tag');
                    } else {
                        stream.wrap('special', 'special-'+found);
                    }
                } else if (this.punctuations[found]) {
                    stream.wrap('punctuation', this.punctuations[found]);
                } else if (this.brackets[found]) {
                    stream.applyWrap(this.brackets[found]);
                } else if (this.operators[found]) {
                    stream.wrap(this.operators[found]);
                } else if (found === '/*') {
                    stream.eatGreedily(found, isHTMLHelper ? commentRgxHelper : this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                    stream.isStillHungry() && stream.setStateAfter('comment');
                } else if (isHTMLHelper && found[0] === '<' && found[found.length-1] === '>') {
                    return stream.abort();
                }
            }  
            return stream;
        },
        codeCompletion: function() {
            return tags;
        },
        symbols: {
            ':': function(stream, found) {
                var aft = stream.after()
                , i1 = aft.indexOf('{')
                , i2 = aft.indexOf(';');
                if (i1 === -1 || (i2 !== -1 && i2 < i1)) {
                    stream.eat(found[0]).wrap('punctuation', this.punctuations[found[0]]);
                    
                    while (found = stream.match(this.values)) {
                        if (found == ';') {
                            stream.wrap('punctuation', this.punctuations[found]);
                            break;
                        } else if (found[0] === '#') {
                            if (found.length === 4 || found.length === 7) {
                                stream.wrap('numeric', 'hex');
                            } else {
                                stream.wrap('invalid');
                            }
                        } else if (found[0] === '@') {
                            stream.wrap('variable', 'variable-'+found.substr(1));
                        } else if (found[0] === '!') {
                            stream.wrap('value', 'css-important');
                        } else if (/\d/.test(found)) {
                            if (!isNaN(found)) {
                                stream.wrap('numeric');
                            } else if (this.units.test(found)) {
                                var f2 = found.match(this.units)[0];
                                stream.wrap('numeric', 'unit-'+f2);
                            } else {
                                stream.wrap('numeric');
                            }
                        } else if (this.punctuations[found]) {
                            stream.wrap('punctuation', this.punctuations[found]);
                        } else if (this.expressions[found]) {
                            stream.eat(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                        } else if (stream.isAfter('(')) {
                            stream.wrap('function');
                        } else {
                            stream.wrap('escaped', 'value');
                        }
                    }
                } else if (/^\:\:?[\w\-\(\)]+$/.test(found)) {
                    stream.wrap('string', 'css-pseudo');
                }
            },
            '#': function(stream) { stream.wrap('property', 'css-id'); },
            '.': function(stream) { stream.wrap('property', 'css-class'); },
            '*': function(stream) { stream.wrap('keyword', 'css-tag'); },
            '@': function(stream, found) {
                if (found === '@media' || found === '@font-face') {
                    stream.wrap('control');
                } else {
                    stream.wrap('variable');
                }
            }
        },
        keyMap: {
            ':': function() {
                if (this.textBeforeCursor(1) !== ':' && this.textAfterCursor(1) !== ';' && this.statesBefore()[0] == 'special') {
                    this.insertText(';', -1);
                }
            },
            ';': function() {
                if (this.textAfterCursor(1) === ';') {
                    this.caret.moveX(1);
                    return false;
                }
            }
        },
        extension: {
            onLeftRemoval: { ':': ';' }
        }
    });
});