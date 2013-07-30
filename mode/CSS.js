/* CodePrinter - CSS Mode */

CodePrinter.defineMode('CSS', {
    keywords: ['white','black','transparent','green','yellow','red','blue','orange','pink','cyan','violet','brown','gray','silver','gold','aqua','lime','navy','indigo','teal','fuchsia','magenta','beige','azure','khaki','sienna','skyblue'],
    regexp: /[\w\-]+\s*:|\b[\w\s\.#:\*\+-<>~&\(\)]+|\w+|"|'|{|}|:|;|\/\*/,
	values: /\;|#[0-9a-fA-F]{3,6}|\-?(\d+|\d*\.\d+)[\w%]*|\w+\s*\(|\b[\w\-]+\b|'|"|\n/,
    units: /px|%|em|rem|s|ms|in|pt|cm|mm|pc/,
    
	fn: function() {
		var ret = '',
			pos, found;
		
		while ((pos = this.search(this.regexp)) !== -1) {
        	found = this.match(this.regexp)[0];
            
            ret += this.tear(pos);
            
            if (found == ':') {
                ret += this.eat(found).wrap(['punctuation', 'colon']);
                
                while ((pos = this.search(this.values)) !== -1) {
                    found = this.match(this.values)[0];
                    
                    ret += this.tear(pos);
                    
                    if (found == ';') {
                        ret += this.eat(found).wrap(['punctuation', 'semicolon']);
                        break;
                    } else if (this.keywords.indexOf(found) !== -1) {
                        ret += this.eat(found).wrap(['keyword', 'color-'+found]);
                    } else if (/\d/.test(found)) {
                        if (!isNaN(found)) {
                            ret += this.eat(found).wrap(['numeric']);
                        } else if (found[0] == '#') {
                            ret += this.eat(found).wrap(['hex']);
                        } else if (this.units.test(found)) {
                            var f2 = found.match(this.units)[0];
                            ret += this.eat(found).wrap(['numeric', 'unit-'+f2]);
                        } else {
                            ret += this.eat(found).wrap(['numeric']);
                        }
                    } else if (found[found.length-1] == '(') {
                        found = found.slice(0, -1).replace(/\s+$/g, '');
                        ret += this.eat(found).wrap(['fname', 'fname-'+found]);
                    } else if (this.chars.hasOwnProperty(found)) {
                        ret += this.eat(found, found).wrap(this.chars[found].cls);
                    } else if (found == "\n") {
                        break;
                    } else {
                        ret += this.eat(found).wrap(['value']);
                    }
                }
            } else if (found[found.length-1] == ':') {
                found = found.slice(0, -1).replace(/\s+$/g, '');
                ret += this.eat(found).wrap(['property']);
            } else if (/^[\w\s\.\#\:\*\+\-\<\>\~\&]+$/.test(found)) {
                ret += this.eat(found).wrap(['special']);
            } else if (this.punctuations.hasOwnProperty(found)) {
                ret += this.eat(found).wrap(['punctuation', this.punctuations[found]]);
            } else if (this.chars.hasOwnProperty(found)) {
                ret += this.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
            } else if (this.brackets.hasOwnProperty(found)) {
                ret += this.eat(found).wrap(this.brackets[found]);
            } else {
            	ret += this.eat(found).wrap(['other']);
            }
		}
		return ret + this;
	}
});