/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', function() {
    var commentRgxHelper = /\*\/|(^|.)(?=\<\s*\/\s*script\s*>)/i
    , controls = ['if','else','elseif','for','switch','while','do','try','catch','finally']
    , constants = ['null','undefined','NaN','Infinity']
    , keywords = [
        'var','return','new','continue','break','instanceof','typeof','case','let','debugger',
        'default','delete','in','throw','void','with','const','of','import','export','module'
    ]
    , specials = [
        'this','window','document','console','arguments','function',
        'Object','Array','String','Number','Function','RegExp','Date','Boolean','Math','JSON',
        'Proxy','Map','WeakMap','Set','WeakSet','Symbol',
        'Error','EvalError','InternalError','RangeError','ReferenceError',
        'StopIteration','SyntaxError','TypeError','URIError'
    ]
    
    return new CodePrinter.Mode({
        name: 'JavaScript',
        controls: new RegExp('^('+controls.join('|')+')$'),
        keywords: new RegExp('^('+keywords.join('|')+')$'),
        specials: new RegExp('^('+specials.join('|')+')$'),
        constants: new RegExp('^('+constants.join('|')+')$'),
        regexp: /\/\*|\/\/|\/.*\/[gimy]{0,4}|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|<\s*\/\s*script\s*>|[^\w\s]|\$(?!\w)|\b[\w\d\-\_]+|\b\w+\b/,
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        lineComment: '//',
        
        memoryAlloc: function() {
            return {
                properties: [],
                variables: [],
                constants: []
            }
        },
        parse: function(stream, memory, isHTMLHelper) {
            var sb = stream.stateBefore, found;
            
            if (sb && sb.comment) {
                var e = this.expressions['/*'];
                stream.eatWhile(isHTMLHelper ? commentRgxHelper : e.ending).applyWrap(e.classes);
                stream.isStillHungry() && stream.continueState();
            }
            
            while (found = stream.match(this.regexp)) {
                if (!isNaN(found) && found != 'Infinity') {
                    if (found.substr(0, 2).toLowerCase() == '0x') {
                        stream.wrap('numeric', 'hex');
                    } else {
                        if ((found+'').indexOf('.') === -1) {
                            stream.wrap('numeric', 'int');
                        } else {
                            stream.wrap('numeric', 'float');
                        }
                    }
                } else if (/^[\w\$]+$/i.test(found)) {
                    if (/^(true|false)$/.test(found)) {
                        stream.wrap('builtin', 'boolean');
                    } else if (this.constants.test(found)) {
                        stream.wrap('builtin');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (found == '$' || this.specials.test(found)) {
                        stream.wrap('special');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (stream.isAfter('(')) {
                        stream.wrap('function');
                    } else if (stream.isBefore(/function\s*\w*\s*\([^\(]*$/)) {
                        stream.wrap('parameter');
                    } else if (stream.isBefore('.') || stream.isAfter(':')) {
                        memory.properties.put(found);
                        stream.wrap('property');
                    } else if (stream.isBefore(/const\s*$/) || memory.constants.indexOf(found) >= 0) {
                        memory.constants.put(found);
                        stream.wrap('constant');
                    } else if (stream.isAfter(/^\s*=\s*/) || memory.variables.indexOf(found) >= 0) {
                        memory.variables.put(found);
                        stream.wrap('variable');
                    }
                } else if (found.length == 1) {
                    if (this.operators[found]) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (this.punctuations[found]) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (this.brackets[found]) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (found === '"' || found === "'") {
                        stream.eat(found, this.expressions[found].ending, function() {
                            this.tear().wrap('invalid');
                        }).applyWrap(this.expressions[found].classes);
                    } else if (found === '#' && stream.peek(1) === '!' && stream.isBefore(/^\s*$/)) {
                        stream.eatAll(found).wrap('directive');
                    }
                } else if (this.expressions[found]) {
                    var until = this.expressions[found].ending;
                    if (isHTMLHelper && found === '/*') {
                        until = commentRgxHelper;
                    }
                    stream.eatGreedily(found, until).applyWrap(this.expressions[found].classes);
                    stream.isStillHungry() && stream.setStateAfter('comment');
                } else if (found[0] == '/') {
                    found = found.substring(0, found.search(/(((\\\\)+|[^\\])\/[gimy]{0,4})/g) + RegExp.$1.length);
                    stream.eatGreedily(found).wrap('regexp').eatEach(/\\./).wrapAll('escaped');
                } else if (isHTMLHelper && found[0] === '<' && found[found.length-1] === '>') {
                    return stream.abort();
                }
            }
            return stream;
        },
        codeCompletion: function(memory) {
            if (/\.\w*$/.test(this.caret.textBefore())) {
                return memory.properties;
            }
            return [controls, keywords, specials, memory.variables, memory.constants];
        },
        keyMap: {
            '/': function() {
                if (this.textAfterCursor(1) === '/') {
                    this.caret.moveX(1);
                } else if (/(^|=|\,|\(|\&|\||return)\s*$/i.test(this.caret.textBefore())) {
                    this.insertText('/', -1);
                }
            },
            '*': function() {
                if (this.textBeforeCursor(1) === '/' && this.textAfterCursor(1) === '/') {
                    this.removeAfterCursor('/');
                }
            }
        },
        snippets: {
            'log': {
                content: 'console.log();',
                cursorMove: -2
            },
            'dcl': {
                content: '$(function() {});',
                cursorMove: -3
            },
            'sif': {
                content: '(function() {})();',
                cursorMove: -5
            },
            'timeout': {
                content: 'setTimeout(function() {}, 100);',
                cursorMove: -8
            },
            'interval': {
                content: 'setInterval(function() {}, 100);',
                cursorMove: -8
            }
        }
    });
});