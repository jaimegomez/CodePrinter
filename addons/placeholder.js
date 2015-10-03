'use strict';

CodePrinter.defineAddon('placeholder', function() {
  
  var emptyModifier = 'cp--empty';
  
  function addPlaceholder(cp) {
    if (cp.dom.placeholder) {
      cp.dom.placeholder.firstChild.nodeValue = cp.getOption('placeholder');
    } else {
      var placeholder = cp.dom.placeholder = document.createElement('pre');
      placeholder.style.cssText = '';
      placeholder.className = 'cp-placeholder';
      var childNode = cp.getOption('placeholder');
      if ('string' === typeof childNode) childNode = document.createTextNode(childNode);
      placeholder.appendChild(childNode);
      cp.dom.screen.insertBefore(placeholder, cp.dom.screen.firstChild);
    }
  }
  function removePlaceholder(cp) {
    var placeholder = cp.dom.placeholder;
    if (placeholder) {
      placeholder.parentNode.removeChild(placeholder);
      cp.dom.placeholder = undefined;
    }
  }
  
  function onChanged(doc) {
    var mainNode = this.getDOMNode();
    if (doc.isEmpty() && !doc.isFocused) {
      mainNode.classList.add(emptyModifier);
      addPlaceholder(this);
    } else {
      mainNode.classList.remove(emptyModifier);
      removePlaceholder(this);
    }
  }
  function onFocus(doc) {
    if (doc.isEmpty()) removePlaceholder(this);
  }
  function onBlur(doc) {
    if (doc.isEmpty()) addPlaceholder(this);
  }
  function placeholderSetter(value, old) {
    if (value) onChanged.call(this, this.doc);
    if (value && !old) {
      this.on('changed', onChanged);
      this.on('focus', onFocus);
      this.on('blur', onBlur);
    } else if (!value && old) {
      this.off('changed', onChanged);
      this.off('focus', onFocus);
      this.off('blur', onBlur);
    }
  }
  
  CodePrinter.defineOption('placeholder', '', placeholderSetter);
  
  return function(cp, options) {
    var ph = options || cp.getOption('placeholder');
    if (ph) {
      placeholderSetter.call(cp, ph, '');
    }
  }
});
