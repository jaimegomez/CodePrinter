/* CodePrinter - CSS Mode */

CodePrinter.defineMode('CSS', {
    keywords: ['white','black','transparent','green','yellow','red','blue','orange','pink','cyan','violet','brown','gray','silver','gold','aqua','lime','navy','indigo','teal','fuchsia','magenta','beige','azure','khaki','sienna','skyblue'],
    regexp: /[\w\-]+\s*:|\b[\w\s\.#:\*\+-<>~&\(\)]+|\w+|"|'|{|}|:|;|\/\*/,
	values: /\;|#[0-9a-fA-F]{3,6}|\-?(\d+|\d*\.\d+)[\w%]*|\w+\s*\(|\b[\w\-]+\b|'|"|\n/,
    units: /px|%|em|rem|s|ms|in|pt|cm|mm|pc/,
    
	fn: function(stream) {
		var pos, found;
		stream = stream || this.stream;
        
		while ((pos = stream.search(this.regexp)) !== -1) {
        	found = stream.match(this.regexp)[0];
            
            stream.tear(pos);
            
            if (found == ':') {
                stream.eat(found).wrap(['punctuation', 'colon']);
                
                while ((pos = stream.search(this.values)) !== -1) {
                    found = stream.match(this.values)[0];
                    
                    stream.tear(pos);
                    
                    if (found == ';') {
                        stream.eat(found).wrap(['punctuation', 'semicolon']);
                        break;
                    } else if (this.keywords.indexOf(found) !== -1) {
                        stream.eat(found).wrap(['keyword', 'color-'+found]);
                    } else if (/\d/.test(found)) {
                        if (!isNaN(found)) {
                            stream.eat(found).wrap(['numeric']);
                        } else if (found[0] == '#') {
                            stream.eat(found).wrap(['hex']);
                        } else if (this.units.test(found)) {
                            var f2 = found.match(this.units)[0];
                            stream.eat(found).wrap(['numeric', 'unit-'+f2]);
                        } else {
                            stream.eat(found).wrap(['numeric']);
                        }
                    } else if (found[found.length-1] == '(') {
                        found = found.slice(0, -1).replace(/\s+$/g, '');
                        stream.eat(found).wrap(['fname', 'fname-'+found]);
                    } else if (this.chars.hasOwnProperty(found)) {
                        stream.eat(found, found).wrap(this.chars[found].cls);
                    } else if (found == "\n") {
                        break;
                    } else {
                        stream.eat(found).wrap(['value']);
                    }
                }
            } else if (found[found.length-1] == ':') {
                found = found.slice(0, -1).replace(/\s+$/g, '');
                stream.eat(found).wrap(['property']);
            } else if (/^[\w\s\.\#\:\*\+\-\<\>\~\&]+$/.test(found)) {
                stream.eat(found).wrap(['special']);
            } else if (this.punctuations.hasOwnProperty(found)) {
                stream.eat(found).wrap(['punctuation', this.punctuations[found]]);
            } else if (this.chars.hasOwnProperty(found)) {
                stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
            } else if (this.brackets.hasOwnProperty(found)) {
                stream.eat(found).wrap(this.brackets[found]);
            } else {
            	stream.eat(found).wrap(['other']);
            }
		}
		return stream;
	},
    keypressMap: {
        58: function() {
            this.textBeforeCursor(1) !== ':' && this.textAfterCursor(1) !== ';' && this.insertText(';', 1);
        }
    }
});