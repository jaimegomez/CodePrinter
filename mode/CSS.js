/* CodePrinter - CSS Mode */

CodePrinter.defineMode('CSS', {
    colors: ['white','black','transparent','green','yellow','red','blue','orange','pink','cyan','violet','brown','gray','silver','gold','aqua','lime','navy','indigo','teal','fuchsia','magenta','beige','azure','khaki','sienna','skyblue'],
    keywords: ['inherit','italic','normal','bold','underline','none','all','solid','dotted','dashed'],
    regexp: /\/\*|#[\w\-]+|\.[\w\-]+|\b[\w\-]+|@\w+|{|}|:|;|<|>/,
	values: /\/\*|\;|,|#[0-9a-fA-F]+|\-?\d+[a-zA-Z%]*|\-?\d*\.\d+[a-zA-Z%]*|\b[a-zA-Z\-]+\b|'|"/,
    units: /px|%|em|rem|s|ms|in|pt|cm|mm|pc/,
    
    fn: function(stream) {
        var found;
        
        while (found = stream.match(this.regexp)) {
            if (found[0] === '#') {
                stream.wrap(['special', 'css-id']);
            } else if (found[0] === '.') {
                stream.wrap(['special', 'css-class']);
            } else if (/^[\w\-]+$/i.test(found)) {
                if (stream.isAfter(':')) {
                    stream.wrap(['property', 'property-'+found]);
                } else if (found.indexOf('-') === -1) {
                    stream.wrap(['css-tag']);
                } else {
                    stream.skip();
                }
            } else if (found[0] === '@') {
                if (found === '@media') {
                    stream.wrap(['control', 'control-media']);
                } else {
                    stream.wrap(['variable', 'variable-'+found.substr(1)]);
                }
            } else if (this.punctuations.hasOwnProperty(found)) {
                stream.wrap(['punctuation', this.punctuations[found]]);
                
                if (found === ':') {
                    while (found = stream.match(this.values)) {
                        if (found == ';') {
                            stream.wrap(['punctuation', this.punctuations[found]]);
                            break;
                        } else if (this.colors.indexOf(found) !== -1) {
                            stream.wrap(['keyword', 'color-'+found]);
                        } else if (this.keywords.indexOf(found) !== -1) {
                            stream.wrap(['keyword', 'keyword-'+found]);
                        } else if (found[0] === '#') {
                            if (found.length === 4 || found.length === 7) {
                                stream.wrap(['numeric', 'hex']);
                            } else {
                                stream.wrap(['invalid']);
                            }
                        } else if (/\d/.test(found)) {
                            if (!isNaN(found)) {
                                stream.wrap(['numeric']);
                            } else if (this.units.test(found)) {
                                var f2 = found.match(this.units)[0];
                                stream.wrap(['numeric', 'unit-'+f2]);
                            } else {
                                stream.wrap(['numeric']);
                            }
                        } else if (this.punctuations.hasOwnProperty(found)) {
                            stream.wrap(['punctuation', this.punctuations[found]]);
                        } else if (this.chars.hasOwnProperty(found)) {
                            stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
                        } else if (stream.isAfter('(')) {
                            stream.wrap(['fname', 'fname-'+found]);
                        } else {
                            stream.wrap(['value']);
                        }
                    }
                    !found && stream.restore();
                }
            } else if (this.brackets.hasOwnProperty(found)) {
                stream.wrap(this.brackets[found]);
            } else if (this.operators.hasOwnProperty(found)) {
                stream.wrap(this.operators[found]);
            } else if (found === '/*') {
                stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
            } else {
                stream.skip();
            }
        }
        
        return stream;
    },
    keypressMap: {
        58: function() {
            this.textBeforeCursor(1) !== ':' && this.textAfterCursor(1) !== ';' && this.insertText(':;', -1);
        },
        59: function() {
            if (this.textAfterCursor(1) === ';') {
                this.caret.moveX(1);
                return false;
            }
            this.insertText(';');
        }
    },
    onRemovedBefore: { ':': ';' },
    onRemovedAfter: { ';': ':' },
    comment: '/*[text content]*/'
});