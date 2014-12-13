var cp = new CodePrinter({
    addons: ['scrollbars']
})
, demo = $('[name=demo]')
, theme = $('[name=theme]')
, caretStyle = $('[name=caretStyle]')
, tabWidth = $('[name=tabWidth]')
, fontSize = $('[name=fontSize]')
, fullscreen = $('[name=fullscreen]')
, readonly = $('[name=readonly]')
, counter = $('[name=counter]')
, insertclosing = $('[name=insertclosing]')
, indentation = $('[name=indentation]')
, indentNewLines = $('[name=indentNewLines]')
, highlightBrackets = $('[name=highlightBrackets]')
, shortcuts = $('[name=shortcuts]')
, blinkCaret = $('[name=blinkCaret]')
, download = $('[name=download]');

download.innerHTML += ' v'+CodePrinter.version;
download.onclick = function() {
    window.location.href = 'http://github.com/tsapeta/CodePrinter/archive/v'+CodePrinter.version+'.zip';
}
$('section').append(cp.mainElement);
cp.print('JavaScript', $('code#JavaScript').innerHTML.decode());

demo.onchange = function() {
    cp.print(this.value, $('code#'+this.value.replace(/\+/g, 'p')).innerHTML.decode());
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
    cp.setFontSize(parseInt(this.value, 10));
    this.focus();
}
fullscreen.onclick = function() {
    cp.enterFullscreen();
}
readonly.onchange = function() {
    cp.options.readOnly = this.checked;
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