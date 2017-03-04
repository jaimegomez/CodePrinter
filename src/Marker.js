import { comparePos } from 'statics';
import { createNode, setNodeStyles, throttle } from 'helpers/index';

class Marker {
  constructor(layer) {
    this.layer = layer;
    this.range = { from: null, to: null };
    this.node = createNode(null, 'div', 'cp-marker');
    this.throttle = throttle();
  }

  mark({ from, to }) {
    return this.throttle(() => {
      const doc = this.layer.doc;
      const firstLine = doc.get(from.line);
      const lastLine = doc.get(to.line);
      const fromMeasure = doc.measureRect(firstLine, from.column);
      const toMeasure = doc.measureRect(lastLine, to.column);
      const pl = doc.sizes.paddingLeft;
      const equal = from.line === to.line;

      if (comparePos(from, to) > 0) {
        return;
      }

      this.top = markerNode(this, this.top
        , fromMeasure.offsetY, fromMeasure.offsetX, equal && fromMeasure.offsetY === toMeasure.offsetY ? 0 : null, fromMeasure.height, pl);

      this.middle = markerNode(this, this.middle
        , fromMeasure.offsetY + fromMeasure.height, pl, null, toMeasure.offsetY - fromMeasure.offsetY - fromMeasure.height, pl);

      if (equal && fromMeasure.offsetY === toMeasure.offsetY) {
        this.bottom = markerNode(this, this.bottom
          , toMeasure.offsetY, fromMeasure.offsetX, toMeasure.offsetX - fromMeasure.offsetX, fromMeasure.height, null);
      } else {
        this.bottom = markerNode(this, this.bottom
          , toMeasure.offsetY, pl, toMeasure.offsetX - pl, toMeasure.charHeight, null);
      }
    });
  }
}

function markerNode(marker, node, top, left, width, height, right) {
  const div = node || createNode(null, 'div', 'cp-marker-piece');
  setNodeStyles(div, { top, left, width, height, right });
  div.parentNode || marker.node.appendChild(div);
  return div;
}

export default Marker;
