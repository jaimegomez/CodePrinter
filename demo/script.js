var cp = new CodePrinter()
, demo = $.get('[name=demo]')
, theme = $.get('[name=theme]')
, caretStyle = $.get('[name=caretStyle]')
, tabWidth = $.get('[name=tabWidth]')
, fontSize = $.get('[name=fontSize]')
, fullscreen = $.get('[name=fullscreen]')
, counter = $.get('[name=counter]')
, insertclosing = $.get('[name=insertclosing]')
, indentation = $.get('[name=indentation]')
, indentNewLines = $.get('[name=indentNewLines]')
, highlightBrackets = $.get('[name=highlightBrackets]')
, shortcuts = $.get('[name=shortcuts]')
, blinkCaret = $.get('[name=blinkCaret]');

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

demo.onchange = function() {
    cp.print(this.value, $.get('code#'+this.value).innerHTML.decode());
}
theme.onchange = function() {
    cp.setTheme(this.value);
}
caretStyle.onchange = function() {
    cp.caret.setStyle(this.value);
}
tabWidth.onchange = function() {
    cp.setTabWidth(parseInt(this.value));
    this.focus();
}
fontSize.onchange = function() {
    cp.setFontSize(this.value);
    this.focus();
}
fullscreen.onclick = function() {
    cp.enterFullscreen();
}
counter.onchange = function() {
    this.checked ? cp.openCounter() : cp.closeCounter();
}
insertclosing.onchange = function() {
    cp.options.insertClosingBrackets = this.checked;
}
indentation.onchange = function() {
    this.checked ? cp.showIndentation() : cp.hideIndentation();
}
indentNewLines.onchange = function() {
    cp.options.indentNewLines = this.checked;
}
highlightBrackets.onchange = function() {
    cp.options.highlightBrackets = this.checked;
}
shortcuts.onchange = function() {
    cp.options.shortcuts = this.checked;
}
blinkCaret.onchange = function() {
    cp.options.blinkCaret = this.checked;
}