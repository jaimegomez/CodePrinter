/* CodePrinter - PHP Mode */

CodePrinter.defineMode('PHP', function() {
    var constants = ['null','__CLASS__','__DIR__','__FILE__','__FUNCTION__','__LINE__','__METHOD__','__NAMESPACE__','__TRAIT__']
    , controls = [
        'if','else','for','foreach','switch','case','default',
        'while','do','elseif','try','catch','finally','declare',
        'endif','endfor','endforeach','endswitch','endwhile','enddeclare'
    ]
    , keywords = [
        'abstract','and','array','as','break','class','clone','const','continue',
        'declare','default','extends','final','function','global','goto',
        'implements','interface','instanceof','namespace','new','or',
        'parent','private','protected','public','return','self','static',
        'throw','use','var','xor'
    ]
    , specials = [
        'define','defined','die','echo','empty','exit','eval','include','include_once',
        'isset','list','require','require_once','print','unset'
    ]
    , keyMap = {}
    
    keyMap['e'] = keyMap['f'] = keyMap['h'] = keyMap['r'] = function(e, k, ch) {
        var bf = this.caret.textBefore(), w = bf.split(/\s+/g).last()+ch;
        if (w == 'else' || this.parser.indentDecrements.indexOf(w) >= 0) {
            var line = this.caret.line()
            , indent = this.getNextLineIndent(line-1);
            this.getIndentAtLine(line-1) == indent && this.caret.setTextBefore(this.tabString(indent-1) + bf.trim());
        }
    }
    
    return new CodePrinter.Mode({
        name: 'PHP',
    	controls: new RegExp('^('+ controls.join('|') +')$', 'i'),
    	keywords: new RegExp('^('+ keywords.join('|') +')$', 'i'),
        specials: new RegExp('^('+ specials.join('|') +')$', 'i'),
        constants: new RegExp('^('+ constants.join('|') +')$', 'i'),
    	regexp: /\$[\w\d\_]+|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|\b\w+\b|\/\*|\/\/|\?>|<\?php|<\?=?|[^\w\s]/,
        indentIncrements: ['else', ':', '[', '{'],
        indentDecrements: ['endif', 'endfor', 'endforeach', 'endswitch', 'endwhile', 'enddeclare', ']', '}'],
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        lineComment: '//',
        
        memoryAlloc: function() {
            return {
                constants: [],
                variables: [],
                classes: []
            }
        },
    	parse: function(stream, memory) {
    		var sb = stream.stateBefore, found;
            
            if (sb) {
                var e = this.expressions[sb.comment ? '/*' : sb.string];
                if (e) {
                    stream.eatWhile(e.ending).applyWrap(e.classes);
                    stream.isStillHungry() && stream.continueState();
                }
            }
            
    		while (found = stream.match(this.regexp)) {
                if (found[0] === '$') {
                    if (found == '$this') {
                        stream.wrap('special');
                    } else {
                        stream.wrap('variable');
                        memory.variables.put(found.slice(1));
                    }
                } else if (!isNaN(found)) {
                    if (found.substr(0, 2).toLowerCase() == '0x') {
                        stream.wrap('numeric', 'hex');
                    } else {
                        if ((found+'').indexOf('.') === -1) {
                            stream.wrap('numeric', 'int');
                        } else {
                            stream.wrap('numeric', 'float');
                        }
                    }
                } else if (/^\w+$/i.test(found)) {
                    if (found == 'define') {
                        var m = stream.after().match(/^\s*\(('(\w+)'|"(\w+)")/);
                        m && m[2] && memory.constants.put(m[2]);
                        stream.wrap('special');
                    } else if (/^(true|false)$/i.test(found)) {
                		stream.wrap('builtin', 'boolean');
                	} else if (this.constants.test(found)) {
                        stream.wrap('builtin');
                    } else if (this.controls.test(found)) {
                		stream.wrap('control');
    	            } else if (this.specials.test(found)) {
                        stream.wrap('special');
                    } else if (this.keywords.test(found)) {
    	            	stream.wrap('keyword');
    	            } else if (stream.isAfter('(')) {
                		stream.wrap('function');
                	} else if (stream.isBefore('class')) {
                        stream.wrap('special');
                        memory.classes.put(found);
                    } else if (stream.isBefore('const') || memory.constants.indexOf(found) >= 0) {
                        stream.wrap('constant');
                        memory.constants.put(found);
                    } else if (stream.isAfter('::')) {
                        stream.wrap('namespace');
                    }
                } else if (found.length == 1) {
                    if (found == '"' || found == "'") {
                        stream.eatGreedily(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                        stream.isStillHungry() && stream.setStateAfter({ string: found });
                    } else if (this.operators[found]) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (this.punctuations[found]) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (this.brackets[found]) {
                        stream.applyWrap(this.brackets[found]);
                    }
                } else if (/^(<\?(php|=?)|\?>)$/.test(found)) {
                    stream.wrap('phptag', found == '?>' ? 'closetag' : 'opentag');
                } else if (this.expressions[found]) {
                    var e = this.expressions[found];
                    if (found === '//') {
                        stream.eatAll(found).applyWrap(e.classes);
                    } else if (found === '/*') {
                        stream.eatGreedily(found, e.ending).applyWrap(e.classes);
                        stream.isStillHungry() && stream.setStateAfter('comment');
                    }
                }
    		}
    		return stream;
    	},
        indentation: function(textBefore, textAfter, line, indent, parser) {
            var before = (textBefore.match(/(\w+|.)$/) || [])[0]
            , after = (textAfter.match(/^(\w+|.)/) || [])[0];
            if (before) {
                if (parser.indentIncrements.indexOf(before) >= 0) {
                    if (after && parser.indentDecrements.indexOf(after) >= 0) {
                        return [1, 0];
                    }
                    return 1;
                }
                if (parser.indentDecrements.indexOf(before) >= 0) {
                    return 0;
                }
            }
            var firstwordbefore = (textBefore.match(/^\w+/) || [])[0];
            if (firstwordbefore && parser.controls.test(firstwordbefore)) {
                return 1;
            }
            var i = 0, prevline = this.getTextAtLine(line - 1).trim();
            while (prevline && !/[\{\:]$/.test(prevline) && (word = (prevline.match(/^\w+/) || [])[0]) && parser.controls.test(word)) {
                i++;
                prevline = this.getTextAtLine(line - i - 1).trim();
            }
            return -i;
        },
        codeCompletion: function(memory) {
            var bf = this.caret.textBefore();
            if (/\_\w*$/.test(this.caret.textBefore())) {
                return [constants, memory.constants];
            }
            if (/\$\w*$/.test(bf)) {
                return ['this', memory.variables];
            }
            return [controls, keywords, specials, memory.classes, memory.constants];
        },
        keyMap: keyMap,
        extension: {
            expressions: {
                "'": { ending: "'", classes: ['string', 'single-quote'] }
            }
        }
    });
});