import Flags from 'Flags';
import { comparePos, pos } from 'statics';
import { webkit, macosx, gecko } from 'helpers/env';
import { isModifierKeyEvent, keyName, lookupKey, updateFlags } from 'helpers/keyboard';
import { addClass, eventCancel, isArray, last, off, on, passive, removeClass } from 'helpers/index';

function attachScrollEvents(cp) {
  const { scroll, mainNode } = cp.dom;
  let isScrolling = false;
  let scrollTimeout;

  if ('ontouchstart' in window || navigator.msMaxTouchPoints > 0) {
    let x, y;
    passive(scroll, 'touchstart', event => {
      y = event.touches[0].screenY;
      x = event.touches[0].screenX;
    });
    on(scroll, 'touchmove', event => {
      if (x != null && y != null) {
        const touch = event.touches[0];
        const scrollSpeed = cp.getOption('scrollSpeed');
        scroll.scrollLeft += scrollSpeed * (x - (x = touch.screenX));
        cp.doc.scrollTo(scroll.scrollTop + scrollSpeed * (y - (y = touch.screenY)));
        return eventCancel(event);
      }
    });
    passive(scroll, 'touchend', () => {
      x = y = null;
    });
  } else if ('onwheel' in window) {
    on(scroll, 'wheel', event => {
      if (event.ctrlKey && event.deltaY % 1 !== 0) {
        return event.preventDefault();
      }
      const scrollSpeed = cp.getOption('scrollSpeed');
      return wheel(cp.doc, event, scrollSpeed, event.deltaX, event.deltaY);
    });
  } else {
    const onMouseWheel = event => {
      const d = wheelDelta(event);
      const scrollSpeed = cp.getOption('scrollSpeed');
      return wheel(cp.doc, event, wheelUnit * scrollSpeed, d.x, d.y);
    };
    on(scroll, 'mousewheel', onMouseWheel);
    gecko && passive(scroll, 'DOMMouseScroll', mousewheel);
  }

  passive(scroll, 'scroll', () => {
    if (!cp.doc._lockedScrolling) {
      cp.doc.scroll(scroll.scrollLeft - cp.doc.scrollLeft, scroll.scrollTop - cp.doc.scrollTop);
    } else {
      if (!isScrolling) {
        addClass(scroll, 'cp--scrolling');
      }
      isScrolling = true;
      cp.emit('scroll');
      scrollTimeout = clearTimeout(scrollTimeout) || setTimeout(() => {
        isScrolling = false;
        removeClass(scroll, 'cp--scrolling');
        wheelTarget(cp.doc, null);
        cp.emit('scrollend');
      }, 200);
    }
    cp.doc._lockedScrolling = false;
  });
}

