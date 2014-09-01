/* CodePrinter - Ruby mode */

CodePrinter.defineMode('Ruby', function() {
    var controls = [
        'begin','case','def','do','else','elseif','end','for',
        'if','then','undef','unless','until','while'
    ]
    , specials = [
        'eval','fail','gets','lambda','print','proc','puts'
    ]
    , keywords = [
        'alias','and','break','class','defined?','ensure','in','loop','module',
        'next','nil','not','or','private','protected','public','redo','rescue',
        'retry','return','self','super','when','yield'
    ]
    , indentIncrements = ['if','def','do','for','case']
    , keyMap = {}
    , tracking = {
        "end": function(key, textline, details) {
            if (this.isState('control', details.line, details.columnStart+1) && /^\W{0,2}$/.test(textline.charAt(details.columnStart-1) + textline.charAt(details.columnEnd))) {
                var s, tmpStr, counter = 1
                , line = details.line
                , col = details.columnStart
                , arr = indentIncrements.slice(0);
                arr.push('end');
                
                do {
                    tmpStr = s = null;
                    for (var i = 0; i < arr.length; i++) {
                        var cs = this.searchLeft(arr[i], line, col, 'control');
                        if (cs[0] >= 0 && cs[1] >= 0 && (!s || cs[0] > s[0] || cs[0] == s[0] && cs[1] > s[1])) {
                            if ((arr[i] != 'if' && arr[i] != 'unless') || this.substring([cs[0], 0], [cs[0], cs[1]]).search(/^\s*$/) === 0) {
                                s = cs;
                                tmpStr = arr[i];
                            }
                        }
                    }
                    if (s && s[0] >= 0 && s[1] >= 0) {
                        tmpStr != 'end' ? --counter : ++counter;
                        line = s[0];
                        col = s[1];
                    } else {
                        return false;
                    }
                } while (counter != 0);
                
                if (tmpStr) {
                    this.createHighlightOverlay(
                        [s[0], s[1], tmpStr],
                        [details.line, details.columnStart, key]
                    );
                }
            }
        }
    }
    , fn = function(ctrl) {
        return function(key, textline, details) {
            if (this.isState('control', details.line, details.columnStart+1) && /^\W{0,2}$/.test(textline.charAt(details.columnStart-1) + textline.charAt(details.columnEnd))) {
                var s, counter = 1
                , line = details.line
                , col = details.columnEnd;
                if ((ctrl != 'if' && ctrl != 'unless') || this.substring([line, 0], [line, details.columnStart]).search(/^\s*$/) === 0) {
                    do {
                        var tmpStr = 'end';
                        s = this.searchRight(tmpStr, line, col, 'control');
                        
                        if (s[0] >= 0 && s[1] >= 0) {
                            for (var i = 0; i < indentIncrements.length; i++) {
                                var cs = this.searchRight(indentIncrements[i], line, col, 'control');
                                if (cs[0] >= 0 && cs[1] >= 0 && (cs[0] < s[0] || cs[0] == s[0] && cs[1] < s[1])) {
                                    if ((indentIncrements[i] != 'if' && indentIncrements[i] != 'unless') || this.substring([cs[0], 0], [cs[0], cs[1]]).search(/^\s*$/) === 0) {
                                        s = cs;
                                        tmpStr = indentIncrements[i];
                                    }
                                }
                            }
                            tmpStr != 'end' ? ++counter : --counter;
                            line = s[0];
                            col = s[1] + tmpStr.length;
                        } else {
                            return false;
                        }
                    } while (counter != 0);
                    
                    this.createHighlightOverlay(
                        [details.line, details.columnStart, ctrl],
                        [s[0], s[1], 'end']
                    );
                }
            }
        }
    }
    
    for (var i = 0; i < indentIncrements.length; i++) {
        tracking[indentIncrements[i]] = fn(indentIncrements[i]);
    }
    
    keyMap['D'] = keyMap['d'] = function(e) {
        var bf = this.caret.textBefore();
        if (/^\s*en$/i.test(this.caret.textBefore())) {
            var line = this.caret.line()
            , indent = this.getNextLineIndent(line-1);
            this.caret.setTextBefore(this.tabString(indent-1) + bf.trim());
        }
    }
    
    return new CodePrinter.Mode({
        name: 'Ruby',
        controls: new RegExp('^('+ controls.join('|') +')$', 'i'),
        keywords: new RegExp('^('+ keywords.join('|') +')$', 'i'),
        specials: new RegExp('^('+ specials.join('|') +')$', 'i'),
        regexp: /\w+\??|=begin|[^\w\s\/]|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|\/(.*)\/[gimy]{0,4}/,
        indentIncrements: indentIncrements,
        indentDecrements: ['end'],
        blockCommentStart: '=begin',
        blockCommentEnd: '=end',
        lineComment: '#',
        
        parse: function(stream) {
            var sb = stream.stateBefore, found;
            
            if (sb && sb.comment) {
                stream.eatWhile('=end').wrap('comment', 'block-comment');
                stream.isStillHungry() && stream.continueState();
            }
            
            while (found = stream.match(this.regexp)) {
                if (!isNaN(found)) {
                    if (found.substr(0, 2).toLowerCase() == '0x') {
                        stream.wrap('numeric', 'hex');
                    } else {
                        if ((found+'').indexOf('.') === -1) {
                            stream.wrap('numeric', 'int');
                        } else {
                            stream.wrap('numeric', 'float');
                        }
                    }
                } else if (/^\w+/.test(found)) {
                    if (/^(true|false)$/i.test(found)) {
                        stream.wrap('builtin', 'boolean');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (this.specials.test(found)) {
                        stream.wrap('special');
                    } else if (stream.isBefore('def') || stream.isAfter('(')) {
                        stream.wrap('function');
                    } else if (stream.isBefore('.') || stream.isBefore(':')) {
                        stream.wrap('property');
                    }
                } else if (found.length == 1) {
                    if (this.punctuations[found]) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (this.operators[found]) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (this.brackets[found]) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (found === '"' || found === "'") {
                        stream.eat(found, this.expressions[found].ending, function() {
                            this.tear().wrap('invalid');
                        }).applyWrap(this.expressions[found].classes);
                    } else if (found == '#') {
                        stream.eatAll(found).wrap('comment', 'line-comment');
                    }
                } else if (found[0] == '=') {
                    stream.eatGreedily(found, '=end').wrap('comment', 'block-comment');
                    stream.isStillHungry() && stream.setStateAfter('comment');
                } else if (found[0] == '/') {
                    stream.wrap('regexp').eatEach(/\\./).wrapAll('escaped');
                }
            }
            return stream;
        },
        indentation: function(textBefore, textAfter, line, indent, parser) {
            var words = textBefore.match(/(\w+)/);
            if (words) {
                for (var i = 1; i < words.length; i++) {
                    if (indentIncrements.indexOf(words[i].toLowerCase()) >= 0) {
                        return 1;
                    }
                }
            }
            return 0;
        },
        codeCompletion: function(memory) {
            return [specials, controls, keywords];
        },
        keyMap: keyMap,
        tracking: tracking
    });
});