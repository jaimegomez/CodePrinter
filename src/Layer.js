import Marker from 'Marker';
import EventEmitter from 'EventEmitter';
import { addClass, classArray, createNode, removeClass } from 'helpers/index';

class Layer extends EventEmitter {
  constructor(classes) {
    super();
    this.parent = null;
    this.node = createNode(null, 'div', classArray('cp-layer', classes));
    this.markers = new Map();
    return this;
  }

  get doc() {
    return this.parent && this.parent.doc || this.parent;
  }

  mark(markerId, range) {
    const marker = this.markers.get(markerId) || new Marker(this);
    marker.mark(range);
    this.markers.set(markerId, marker);
    this.node.appendChild(marker.node);
    this.show();
  }

  clear(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      this.node.removeChild(marker.node);
      this.markers.delete(markerId);
    }
  }

  clearAll() {
    for (const [, marker] of this.markers) {
      this.node.removeChild(marker.node);
    }
    this.markers.clear();
  }

  hide() {
    addClass(this.node, 'cp-hidden');
  }

  show() {
    removeClass(this.node, 'cp-hidden');
  }
}

function getDocument(parent) {
  return parent.doc || parent;
}

function deleteLayerNode(layer, nodeId, node) {
  if (layer.nodes.delete(nodeId) && node.parentNode) {
    node.parentNode.removeChild(node);
    return true;
  }
  return false;
}

function prepareLayerNode(layer, nodeId, tagName) {
  const node = layer.get(nodeId);
  if (!node || node.tagName.toLowerCase() !== tagName.toLowerCase()) {
    node && deleteLayerNode(layer, nodeId, node);
    return createNode(null, tagName);
  }
  return node;
}

function updateLayerNode(node, { className, style }) {
  node.className = className;

  if (style) {
    const keys = Object.keys(style);
    for (const key of keys) {
      const value = style[key];
      node.style[key] = typeof value === 'number' ? `${value}px` : value || '';
    }
  } else {
    node.setAttribute('style', '');
  }
}

export default Layer;
