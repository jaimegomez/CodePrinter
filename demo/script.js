var cp = new CodePrinter();

$.get('section').append(cp.mainElement);
cp.print('JavaScript', $.get('code#JavaScript').innerHTML.decode());

setTimeout(function() {
    cp.mainElement.animate({ translateX: 0, opacity: 1 }, 700, function() {
        setTimeout(function() {
            $('#options, header, article').animate({ opacity: 1 }, 700, function() {
                $.get('img').effectIn('slideDown', 700);
            });
        }, 150);
    });
}, 150);

$.get('[name=demo]')
.on({ change: function() {
    cp.print(this.value, $.get('code#'+this.value).innerHTML.decode());
}});
$.get('[name=theme]').prop({ value: cp.options.theme })
.on({ change: function() {
    cp.setTheme(this.value);
}});
$.get('[name=caretStyle]').prop({ value: cp.options.caretStyle })
.on({ change: function() {
    cp.caret.setStyle(this.value);
}});
$.get('[name=tabWidth]').prop({ value: cp.options.tabWidth })
.on({ change: function() {
    cp.setTabWidth(parseInt(this.value));
    this.focus();
}});
$.get('[name=fontSize]').prop({ value: cp.options.fontSize })
.on({ change: function() {
    cp.setFontSize(this.value);
    this.focus();
}});
$.get('[name=fullscreen]')
.on({ click: function() {
    cp.enterFullscreen();
}});
$.get('[name=counter]').prop({ checked: cp.options.lineNumbers })
.on({ change: function() {
    this.checked ? cp.openCounter() : cp.closeCounter();
}});
$.get('[name=insertclosing]').prop({ checked: cp.options.insertClosingBrackets })
.on({ change: function() {
    cp.options.insertClosingBrackets = this.checked;
}});
$.get('[name=indentation]').prop({ checked: cp.options.showIndentation })
.on({ change: function() {
    cp.options.showIndentation = this.checked;
    cp.forcePrint();
}});
$.get('[name=indentNewLines]').prop({ checked: cp.options.indentNewLines })
.on({ change: function() {
    cp.options.indentNewLines = this.checked;
}});
$.get('[name=highlightBrackets]').prop({ checked: cp.options.highlightBrackets })
.on({ change: function() {
    cp.options.highlightBrackets = this.checked;
}});
$.get('[name=shortcuts]').prop({ checked: cp.options.shortcuts })
.on({ change: function() {
    cp.options.shortcuts = this.checked;
}});
$.get('[name=blinkCaret]').prop({ checked: cp.options.blinkCaret })
.on({ change: function() {
    cp.options.blinkCaret = this.checked;
}});