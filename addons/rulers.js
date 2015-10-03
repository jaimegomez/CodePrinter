'use strict';

CodePrinter.defineAddon('rulers', function() {
  
  function rulersSetter(value, oldValue) {
    if (!this.rulers) return new Rulers(this);
    var cols = 'number' === typeof value ? [value] : value;
    var rulers = this.dom.rulers;
    rulers.innerHTML = '';
    
    if (cols && cols.length) {
      for (var i = 0; i < cols.length; i++) {
        var ruler = document.createElement('div');
        ruler.className = 'cp-ruler';
        ruler.style.left = this.doc.sizes.paddingLeft + (cols[i] * this.doc.sizes.font.width) + 'px';
        rulers.appendChild(ruler);
      }
    }
  }
  function rulersStyleSetter(value, oldValue) {
    if (this.dom.rulers) {
      var className = 'cp-rulers';
      if (value && value !== 'solid') {
        className += ' cp-rulers--' + value;
      }
      this.dom.rulers.className = className;
    }
  }
  
  CodePrinter.defineOption('rulers', null, rulersSetter);
  CodePrinter.defineOption('rulersStyle', 'solid', rulersStyleSetter);
  
  function Rulers(cp, options) {
    var rulers = document.createElement('div');
    rulers.className = 'cp-rulers';
    cp.rulers = this;
    cp.dom.rulers = rulers;
    cp.dom.wrapper.appendChild(rulers);
    rulersStyleSetter.call(cp, cp.getOption('rulersStyle'), null);
    rulersSetter.call(cp, options || cp.getOption('rulers'), null);
    return this;
  }
  
  return Rulers;
});
