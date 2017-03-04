const div = document.createElement('div');
const li = document.createElement('li');
const pre = document.createElement('pre');
const span = document.createElement('span');
const preLine = pre.cloneNode(false);

preLine.className = 'cp-line';

export default { div, li, pre, span, preLine };
