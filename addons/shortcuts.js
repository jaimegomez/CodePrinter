CodePrinter.defineAddon('shortcuts', function() {
    
    var shortcuts = {
        'Ctrl Backspace': function() {
            this.deleteToBeginning();
            return false;
        },
        'Ctrl Del': function() {
            this.deleteToEnd();
            return false;
        },
        'Alt Up': CodePrinter.prototype.searchPrev,
        'Alt Down': CodePrinter.prototype.searchNext,
        'Ctrl Alt Up': CodePrinter.prototype.swapLineUp,
        'Ctrl Alt Down': CodePrinter.prototype.swapLineDown,
        'Ctrl D': CodePrinter.prototype.nextDefinition,
        'Ctrl Alt D': CodePrinter.prototype.previousDefinition,
        'Ctrl F': function(e) {
            var p = prompt('Find...');
            p ? this.search(p) : this.searchEnd();
        },
        'Ctrl Shift F': function() {
            this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
        },
        'Ctrl I': CodePrinter.prototype.fixIndents,
        'Ctrl J': function() {
            this.setCursorPosition(parseInt(prompt("Jump to line..."), 10) - 1, 0);
        },
        'Ctrl M': function() {
            var dl = this.caret.dl();
            if (dl) dl.classes && dl.classes.indexOf('cp-marked') >= 0 ? dl.removeClass('cp-marked') : dl.addClass('cp-marked');
        },
        'Ctrl N': function() {
            this.counter.hasClass('hidden') ? this.openCounter() : this.closeCounter();
        },
        'Ctrl R': function() {
            this.forcePrint();
        },
        'Ctrl Z': function() {
            this.doc.undo();
        },
        'Ctrl Shift Z': function(e) {
            this.doc.redo();
        },
        'Ctrl =': CodePrinter.prototype.increaseFontSize,
        'Ctrl -': CodePrinter.prototype.decreaseFontSize,
        'Ctrl /': CodePrinter.prototype.toggleComment,
        'Ctrl Shift /': CodePrinter.prototype.toggleBlockComment,
        'Ctrl Left': function() {
            this.caret.position(this.caret.line(), 0);
            return false;
        },
        'Ctrl Right': function() {
            this.caret.position(this.caret.line(), -1);
            return false;
        },
        'Ctrl Up': function() {
            this.caret.position(0, 0);
        },
        'Ctrl Down': function() {
            this.caret.position(this.doc.size() - 1, -1);
        }
    }
    
    return function(cp, options) {
        cp.keyMap.extend(shortcuts);
    }
});