function attachInputEvents(cp) {
  const input = cp.dom.input;

  passive(input, 'focus', () => {
    removeClass(cp.dom.mainNode, 'inactive');
    cp.doc.focus();
  });

  passive(input, 'blur', () => {
    if (Flags.isMouseDown) {
      input.focus();
    } else {
      addClass(cp.dom.mainNode, 'inactive');
      if (cp.getOption('abortSelectionOnBlur')) {
        cp.doc.call('clearSelection');
      }
      cp.doc.blur();
    }
  });

  on(input, 'keydown', event => {
    updateFlags(event, true);
    const code = event.keyCode;
    const key = keyName(event);

    if (key === (macosx ? 'Cmd' : 'Ctrl')) {
      input.value = cp.doc.getSelection();
      input.setSelectionRange(0, input.value.length);
      return eventCancel(event, true);
    }
    if (Flags.cmdKey) {
      if (code === 86 || code === 88) {
        cp.doc.call('removeSelection');
      }
      if (code === 67 || code === 88) {
        return;
      }
      input.value = '';
    }
    if (cp.getOption('readOnly') && (code < 37 || code > 40)) {
      return;
    }
    cp.emit(`[${key}]`, event);
    cp.emit('keydown', key, event);

    if (!event.defaultPrevented) {
      const keyMap = cp.getOption('keyMap');
      if (keyMap) {
        const cmd = lookupKey(key, keyMap) || event.shiftKey && lookupKey(keyName(event, true), keyMap);
        if (cmd) {
          cp.execute(cmd);
          return eventCancel(event, true);
        }
      }

      // if (!cp.keyMap[seq] && event.shiftKey) seq = keySequence(event, true);
      // if (seq.length > 1 && cp.keyMap[seq] && callKeyBinding(cp, cp.keyMap, seq)) {
      //   if ([8, 46, 127, 63272].indexOf(code) >= 0) cp.emit('keypress', '', event);
      //   return eventCancel(event, 1);
      // }
    }
  });

  on(input, 'keypress', event => {
    const { readOnly, useParserKeyMap, autoIndent } = cp.getOptions();
    const ch = String.fromCharCode(event.charCode || event.keyCode);

    if (readOnly || event.ctrlKey || event.metaKey || !ch) {
      return;
    }

    cp.doc.eachCaret(caret => {
      const { mode, state, stream } = caret.getParserState();
      const head = caret.head();

      if (caret.hasSelection() && mode.selectionWrappers[ch]) {
        const wrapper = mode.selectionWrappers[ch];
        const arr = isArray(wrapper) ? wrapper : [wrapper, wrapper];
        caret.wrapSelection(...arr);
      } else if (useParserKeyMap && mode.keyMap[ch]) {
        const str = mode.keyMap[ch].call(cp, stream, state, caret);
        caret.insert(str == null ? ch : str);
      }// else if (cp.keypressBindings[ch]) {
      //  cp.keypressBindings[ch].call(cp, s, caret, ch);
      //}
      else {
        caret.insert(ch);
      }

      if (autoIndent && mode.isIndentTrigger(ch)) {
        reindentAt(cp, head.line);
      }
    });
    cp.emit('keypress', ch, event);
    return eventCancel(event);
  });

  passive(input, 'keyup', event => {
    updateFlags(event, false);

    if (cp.getOption('readOnly')) {
      return;
    }
    if (input.value.length && !isModifierKeyEvent(event)) {
      cp.doc.call('insert', input.value);
    }
    input.value = '';
    cp.emit('keyup', event);
  });

  passive(input, 'input', () => {
    if (!cp.getOption('readOnly') && input.value.length) {
      const autoIndent = cp.getOption('autoIndent');
      cp.doc.call('insert', input.value, 0, autoIndent && cp.doc.mode.name !== 'plaintext');
      input.value = '';
    }
  });
}

