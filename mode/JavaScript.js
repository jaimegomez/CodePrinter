/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', {
    controls: ['if','else','elseif','for','switch','while','do'],
    keywords: ['this','return','new','continue','break','instanceof','typeof','case','try','catch','debugger','default','delete','finally','in','throw','void','with'],
    specials: ['window','document','console','arguments','function','Object','Array','String','Number','Function','Math','JSON','RegExp','Node','HTMLElement','Boolean','$','jQuery','Selector'],
    
    regexp: /\/\*|\/\/|'|"|{|}|\(|\)|\[|\]|=|-|\+|\/(.*)\/[gimy]{0,4}|\/|%|<|>|&|\||\.|,|:|;|\?|!|\$(?!\w)|\b[\w\d\-\_]+(?=(\(|\:))|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|\b\w+\b/,
    
    fn: function(stream) {
        var pos, found;
        stream = stream || this.stream;
        
        while ((pos = stream.search(this.regexp)) !== -1) {
            found = stream.match(this.regexp)[0];
            
            stream.tear(pos);
            
            if (!isNaN(found)) {
                if (/^0x[\da-fA-F]+$/.test(found)) {
                    stream.eat(found).wrap(['numeric', 'hex']);
                } else {
                    if ((found+'').indexOf('.') === -1) {
                        stream.eat(found).wrap(['numeric', 'int']);
                    } else {
                        stream.eat(found).wrap(['numeric', 'float']);
                    }
                }
            } else if (/^([\w\d\-\_]+|\$)$/i.test(found)) {
                if (found == 'true' || found == 'false') {
                    stream.eat(found).wrap(['boolean', found]);
                } else if (found == 'var') {
                    stream.eat(found).wrap(['variable']);
                } else if (found == 'null' || found == 'undefined') {
                    stream.eat(found).wrap(['empty-value', found]);
                } else if (this.controls.indexOf(found) !== -1) {
                    stream.eat(found).wrap(['control', found]);  
                } else if (this.specials.indexOf(found) !== -1) {
                    stream.eat(found).wrap(['special', found]);
                } else if (this.keywords.indexOf(found) !== -1) {
                    stream.eat(found).wrap(['keyword', found]);
                } else if (/^\s*\(/.test(stream.substr(found.length))) {
                    stream.eat(found).wrap('fname');
                } else if (/^\s*\:/.test(stream.substr(found.length))) {
                    stream.eat(found).wrap('property');
                } else {
                    stream.eat(found).wrap('word');
                } 
            } else if (/^[^\w\d\s]+$/.test(found)) {
                if (this.punctuations.hasOwnProperty(found)) {
                    stream.eat(found).wrap(['punctuation', this.punctuations[found]]);
                } else if (this.operators.hasOwnProperty(found)) {
                    stream.eat(found).wrap(['operator', this.operators[found]]);
                } else if (this.brackets.hasOwnProperty(found)) {
                    stream.eat(found).wrap(this.brackets[found]);
                } else if (this.chars.hasOwnProperty(found)) {
                    stream.eat(found, this.chars[found].end).wrap(this.chars[found].cls);
                } else {
                    stream.eat(found).wrap(['other']);
                }
            } else if (found == "\\") {
                stream.eat(found+stream.substring(0, 2)).wrap('escaped');
            } else if (found[0] == '/') {
                stream.eat(found);
                stream.wrap(['regexp'], function(cls) {
                    return this.replace(/(\\.)/g, '</span><span class="cp-escaped">$1</span><span class="'+cls+'">');
                });
            } else {
                stream.eat(found).wrap(['other']);
            }
        }
        
        return stream;
    }
});