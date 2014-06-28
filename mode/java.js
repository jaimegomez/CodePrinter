/* CodePrinter - Java Mode */

CodePrinter.defineMode('Java', function() {
    var controls = ['if','else','while','for','case','switch','try','catch','finally']
    , types = ['byte','short','int','long','float','double','boolean','char']
    , constants = ['null','undefined','NaN','Infinity']
    , keywords = [
        'abstract','assert','break','const','continue','default','do','enum','extends',
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
    
    return {
        controls: new RegExp('^('+ controls.join('|') +')$'),
        keywords: new RegExp('^('+ keywords.join('|') +')$'),
        specials: new RegExp('^('+ specials.join('|') +')$'),
        constants: new RegExp('^('+ constants.join('|') +')$'),
        types: new RegExp('^('+ types.join('|') +')$'),
        regexp: /\/\*|\/\/|#?\b\w+\b|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]/,
        
        memoryAlloc: function() {
            return {
                classes: []
            }
        },
        parse: function(stream, memory) {
            var found;
            
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
                        stream.wrap('builtin-constant', 'boolean');
                    } else if (this.constants.test(found)) {
                        stream.wrap('builtin-constant');
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
                        if (found = stream.match(/^\s*(\w+)/, 1)) {
                            memory.classes.put(found);
                            stream.reset();
                        } else {
                            stream.restore();
                        }
                    } else if (found == 'import') {
                        stream.wrap('keyword');
                        if (found = stream.match(/^.*[\s\.]([a-zA-Z0-9]+);$/, 1)) {
                            memory.classes.put(found);
                            stream.reset();
                        } else {
                            stream.restore();
                        }
                    } else if (stream.isAfter('(')) {
                        stream.wrap('function');
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
                            return this.wrap('invalid').reset();
                        }).applyWrap(this.expressions[found].classes);
                    } else {
                        stream.wrap('other');
                    }
                } else if (this.expressions[found]) {
                    stream.eatWhile(found, this.expressions[found].ending).applyWrap(this.expressions[found].classes);
                } else {
                    stream.wrap('other');
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
    }
});