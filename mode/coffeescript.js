/* CodePrinter - CoffeeScript Mode */

CodePrinter.defineMode('CoffeeScript', function() {
    var controls = ['if','else','elseif','then','for','switch','while','until','do','try','catch','finally']
    , booleans = ['true','false','yes','no','on','off']
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
    , keyMap = {}
    
    keyMap['e'] = keyMap['f'] = keyMap['h'] = keyMap['y'] = function(e, k, ch) {
        var bf = this.caret.textBefore(), w = bf.split(/\s+/g).last()+ch;
        if (this.parser.controls.test(w)) {
            var line = this.caret.line()
            , indent = this.getNextLineIndent(line-1);
            this.getIndentAtLine(line-1) == indent && this.caret.setTextBefore(this.tabString(indent-1) + bf.trim());
        }
    }
    
    return {
        controls: new RegExp('^('+ controls.join('|') +')$'),
        keywords: new RegExp('^('+ keywords.join('|') +')$'),
        specials: new RegExp('^('+ specials.join('|') +')$'),
        booleans: new RegExp('^('+ booleans.join('|') +')$'),
        constants: new RegExp('^('+ constants.join('|') +')$'),
        regexp: /\#{1,3}|\-\>|\/\/\/|\/.*\/[gimy]*|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]|\$(?!\w)|\b[\w\d\-\_]+|\b\w+\b/,
        indentIncrements: ['->', '='],
        indentDecrements: [],
        blockCommentStart: '###',
        blockCommentEnd: '###',
        lineComment: '#',
        
        memoryAlloc: function() {
            return {
                classes: []
            }
        },
        parse: function(stream, memory) {
            var found;
            
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
                    if (this.booleans.test(found)) {
                        stream.wrap('builtin-constant', 'boolean');
                    } else if (this.constants.test(found)) {
                        stream.wrap('builtin-constant');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (stream.isBefore('.')) {
                        stream.wrap('property');
                    } else if (stream.isAfter(/^\s*=\s*(\([\w\s\,\.]*\))?\s*->/) || stream.isAfter(/^\s+[\d\"\'\w]/)) {
                        stream.wrap('function');
                    } else if (this.specials.test(found) || memory.classes.indexOf(found) !== -1 || stream.isBefore('class')) {
                        stream.wrap('special');
                        memory.classes.put(found);
                    }
                } else if (found == '->' || found == '@') {
                    stream.wrap('special');
                } else if (this.expressions[found]) {
                    stream.eatWhile(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                } else if (found.length == 1) {
                    if (this.operators[found]) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (this.punctuations[found]) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (this.brackets[found]) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (found == '"') {
                        stream.eatWhile(found, /(^"|[^\\]\"|\\{2}")/).wrap('string', 'double-quote', function(helper) {
                            return this.replace(/(\#\{[^\}]*\})/g, helper('$1', 'escaped'));
                        });
                    }
                } else if (found[0] == '/') {
                    if (found[1] == '/' && found[2] == '/') {
                        stream.eatWhile(found, found).wrap('regexp', function(helper) {
                            return this.replace(/(\\.|\#\{[^\}]*\})/g, helper('$1', 'escaped'));
                        });
                    } else {
                        stream.cut(found.search(/([^\\]\/[gimy]{0,4})/g) + RegExp.$1.length);
                        stream.wrap('regexp', function(helper) {
                            return this.replace(/(\\.)/g, helper('$1', 'escaped'));
                        });
                    }
                }
            }
            return stream;
        },
        indentation: function(textBefore, textAfter, line, indent, parser) {
            if (/(\-\>|\=)$/.test(textBefore)) {
                return /^\,/.test(textAfter) ? [1, 0] : 1;
            }
            var firstwordbefore = (textBefore.match(/^\w+/) || [])[0];
            if (firstwordbefore && !/\sthen\s/.test(textBefore) && parser.controls.test(firstwordbefore)) {
                return 1;
            }
            var i = 0, prevline = this.getTextAtLine(line - 1).trim();
            while (prevline && !/\sthen\s/.test(prevline) && (word = (prevline.match(/^\w+/) || [])[0]) && parser.controls.test(word)) {
                i++;
                prevline = this.getTextAtLine(line - i - 1).trim();
            }
            return -i;
        },
        codeCompletion: function(memory) {
            return [controls, keywords, specials, memory.classes];
        },
        keyMap: keyMap,
        expressions: {
            '#': {
                ending: '\n',
                classes: ['comment', 'line-comment']
            },
            '###': {
                ending: '###',
                classes: ['comment', 'block-comment']
            },
            "'": {
                ending: /(^'|[^\\]'|\\{2}')/,
                classes: ['string', 'single-quote']
            }
        },
        snippets: {
            'log': {
                content: 'console.log ',
            },
            'dcl': {
                content: '$ -> '
            },
            'sif': {
                content: 'do () -> '
            },
            'timeout': {
                content: 'setTimeout -> , 100',
                cursorMove: -5
            },
            'interval': {
                content: 'setInterval -> , 100',
                cursorMove: -5
            }
        }
    }
});