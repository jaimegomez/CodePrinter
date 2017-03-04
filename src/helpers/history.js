import historyActions from 'historyActions';
import { copy, isArray, last } from 'helpers/index';

export function checkSupport(stack) {
  for (const change of stack) {
    if (!change.type || !change.make || !change.reverse) {
      throw new Error('Some of the changes in the history are incorrect');
    }
    if (!historyActions[change.type]) {
      throw new Error('Some of the changes in the history contain unsupported actions (like "' + change.type + '" ).');
    }
  }
}

let historyStateId = 0;
export function copyState(state) {
  const newState = copy(state);
  newState.id = ++historyStateId;
  return newState;
}

export function getHistoryAction(type) {
  return historyActions[type];
}

export function historyMove(hist, from, into) {
  if (!hist.lock && from.length) {
    const lastChange = last(from);
    const splitted = maybeSplitChanges(lastChange);
    const reversed = reverseChanges(splitted);

    if (lastChange === splitted || lastChange.length === 0) {
      from.pop();
    }
    historyPush(hist, into, reversed);
    return reversed;
  }
}

export function historyPush(hist, into, state) {
  const lastItem = last(into);
  if (isArray(lastItem)) {
    if (!isArray(state)) state = [state];
    var codes = [], min = Math.min(lastItem.length, state.length);
    for (var i = 0; i < min; i++) {
      var ch = lastItem[i], cur = state[i], hist = historyActions[ch.type];
      if (ch.type === cur.type && hist.merge && hist.canBeMerged) codes[i] = hist.canBeMerged(ch, cur);
      if (!codes[i]) break;
    }
    if (i === min) {
      for (var i = 0; i < min; i++) {
        var hist = historyActions[lastItem[i].type];
        hist.merge(lastItem[i], state[i], codes[i]);
      }
      for (; i < state.length; i++) lastItem.push(state[i]);
      return true;
    }
  }
  into.push(state);
}

export function maybeSplitChanges(state) {
  if (!isArray(state)) return splitChange(state) || state;
  var split = [];
  for (var i = 0; i < state.length; i++) {
    var s = splitChange(state[i]);
    if (s === state[i]) split.push(state.splice(i--, 1)[0]);
    else if (s) split.push(s);
  }
  return split.length ? split : state;
}

export function reverseChange(change) {
  return historyActions[change.type].reverse(change);
}

export function reverseChanges(state) {
  return isArray(state) ? state.map(reverseChange) : reverseChange(state);
}

export function splitChange(change) {
  const act = historyActions[change.type];
  return act && act.split && act.split(change);
}