function attachMouseEvents(cp) {
  const { scroll, wrapper } = cp.dom;
  const counterSelection = [];
  let caret;
  let moveEvent;
  let dblClickTimeout;

  function counterSelDispatch(line, selIndex) {
    counterSelection[selIndex] = line;
    const lastItem = last(counterSelection);
    const caret = cp.doc.resetCarets();
    caret.setSelection(
      pos(counterSelection[0], 0),
      pos(lastItem + (counterSelection[0] <= lastItem ? 1 : 0), 0)
    );
    return caret;
  }
  function tripleclick(event) {
    const head = caret.head();
    caret.setSelection(pos(head.line, 0), pos(head.line + 1, 0));
    Flags.waitForTripleClick = Flags.isMouseDown = false;
    dblClickTimeout = clearTimeout(dblClickTimeout);
    return eventCancel(event);
  }
  function onMouse(e) {
    if (e.defaultPrevented || e.which === 3) return false;

    const doc = cp.doc;
    const sizes = doc.sizes;
    const rect = scroll.getBoundingClientRect();
    const offsetHeight = scroll.offsetHeight;
    const x = e.pageX - rect.left - sizes.countersWidth;
    const y = Math.max(0, Math.min(e.pageY - rect.top + scroll.scrollTop, scroll.scrollHeight));
    const measure = doc.measurePosition(Math.max(0, x), y - sizes.paddingTop);

    if (e.type === 'mousedown') {
      Flags.isMouseDown = true;

      if (x < 0) {
        caret = counterSelDispatch(measure.lineIndex, 0);
      } else {
        if (Flags.waitForTripleClick) {
          caret = doc.resetCarets();
          return tripleclick(e);
        }

        caret = doc.findCaretAt(measure.position);

        if (caret && caret.hasSelection()) {
          Flags.movingSelection = true;
        } else {
          caret = Flags.cmdKey ? doc.createCaret() : doc.resetCarets();
          caret.dispatch(measure);

          if (!Flags.shiftKey || !caret.hasSelection()) {
            caret.beginSelection();
          }
        }
      }
      on(window, 'mousemove', onMouse);
      on(window, 'mouseup', onMouse);
    }
    else if (e.type === 'mousemove') {
      const top = Math.round(e.pageY - rect.top + scroll.scrollTop);
      const bottom = Math.round(rect.top + offsetHeight - e.pageY);

      if (Flags.movingSelection) {
        ++Flags.movingSelection;
      } else if (counterSelection.length && x < 0) {
        counterSelDispatch(measure.lineIndex, 1);
      } else if (comparePos(caret.head(), measure.position) !== 0) {
        caret.dispatch(measure);
      }

      moveEvent = e;

      if (top <= 40 || bottom <= 40) {
        const [distance, move] = top <= 40 ? [top, -sizes.font.height] : [bottom, sizes.font.height];
        Flags.mouseScrolling = true;

        const mouseScrolling = () => {
          if (Flags.isMouseDown && moveEvent === e) {
            doc.scroll(0, move);
            onMouse.call(wrapper, moveEvent);
          } else {
            Flags.mouseScrolling = false;
          }
        };
        setTimeout(mouseScrolling, distance + 10);
      }
    }
    else if (e.type === 'mouseup') {
      if (Flags.movingSelection > 1) {
        caret.moveSelectionTo(measure.position);
      } else {
        if (Flags.movingSelection === true) caret.clearSelection();
        maybeClearSelection(caret);
      }
      Flags.isMouseDown = Flags.movingSelection = false;
      counterSelection.length = 0;

      off(window, 'mousemove', onMouse);
      off(window, 'mouseup', onMouse);
    }
  }

  on(wrapper, 'mousedown', onMouse);
  on(scroll, 'selectstart', eventCancel);

  on(scroll, 'dblclick', () => {
    if (!cp.getOption('searchOnDblClick')) {
      return;
    }
    if (!caret) {
      caret = doc.resetCarets();
    }
    const word = caret.match(/\w/);
    Flags.waitForTripleClick = true;

    clearTimeout(dblClickTimeout);
    dblClickTimeout = setTimeout(() => {
      Flags.waitForTripleClick = false;
      const { from } = caret.getRange();

      cp.doc.search(word, false, results => {
        const node = results.get(from.line, from.column);
        results.setActive(null);
        if (node) {
          node.span.classList.add('cp-hidden');
        }
        caret.once('selectionCleared', () => cp.doc.searchEnd());
      });
    }, 250);
  });
}

function maybeClearSelection(caret) {
  const anchor = caret.anchor(true);
  if (anchor && comparePos(anchor, caret.head(true)) === 0) {
    caret.clearSelection();
  }
}

function wheelDelta(event) {
  const x = event.wheelDeltaX;
  const y = event.wheelDeltaY;
  return {
    x: x == null && event.axis === event.HORIZONTAL_AXIS ? event.detail : x,
    y: y == null ? event.axis === event.VERTICAL_AXIS ? event.detail : event.wheelDelta : y,
  };
}

function wheel(doc, event, speed, x, y) {
  if (webkit && macosx) wheelTarget(doc, event.target);
  doc.scroll(speed * x, speed * y);
  return eventCancel(event);
}

function wheelTarget(doc, wt) {
  if (doc.wheelTarget !== wt && doc.dom.scroll !== wt) {
    if (wt && wt.style.display === 'none') {
      wt.parentNode.removeChild(wt);
    }
    doc.wheelTarget = wt;
  }
}

export function attachEvents(cp) {
  attachScrollEvents(cp);
  attachInputEvents(cp);
  attachMouseEvents(cp);
}
