CodePrinter.defineAddon('css-colors', function() {
  return function(cp, options) {
    var prop = options && options.property || 'color';
    
    cp.wrapper.delegate('span.cpx-hex', {
      mouseover: function() {
        var html = this.innerHTML;
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(html)) {
          this.style[prop] = html;
        }
      },
      mouseout: function() {
        this.style.removeProperty(prop);
      }
    });
    
    cp.wrapper.delegate('span.cpx-css-color', {
      mouseover: function() {
        var html = this.innerHTML;
        if (/^[a-z\-]+$/i.test(html)) {
          this.style[prop] = html;
        }
      },
      mouseout: function() {
        this.style.removeProperty(prop);
      }
    });
  }
});