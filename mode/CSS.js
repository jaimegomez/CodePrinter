/* CodePrinter - CSS Mode */

CodePrinter.defineMode('CSS', {
    colors: ['white','black','transparent','green','yellow','red','blue','orange','pink','cyan','violet','brown','gray','silver','gold','aqua','lime','navy','indigo','teal','fuchsia','magenta','beige','azure','khaki','sienna','skyblue'],
    keywords: ['inherit','italic','normal','bold','underline','none','all','solid','dotted','dashed'],
    regexp: /\/\*|#[\w\-]+|\.[\w\-]+|\b[\w\-]+|@\w+|{|}|:|;|<|>/,
	values: /\/\*|\;|#[0-9a-fA-F]+|\-?\d+[a-zA-Z%]*|\-?\d*\.\d+[a-zA-Z%]*|\b[\w\-]+\b|'|"|\n/,
    units: /px|%|em|rem|s|ms|in|pt|cm|mm|pc/,
    
    fn: function(stream) {
        var found;
        
        while (found = stream.retrieve(this.regexp)) {
            if (found[0] === '#') {
                stream.eat(found).wrap(['special', 'css-id']);
            } else if (found[0] === '.') {
                stream.eat(found).wrap(['special', 'css-class']);
            } else if (/^[\w\-]+$/i.test(found)) {
                if (stream.isNext(/:/)) {
                    stream.eat(found).wrap(['property', 'property-'+found]);
                } else if (found.indexOf('-') === -1) {
                    stream.eat(found).wrap(['css-tag']);
                } else {
                    stream.skip();
                }
            } else if (found[0] === '@') {
                if (found === '@media') {
                    stream.eat(found).wrap(['control', 'control-media']);
                } else {
                    stream.eat(found).wrap(['variable', 'variable-'+found.substr(1)]);
                }
            } else if (this.punctuations.hasOwnProperty(found)) {
                stream.eat(found).wrap(['punctuation', this.punctuations[found]]);
                
                if (found === ':') {
                    while (found = stream.retrieve(this.values)) {
                        if (found == ';') {
                            stream.eat(found).wrap(['punctuation', 'semicolon']);
                            break;
                        } else if (this.colors.indexOf(found) !== -1) {
                            stream.eat(found).wrap(['keyword', 'color-'+found]);
                        } else if (this.keywords.indexOf(found) !== -1) {
                            stream.eat(found).wrap(['keyword', 'keyword-'+found]);
                        } else if (found[0] === '#') {
                            if (found.length === 4 || found.length === 7) {
                                stream.eat(found).wrap(['numeric', 'hex']);
                            } else {
                                stream.eat(found).wrap(['invalid']);
                            }
                        } else if (/\d/.test(found)) {
                            if (!isNaN(found)) {
                                stream.eat(found).wrap(['numeric']);
                            } else if (this.units.test(found)) {
                                var f2 = found.match(this.units)[0];
                                stream.eat(found).wrap(['numeric', 'unit-'+f2]);
                            } else {
                                stream.eat(found).wrap(['numeric']);
                            }
                        } else if (this.chars.hasOwnProperty(found)) {
                            stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
                        } else if (found == "\n") {
                            break;
                        } else if (stream.isNext(/\(/)) {
                            stream.eat(found).wrap(['fname', 'fname-'+found]);
                        } else {
                            stream.eat(found).wrap(['value']);
                        }
                    }
                }
            } else if (this.brackets.hasOwnProperty(found)) {
                stream.eat(found).wrap(this.brackets[found]);
            } else if (found === '/*') {
                stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
            } else {
                stream.skip();
            }
        }
    },
    keypressMap: {
        58: function() {
            this.textBeforeCursor(1) !== ':' && this.textAfterCursor(1) !== ';' && this.insertText(';', 1);
        }
    }
});