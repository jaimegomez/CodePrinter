/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', function() {
    
    var wordRgx = /[\w$\xa1-\uffff]/
    , operatorRgx = /[+\-*&%=<>!?|~^]/
    , closeBrackets = /^[}\]\)]/
    , controls = ['if','else','elseif','for','switch','while','do','try','catch','finally']
    , constants = ['null','undefined','NaN','Infinity']
    , keywords = [
        'var','return','new','continue','break','instanceof','typeof','case','let','class',
        'extends','yield','debugger','default','delete','in','throw','public','private',
        'void','with','const','of'
    ]
    , specials = [
        'this','window','document','console','arguments','function','import','export','module',
        'Object','Array','String','Number','Function','RegExp','Date','Boolean','Math','JSON',
        'Proxy','Map','WeakMap','Set','WeakSet','Symbol',
        'Error','EvalError','InternalError','RangeError','ReferenceError',
        'StopIteration','SyntaxError','TypeError','URIError'
    ]
    
    function string(stream, state, escaped) {
        var esc = !!escaped, ch;
        while (ch = stream.next()) {
            if (ch == state.quote && !esc) break;
            if (esc = !esc && ch == '\\') {
                stream.undo(1);
                state.next = escapedString;
                return 'string';
            }
        }
        if (!ch && esc) state.next = string;
        state.next = null;
        if (!ch) return 'invalid';
        state.quote = undefined;
        return 'string';
    }
    function escapedString(stream, state) {
        if (stream.eat('\\')) {
            var ch = stream.next();
            if (ch) {
                state.next = string;
                return 'escaped';
            }
            stream.undo(1);
        }
        return string(stream, state, true);
    }
    function comment(stream, state) {
        var star, ch;
        while (ch = stream.next()) {
            if (star && ch == '/') {
                break;
            }
            star = ch == '*';
        }
        state.next = ch && star ? null : comment;
        return 'comment';
    }
    function regexp(stream, state, escaped) {
        var esc = !!escaped, ch;
        while (ch = stream.next()) {
            if (ch == '\\' && !stream.eol()) {
                stream.undo(1);
                state.next = escapedRegexp;
                return 'regexp';
            }
            if (ch == '/') {
                stream.eatWhile(/[gimy]/);
                state.next = null;
                return 'regexp';
            }
        }
        state.next = null;
        return 'regexp';
    }
    function escapedRegexp(stream, state) {
        if (stream.eat('\\')) {
            var ch = stream.next();
            if (ch) {
                state.next = regexp;
                return 'escaped';
            }
            stream.undo(1);
        }
        return regexp(stream, state, true);
    }
    function parameters(stream, state) {
        var ch = stream.next();
        if (ch) {
            if (ch == ')') {
                state.next = null;
                return 'bracket';
            }
            if (ch == '.' && stream.eat('.') && stream.eat('.')) {
                state.next = parameters;
                return 'operator';
            }
            if (ch == ',' || ch == ' ') {
                state.next = parameters;
                return;
            }
            if (wordRgx.test(ch)) {
                var word = ch + stream.eatWhile(wordRgx);
                if (stream.eol()) state.next = null;
                state.context.params[word] = true;
                return 'parameter';
            }
            stream.undo(1);
            return state.next = null;
        }
        return state.next = null;
    }
    
    function pushcontext(state) {
        state.context = { vars: {}, params: {}, indent: state.indent + 1, prev: state.context };
    }
    function popcontext(state) {
        if (state.context.prev) {
            state.context = state.context.prev;
        }
    }
    function isVariable(varname, state) {
        for (var ctx = state.context; ctx; ctx = ctx.prev) if (ctx.vars[varname]) return ctx.vars[varname];
    }
    
    return new CodePrinter.Mode({
        name: 'JavaScript',
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        lineComment: '//',
        indentTriggers: /[\}\]\)]/,
        matching: 'brackets',
        
        initialState: function() {
            return {
                indent: 0,
                context: { vars: {}, params: {}, indent: 0 }
            }
        },
        iterator: function(stream, state) {
            var ch = stream.next();
            if (ch == '"' || ch == "'") {
                state.quote = ch;
                return string(stream, state);
            }
            if (ch == '/') {
                if (stream.eat('/')) {
                    stream.skip();
                    return 'comment';
                }
                if (stream.eat('*')) {
                    return comment(stream, state);
                }
                if (stream.lastStyle == 'word' || stream.lastStyle == 'parameter' || stream.lastStyle == 'numeric'
                    || stream.lastStyle == 'constant' || stream.lastValue == ')') {
                    return 'operator';
                }
                return regexp(stream, state);
            }
            if (ch == '.') {
                if (stream.match(/^\d+(?:[eE][+\-]?\d+)?/, true)) {
                    return 'numeric';
                } else if (stream.eat('.') && stream.eat('.')) {
                    return 'operator';
                }
                return;
            }
            if (ch == ';') {
                if (state.vardef) state.vardef = undefined;
                if (state.constdef) state.constdef = undefined;
                if (state.control) state.control = undefined;
                return 'punctuation';
            }
            if (ch == '0' && stream.eat(/x/i)) {
                stream.eatWhile(/[\da-f]/i);
                return 'numeric hex';
            }
            if (/[\[\]{}\(\)]/.test(ch)) {
                if (ch == '(' && state.hasFunction && (stream.lastValue == 'function' || stream.lastStyle == 'function') && !stream.eol()) {
                    state.next = parameters;
                    pushcontext(state);
                    if ('string' == typeof state.hasFunction) {
                        stream.markDefinition({
                            name: state.hasFunction,
                            params: state.context.params
                        });
                    }
                    state.hasFunction = undefined;
                }
                if (ch == '{') {
                    ++state.indent;
                } else if (ch == '}') {
                    if (state.control) state.control = undefined;
                    if (state.indent == state.context.indent) {
                        popcontext(state);
                    }
                    --state.indent;
                }
                return 'bracket';
            }
            if (/\d/.test(ch)) {
                stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/, true);
                return 'numeric';
            }
            if (ch == '<' && state.parser && stream.isAfter(/^\s*\/\s*script/i)) {
                state.parser = undefined;
                stream.undo(1);
                return;
            }
            if (operatorRgx.test(ch)) {
                stream.eatWhile(operatorRgx);
                return 'operator';
            }
            if (wordRgx.test(ch)) {
                var word = ch + stream.eatWhile(wordRgx);
                if (word == 'function') {
                    state.hasFunction = true;
                    return 'special';
                }
                if (word == 'var') {
                    state.vardef = true;
                    return 'keyword';
                }
                if (word == 'const') {
                    state.constdef = true;
                    return 'keyword';
                }
                if (stream.lastValue == 'function') {
                    state.hasFunction = word;
                    return state.context.vars[word] = 'function';
                }
                if (word == 'true' || word == 'false') return 'builtin boolean';
                if (constants.indexOf(word) >= 0) return 'constant';
                if (controls.indexOf(word) >= 0) {
                    state.control = word;
                    return 'control';
                }
                if (specials.indexOf(word) >= 0) return 'special';
                if (keywords.indexOf(word) >= 0) return 'keyword';
                
                if (state.context) {
                    if (state.context.params[word] && !stream.isBefore(/\.\s*$/, -word.length)) {
                        return 'variable';
                    }
                    var isVar = isVariable(word, state);
                    if (isVar && 'string' === typeof isVar) return isVar;
                }
                if (!stream.lastValue || stream.lastStyle == 'keyword' || stream.lastValue == ',') {
                    if (state.vardef) return state.context.vars[word] = 'variable';
                    if (state.constdef) return state.context.vars[word] = 'constant';
                }
                if (stream.isAfter(/^\s*:/)) {
                    return 'property';
                }
                if (stream.isBefore(/\.\s*$/, -word.length)) {
                    if (stream.isAfter(/^\s*\(/)) return 'function';
                    return 'property';
                }
                return 'word';
            }
            if (ch == '#') {
                if (stream.peek() == '!' && stream.pos == 1) {
                    stream.skip();
                    return 'directive';
                }
                return 'invalid';
            }
        },
        indent: function(stream, state) {
            var i = state.indent;
            if (stream.lastStyle == 'bracket') {
                if (stream.isAfter(closeBrackets)) return [i, -1];
            }
            if (state.control) return state.indent + 1;
            if (stream.isAfter(closeBrackets) || state.parser && stream.isAfter(/^\s*<\s*\/\s*script/i)) return i - 1;
            return i;
        },
        completions: function(stream, state) {
            var vars = [];
            if (state.context) {
                for (var ctx = state.context; ctx; ctx = ctx.prev) {
                    vars.push.apply(vars, Object.keys(ctx.vars));
                    vars.push.apply(vars, Object.keys(ctx.params));
                }
            }
            return {
                values: vars,
                search: 200
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