export default {
  vertical(css, measure, options) {
    css.width = 1;
    css.height = options.caretHeight * measure.charHeight;
  },
  underline(css, measure) {
    css.width = measure.charWidth || measure.dl.height / 2;
    css.height = 1;
    css.top += measure.dl.height - 1;
  },
  block(css, measure, options) {
    css.width = measure.charWidth || measure.dl.height / 2;
    css.height = options.caretHeight * measure.charHeight;
  },
};
