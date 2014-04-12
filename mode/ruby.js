/* CodePrinter - Ruby mode */

CodePrinter.defineMode('Ruby', (function() {
    var ctrls = ['if','def','do','for','case','unless']
    , tracking = {
        "end": function(cp, key, details) {
            var s, tmpStr, counter = 1
            , line = details.line
            , col = details.columnStart
            , arr = ctrls.slice(0);
            arr.push('end');
            
            do {
                tmpStr = s = null;
                for (var i = 0; i < arr.length; i++) {
                    var cs = cp.searchLeft(arr[i], line, col);
                    if (cs[0] >= 0 && cs[1] >= 0 && (!s || cs[0] > s[0] || cs[0] == s[0] && cs[1] > s[1])) {
                        if ((arr[i] != 'if' && arr[i] != 'unless') || cp.substring([cs[0], 0], [cs[0], cs[1]]).search(/^\s*$/) === 0) {
                            s = cs;
                            tmpStr = arr[i];
                        }
                    }
                }
                if (s[0] >= 0 && s[1] >= 0) {
                    tmpStr != 'end' ? --counter : ++counter;
                    line = s[0];
                    col = s[1];
                } else {
                    counter = 0;
                }
            } while (counter != 0);
            
            if (tmpStr) {
                cp.createHighlightOverlay(
                    [s[0], s[1], tmpStr],
                    [details.line, details.columnStart, key]
                );
            }
            return false;
        }
    }
    , fn = function(ctrl) {
        return function(cp, key, details) {
            var s, counter = 1
            , line = details.line
            , col = details.columnEnd;
            if ((ctrl != 'if' && ctrl != 'unless') || cp.substring([line, 0], [line, details.columnStart]).search(/^\s*$/) === 0) {
                do {
                    var tmpStr = 'end';
                    s = cp.searchRight(tmpStr, line, col);
                    
                    if (s[0] >= 0 && s[1] >= 0) {
                        for (var i = 0; i < ctrls.length; i++) {
                            var cs = cp.searchRight(ctrls[i], line, col);
                            if (cs[0] >= 0 && cs[1] >= 0 && (cs[0] < s[0] || cs[0] == s[0] && cs[1] < s[1])) {
                                if ((ctrls[i] != 'if' && ctrls[i] != 'unless') || cp.substring([cs[0], 0], [cs[0], cs[1]]).search(/^\s*$/) === 0) {
                                    s = cs;
                                    tmpStr = ctrls[i];
                                }
                            }
                        }
                        tmpStr != 'end' ? ++counter : --counter;
                        line = s[0];
                        col = s[1] + tmpStr.length;
                    } else {
                        counter = 0;
                    }
                } while (counter != 0);
                
                cp.createHighlightOverlay(
                    [details.line, details.columnStart, ctrl],
                    [s[0], s[1], 'end']
                );
                return false;
            }
        }
    }
    , kpf = function(e) {
        if (this.textBeforeCursor(3).toLowerCase().search(/\Wen/) !== -1) {
            var bf = this.caret.textBefore().trim(),
                i = this.getIndentAtLine(this.caret.line()-1);
            
            this.caret.setTextBefore(this.tabString(i-1) + bf);
        }
        this.insertText(e.getCharCode() == 68 ? 'D' : 'd');
    };
    
    for (var i = 0; i < ctrls.length; i++) {
        tracking[ctrls[i]] = fn(ctrls[i]);
    }
    
    return {
        controls: ['end','if','else','elseif','def','undef','begin','for','do','while','case','unless','until','then'],
        keywords: ['public','private','protected','alias','and','break','class','defined?','ensure','in','loop','module','next','nil','not','or','redo','rescue','retry','return','self','super','when','yield'],
        specials: ['puts','gets','print','proc','lambda','eval','fail'],
        regexp: /\w+\??|=begin|[^\w\s\/]|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|\/(.*)\/[gimy]{0,4}/,
        comment: '#',
        
        fn: function(stream) {
            var found;
            
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
                    found = found.toLowerCase();
                    if (found == 'true' || found == 'false') {
                        stream.wrap('boolean');
                    } else if (this.controls.indexOf(found) !== -1) {
                        stream.wrap('control');
                    } else if (this.keywords.indexOf(found) !== -1) {
                        stream.wrap('keyword');
                    } else if (this.specials.indexOf(found) !== -1) {
                        stream.wrap('special');
                    } else if (stream.isBefore('def') || stream.isAfter('(')) {
                        stream.wrap('function');
                    } else if (stream.isBefore('.') || stream.isBefore(':')) {
                        stream.wrap('property');
                    } else {
                        stream.wrap('word');
                    }
                } else if (found.length == 1) {
                    if (this.punctuations.hasOwnProperty(found)) {
                        stream.wrap('punctuation', this.punctuations[found]);
                    } else if (this.operators.hasOwnProperty(found)) {
                        stream.wrap('operator', this.operators[found]);
                    } else if (this.brackets.hasOwnProperty(found)) {
                        stream.applyWrap(this.brackets[found]);
                    } else if (found === '"' || found === "'") {
                        stream.eat(found, this.expressions[found].ending, function() {
                            return this.wrap('invalid').reset();
                        }).applyWrap(this.expressions[found].classes);
                    } else if (found == '#') {
                        stream.eatWhile(found, '\n').wrap('comment', 'line-comment');
                    } else {
                        stream.wrap('other');
                    }
                } else if (found[0] == '=') {
                    stream.eatWhile(found, '=end').wrap('comment', 'multiline-comment');
                } else if (found[0] == '/') {
                    stream.wrap('regexp', function(cls) {
                        return this.replace(/(\\.)/g, '</span><span class="cp-escaped">$1</span><span class="'+cls+'">');
                    });
                } else {
                    stream.wrap('other');
                }
            }
            return stream;
        },
        keypressMap: {
            68: kpf,
            100: kpf
        },
        tracking: tracking
    }
})());