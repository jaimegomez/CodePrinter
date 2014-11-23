/* CodePrinter - Java Mode */

CodePrinter.defineMode('Java', function() {
    var controls = ['if','else','while','for','do','case','switch','try','catch','finally']
    , types = ['byte','short','int','long','float','double','boolean','char']
    , constants = ['null','undefined','NaN','Infinity']
    , keywords = [
        'abstract','assert','break','const','continue','default','enum','extends',
        'final','goto','implements','instanceof','interface','native','new','package',
        'private','protected','public','return','static','strictfp','super',
        'synchronized','this','throw','throws','transient','void','volatile'
    ]
    , specials = [
        'Byte','Short','Integer','Long','Float','Double','Boolean','Character','Number',
        'Iterable','Runnable','Thread','Error','Exception','Throwable','System','String','Object',
        'AbstractMethodError','AssertionError','ClassCircularityError','ClassFormatError','Deprecated',
        'EnumConstantNotPresentException','ExceptionInInitializerError','IllegalAccessError','IllegalThreadStateException',
        'InstantiationError','InternalError','NegativeArraySizeException','NoSuchFieldError','Override',
        'Process','ProcessBuilder','SecurityManager','StringIndexOutOfBoundsException','SuppressWarnings',
        'TypeNotPresentException','UnknownError','UnsatisfiedLinkError','UnsupportedClassVersionError','VerifyError',
        'InstantiationException','IndexOutOfBoundsException','ArrayIndexOutOfBoundsException','CloneNotSupportedException',
        'NoSuchFieldException','IllegalArgumentException','NumberFormatException','SecurityException','Void',
        'InheritableThreadLocal','IllegalStateException','InterruptedException','NoSuchMethodException',
        'IllegalAccessException','UnsupportedOperationException','Enum','StrictMath','Package','Compiler',
        'Readable','Runtime','StringBuilder','Math','IncompatibleClassChangeError','NoSuchMethodError',
        'ThreadLocal','RuntimePermission','ArithmeticException','NullPointerException',
        'StackTraceElement','Appendable','StringBuffer','ThreadGroup','IllegalMonitorStateException',
        'StackOverflowError','OutOfMemoryError','VirtualMachineError','ArrayStoreException','ClassCastException',
        'LinkageError','NoClassDefFoundError','ClassNotFoundException','RuntimeException','ThreadDeath',
        'ClassLoader','Cloneable','Class','CharSequence','Comparable'
    ]
    
    return new CodePrinter.Mode({
        name: 'Java',
        controls: new RegExp('^('+ controls.join('|') +')$'),
        keywords: new RegExp('^('+ keywords.join('|') +')$'),
        specials: new RegExp('^('+ specials.join('|') +')$'),
        constants: new RegExp('^('+ constants.join('|') +')$'),
        types: new RegExp('^('+ types.join('|') +')$'),
        regexp: /\/\*|\/\/|#?\b\w+\b|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]/,
        blockCommentStart: '/*',
        blockCommentEnd: '*/',
        lineComment: '//',
        
        memoryAlloc: function() {
            return {
                classes: []
            }
        },
        parse: function(stream, memory) {
            var sb = stream.stateBefore, found;
            
            if (sb && sb.comment) {
                var e = this.expressions['/*'];
                stream.eatWhile(e.ending).applyWrap(e.classes);
                stream.isStillHungry() && stream.continueState();
            }
            
            while (found = stream.match(this.regexp)) {
                if (!isNaN(found) && found != 'Infinity') {
                    if (found.substring(0, 2) === '0x') {
                        stream.wrap('numeric', 'hex');
                    } else {
                        if ((found+'').indexOf('.') === -1) {
                            stream.wrap('numeric', 'int');
                        } else {
                            stream.wrap('numeric', 'float');
                        }
                    }
                } else if (/^[a-zA-Z0-9\_]+$/.test(found)) {
                    if (found == 'true' || found == 'false') {
                        stream.wrap('builtin', 'boolean');
                    } else if (this.constants.test(found)) {
                        stream.wrap('builtin');
                    } else if (this.controls.test(found)) {
                        stream.wrap('control');
                    } else if (this.types.test(found)) {
                        stream.wrap('keyword', 'type');
                    } else if (this.keywords.test(found)) {
                        stream.wrap('keyword');
                    } else if (this.specials.test(found) || (!stream.isBefore('.') && !stream.isAfter(';') && memory.classes.indexOf(found) !== -1)) {
                        stream.wrap('special');
                    } else if (found == 'class') {
                        stream.wrap('keyword');
                        if (found = stream.capture(/^\s*(\w+)/, 1)) {
                            memory.classes.put(found);
                        }
                    } else if (found == 'import') {
                        stream.wrap('keyword');
                        if (found = stream.capture(/^.*[\s\.]([a-zA-Z0-9]+);$/, 1)) {
                            stream.eat(found).wrap('special');
                            memory.classes.put(found);
                        }
                    } else if (stream.isAfter('(')) {
                        if (stream.isBefore(/\bp(ublic|rotected|rivate)\b/)) stream.isDefinition = true;
                        stream.wrap('function');
                    } else if (stream.isBefore('.')) {
                        stream.wrap('property');
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
                    }
                } else if (this.expressions[found]) {
                    stream.eatGreedily(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                    found === '/*' && stream.isStillHungry() && stream.setStateAfter('comment');
                }
            }
            return stream;
        },
        codeCompletion: function(memory) {
            return [controls, keywords, specials, types, constants, memory.classes];
        },
        snippets: {
            'in': {
                content: 'System.in'
            },
            'out': {
                content: 'System.out'
            },
            'print': {
                content: 'System.out.print();',
                cursorMove: -2
            },
            'println': {
                content: 'System.out.println();',
                cursorMove: -2
            },
            'psvm': {
                content: 'public static void main(String[] args) {}',
                cursorMove: -1
            }
        }
    });
});