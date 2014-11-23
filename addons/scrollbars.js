CodePrinter.defineAddon('scrollbars', function() {
    
    var Scrollbars = function(cp) {
        var x = new Scrollbar(cp, 'horizontal')
        , y = new Scrollbar(cp, 'vertical');
        
        this.update = function(show) {
            x.update(show);
            y.update(show);
        }
        this.show = function() {
            x.show();
            y.show();
        }
        this.hide = function() {
            if (!this.options.alwaysVisible) {
                x.hide();
                y.hide();
            }
        }
    }
    
    var Scrollbar = function(cp, type) {
        var div = document.createElement('div')
        , slider = document.createElement('div')
        , dim, dir;
        
        if (type === 'vertical') {
            dim = 'Height';
            dir = 'Top';
        } else {
            dim = 'Width';
            dir = 'Left';
        }
        
        div.className = 'cp-scrollbar cp-scrollbar-'+type;
        slider.className = 'cp-scrollbar-slider';
        div.appendChild(slider);
        
        cp.container.appendChild(div);
        
        this.update = function(show) {
            var m = div['offset'+dim] - 4
            , c = cp.wrapper['client'+dim]
            , sm = cp.wrapper['scroll'+dim]
            , sr = cp.wrapper['scroll'+dir]
            , lv = sr / (sm - c)
            , s = c / sm * m;
            
            if (s >= m) {
                this.hide();
            } else {
                show !== false && this.show();
                slider.style[dim.toLowerCase()] = parseInt(s, 10) + 'px';
                slider.style[dir.toLowerCase()] = parseInt(lv * (m - s), 10) + 'px';
            }
        }
        this.show = function() {
            div.addClass('visible');
        }
        this.hide = function() {
            div.removeClass('visible');
        }
    }
    
    Scrollbars.defaults = {
        alwaysVisible: false,
        inactivityTimeout: 600
    }
    
    return function(cp, options) {
        if (!cp.scrollbars) {
            var sb = cp.scrollbars = new Scrollbars(cp)
            , sTimeout;
            
            sb.options = {}.extend(Scrollbars.defaults, options);
            
            if (cp.caret.isActive) {
                sb.update(false);
            }
            
            cp.on({
                'scroll': function() {
                    sb.update();
                    if (!sb.options.alwaysVisible) {
                        sTimeout = clearTimeout(sTimeout) || setTimeout(function() {
                            sb.hide();
                        }, sb.options.inactivityTimeout);
                    }
                }
            });
        }
    }
});