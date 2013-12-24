/* CodePrinter - JavaScript Mode */

CodePrinter.defineMode('JavaScript', {
    controls: ['if','else','elseif','for','switch','while','do'],
    keywords: ['var','this','return','new','continue','break','instanceof','typeof','case','try','catch','debugger','default','delete','finally','in','throw','void','with'],
    specials: ['window','document','console','arguments','function','Object','Array','String','Number','Function','Math','JSON','RegExp','Node','HTMLElement','Boolean','$','jQuery','Selector'],
    
    regexp: /\/\*|\/\/|\/(.*)\/[gimy]{0,4}|\b\d*\.?\d+\b|\b0x[\da-fA-F]+\b|[^\w\s]|\$(?!\w)|\b[\w\d\-\_]+|\b\w+\b/,
    
    fn: function(stream) {
        var found;
        
        while (found = stream.match(this.regexp)) {
            if (!isNaN(found)) {
                if (found.substr(0, 2).toLowerCase() == '0x') {
                    stream.wrap(['numeric', 'hex']);
                } else {
                    if ((found+'').indexOf('.') === -1) {
                        stream.wrap(['numeric', 'int']);
                    } else {
                        stream.wrap(['numeric', 'float']);
                    }
                }
            } else if (/^[\w\-\$]+/i.test(found)) {
                found = found.toLowerCase();
                if (found == 'true' || found == 'false') {
                    stream.wrap(['boolean', found]);
                } else if (found == 'null' || found == 'undefined') {
                    stream.wrap(['empty-value', found]);
                } else if (this.controls.indexOf(found) !== -1) {
                    stream.wrap(['control', found]);
                } else if (this.specials.indexOf(found) !== -1) {
                    stream.wrap(['special', found]);
                } else if (this.keywords.indexOf(found) !== -1) {
                    stream.wrap(['keyword', found]);
                } else if (stream.isAfter('(')) {
                    stream.wrap('fname');
                } else if (stream.isAfter(':')) {
                    stream.wrap('property');
                } else {
                    stream.wrap('word');
                } 
            } else if (found.length == 1) {
                if (this.punctuations.hasOwnProperty(found)) {
                    stream.wrap(['punctuation', this.punctuations[found]]);
                } else if (this.operators.hasOwnProperty(found)) {
                    stream.wrap(['operator', this.operators[found]]);
                } else if (this.brackets.hasOwnProperty(found)) {
                    stream.wrap(this.brackets[found]);
                } else if (found === '"' || found === "'") {
                    stream.eat(found, this.chars[found].end, function() {
                        return this.wrap(['invalid']).reset();
                    }).wrap(this.chars[found].cls);
                } else {
                    stream.wrap(['other']);
                }
            } else if (this.chars.hasOwnProperty(found)) {
                stream.eatWhile(found, this.chars[found].end).wrap(this.chars[found].cls);
            } else if (found[0] == '/') {
                stream.wrap(['regexp'], function(cls) {
                    return this.replace(/(\\.)/g, '</span><span class="cp-escaped">$1</span><span class="'+cls+'">');
                });
            } else {
                stream.wrap(['other']);
            }
        }
        
        return stream;
    },
    comment: '//'
});