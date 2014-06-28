/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', function() {
    var controls = ['if','else','elseif','for','switch','while','do','try','catch','finally']
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
    
    return {
        controls: new RegExp('^('+controls.join('|')+')$'),
        keywords: new RegExp('^('+keywords.join('|')+')$'),
        specials: new RegExp('^('+specials.join('|')+')$'),
        constants: new RegExp('^('+constants.join('|')+')$'),
        regexp: /\/\*|\/\/|\/.*\/[gimy]{0,4}|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]|\$(?!\w)|\b[\w\d\-\_]+|\b\w+\b/,
        
        memoryAlloc: function() {
            return {
                properties: [],
                variables: [],
                constants: []
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
                } else if (/^[\w\-\$]+$/i.test(found)) {
                    if (/^(true|false)$/.test(found)) {
                        stream.wrap('builtin-constant', 'boolean');
                    } else if (this.constants.test(found)) {
                        stream.wrap('builtin-constant');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (found == '$' || this.specials.test(found)) {
                        stream.wrap('special');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (stream.isAfter('(')) {
                        stream.wrap('function');
                    } else if (stream.isBefore('.') || stream.isAfter(':') || memory.properties.indexOf(found) >= 0) {
                        memory.properties.put(found);
                        stream.wrap('property');
                    } else if (stream.isBefore(/const\s*$/) || memory.constants.indexOf(found) >= 0) {
                        memory.constants.put(found);
                        stream.wrap('constant');
                    } else if (stream.isAfter(/^\s*=\s*/) || memory.variables.indexOf(found) >= 0) {
                        memory.variables.put(found);
                        stream.wrap('variable');
                    } else if (stream.isBefore(/function\s*\w*\s*\([^\(]*$/)) {
                        stream.wrap('parameter');
                    }
                } else if (found.length == 1) {
                    if (found in this.operators) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (found in this.punctuations) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (found in this.brackets) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (found === '"' || found === "'") {
                        stream.eat(found, this.expressions[found].ending, function() {
                            return this.wrap('invalid').reset();
                        }).applyWrap(this.expressions[found].classes);
                    }
                } else if (found in this.expressions) {
                    stream.eatWhile(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                } else if (found[0] == '/') {
                    stream.cut(found.search(/([^\\]\/[gimy]{0,4})/g) + RegExp.$1.length);
                    stream.wrap('regexp', function(helper) {
                        return this.replace(/(\\.)/g, helper('$1', 'escaped'));
                    });
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
    }
});